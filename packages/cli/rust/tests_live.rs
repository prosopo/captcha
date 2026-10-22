// Copyright 2021-2026 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

//! The live equivalence tests: vectors written by the provider's live generators
//! (packages/provider/rust/equivalence/generate-*.ts, see live-harness.ts) replayed against the
//! Rust app on the same stores, starting from the state the TS run started from. Ignored by
//! default; run with `cargo test -p prosopo-cli --test live -- --ignored` with MongoDB on
//! 127.0.0.1:${PROSOPO_TEST_MONGO_PORT:-27999} (user root/root) and Redis Stack on
//! localhost:6379 (password root). Each test empties both first.
//!
//! Beside the frame headers the public router's test leaves out, answers are compared with the
//! request id taken out: it is fresh on each side, and a refusal's body quotes it. Stored
//! records are compared as canonical extended JSON, so field order and BSON types count; only
//! the ids and timestamps a run makes fresh are left out.

use axum::extract::State;
use axum::routing::post;
use axum::Router;
use base64::Engine;
use bson::{Bson, Document};
use prosopo_cli::{app_parts, get_config, provider_router, AppParts, Environment};
use prosopo_env::{Environment as BaseEnvironment, ProviderEnvironment};
use prosopo_keyring::{get_pair, KeyringPair, Secret};
use prosopo_util_crypto::jwt::JwtIssueOptions;
use prosopo_provider::api::healthz_geo::HealthzProbe;
use prosopo_provider::http_replay::{answer, exchange, shown, Answer};
use prosopo_provider::api::challenge::SeedSource;
use prosopo_provider::tasks::detection::{DecodeFuture, PayloadDecoder};
use prosopo_types::config::ProsopoConfig;
use prosopo_util_crypto::U8aLike;
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::net::SocketAddr;
use prosopo_database::provider::ProviderDatabase;
use prosopo_database::source::{Source, SystemSource};
use prosopo_database::MongoConnectionTimeouts;
use prosopo_database::MongoDatabase;
use prosopo_env::DatabaseSettings;
use prosopo_logger::Logger;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// The live tests share one MongoDB and one Redis, which each empties, so they run one at a time.
static LIVE: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

const MNEMONIC: &str = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
const ADMIN: &str = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

fn mongo_url() -> String {
    let port: String = std::env::var("PROSOPO_TEST_MONGO_PORT").unwrap_or_else(|_| "27999".to_string());
    format!("mongodb://root:root@127.0.0.1:{port}/?authSource=admin")
}

/// ipapi.is answering from the vectors' table; an IP not in it is a bogon.
async fn fake_ipapi(table: Value) -> String {
    async fn lookup(State(table): State<Arc<Value>>, body: String) -> axum::response::Response {
        let query: Value = serde_json::from_str(&body).unwrap_or(Value::Null);
        let ip: Value = query.get("q").cloned().unwrap_or(Value::Null);
        let found: Value = ip.as_str().and_then(|ip| table.get(ip)).cloned().unwrap_or_else(|| json!({ "ip": ip, "is_bogon": true }));
        let mut response = axum::response::Response::new(axum::body::Body::from(found.to_string()));
        response.headers_mut().insert(axum::http::header::CONTENT_TYPE, axum::http::HeaderValue::from_static("application/json"));
        response
    }
    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind("127.0.0.1:0").await.expect("binds");
    let port: u16 = listener.local_addr().expect("an address").port();
    let router: Router = Router::new().route("/", post(lookup)).with_state(Arc::new(table));
    tokio::spawn(async move { axum::serve(listener, router).await.expect("serves") });
    format!("http://127.0.0.1:{port}/")
}

fn encode_name(name: &str) -> Vec<u8> {
    let mut out: Vec<u8> = Vec::new();
    for label in name.trim_end_matches('.').split('.').filter(|label| !label.is_empty()) {
        out.push(label.len() as u8);
        out.extend_from_slice(label.as_bytes());
    }
    out.push(0);
    out
}

/// A DNS server on UDP answering CNAME and MX queries from the vectors' table, as the TS
/// generator's stand-in does: an unknown name does not exist, a known one without the record
/// type has no data.
async fn fake_dns(table: Value) -> String {
    let socket: tokio::net::UdpSocket = tokio::net::UdpSocket::bind("127.0.0.1:0").await.expect("binds");
    let address: SocketAddr = socket.local_addr().expect("an address");
    tokio::spawn(async move {
        let mut buffer: [u8; 1500] = [0; 1500];
        loop {
            let Ok((length, peer)) = socket.recv_from(&mut buffer).await else {
                return;
            };
            let query: &[u8] = &buffer[..length];
            let mut offset: usize = 12;
            let mut labels: Vec<String> = Vec::new();
            while offset < query.len() && query[offset] != 0 {
                let size: usize = query[offset] as usize;
                labels.push(String::from_utf8_lossy(&query[offset + 1..offset + 1 + size]).into_owned());
                offset += size + 1;
            }
            let question_end: usize = offset + 5;
            let record_type: u16 = u16::from_be_bytes([query[offset + 1], query[offset + 2]]);
            let name: String = labels.join(".").to_lowercase();
            let entry: Option<&Value> = table.get(&name);
            let mut answers: Vec<u8> = Vec::new();
            let mut count: u16 = 0;
            let mut record = |kind: u16, rdata: Vec<u8>| {
                answers.extend_from_slice(&[0xc0, 0x0c]);
                answers.extend_from_slice(&kind.to_be_bytes());
                answers.extend_from_slice(&1u16.to_be_bytes());
                answers.extend_from_slice(&60u32.to_be_bytes());
                answers.extend_from_slice(&(rdata.len() as u16).to_be_bytes());
                answers.extend_from_slice(&rdata);
                count += 1;
            };
            if let (Some(entry), 5) = (entry, record_type) {
                if let Some(target) = entry.get("cname").and_then(Value::as_str) {
                    record(5, encode_name(target));
                }
            }
            if let (Some(entry), 15) = (entry, record_type) {
                for mx in entry.get("mx").and_then(Value::as_array).cloned().unwrap_or_default() {
                    let mut rdata: Vec<u8> = (mx["preference"].as_u64().unwrap_or(0) as u16).to_be_bytes().to_vec();
                    rdata.extend(encode_name(mx["exchange"].as_str().unwrap_or_default()));
                    record(15, rdata);
                }
            }
            let flags: u16 = 0x8400 | (u16::from_be_bytes([query[2], query[3]]) & 0x0100) | 0x0080 | if entry.is_some() { 0 } else { 3 };
            let mut response: Vec<u8> = query[..2].to_vec();
            response.extend_from_slice(&flags.to_be_bytes());
            response.extend_from_slice(&1u16.to_be_bytes());
            response.extend_from_slice(&count.to_be_bytes());
            response.extend_from_slice(&[0, 0, 0, 0]);
            response.extend_from_slice(&query[12..question_end]);
            response.extend(answers);
            let _ = socket.send_to(&response, peer).await;
        }
    });
    address.to_string()
}

async fn redis() -> redis::aio::MultiplexedConnection {
    redis::Client::open("redis://:root@localhost:6379").expect("a client").get_multiplexed_async_connection().await.expect("connects")
}

/// The database dropped and Redis emptied.
async fn reset(database: &str) {
    let mongo: mongodb::Client = mongodb::Client::with_uri_str(mongo_url()).await.expect("connects");
    mongo.database(database).drop().await.expect("drops");
    let _: () = redis::cmd("FLUSHALL").query_async(&mut redis().await).await.expect("flushes");
}

/// The Redis hashes the TS run started from.
async fn restore_hashes(hashes: &Value) {
    let mut connection = redis().await;
    for hash in hashes.as_array().expect("hashes") {
        let key: &str = hash["key"].as_str().expect("a key");
        let fields: Vec<(String, String)> =
            hash["fields"].as_object().expect("fields").iter().map(|(name, value)| (name.clone(), value.as_str().expect("a string").to_string())).collect();
        let _: () = redis::cmd("DEL").arg(key).query_async(&mut connection).await.expect("deletes");
        let mut command = redis::cmd("HSET");
        command.arg(key);
        for (name, value) in fields {
            command.arg(name).arg(value);
        }
        let _: () = command.query_async(&mut connection).await.expect("writes");
    }
}

/// The collections the TS run started from, from their canonical extended JSON.
async fn restore_database(database: &str, seed: &Value) {
    let mongo: mongodb::Client = mongodb::Client::with_uri_str(mongo_url()).await.expect("connects");
    for (collection, documents) in seed.as_object().expect("collections") {
        let documents: Vec<Document> = documents
            .as_array()
            .expect("documents")
            .iter()
            .map(|document| match Bson::try_from(document.clone()).expect("extended JSON") {
                Bson::Document(document) => document,
                other => panic!("not a document: {other}"),
            })
            .collect();
        mongo.database(database).collection::<Document>(collection).insert_many(documents).await.expect("inserts");
    }
}

/// A collection's documents in insertion order, as canonical extended JSON.
async fn dump(database: &str, collection: &str) -> Vec<Value> {
    let mongo: mongodb::Client = mongodb::Client::with_uri_str(mongo_url()).await.expect("connects");
    let mut cursor = mongo.database(database).collection::<Document>(collection).find(Document::new()).sort(bson::doc! { "_id": 1 }).await.expect("finds");
    let mut out: Vec<Value> = Vec::new();
    while cursor.advance().await.expect("reads") {
        let document: Document = cursor.deserialize_current().expect("a document");
        out.push(Bson::Document(document).into_canonical_extjson());
    }
    out
}

/// A ready environment over the live stores, and the app built from it as `start` builds it.
async fn live_app(variables: &HashMap<String, String>) -> (Router, Arc<ProviderEnvironment>) {
    live_app_at(variables, Arc::new(SystemSource)).await
}

/// The time a recorded request was sent; ids and `Math.random()` as the system makes them.
struct PinnedClock(AtomicI64);

impl Source for PinnedClock {
    fn now(&self) -> bson::DateTime {
        bson::DateTime::from_millis(self.0.load(Ordering::SeqCst))
    }

    fn random(&self) -> f64 {
        SystemSource.random()
    }

    fn object_id(&self) -> bson::oid::ObjectId {
        SystemSource.object_id()
    }
}

/// `live_app`, its database telling the time by `source`.
async fn live_app_at(variables: &HashMap<String, String>, source: Arc<dyn Source>) -> (Router, Arc<ProviderEnvironment>) {
    live_app_with(variables, source, None, None, None).await
}

/// `live_app_at`, with the SIMD decoder the private build would supply and the render seeds a
/// run drew.
async fn live_app_with(
    variables: &HashMap<String, String>,
    source: Arc<dyn Source>,
    decoder: Option<Arc<dyn PayloadDecoder>>,
    seeds: Option<Arc<dyn SeedSource>>,
    dataset_id: Option<String>,
) -> (Router, Arc<ProviderEnvironment>) {
    let config: ProsopoConfig = get_config(&Environment::from_map(variables.clone()), None, None, None, None).expect("a config");
    let pair: KeyringPair = get_pair(Some(Secret::Text(MNEMONIC)), None, None, None).expect("the provider pair");
    let admin: KeyringPair = get_pair(None, Some(U8aLike::Str(ADMIN)), None, None).expect("the admin pair");
    let mut env: ProviderEnvironment = ProviderEnvironment(BaseEnvironment::new(config, Some(pair), Some(admin)).expect("an environment"));
    let builder_source: Arc<dyn Source> = source.clone();
    env.0.database_builder = Box::new(move |settings: &DatabaseSettings, logger: &Logger| {
        let mongo: MongoDatabase = MongoDatabase::new(&settings.url, Some(&settings.dbname), Some(&settings.auth_source), Some(logger.clone()), MongoConnectionTimeouts::default())
            .expect("a database");
        Ok(ProviderDatabase::with_mongo(Arc::new(mongo), Some(settings.redis.clone()), builder_source.clone(), logger.clone()))
    });
    env.0.source = source;
    env.is_ready().await.expect("ready");
    let env: Arc<ProviderEnvironment> = Arc::new(env);
    let reader: HashMap<String, String> = variables.clone();
    let probe: HealthzProbe = Arc::new(|_: String, _: Duration| Box::pin(async { false }));
    let parts: AppParts = AppParts {
        env: Arc::new(move |name: &str| reader.get(name).cloned()),
        probe,
        version: "dev".to_string(),
        decoder,
        seeds: seeds.unwrap_or_else(|| Arc::new(prosopo_provider::api::challenge::FreshSeeds)),
        dataset_id,
        ..app_parts(env.clone())
    };
    (provider_router(parts).0, env)
}

/// The request id taken out of an answer's headers and body; the ETag of a body that quoted it
/// kept only to its length.
fn without_request_id(answer: &Answer) -> (Vec<(String, String)>, Vec<u8>) {
    let id: Option<String> = answer.headers.iter().find(|(name, _)| name == "x-request-id").map(|(_, value)| value.clone());
    let body: String = String::from_utf8_lossy(&answer.body).into_owned();
    let quoted: bool = id.as_ref().is_some_and(|id| body.contains(id.as_str()));
    let body: String = id.as_ref().map_or(body.clone(), |id| body.replace(id.as_str(), "<request-id>"));
    let headers: Vec<(String, String)> = answer
        .headers
        .iter()
        .map(|(name, value)| match name.as_str() {
            "x-request-id" if value.starts_with("e-") => (name.clone(), "e-<uuid>".to_string()),
            "x-ratelimit-reset" => (name.clone(), "<epoch seconds>".to_string()),
            "etag" if quoted => (name.clone(), value.split('-').next().unwrap_or_default().to_string()),
            _ => (name.clone(), value.clone()),
        })
        .collect();
    (headers, body.into_bytes())
}

/// The request with `{{ADMIN_JWT}}` replaced by a token freshly issued by the provider's pair,
/// as the generators send it.
fn with_admin_jwt(request: &[u8]) -> Vec<u8> {
    let text: String = String::from_utf8_lossy(request).into_owned();
    if !text.contains("{{ADMIN_JWT}}") {
        return request.to_vec();
    }
    let pair: KeyringPair = get_pair(Some(Secret::Text(MNEMONIC)), None, None, None).expect("the provider pair");
    let token: String = pair.jwt_issue(&JwtIssueOptions { expires_in: Some(300.0), not_before: None }, &[]).expect("a token");
    text.replace("{{ADMIN_JWT}}", &token).into_bytes()
}

/// Replays the vectors' exchanges in order; the differences, as messages.
async fn replay(port: u16, exchanges: &Value) -> (usize, Vec<String>) {
    replay_with(port, exchanges, |_| {}).await
}

/// `replay`, with `before` told of each exchange before it is sent.
async fn replay_with(port: u16, exchanges: &Value, before: impl Fn(&Value)) -> (usize, Vec<String>) {
    let decode = |text: &Value| base64::engine::general_purpose::STANDARD.decode(text.as_str().expect("base64")).expect("base64 decodes");
    let mut failures: Vec<String> = Vec::new();
    let mut compared: usize = 0;
    for step in exchanges.as_array().expect("exchanges") {
        before(step);
        let request: Vec<u8> = decode(&step["request"]);
        let actual: Answer = answer(&exchange(port, &with_admin_jwt(&request)).await);
        if step["compare"] == Value::Bool(false) {
            continue;
        }
        compared += 1;
        let expected: Answer = answer(&decode(&step["response"]));
        let no_content: bool = expected.status_line.starts_with("HTTP/1.1 204 ");
        let length_agrees: bool = expected.content_length.is_none() || no_content || expected.content_length == actual.content_length;
        let (expected_headers, expected_body) = without_request_id(&expected);
        let (actual_headers, actual_body) = without_request_id(&actual);
        if expected.status_line != actual.status_line || expected_headers != actual_headers || expected_body != actual_body || !length_agrees {
            failures.push(format!(
                "{}\n      rust {:?} {:?} {}\n      ts   {:?} {:?} {}",
                shown(&request).lines().next().unwrap_or_default(),
                actual.status_line,
                actual_headers,
                shown(&actual_body),
                expected.status_line,
                expected_headers,
                shown(&expected_body),
            ));
        }
    }
    (compared, failures)
}

/// A stored record with the values a run makes fresh replaced; a dotted name reaches into a
/// subdocument.
fn normalised(record: &Value, fresh: &[&str]) -> String {
    let mut record: Value = record.clone();
    for field in fresh {
        let mut parts: Vec<&str> = field.split('.').collect();
        let last: &str = parts.pop().unwrap_or_default();
        let parent: Option<&mut Value> = parts.into_iter().try_fold(&mut record, |value, part| value.get_mut(part));
        if let Some(Value::Object(parent)) = parent {
            if parent.contains_key(last) {
                parent.insert(last.to_string(), json!("<fresh>"));
            }
        }
    }
    record.to_string()
}

/// Records compared as a multiset, since stores written in the background may land in any order.
fn compare_records(expected: &Value, actual: &[Value], fresh: &[&str]) -> Vec<String> {
    let mut expected: Vec<String> = expected.as_array().expect("records").iter().map(|record| normalised(record, fresh)).collect();
    let mut actual: Vec<String> = actual.iter().map(|record| normalised(record, fresh)).collect();
    expected.sort();
    actual.sort();
    if expected == actual {
        return Vec::new();
    }
    let missing: Vec<String> = expected.iter().filter(|record| !actual.contains(record)).cloned().collect();
    let extra: Vec<String> = actual.iter().filter(|record| !expected.contains(record)).cloned().collect();
    vec![format!("records differ ({} expected, {} stored)\n  only in ts:\n    {}\n  only in rust:\n    {}", expected.len(), actual.len(), missing.join("\n    "), extra.join("\n    "))]
}

async fn serve(router: Router) -> u16 {
    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind("[::]:0").await.expect("binds");
    let port: u16 = listener.local_addr().expect("an address").port();
    tokio::spawn(async move { axum::serve(listener, router.into_make_service_with_connect_info::<SocketAddr>()).await.expect("serves") });
    port
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn access_policy_blocks_as_the_express_app_does() {
    let _live = LIVE.lock().await;
    let vectors: Value = serde_json::from_str(include_str!("../../provider/rust/equivalence/block-vectors.json")).expect("block-vectors.json parses");
    let database: &str = vectors["database"].as_str().expect("a database");
    reset(database).await;
    let ipapi: String = fake_ipapi(vectors["ipapi"].clone()).await;
    let mut variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    variables.insert("PROSOPO_IPAPI_URL".to_string(), ipapi);
    variables.insert("NODE_ENV".to_string(), "production".to_string());
    let (router, _env) = live_app(&variables).await;
    restore_hashes(&vectors["redis"]).await;
    let port: u16 = serve(router).await;
    let (compared, mut failures) = replay(port, &vectors["exchanges"]).await;
    tokio::time::sleep(Duration::from_millis(1000)).await;
    let sessions: Vec<Value> = dump(database, "sessions").await;
    failures.extend(compare_records(&vectors["sessions"], &sessions, &["_id", "sessionId", "createdAt", "storedAtTimestamp", "lastUpdatedTimestamp"]));
    assert!(compared > 25, "only {compared} compared");
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn client_origins_are_checked_as_the_express_app_checks_them() {
    let _live = LIVE.lock().await;
    let vectors: Value = serde_json::from_str(include_str!("../../provider/rust/equivalence/domain-vectors.json")).expect("domain-vectors.json parses");
    let database: &str = vectors["database"].as_str().expect("a database");
    reset(database).await;
    let ipapi: String = fake_ipapi(vectors["ipapi"].clone()).await;
    let mut variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    variables.insert("PROSOPO_IPAPI_URL".to_string(), ipapi);
    variables.insert("NODE_ENV".to_string(), "production".to_string());
    let (router, _env) = live_app(&variables).await;
    restore_database(database, &vectors["seed"]).await;
    let port: u16 = serve(router).await;
    let (compared, failures) = replay(port, &vectors["exchanges"]).await;
    assert!(compared > 30, "only {compared} compared");
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn spam_emails_are_checked_as_the_express_app_checks_them() {
    let _live = LIVE.lock().await;
    let vectors: Value = serde_json::from_str(include_str!("../../provider/rust/equivalence/spam-vectors.json")).expect("spam-vectors.json parses");
    let database: &str = vectors["database"].as_str().expect("a database");
    reset(database).await;
    let ipapi: String = fake_ipapi(vectors["ipapi"].clone()).await;
    let dns: String = fake_dns(vectors["dns"].clone()).await;
    let mut variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    variables.insert("PROSOPO_IPAPI_URL".to_string(), ipapi);
    variables.insert("PROSOPO_DNS_SERVERS".to_string(), json!([dns]).to_string());
    variables.insert("NODE_ENV".to_string(), "production".to_string());
    let (router, _env) = live_app(&variables).await;
    restore_database(database, &vectors["seed"]).await;
    let port: u16 = serve(router).await;
    let (compared, failures) = replay(port, &vectors["exchanges"]).await;
    assert!(compared > 25, "only {compared} compared");
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}

/// The fields image verification's side update (`providedIp`, `metadata`) and its result
/// update (`blocked`) add to a commitment. The TS sends the two at once, so which lands first,
/// and with it the order these fields are added in, varies from one request to the next.
const COMMITMENT_RACE: [&str; 3] = ["blocked", "metadata", "providedIp"];

/// The record with `fields` moved to the end, in that order.
fn with_fields_last(record: &Value, fields: &[&str]) -> Value {
    let mut ordered: Map<String, Value> = record.as_object().expect("a record").clone();
    for field in fields {
        if let Some(value) = ordered.shift_remove(*field) {
            ordered.insert(field.to_string(), value);
        }
    }
    Value::Object(ordered)
}

/// The cached sessions, by key, as JSON.
async fn cached_sessions() -> Vec<Value> {
    let mut connection = redis().await;
    let mut keys: Vec<String> = redis::cmd("KEYS").arg("cache:session:*").query_async(&mut connection).await.expect("lists");
    keys.sort();
    let mut out: Vec<Value> = Vec::new();
    for key in keys {
        let value: String = redis::cmd("GET").arg(&key).query_async(&mut connection).await.expect("reads");
        out.push(json!({ "key": key, "value": serde_json::from_str::<Value>(&value).expect("JSON") }));
    }
    out
}

/// Every Redis hash, by key, as `dumpRedisHashes` writes them.
async fn redis_hashes() -> Value {
    let mut connection = redis().await;
    let mut keys: Vec<String> = redis::cmd("KEYS").arg("*").query_async(&mut connection).await.expect("lists");
    keys.sort();
    let mut out: Vec<Value> = Vec::new();
    for key in keys {
        let kind: String = redis::cmd("TYPE").arg(&key).query_async(&mut connection).await.expect("a type");
        if kind != "hash" {
            continue;
        }
        let fields: Vec<(String, String)> = redis::cmd("HGETALL").arg(&key).query_async(&mut connection).await.expect("fields");
        let fields: Map<String, Value> = fields.into_iter().map(|(name, value)| (name, Value::String(value))).collect();
        out.push(json!({ "key": key, "fields": fields }));
    }
    Value::Array(out)
}

/// The usage counters, by key.
async fn usage_counters() -> Vec<Value> {
    let mut connection = redis().await;
    let mut keys: Vec<String> = redis::cmd("KEYS").arg("cnt:*").query_async(&mut connection).await.expect("lists");
    keys.sort();
    let mut out: Vec<Value> = Vec::new();
    for key in keys {
        let value: String = redis::cmd("GET").arg(&key).query_async(&mut connection).await.expect("reads");
        out.push(json!({ "key": key, "value": value }));
    }
    out
}

async fn restore_cached_sessions(cache: &Value) {
    let mut connection = redis().await;
    for entry in cache.as_array().expect("cached sessions") {
        let _: () = redis::cmd("SET")
            .arg(entry["key"].as_str().expect("a key"))
            .arg(entry["value"].to_string())
            .arg("EX")
            .arg(86400)
            .query_async(&mut connection)
            .await
            .expect("caches");
    }
}

/// A cached session with the time it was last patched left out.
fn cached_without_time(entries: &[Value]) -> Vec<Value> {
    entries
        .iter()
        .map(|entry| {
            let mut entry: Value = entry.clone();
            if let Some(value) = entry["value"].as_object_mut() {
                if value.contains_key("lastUpdatedTimestamp") {
                    value.insert("lastUpdatedTimestamp".to_string(), json!("<fresh>"));
                }
            }
            entry
        })
        .collect()
}

type Forwarded = Arc<Mutex<Vec<Value>>>;

/// The issuing provider a forwarded verify reaches: what it was sent, kept, and a fixed answer.
async fn other_provider(port: u16, received: Forwarded) {
    async fn verify(State(received): State<Forwarded>, request: axum::extract::Request) -> axum::response::Response {
        let (parts, body) = request.into_parts();
        let bytes = axum::body::to_bytes(body, usize::MAX).await.expect("a body");
        let pick = |name: &str| parts.headers.get(name).and_then(|value| value.to_str().ok()).map(str::to_string);
        received.lock().expect("lock").push(json!({
            "method": parts.method.as_str(),
            "path": parts.uri.to_string(),
            "siteKey": pick("prosopo-site-key"),
            "user": pick("prosopo-user"),
            "marker": pick("prosopo-verify-forwarded"),
            "body": serde_json::from_slice::<Value>(&bytes).expect("JSON"),
        }));
        let answer: Value = json!({ "status": "ok", "verified": true, "score": 0.25, "forwardedBy": "issuer" });
        axum::response::Response::builder().header("Content-Type", "application/json").body(axum::body::Body::from(answer.to_string())).expect("a response")
    }
    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind(("::", port)).await.expect("binds the issuer's port");
    let router: Router = Router::new().route("/{*path}", post(verify)).with_state(received);
    tokio::spawn(async move { axum::serve(listener, router).await.expect("serves") });
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn verifies_as_the_express_app_verifies() {
    let _live = LIVE.lock().await;
    let vectors: Value = serde_json::from_str(include_str!("../../provider/rust/equivalence/verify-vectors.json")).expect("verify-vectors.json parses");
    let database: &str = vectors["database"].as_str().expect("a database");
    reset(database).await;
    let ipapi: String = fake_ipapi(vectors["ipapi"].clone()).await;
    let dns: String = fake_dns(vectors["dns"].clone()).await;
    let received: Forwarded = Arc::new(Mutex::new(Vec::new()));
    other_provider(28123, received.clone()).await;
    let pair: KeyringPair = get_pair(Some(Secret::Text(MNEMONIC)), None, None, None).expect("the provider pair");
    let list: String = vectors["providerList"].as_str().expect("a provider list").replace("{{SELF}}", &pair.address().expect("an address"));
    std::env::set_var("PROSOPO_PROVIDER_LIST", list);
    let mut variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    variables.insert("PROSOPO_IPAPI_URL".to_string(), ipapi);
    variables.insert("PROSOPO_DNS_SERVERS".to_string(), json!([dns]).to_string());
    variables.insert("NODE_ENV".to_string(), "production".to_string());
    let clock: Arc<PinnedClock> = Arc::new(PinnedClock(AtomicI64::new(0)));
    let first: i64 = vectors["exchanges"][0]["at"].as_i64().expect("a time");
    clock.0.store(first, Ordering::SeqCst);
    let (router, _env) = live_app_at(&variables, clock.clone()).await;
    restore_database(database, &vectors["seed"]).await;
    restore_hashes(&vectors["redis"]).await;
    restore_cached_sessions(&vectors["cache"]).await;
    let port: u16 = serve(router).await;
    let (compared, mut failures) = replay_with(port, &vectors["exchanges"], |step| clock.0.store(step["at"].as_i64().expect("a time"), Ordering::SeqCst)).await;
    let scraped: Vec<u8> = exchange(port, b"GET /metrics HTTP/1.1\r\nHost: h.example\r\nConnection: close\r\n\r\n").await;
    let mut metrics: Vec<String> = String::from_utf8_lossy(&scraped).lines().filter(|line| line.starts_with("prosopo_captcha_verify")).map(str::to_string).collect();
    metrics.sort();
    if json!(metrics) != vectors["metrics"] {
        failures.push(format!("verify metrics differ\n  ts:   {}\n  rust: {}", vectors["metrics"], json!(metrics)));
    }
    tokio::time::sleep(Duration::from_millis(1500)).await;
    let fresh: [&str; 3] = ["lastUpdatedTimestamp", "verifiedAtTimestamp", "failedAtTimestamp"];
    failures.extend(compare_records(&vectors["after"]["powcaptchas"], &dump(database, "powcaptchas").await, &fresh));
    for collection in ["sessions", "puzzlecaptchas", "audiocaptchas", "iconordercaptchas"] {
        failures.extend(compare_records(&vectors["after"][collection], &dump(database, collection).await, &fresh));
    }
    let racing = |records: Vec<Value>| records.iter().map(|record| with_fields_last(record, &COMMITMENT_RACE)).collect::<Vec<Value>>();
    let expected_commitments: Value = Value::Array(racing(vectors["after"]["usercommitments"].as_array().expect("commitments").clone()));
    failures.extend(compare_records(&expected_commitments, &racing(dump(database, "usercommitments").await), &fresh));
    let counters: Vec<Value> = usage_counters().await;
    if json!(counters) != vectors["counters"] {
        failures.push(format!("usage counters differ\n  ts:   {}\n  rust: {}", vectors["counters"], json!(counters)));
    }
    let cached: Vec<Value> = cached_sessions().await;
    let expected_cache: Vec<Value> = vectors["cacheAfter"].as_array().expect("cached sessions").clone();
    if cached_without_time(&cached) != cached_without_time(&expected_cache) {
        failures.push(format!("cached sessions differ\n  ts:   {}\n  rust: {}", json!(expected_cache), json!(cached)));
    }
    let forwarded: Vec<Value> = received.lock().expect("lock").clone();
    if json!(forwarded) != vectors["forwarded"] {
        failures.push(format!("forwarded requests differ\n  ts:   {}\n  rust: {}", vectors["forwarded"], json!(forwarded)));
    }
    assert!(compared > 120, "only {compared} compared");
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn access_rule_routes_answer_as_the_express_app_does() {
    let _live = LIVE.lock().await;
    let vectors: Value = serde_json::from_str(include_str!("../../provider/rust/equivalence/rules-vectors.json")).expect("rules-vectors.json parses");
    let database: &str = vectors["database"].as_str().expect("a database");
    reset(database).await;
    let ipapi: String = fake_ipapi(json!({})).await;
    let mut variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    variables.insert("PROSOPO_IPAPI_URL".to_string(), ipapi);
    variables.insert("NODE_ENV".to_string(), "production".to_string());
    let (router, _env) = live_app(&variables).await;
    restore_hashes(&vectors["redis"]).await;
    let port: u16 = serve(router).await;
    let (compared, mut failures) = replay(port, &vectors["exchanges"]).await;
    tokio::time::sleep(Duration::from_millis(500)).await;
    let after: Value = redis_hashes().await;
    if after != vectors["after"] {
        failures.push(format!("rule hashes differ\n  ts:   {}\n  rust: {}", vectors["after"], after));
    }
    assert!(compared > 25, "only {compared} compared");
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}

/// A body with the ids and times a run makes fresh masked.
fn masked(body: &[u8]) -> String {
    let ids = regex::Regex::new(r"\b[0-9a-f]{24}\b").expect("a pattern");
    let times = regex::Regex::new(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z").expect("a pattern");
    let text: String = String::from_utf8_lossy(body).into_owned();
    times.replace_all(&ids.replace_all(&text, "<id>"), "<time>").into_owned()
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn admin_routes_answer_as_the_express_app_does() {
    let _live = LIVE.lock().await;
    let vectors: Value = serde_json::from_str(include_str!("../../provider/rust/equivalence/admin-vectors.json")).expect("admin-vectors.json parses");
    let database: &str = vectors["database"].as_str().expect("a database");
    reset(database).await;
    let ipapi: String = fake_ipapi(vectors["ipapi"].clone()).await;
    let mut variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    variables.insert("PROSOPO_IPAPI_URL".to_string(), ipapi);
    variables.insert("NODE_ENV".to_string(), "production".to_string());
    let clock: Arc<PinnedClock> = Arc::new(PinnedClock(AtomicI64::new(vectors["exchanges"][0]["at"].as_i64().expect("a time"))));
    let (router, _env) = live_app_at(&variables, clock.clone()).await;
    restore_database(database, &vectors["seed"]).await;
    restore_hashes(&vectors["redis"]).await;
    let mut connection = redis().await;
    for entry in vectors["strings"].as_array().expect("strings") {
        let _: () = redis::cmd("SET").arg(entry["key"].as_str().expect("a key")).arg(entry["value"].as_str().expect("a value")).query_async(&mut connection).await.expect("writes");
    }
    let port: u16 = serve(router).await;
    let decode = |text: &Value| base64::engine::general_purpose::STANDARD.decode(text.as_str().expect("base64")).expect("base64 decodes");
    let mut failures: Vec<String> = Vec::new();
    for step in vectors["exchanges"].as_array().expect("exchanges") {
        clock.0.store(step["at"].as_i64().expect("a time"), Ordering::SeqCst);
        let request: Vec<u8> = decode(&step["request"]);
        let actual: Answer = answer(&exchange(port, &with_admin_jwt(&request)).await);
        let expected: Answer = answer(&decode(&step["response"]));
        let fresh: bool = masked(&expected.body) != String::from_utf8_lossy(&expected.body);
        let headers = |answer: &Answer| -> Vec<(String, String)> {
            without_request_id(answer)
                .0
                .into_iter()
                .map(|(name, value)| if name == "etag" && fresh { (name, value.split('-').next().unwrap_or_default().to_string()) } else { (name, value) })
                .collect()
        };
        if expected.status_line != actual.status_line || headers(&expected) != headers(&actual) || masked(&expected.body) != masked(&actual.body) {
            failures.push(format!(
                "{}\n      rust {:?} {}\n      ts   {:?} {}",
                shown(&request).lines().next().unwrap_or_default(),
                actual.status_line,
                masked(&actual.body),
                expected.status_line,
                masked(&expected.body)
            ));
        }
    }
    let scraped: Vec<u8> = exchange(port, b"GET /metrics HTTP/1.1\r\nHost: h.example\r\nConnection: close\r\n\r\n").await;
    let gauge: Vec<String> = String::from_utf8_lossy(&scraped).lines().filter(|line| line.starts_with("prosopo_maintenance_mode")).map(str::to_string).collect();
    if json!(gauge) != vectors["metrics"] {
        failures.push(format!("maintenance gauge differs: ts {} rust {}", vectors["metrics"], json!(gauge)));
    }
    tokio::time::sleep(Duration::from_millis(1000)).await;
    failures.extend(compare_records(&vectors["after"]["clients"], &dump(database, "clients").await, &["_id", "settings._id"]));
    failures.extend(compare_records(&vectors["after"]["decisionmachines"], &dump(database, "decisionmachines").await, &["_id", "createdAt", "updatedAt"]));
    failures.extend(compare_records(&vectors["after"]["sessions"], &dump(database, "sessions").await, &["lastUpdatedTimestamp", "dnsEvent.receivedAt"]));
    let mut strings: Vec<Value> = Vec::new();
    for pattern in ["cache:session:*", "cnt:*"] {
        let mut keys: Vec<String> = redis::cmd("KEYS").arg(pattern).query_async(&mut connection).await.expect("lists");
        keys.sort();
        for key in keys {
            let value: String = redis::cmd("GET").arg(&key).query_async(&mut connection).await.expect("reads");
            strings.push(json!({ "key": key, "value": value }));
        }
    }
    if json!(strings) != vectors["afterStrings"] {
        failures.push(format!("Redis strings differ\n  ts:   {}\n  rust: {}", vectors["afterStrings"], json!(strings)));
    }
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}

/// A server answering each listed path with its text and an ETag, as the generator's does.
async fn list_server(port: u16, lists: Value) {
    let lists: Arc<Map<String, Value>> = Arc::new(lists.as_object().expect("lists").clone());
    let router: Router = Router::new().fallback(move |request: axum::extract::Request| {
        let lists: Arc<Map<String, Value>> = lists.clone();
        async move {
            let path: String = request.uri().path().to_string();
            match lists.get(&path).and_then(Value::as_str) {
                Some(text) => axum::response::Response::builder()
                    .header("Content-Type", "text/plain")
                    .header("ETag", format!("\"{path}\""))
                    .body(axum::body::Body::from(text.to_string()))
                    .expect("a response"),
                None => axum::response::Response::builder().status(404).body(axum::body::Body::empty()).expect("a response"),
            }
        }
    });
    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind(("127.0.0.1", port)).await.expect("binds the list port");
    tokio::spawn(async move { axum::serve(listener, router).await.expect("serves") });
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn scheduled_jobs_run_as_the_node_ones_do() {
    use prosopo_provider::tasks::schedulers::{check_if_task_is_running, get_client_list, store_commitments_external, update_spam_email_domains};
    use prosopo_types::client::ScheduledTaskNames;
    let _live = LIVE.lock().await;
    let vectors: Value = serde_json::from_str(include_str!("../../provider/rust/equivalence/schedulers-vectors.json")).expect("schedulers-vectors.json parses");
    let database: &str = vectors["database"].as_str().expect("a database");
    let central: &str = vectors["central"].as_str().expect("a central database");
    let clients: &str = vectors["clients"].as_str().expect("a client database");
    reset(database).await;
    let mongo: mongodb::Client = mongodb::Client::with_uri_str(mongo_url()).await.expect("connects");
    mongo.database(central).drop().await.expect("drops");
    mongo.database(clients).drop().await.expect("drops");
    let ipapi: String = fake_ipapi(json!({})).await;
    list_server(u16::try_from(vectors["listPort"].as_u64().expect("a port")).expect("a port"), vectors["lists"].clone()).await;
    let mut variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    variables.insert("PROSOPO_IPAPI_URL".to_string(), ipapi);
    let clock: Arc<PinnedClock> = Arc::new(PinnedClock(AtomicI64::new(vectors["runningChecks"][0]["at"].as_i64().expect("a time"))));
    let (_router, env) = live_app_at(&variables, clock.clone()).await;
    restore_database(database, &vectors["seed"]).await;
    restore_database(clients, &vectors["clientsSeed"]).await;
    let db = env.0.db.clone().expect("a database");
    let logger: Logger = env.0.logger.clone();
    let mut failures: Vec<String> = Vec::new();
    for check in vectors["runningChecks"].as_array().expect("checks") {
        clock.0.store(check["at"].as_i64().expect("a time"), Ordering::SeqCst);
        let name: ScheduledTaskNames = check["name"].as_str().expect("a name").parse().expect("a task name");
        let running: bool = check_if_task_is_running(name, &db).await.expect("checks");
        if Value::Bool(running) != check["running"] {
            failures.push(format!("{} running: rust {running}, ts {}", name.as_str(), check["running"]));
        }
    }
    let at = |job: &str| clock.0.store(vectors["ran"][job].as_i64().expect("a time"), Ordering::SeqCst);
    let config = &env.0.config;
    at("storeCommitmentsExternal");
    store_commitments_external(&db, config.mongo_captcha_uri.as_deref(), &logger).await.expect("stores");
    at("storeCommitmentsExternalAgain");
    store_commitments_external(&db, config.mongo_captcha_uri.as_deref(), &logger).await.expect("stores");
    at("getClientList");
    get_client_list(&db, config.mongo_client_uri.as_deref(), &logger).await.expect("pulls");
    let cache_dir: String = std::env::temp_dir().join(format!("spam-cache-{}", uuid::Uuid::new_v4())).to_string_lossy().into_owned();
    let port: u64 = vectors["listPort"].as_u64().expect("a port");
    at("updateSpamEmailDomains");
    let lists: Vec<String> = vec![format!("http://127.0.0.1:{port}/one.txt"), format!("http://127.0.0.1:{port}/two.txt")];
    update_spam_email_domains(&db, &logger, &lists, &cache_dir).await.expect("updates");
    at("updateSpamEmailDomainsMissing");
    let failure: Value = match update_spam_email_domains(&db, &logger, &[format!("http://127.0.0.1:{port}/missing.txt")], &cache_dir).await {
        Ok(()) => Value::Null,
        Err(error) => json!(error.message()),
    };
    if failure != vectors["failure"] {
        failures.push(format!("the missing list: rust {failure}, ts {}", vectors["failure"]));
    }
    tokio::time::sleep(Duration::from_millis(500)).await;
    let fresh_records: [&str; 4] = ["_id", "lastUpdatedTimestamp", "storedAtTimestamp", "verifiedAtTimestamp"];
    for (collection, fresh) in [
        ("schedulers", vec!["_id", "datetime", "updated"]),
        ("clients", vec!["_id", "settings._id"]),
        ("spamemaildomains", vec!["_id", "createdAt", "updatedAt"]),
        ("powcaptchas", fresh_records.to_vec()),
        ("sessions", fresh_records.to_vec()),
    ] {
        failures.extend(compare_records(&vectors["after"][collection], &dump(database, collection).await, &fresh).into_iter().map(|failure| format!("{collection}: {failure}")));
    }
    for collection in ["powcaptchas", "sessions"] {
        let expected: &Value = &vectors["centralAfter"][collection];
        failures.extend(compare_records(expected, &dump(central, collection).await, &fresh_records).into_iter().map(|failure| format!("central {collection}: {failure}")));
    }
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}

/// Every collection of `database` that holds documents, as `dumpDatabase` writes them.
async fn dump_database(database: &str) -> Map<String, Value> {
    let mongo: mongodb::Client = mongodb::Client::with_uri_str(mongo_url()).await.expect("connects");
    let mut names: Vec<String> = mongo.database(database).list_collection_names().await.expect("lists");
    names.sort();
    let mut out: Map<String, Value> = Map::new();
    for name in names {
        let documents: Vec<Value> = dump(database, &name).await;
        if !documents.is_empty() {
            out.insert(name, Value::Array(documents));
        }
    }
    out
}

/// Each collection's indexes sorted by name, as relaxed extended JSON (the generator's `JSON.stringify`).
async fn indexes(database: &str) -> Value {
    let mongo: mongodb::Client = mongodb::Client::with_uri_str(mongo_url()).await.expect("connects");
    let mut names: Vec<String> = mongo.database(database).list_collection_names().await.expect("lists");
    names.sort();
    let mut out: Map<String, Value> = Map::new();
    for name in names {
        let mut cursor = mongo.database(database).collection::<Document>(&name).list_indexes().await.expect("lists indexes");
        let mut list: Vec<Value> = Vec::new();
        while cursor.advance().await.expect("reads") {
            let index: mongodb::IndexModel = cursor.deserialize_current().expect("an index");
            list.push(Bson::Document(bson::serialize_to_document(&index).expect("serialises")).into_relaxed_extjson());
        }
        out.insert(name, Value::Array(list));
    }
    indexes_by_name(&Value::Object(out))
}

/// Each collection's indexes in byte order of their names: the generator sorts them with
/// `localeCompare`, which orders `ipInfo_1` before `ipInfo.countryCode_1`.
fn indexes_by_name(indexes: &Value) -> Value {
    let mut indexes: Value = indexes.clone();
    for list in indexes.as_object_mut().expect("collections").values_mut() {
        list.as_array_mut().expect("indexes").sort_by_key(|index| index["name"].as_str().unwrap_or_default().to_string());
    }
    indexes
}

/// Canonical extended JSON with each `$numberDouble` read back as its value: JS writes 1e-7 as
/// `"1e-7"` and the bson crate as `"0.0000001"`, the same double.
fn doubles_as_values(value: &Value) -> Value {
    match value {
        Value::Object(fields) => match fields.get("$numberDouble").and_then(Value::as_str) {
            Some(text) if fields.len() == 1 => match text.parse::<f64>() {
                Ok(double) if double.is_finite() => json!({ "$numberDouble": format!("{:e}", double) }),
                _ => value.clone(),
            },
            _ => Value::Object(fields.iter().map(|(name, value)| (name.clone(), doubles_as_values(value))).collect()),
        },
        Value::Array(items) => Value::Array(items.iter().map(doubles_as_values).collect()),
        other => other.clone(),
    }
}

/// What a stand-in provider was sent, as the generator records it.
type Sent = Arc<Mutex<Vec<Value>>>;

/// A JWT's header and payload, its times masked, and whether the provider's key verifies it.
fn decoded_jwt(authorization: &str) -> Value {
    let token: &str = authorization.strip_prefix("Bearer ").unwrap_or(authorization);
    let part = |index: usize| -> Value {
        let bytes: Vec<u8> = base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(token.split('.').nth(index).unwrap_or_default()).expect("base64url");
        serde_json::from_slice(&bytes).expect("JSON")
    };
    let payload: Map<String, Value> =
        part(1).as_object().expect("claims").iter().map(|(name, value)| (name.clone(), if value.is_number() { json!("<time>") } else { value.clone() })).collect();
    let pair: KeyringPair = get_pair(Some(Secret::Text(MNEMONIC)), None, None, None).expect("the provider pair");
    let verified: bool = pair.jwt_verify(token, &Default::default()).map(|result| result.is_valid).unwrap_or(false);
    json!({ "header": part(0), "payload": payload, "verified": verified })
}

async fn stand_in_provider(sent: Sent) -> String {
    async fn receive(State(sent): State<Sent>, request: axum::extract::Request) -> axum::response::Response {
        let (parts, body) = request.into_parts();
        let header = |name: &str| parts.headers.get(name).and_then(|value| value.to_str().ok()).map(str::to_string);
        let body = axum::body::to_bytes(body, usize::MAX).await.expect("a body");
        let record: Value = json!({
            "method": parts.method.as_str(),
            "url": parts.uri.to_string(),
            "contentType": header("content-type"),
            "siteKey": header("prosopo-site-key"),
            "body": String::from_utf8_lossy(&body),
            "jwt": decoded_jwt(&header("authorization").unwrap_or_default()),
        });
        sent.lock().expect("unpoisoned").push(record);
        let mut response = axum::response::Response::new(axum::body::Body::from(r#"{"status":"ok"}"#));
        response.headers_mut().insert(axum::http::header::CONTENT_TYPE, axum::http::HeaderValue::from_static("application/json"));
        response
    }
    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind("127.0.0.1:0").await.expect("binds");
    let port: u16 = listener.local_addr().expect("an address").port();
    let router: Router = Router::new().fallback(receive).with_state(sent);
    tokio::spawn(async move { axum::serve(listener, router).await.expect("serves") });
    format!("http://127.0.0.1:{port}")
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn commands_run_as_the_node_ones_do() {
    use prosopo_cli::commands::{invocation, run};
    let _live = LIVE.lock().await;
    let vectors: Value = serde_json::from_str(include_str!("equivalence/commands-live-vectors.json")).expect("commands-live-vectors.json parses");
    let database: &str = vectors["database"].as_str().expect("a database");
    let central: &str = vectors["central"].as_str().expect("a central database");
    reset(database).await;
    let mongo: mongodb::Client = mongodb::Client::with_uri_str(mongo_url()).await.expect("connects");
    mongo.database(central).drop().await.expect("drops");
    restore_database(database, &vectors["seed"]).await;
    let sent: Sent = Arc::new(Mutex::new(Vec::new()));
    let provider: String = stand_in_provider(sent.clone()).await;
    let mut variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    variables.insert("PROSOPO_IPAPI_URL".to_string(), fake_ipapi(json!({})).await);
    let config: ProsopoConfig = get_config(&Environment::from_map(variables), None, None, None, None).expect("a config");
    let pair: KeyringPair = get_pair(Some(Secret::Text(MNEMONIC)), None, None, None).expect("the provider pair");
    let admin: KeyringPair = get_pair(None, Some(U8aLike::Str(ADMIN)), None, None).expect("the admin pair");
    let mut failures: Vec<String> = Vec::new();
    for step in vectors["steps"].as_array().expect("steps") {
        let line: Vec<String> =
            step["line"].as_array().expect("a line").iter().map(|token| token.as_str().expect("a token").replace("<provider>", &provider)).collect();
        let shown_line: String = step["line"].as_array().expect("a line").iter().filter_map(Value::as_str).collect::<Vec<&str>>().join(" ");
        let before: usize = sent.lock().expect("unpoisoned").len();
        let env: ProviderEnvironment = ProviderEnvironment(BaseEnvironment::new(config.clone(), Some(pair.clone()), Some(admin.clone())).expect("an environment"));
        let _ = run(invocation(&line), env).await;
        let after: Map<String, Value> = dump_database(database).await;
        let expected: &Map<String, Value> = step["after"].as_object().expect("collections");
        let mut names: Vec<&String> = expected.keys().chain(after.keys()).collect();
        names.sort();
        names.dedup();
        for name in names {
            let actual: Vec<Value> = after.get(name).and_then(Value::as_array).cloned().unwrap_or_default();
            let expected: Value = expected.get(name).cloned().unwrap_or_else(|| json!([]));
            let (expected, actual): (Value, Vec<Value>) = (doubles_as_values(&expected), actual.iter().map(doubles_as_values).collect());
            failures.extend(compare_records(&expected, &actual, &["_id", "settings._id", "randomKey"]).into_iter().map(|failure| format!("{shown_line}\n  {name}: {failure}")));
        }
        let received: Vec<Value> = sent.lock().expect("unpoisoned")[before..].to_vec();
        if Value::Array(received.clone()) != step["sent"] {
            failures.push(format!("{shown_line}\n  sent: rust {}\n  ts   {}", Value::Array(received), step["sent"]));
        }
    }
    for (name, database) in [("provider", database), ("central", central)] {
        let actual: Value = indexes(database).await;
        if actual != indexes_by_name(&vectors["indexes"][name]) {
            failures.push(format!("{name} indexes: rust {actual}\n  ts {}", vectors["indexes"][name]));
        }
    }
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}

/// Each SIMD payload the challenge generator sent, and what decodeSimd.js read out of it.
type DecodedPayloads = Vec<(String, Result<Map<String, Value>, String>)>;

struct RecordedDecoder(DecodedPayloads);

impl RecordedDecoder {
    fn recorded(&self, encrypted: &str) -> DecodeFuture<'_> {
        let found: Result<Map<String, Value>, String> = self
            .0
            .iter()
            .find(|(ciphertext, _)| ciphertext == encrypted)
            .map_or_else(|| Err("not a payload the generator sent".to_string()), |(_, decoded)| decoded.clone());
        Box::pin(async move { found })
    }
}

impl PayloadDecoder for RecordedDecoder {
    fn decrypt_simd_readings<'a>(&'a self, encrypted: &'a str, _private_key: &'a str, _inner_config: &'a str) -> DecodeFuture<'a> {
        self.recorded(encrypted)
    }

    fn decrypt_behavioral_data<'a>(&'a self, encrypted: &'a str, _private_key: &'a str, _inner_config: &'a str) -> DecodeFuture<'a> {
        self.recorded(encrypted)
    }

    fn decrypt_payload<'a>(&'a self, payload: &'a str, _head_hash: &'a str, _bundle: &'a prosopo_provider::tasks::detection::PoolBundleDecrypt) -> DecodeFuture<'a> {
        self.recorded(payload)
    }
}

/// The render seeds the TS drew, handed out in the order it drew them.
struct RecordedSeeds(Mutex<std::collections::VecDeque<Vec<u8>>>);

impl SeedSource for RecordedSeeds {
    fn seed(&self) -> Vec<u8> {
        let hex: Vec<u8> = self.0.lock().expect("lock").pop_front().expect("the TS drew a seed for every render");
        hex
    }
}

/// A WebP data URI decoded: width, height and pixels.
fn data_uri_pixels(uri: &str) -> Option<(u32, u32, Vec<u8>)> {
    let encoded: &str = uri.strip_prefix("data:image/webp;base64,")?;
    let bytes: Vec<u8> = base64::engine::general_purpose::STANDARD.decode(encoded).ok()?;
    let image = webp::Decoder::new(&bytes).decode()?;
    Some((image.width(), image.height(), image.to_vec()))
}

/// Peak signal-to-noise ratio of two equal-sized pixel buffers, in dB.
fn psnr(a: &[u8], b: &[u8]) -> f64 {
    let mse: f64 = a.iter().zip(b).map(|(x, y)| (f64::from(*x) - f64::from(*y)).powi(2)).sum::<f64>() / a.len() as f64;
    if mse == 0.0 {
        f64::INFINITY
    } else {
        10.0 * (255.0 * 255.0 / mse).log10()
    }
}

/// The two answers' images compared as pixels, then masked. They are not byte-equal and not
/// pixel-equal: the icons are rasterised by resvg rather than librsvg (the icon-order-assets
/// deviation, antialiasing only) and the background is lossy WebP from two encoders. A wrong
/// layout falls far below the 30 dB floor, and the stored targets, compared exactly, pin the
/// geometry.
fn compared_images(expected: &mut Map<String, Value>, actual: &mut Map<String, Value>, failures: &mut Vec<String>) {
    if expected.contains_key("piece") {
        return;
    }
    for key in ["legend", "background"] {
        let (Some(expected_uri), Some(actual_uri)) = (expected.get(key).and_then(Value::as_str), actual.get(key).and_then(Value::as_str)) else {
            continue;
        };
        match (data_uri_pixels(expected_uri), data_uri_pixels(actual_uri)) {
            (Some((ew, eh, ep)), Some((aw, ah, ap))) => {
                if (ew, eh) != (aw, ah) || ep.len() != ap.len() {
                    failures.push(format!("{key}: ts {ew}x{eh}, rust {aw}x{ah}"));
                } else if psnr(&ep, &ap) < 30.0 {
                    failures.push(format!("{key}: {:.1} dB apart", psnr(&ep, &ap)));
                }
            }
            _ => failures.push(format!("{key} does not decode")),
        }
        expected.insert(key.to_string(), json!("<image>"));
        actual.insert(key.to_string(), json!("<image>"));
    }
}

/// `${timestamp}___${user}___${dapp}___<nonce>`: the nonce is `Math.random`, so it is masked.
fn masked_challenge(challenge: &str) -> String {
    let parts: Vec<&str> = challenge.split("___").collect();
    if parts.len() != 4 {
        return challenge.to_string();
    }
    format!("{}___{}___{}___<nonce>", parts[0], parts[1], parts[2])
}

/// The answer's challenge checked as signed by `provider`, then its nonce and signature masked.
fn checked_challenge(body: &mut Map<String, Value>, provider: &str, side: &str, failures: &mut Vec<String>) {
    let Some(challenge) = body.get("challenge").and_then(Value::as_str).map(str::to_string) else {
        return;
    };
    let signature: Option<String> = body.get("signature").and_then(|signature| signature.pointer("/provider/challenge")).and_then(Value::as_str).map(str::to_string);
    if let Some(signature) = signature.filter(|signature| !signature.is_empty()) {
        let valid: bool = prosopo_util_crypto::signature::signature_verify(U8aLike::Bytes(challenge.as_bytes()), U8aLike::Str(&signature), U8aLike::Str(provider))
            .is_ok_and(|result| result.is_valid);
        if !valid {
            failures.push(format!("{side}'s signature over {challenge} does not verify against the provider"));
        }
        if let Some(Value::Object(provider)) = body.get_mut("signature").and_then(|signature| signature.get_mut("provider")) {
            provider.insert("challenge".to_string(), json!("<signature>"));
        }
    }
    body.insert("challenge".to_string(), json!(masked_challenge(&challenge)));
}

const CHALLENGE_MEMBERS: [&str; 18] = [
    "captchas",
    "language",
    "requestHash",
    "status",
    "challenge",
    "difficulty",
    "timestamp",
    "signature",
    "background",
    "legend",
    "legendIconSize",
    "clip",
    "characterCount",
    "piece",
    "pieceSize",
    "originX",
    "originY",
    "imageSwitchAvailable",
];

/// An image answer as served, kept to be checked against the commitment it stored.
struct ServedImages {
    side: &'static str,
    user: String,
    request_hash: String,
    captcha_ids: Vec<String>,
}

/// An image answer's random members checked, then masked: which captchas of a kind a request
/// draws, and their order, are random on both sides, so each is checked to be the dataset's
/// captcha of that id and label, distinct from the others, and its ids masked, and the
/// captchas compared as a multiset; the request hash, which a fresh salt makes, is checked as
/// signed by the provider and kept for [`checked_commitments`].
fn masked_images(body: &mut Map<String, Value>, side: &'static str, user: &str, provider: &str, dataset: &[Value], served: &mut Vec<ServedImages>, failures: &mut Vec<String>) {
    let Some(Value::Array(captchas)) = body.get_mut("captchas") else {
        return;
    };
    if captchas.is_empty() {
        return;
    }
    let mut ids: Vec<String> = Vec::new();
    for captcha in captchas.iter_mut() {
        let id: String = captcha["captchaId"].as_str().unwrap_or_default().to_string();
        let stored: Option<&Value> = dataset.iter().find(|stored| stored["captchaId"].as_str() == Some(id.as_str()));
        let matches: bool = stored.is_some_and(|stored| stored["captchaContentId"] == captcha["captchaContentId"] && stored["target"] == captcha["targetEn"]);
        if !matches || ids.contains(&id) {
            failures.push(format!("{side} served captcha {id}, which is not a distinct dataset captcha of label {}", captcha["targetEn"]));
        }
        ids.push(id);
        captcha["captchaId"] = json!("<id>");
        captcha["captchaContentId"] = json!("<id>");
    }
    captchas.sort_by_key(Value::to_string);
    let request_hash: String = body["requestHash"].as_str().unwrap_or_default().to_string();
    let signature: &str = body.get("signature").and_then(|signature| signature.pointer("/provider/requestHash")).and_then(Value::as_str).unwrap_or_default();
    let valid: bool = prosopo_util_crypto::signature::signature_verify(U8aLike::Bytes(request_hash.as_bytes()), U8aLike::Str(signature), U8aLike::Str(provider))
        .is_ok_and(|result| result.is_valid);
    if !valid {
        failures.push(format!("{side}'s signature over request hash {request_hash} does not verify against the provider"));
    }
    served.push(ServedImages { side, user: user.to_string(), request_hash, captcha_ids: ids });
    body.insert("requestHash".to_string(), json!("<requestHash>"));
    body.insert("signature".to_string(), json!({ "provider": { "requestHash": "<signature>" } }));
}

/// Each image answer's commitment found by its request hash, the hash recomputed from the
/// captchas served, the user and the stored salt, and its deadline a minute per captcha from
/// when it was requested.
fn checked_commitments(served: &[ServedImages], side: &str, records: &[Value], failures: &mut Vec<String>) {
    for images in served.iter().filter(|images| images.side == side) {
        let Some(record) = records.iter().find(|record| record["requestHash"].as_str() == Some(images.request_hash.as_str())) else {
            failures.push(format!("{side} stored no commitment for request hash {}", images.request_hash));
            continue;
        };
        let salt: &str = record["salt"].as_str().unwrap_or_default();
        let mut ids: Vec<String> = images.captcha_ids.clone();
        let recomputed: String = prosopo_datasets::compute_pending_request_hash(&mut ids, prosopo_util_crypto::js::JoinValue::from(images.user.as_str()), salt);
        if recomputed != images.request_hash {
            failures.push(format!("{side}'s request hash {} is not the hash of what it served", images.request_hash));
        }
        let time = |key: &str| record[key].pointer("/$date/$numberLong").and_then(Value::as_str).and_then(|text| text.parse::<i64>().ok());
        if time("deadlineTimestamp").zip(time("requestedAtTimestamp")).map(|(deadline, requested)| deadline - requested) != Some(60_000 * images.captcha_ids.len() as i64) {
            failures.push(format!("{side}'s deadline for {} is not a minute per captcha", images.request_hash));
        }
    }
}

/// A stored commitment with what a fresh salt makes masked, once the salt is 32 bytes of hex.
fn stored_commitment(record: &Value, side: &str, failures: &mut Vec<String>) -> Value {
    let mut record: Value = record.clone();
    let salt: &str = record["salt"].as_str().unwrap_or_default();
    if !(salt.len() == 66 && salt.starts_with("0x") && salt[2..].bytes().all(|byte| byte.is_ascii_hexdigit())) {
        failures.push(format!("{side}'s stored salt {salt:?} is not 32 bytes of hex"));
    }
    for key in ["requestHash", "salt", "_id"] {
        record[key] = json!("<fresh>");
    }
    record
}

/// A number from canonical extended JSON.
fn extended_number(value: &Value) -> Option<f64> {
    value.as_f64().or_else(|| ["$numberInt", "$numberDouble", "$numberLong"].iter().find_map(|key| value.get(*key)?.as_str()?.parse().ok()))
}

/// A puzzle answer as served, kept to be checked against the record it stored.
struct ServedPuzzle {
    side: &'static str,
    body: Map<String, Value>,
}

/// A puzzle answer taken for [`rerendered_puzzles`], then its random members masked: the
/// target and origin are `Math.random`, the imagery comes from fresh seeds, and an unpinned
/// piece size from a cryptographic sampler.
fn masked_puzzle(body: &mut Map<String, Value>, side: &'static str, varies: bool, served: &mut Vec<ServedPuzzle>) {
    if !body.contains_key("piece") {
        return;
    }
    served.push(ServedPuzzle { side, body: body.clone() });
    for key in ["background", "piece", "originX", "originY"] {
        body.insert(key.to_string(), json!("<random>"));
    }
    if varies {
        body.insert("pieceSize".to_string(), json!("<random>"));
    }
}

/// A stored puzzle record checked and masked: its target and origin integers within the ranges
/// they are drawn from, its seeds 128-bit hex, and an unpinned piece size within the default
/// scale range.
fn stored_puzzle(record: &Value, provider: &str, side: &str, varying_sites: &[String], failures: &mut Vec<String>) -> Value {
    let mut record: Value = stored_challenge(record, provider, side, failures);
    for (key, min, max) in [("targetX", 150.0, 280.0), ("targetY", 30.0, 170.0), ("originX", 20.0, 130.0), ("originY", 30.0, 170.0)] {
        let drawn: Option<f64> = extended_number(&record[key]);
        if !drawn.is_some_and(|drawn| drawn.fract() == 0.0 && (min..=max).contains(&drawn)) {
            failures.push(format!("{side}'s stored {key} {:?} is not an integer in [{min}, {max}]", record[key]));
        }
        record[key] = json!("<random>");
    }
    let varies: bool = record["dappAccount"].as_str().is_some_and(|site| varying_sites.iter().any(|varying| varying == site));
    let Some(render) = record.get_mut("render").and_then(Value::as_object_mut) else {
        failures.push(format!("{side} stored no render inputs"));
        return record;
    };
    for key in ["backgroundSeed", "renderSeed"] {
        let seed: &str = render.get(key).and_then(Value::as_str).unwrap_or_default();
        if seed.len() != 32 || !seed.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            failures.push(format!("{side}'s stored {key} {seed:?} is not 128-bit hex"));
        }
        render.insert(key.to_string(), json!("<seed>"));
    }
    if varies {
        let size: Option<f64> = render.get("pieceSize").and_then(extended_number);
        if !size.is_some_and(|size| (45.0..=135.0).contains(&size)) {
            failures.push(format!("{side}'s stored piece size {size:?} is outside the default scale range"));
        }
        render.insert("pieceSize".to_string(), json!("<random>"));
    }
    record
}

/// Pixels with the colour under full transparency cleared: sharp's lossless WebP keeps
/// whatever colour it is given there, the Rust encoder does not, and nothing shows it.
fn visible_pixels(pixels: &[u8]) -> Vec<u8> {
    pixels.chunks(4).flat_map(|pixel| if pixel[3] == 0 { [0; 4] } else { [pixel[0], pixel[1], pixel[2], pixel[3]] }).collect()
}

/// Each served puzzle re-rendered by the Rust renderer from the record it stored: the record's
/// seeds, target, piece size and settings must reproduce the imagery served, byte for byte from
/// the Rust and pixel for pixel, wherever a pixel is visible, from the TS's sharp encoding, and
/// the answer's origin and piece size must be the stored ones.
fn rerendered_puzzles(served: &[ServedPuzzle], side: &str, records: &[Value], failures: &mut Vec<String>) {
    for puzzle in served.iter().filter(|puzzle| puzzle.side == side) {
        let Some(record) = records.iter().find(|record| record["challenge"] == puzzle.body["challenge"]) else {
            failures.push(format!("{side} stored no record for {}", puzzle.body["challenge"]));
            continue;
        };
        let number = |value: &Value| extended_number(value).unwrap_or(f64::NAN);
        let render: &Value = &record["render"];
        for (served_key, stored) in [("originX", &record["originX"]), ("originY", &record["originY"]), ("pieceSize", &render["pieceSize"])] {
            if puzzle.body[served_key].as_f64() != Some(number(stored)) {
                failures.push(format!("{side} served {served_key} {} but stored {stored}", puzzle.body[served_key]));
            }
        }
        let seed = |key: &str| -> Option<Vec<u8>> {
            let hex: &str = render[key].as_str()?;
            (0..hex.len()).step_by(2).map(|i| u8::from_str_radix(hex.get(i..i + 2)?, 16).ok()).collect()
        };
        let settings: &Value = &render["settings"];
        let rendered = prosopo_puzzle_assets::create_puzzle(
            &prosopo_puzzle_assets::NotchPlacement { target_x: number(&record["targetX"]), target_y: number(&record["targetY"]) },
            &prosopo_puzzle_assets::PuzzleGeometry { piece_size: Some(number(&render["pieceSize"]) as u32), ..prosopo_puzzle_assets::DEFAULT_GEOMETRY },
            &prosopo_puzzle_assets::PuzzleRenderSettings {
                decoy_count: number(&settings["decoyCount"]),
                decoy_edge_darkness: number(&settings["decoyEdgeDarkness"]),
                decoy_body_brightness: number(&settings["decoyBodyBrightness"]),
                hole_darken: number(&settings["holeDarken"]),
                decoy_hole_darken: number(&settings["decoyHoleDarken"]),
            },
            seed("backgroundSeed"),
            seed("renderSeed"),
        );
        let rendered = match rendered {
            Ok(rendered) => rendered,
            Err(error) => {
                failures.push(format!("{side}'s stored render inputs do not render: {error}"));
                continue;
            }
        };
        for (key, bytes) in [("background", &rendered.background), ("piece", &rendered.piece)] {
            let again: String = prosopo_puzzle_assets::to_data_uri(bytes);
            let served_uri: &str = puzzle.body[key].as_str().unwrap_or_default();
            if side == "rust" {
                if again != served_uri {
                    failures.push(format!("rust's {key} is not what its stored inputs render"));
                }
                continue;
            }
            match (data_uri_pixels(served_uri), data_uri_pixels(&again)) {
                (Some((sw, sh, sp)), Some((rw, rh, rp))) if (sw, sh) == (rw, rh) && sp.len() == rp.len() => {
                    if visible_pixels(&sp) != visible_pixels(&rp) {
                        failures.push(format!("ts's {key} differs from what its stored inputs render"));
                    }
                }
                _ => failures.push(format!("ts's {key} does not decode to the size its stored inputs render")),
            }
        }
    }
}

/// An audio answer's clip checked as a WAV, then masked: which clip a request gets is the TS
/// buffer's timing, and the clip's synthesis is proven by audio-assets' own vectors.
fn compared_clip(body: &mut Map<String, Value>, side: &str, failures: &mut Vec<String>) {
    let Some(clip) = body.get("clip").and_then(Value::as_str) else {
        return;
    };
    let wav: Option<Vec<u8>> = clip.strip_prefix("data:audio/wav;base64,").and_then(|encoded| base64::engine::general_purpose::STANDARD.decode(encoded).ok());
    if !wav.as_deref().is_some_and(|wav| wav.len() > 44 && wav.starts_with(b"RIFF") && &wav[8..12] == b"WAVE") {
        failures.push(format!("{side}'s clip is not a WAV data URI"));
    }
    body.insert("clip".to_string(), json!("<clip>"));
}

/// A stored audio record with its answer masked to its length, once it is all digits.
fn stored_audio(record: &Value, provider: &str, side: &str, failures: &mut Vec<String>) -> Value {
    let mut record: Value = stored_challenge(record, provider, side, failures);
    let answer: String = record["answer"].as_str().unwrap_or_default().to_string();
    if answer.is_empty() || !answer.bytes().all(|byte| byte.is_ascii_digit()) {
        failures.push(format!("{side}'s stored answer {answer:?} is not digits"));
    }
    record["answer"] = json!(format!("<answer:{}>", answer.len()));
    record
}

/// A challenge answer as compared: its members with nonce and signature masked, and, when it
/// was padded, the number and total length of the pads instead of the random pads themselves.
fn challenge_answer(parsed: Map<String, Value>, padded: bool, provider: &str, side: &str, failures: &mut Vec<String>) -> String {
    let mut members: Map<String, Value> = Map::new();
    let mut pads: Vec<usize> = Vec::new();
    for (key, value) in parsed {
        if padded && !CHALLENGE_MEMBERS.contains(&key.as_str()) {
            pads.push(value.as_str().map_or(0, str::len));
        } else {
            members.insert(key, value);
        }
    }
    checked_challenge(&mut members, provider, side, failures);
    if padded {
        return json!({ "members": members, "pads": pads.len(), "padded": pads.iter().sum::<usize>() }).to_string();
    }
    Value::Object(members).to_string()
}

async fn cache_entries() -> Vec<Value> {
    let mut connection = redis().await;
    let mut keys: Vec<String> = redis::cmd("KEYS").arg("cache:session:*").query_async(&mut connection).await.expect("lists");
    keys.sort();
    let mut out: Vec<Value> = Vec::new();
    for key in keys {
        let raw: String = redis::cmd("GET").arg(&key).query_async(&mut connection).await.expect("reads");
        out.push(json!({ "key": key, "raw": raw }));
    }
    out
}

/// A cache entry with the time a session was last patched masked; a pointer is kept as it is.
fn cache_entry_without_time(entry: &Value) -> Value {
    let raw: &str = entry["raw"].as_str().unwrap_or_default();
    match serde_json::from_str::<Value>(raw) {
        Ok(Value::Object(mut session)) => {
            if session.contains_key("lastUpdatedTimestamp") {
                session.insert("lastUpdatedTimestamp".to_string(), json!("<fresh>"));
            }
            json!({ "key": entry["key"], "session": session })
        }
        _ => entry.clone(),
    }
}

/// A stored PoW record with its nonce and signature masked, once the signature checks out.
fn stored_challenge(record: &Value, provider: &str, side: &str, failures: &mut Vec<String>) -> Value {
    let mut record: Value = record.clone();
    let challenge: String = record["challenge"].as_str().unwrap_or_default().to_string();
    let signature: String = record["providerSignature"].as_str().unwrap_or_default().to_string();
    let valid: bool = prosopo_util_crypto::signature::signature_verify(U8aLike::Bytes(challenge.as_bytes()), U8aLike::Str(&signature), U8aLike::Str(provider))
        .is_ok_and(|result| result.is_valid);
    if !valid {
        failures.push(format!("{side}'s stored signature over {challenge} does not verify against the provider"));
    }
    record["challenge"] = json!(masked_challenge(&challenge));
    record["providerSignature"] = json!("<signature>");
    record["_id"] = json!("<fresh>");
    record
}

/// A session with what the block middleware's synthetic one makes fresh masked: its id, its
/// times and its document id. Its contents are checked by the block test.
fn session_without_block_ids(record: &Value) -> Value {
    let mut record: Value = record.clone();
    if record["sessionId"].as_str().is_some_and(|id| id.starts_with("blocked-")) {
        for field in ["_id", "sessionId", "createdAt", "storedAtTimestamp"] {
            record[field] = json!("<fresh>");
        }
    }
    record
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn challenges_are_issued_as_the_express_app_issues_them() {
    let _live = LIVE.lock().await;
    let vectors: Value = serde_json::from_str(include_str!("../../provider/rust/equivalence/challenge-vectors.json")).expect("challenge-vectors.json parses");
    let database: &str = vectors["database"].as_str().expect("a database");
    let provider: &str = vectors["provider"].as_str().expect("the provider's address");
    reset(database).await;
    let ipapi: String = fake_ipapi(vectors["ipapi"].clone()).await;
    let pool = tempfile::TempDir::new().expect("a pool directory");
    for (name, contents) in vectors["poolFiles"].as_object().expect("pool files") {
        std::fs::write(pool.path().join(name), contents.as_str().expect("text")).expect("writes");
    }
    let mut variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    variables.insert("PROSOPO_IPAPI_URL".to_string(), ipapi);
    variables.insert("PROSOPO_DETECTOR_POOL_DIR".to_string(), pool.path().to_string_lossy().into_owned());
    variables.insert("NODE_ENV".to_string(), "production".to_string());
    let decoded: DecodedPayloads = vectors["decoded"]
        .as_array()
        .expect("decoded payloads")
        .iter()
        .map(|entry| {
            let ciphertext: String = entry["ciphertext"].as_str().expect("a payload").to_string();
            match entry["readings"].as_object() {
                Some(readings) => (ciphertext, Ok(readings.clone())),
                None => (ciphertext, Err(entry["error"].as_str().unwrap_or_default().to_string())),
            }
        })
        .collect();
    let clock: Arc<PinnedClock> = Arc::new(PinnedClock(AtomicI64::new(vectors["exchanges"][0]["at"].as_i64().expect("a time"))));
    let seeds: std::collections::VecDeque<Vec<u8>> = vectors["seeds"]
        .as_array()
        .expect("seeds")
        .iter()
        .map(|seed| {
            let hex: &str = seed.as_str().expect("hex");
            (0..hex.len()).step_by(2).map(|i| u8::from_str_radix(&hex[i..i + 2], 16).expect("hex")).collect()
        })
        .collect();
    let (router, _env) = live_app_with(&variables, clock.clone(), Some(Arc::new(RecordedDecoder(decoded))), Some(Arc::new(RecordedSeeds(Mutex::new(seeds)))), vectors["datasetId"].as_str().map(str::to_string)).await;
    restore_database(database, &vectors["seed"]).await;
    restore_hashes(&vectors["redis"]).await;
    let mut connection = redis().await;
    for entry in vectors["cache"].as_array().expect("cache entries") {
        let _: () = redis::cmd("SET")
            .arg(entry["key"].as_str().expect("a key"))
            .arg(entry["raw"].as_str().expect("a value"))
            .arg("EX")
            .arg(86400)
            .query_async(&mut connection)
            .await
            .expect("caches");
    }
    let port: u16 = serve(router).await;
    let decode = |text: &Value| base64::engine::general_purpose::STANDARD.decode(text.as_str().expect("base64")).expect("base64 decodes");
    let mut failures: Vec<String> = Vec::new();
    let mut compared: usize = 0;
    let mut served: Vec<ServedPuzzle> = Vec::new();
    let mut served_images: Vec<ServedImages> = Vec::new();
    let dataset: Vec<Value> = vectors["seed"]["captchas"].as_array().cloned().unwrap_or_default();
    let mut varying_sites: Vec<String> = Vec::new();
    for step in vectors["exchanges"].as_array().expect("exchanges") {
        clock.0.store(step["at"].as_i64().expect("a time"), Ordering::SeqCst);
        let request: Vec<u8> = decode(&step["request"]);
        let actual: Answer = answer(&exchange(port, &request).await);
        let expected: Answer = answer(&decode(&step["response"]));
        let line: String = shown(&request).lines().next().unwrap_or_default().to_string();
        if step["compare"] == Value::Bool(false) {
            let body: Value = serde_json::from_slice(&actual.body).unwrap_or(Value::Null);
            let challenge: &str = body["challenge"].as_str().unwrap_or_default();
            let shaped: bool = (body["captchas"] == json!([]) && body["requestHash"] == json!(""))
                || body["difficulty"] == json!(1)
                || body["legend"].as_str().and_then(data_uri_pixels).is_some()
                || body["piece"].as_str().and_then(data_uri_pixels).is_some()
                || body["clip"].as_str().is_some_and(|clip| clip.starts_with("data:audio/wav;base64,"));
            let unsigned: bool = (challenge.ends_with("___0") && body.pointer("/signature/provider/challenge") == Some(&json!("")))
                || body.pointer("/signature/provider/requestHash") == Some(&json!(""));
            if !actual.status_line.starts_with("HTTP/1.1 200 ") || !shaped || !unsigned {
                failures.push(format!("{line}\n      rust dummy challenge {body}"));
            }
            continue;
        }
        compared += 1;
        let padded: bool = step["padded"] == Value::Bool(true);
        let varies: bool = step["varies"] == Value::Bool(true);
        if varies {
            let text: String = String::from_utf8_lossy(&request).into_owned();
            let body: Value = text.split_once("\r\n\r\n").and_then(|(_, body)| serde_json::from_str(body).ok()).unwrap_or(Value::Null);
            varying_sites.extend(body["dapp"].as_str().map(str::to_string));
        }
        let (expected_headers, expected_body) = without_request_id(&expected);
        let (actual_headers, actual_body) = without_request_id(&actual);
        let issued: bool = expected_body.starts_with(b"{\"status\":\"ok\"") || padded;
        let headers = |headers: Vec<(String, String)>| -> Vec<(String, String)> { headers.into_iter().filter(|(name, _)| !(issued && name == "etag")).collect() };
        let (expected_body, actual_body) = if issued {
            match (serde_json::from_slice::<Value>(&expected_body), serde_json::from_slice::<Value>(&actual_body)) {
                (Ok(Value::Object(mut expected_json)), Ok(Value::Object(mut actual_json))) => {
                    compared_images(&mut expected_json, &mut actual_json, &mut failures);
                    masked_puzzle(&mut expected_json, "ts", varies, &mut served);
                    masked_puzzle(&mut actual_json, "rust", varies, &mut served);
                    let sent: String = String::from_utf8_lossy(&request).into_owned();
                    let sent_body: Value = sent.split_once("\r\n\r\n").and_then(|(_, body)| serde_json::from_str(body).ok()).unwrap_or(Value::Null);
                    let user: &str = sent_body["user"].as_str().unwrap_or_default();
                    masked_images(&mut expected_json, "ts", user, provider, &dataset, &mut served_images, &mut failures);
                    masked_images(&mut actual_json, "rust", user, provider, &dataset, &mut served_images, &mut failures);
                    compared_clip(&mut expected_json, "ts", &mut failures);
                    compared_clip(&mut actual_json, "rust", &mut failures);
                    (challenge_answer(expected_json, padded, provider, "ts", &mut failures), challenge_answer(actual_json, padded, provider, "rust", &mut failures))
                }
                _ => (String::from_utf8_lossy(&expected_body).into_owned(), String::from_utf8_lossy(&actual_body).into_owned()),
            }
        } else {
            (String::from_utf8_lossy(&expected_body).into_owned(), String::from_utf8_lossy(&actual_body).into_owned())
        };
        let lengths_agree: bool = issued || expected.content_length == actual.content_length;
        if expected.status_line != actual.status_line || headers(expected_headers.clone()) != headers(actual_headers.clone()) || expected_body != actual_body || !lengths_agree {
            failures.push(format!(
                "{line}\n      rust {:?} {:?} {}\n      ts   {:?} {:?} {}",
                actual.status_line, actual_headers, actual_body, expected.status_line, expected_headers, expected_body
            ));
        }
    }
    let scraped: Vec<u8> = exchange(port, b"GET /metrics HTTP/1.1\r\nHost: h.example\r\nConnection: close\r\n\r\n").await;
    let mut metrics: Vec<String> = String::from_utf8_lossy(&scraped)
        .lines()
        .filter(|line| line.starts_with("prosopo_captcha_issued") || line.starts_with("prosopo_captcha_issue_errors"))
        .map(str::to_string)
        .collect();
    metrics.sort();
    if json!(metrics) != vectors["metrics"] {
        failures.push(format!("issue metrics differ\n  ts:   {}\n  rust: {}", vectors["metrics"], json!(metrics)));
    }
    tokio::time::sleep(Duration::from_millis(1500)).await;
    let fresh: [&str; 1] = ["lastUpdatedTimestamp"];
    let expected_challenges: Vec<Value> = vectors["after"]["powcaptchas"].as_array().expect("records").iter().map(|record| stored_challenge(record, provider, "ts", &mut failures)).collect();
    let actual_challenges: Vec<Value> = dump(database, "powcaptchas").await.iter().map(|record| stored_challenge(record, provider, "rust", &mut failures)).collect();
    failures.extend(compare_records(&Value::Array(expected_challenges), &actual_challenges, &fresh));
    let expected_icons: Vec<Value> = vectors["after"]["iconordercaptchas"].as_array().expect("records").iter().map(|record| stored_challenge(record, provider, "ts", &mut failures)).collect();
    let actual_icons: Vec<Value> = dump(database, "iconordercaptchas").await.iter().map(|record| stored_challenge(record, provider, "rust", &mut failures)).collect();
    failures.extend(compare_records(&Value::Array(expected_icons), &actual_icons, &fresh));
    let expected_audio: Vec<Value> = vectors["after"]["audiocaptchas"].as_array().expect("records").iter().map(|record| stored_audio(record, provider, "ts", &mut failures)).collect();
    let actual_audio: Vec<Value> = dump(database, "audiocaptchas").await.iter().map(|record| stored_audio(record, provider, "rust", &mut failures)).collect();
    failures.extend(compare_records(&Value::Array(expected_audio), &actual_audio, &fresh));
    let ts_puzzles: Vec<Value> = vectors["after"]["puzzlecaptchas"].as_array().expect("records").clone();
    let rust_puzzles: Vec<Value> = dump(database, "puzzlecaptchas").await;
    rerendered_puzzles(&served, "ts", &ts_puzzles, &mut failures);
    rerendered_puzzles(&served, "rust", &rust_puzzles, &mut failures);
    let expected_puzzles: Vec<Value> = ts_puzzles.iter().map(|record| stored_puzzle(record, provider, "ts", &varying_sites, &mut failures)).collect();
    let actual_puzzles: Vec<Value> = rust_puzzles.iter().map(|record| stored_puzzle(record, provider, "rust", &varying_sites, &mut failures)).collect();
    failures.extend(compare_records(&Value::Array(expected_puzzles), &actual_puzzles, &fresh));
    let ts_commitments: Vec<Value> = vectors["after"]["usercommitments"].as_array().expect("records").clone();
    let rust_commitments: Vec<Value> = dump(database, "usercommitments").await;
    checked_commitments(&served_images, "ts", &ts_commitments, &mut failures);
    checked_commitments(&served_images, "rust", &rust_commitments, &mut failures);
    let expected_commitments: Vec<Value> = ts_commitments.iter().map(|record| stored_commitment(record, "ts", &mut failures)).collect();
    let actual_commitments: Vec<Value> = rust_commitments.iter().map(|record| stored_commitment(record, "rust", &mut failures)).collect();
    failures.extend(compare_records(&Value::Array(expected_commitments), &actual_commitments, &fresh));
    let expected_sessions: Vec<Value> = vectors["after"]["sessions"].as_array().expect("sessions").iter().map(session_without_block_ids).collect();
    let actual_sessions: Vec<Value> = dump(database, "sessions").await.iter().map(session_without_block_ids).collect();
    failures.extend(compare_records(&Value::Array(expected_sessions), &actual_sessions, &fresh));
    let cache: Vec<Value> = cache_entries().await.iter().map(cache_entry_without_time).collect();
    let expected_cache: Vec<Value> = vectors["cacheAfter"].as_array().expect("cache entries").iter().map(cache_entry_without_time).collect();
    if cache != expected_cache {
        failures.push(format!("cache differs\n  ts:   {}\n  rust: {}", json!(expected_cache), json!(cache)));
    }
    assert!(compared > 35, "only {compared} compared");
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}

/// Each escalated session id in `text` replaced by the step that minted it.
fn with_escalations_named(text: &str, minted: &[(String, String)]) -> String {
    minted.iter().fold(text.to_string(), |text, (id, name)| text.replace(id.as_str(), name))
}

/// The escalation id an answer carries, if any.
fn escalation_id(answer: &Answer) -> Option<String> {
    serde_json::from_slice::<Value>(&answer.body).ok()?.pointer("/escalation/sessionId")?.as_str().map(str::to_string)
}

/// A puzzle escalation's draws, masked once they are within their level's bands; the level is
/// not stored, so any level's bands will do, as long as it is one band for all of them.
fn masked_draws(session: &mut Map<String, Value>, side: &str, failures: &mut Vec<String>) {
    let Some(tolerance) = session.get("puzzleTolerance").and_then(extended_number) else {
        return;
    };
    let puzzle: Value = session.get("puzzle").cloned().unwrap_or(Value::Null);
    let number = |key: &str| puzzle.get(key).and_then(extended_number);
    let banded = prosopo_captcha_severity::PUZZLE_DIFFICULTY_LEVELS.iter().any(|band| {
        let within = |value: Option<f64>, range: &prosopo_captcha_severity::PuzzleDifficultyRange| value.is_some_and(|value| value >= range.min && value <= range.max);
        within(Some(tolerance), &band.tolerance)
            && within(number("decoyCount"), &band.decoy_count)
            && within(number("decoyEdgeDarkness"), &band.decoy_edge_darkness)
            && number("decoyHoleDarken").is_some_and(|value| value <= 1.0)
            && puzzle.pointer("/pieceScale/min").and_then(extended_number) == Some(band.piece_scale.min)
            && puzzle.pointer("/pieceScale/max").and_then(extended_number) == Some(band.piece_scale.max)
    });
    if !banded {
        failures.push(format!("{side} puzzle escalation drew outside every band: {tolerance} {puzzle}"));
    }
    session.insert("puzzleTolerance".to_string(), json!("<drawn>"));
    session.insert("puzzle".to_string(), json!("<drawn>"));
}

/// A solve's session result and its SIMD readings are written to Mongo by two background
/// updates in both implementations, so which of their fields comes first is a race.
/// MongoDB writes an upsert's two query fields in either order, from one run to the next, for
/// the same command, so the user solutions' `commitmentId` and `captchaId` are compared the same way.
const SUBMIT_RACE: [&str; 8] = ["result", "userSubmitted", "blocked", "clientMetaData", "simdReadings", "simdReadingsStage", "commitmentId", "captchaId"];

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn pow_solutions_are_judged_as_the_express_app_judges_them() {
    let _live = LIVE.lock().await;
    let vectors: Value = serde_json::from_str(include_str!("../../provider/rust/equivalence/pow-solution-live-vectors.json")).expect("pow-solution-live-vectors.json parses");
    let database: &str = vectors["database"].as_str().expect("a database");
    reset(database).await;
    let ipapi: String = fake_ipapi(vectors["ipapi"].clone()).await;
    let pool = tempfile::TempDir::new().expect("a pool directory");
    for (name, contents) in vectors["poolFiles"].as_object().expect("pool files") {
        std::fs::write(pool.path().join(name), contents.as_str().expect("text")).expect("writes");
    }
    let mut variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    variables.insert("PROSOPO_IPAPI_URL".to_string(), ipapi);
    variables.insert("PROSOPO_DETECTOR_POOL_DIR".to_string(), pool.path().to_string_lossy().into_owned());
    variables.insert("NODE_ENV".to_string(), "production".to_string());
    let decoded: DecodedPayloads = vectors["decoded"]
        .as_array()
        .expect("decoded payloads")
        .iter()
        .map(|entry| {
            let ciphertext: String = entry["ciphertext"].as_str().expect("a payload").to_string();
            match entry["readings"].as_object() {
                Some(readings) => (ciphertext, Ok(readings.clone())),
                None => (ciphertext, Err(entry["error"].as_str().unwrap_or_default().to_string())),
            }
        })
        .collect();
    let clock: Arc<PinnedClock> = Arc::new(PinnedClock(AtomicI64::new(vectors["exchanges"][0]["at"].as_i64().expect("a time"))));
    let (router, _env) = live_app_with(&variables, clock.clone(), Some(Arc::new(RecordedDecoder(decoded))), None, None).await;
    restore_database(database, &vectors["seed"]).await;
    restore_hashes(&vectors["redis"]).await;
    let mut connection = redis().await;
    for entry in vectors["cache"].as_array().expect("cache entries") {
        let _: () = redis::cmd("SET").arg(entry["key"].as_str().expect("a key")).arg(entry["raw"].as_str().expect("a value")).arg("EX").arg(86400).query_async(&mut connection).await.expect("caches");
    }
    for entry in vectors["counters"].as_array().expect("counters") {
        let _: () = redis::cmd("SET").arg(entry["key"].as_str().expect("a key")).arg(entry["value"].as_str().expect("a value")).arg("EX").arg(86400).query_async(&mut connection).await.expect("counts");
    }
    let port: u16 = serve(router).await;
    let decode = |text: &Value| base64::engine::general_purpose::STANDARD.decode(text.as_str().expect("base64")).expect("base64 decodes");
    let mut failures: Vec<String> = Vec::new();
    let (mut minted_ts, mut minted_rust): (Vec<(String, String)>, Vec<(String, String)>) = (Vec::new(), Vec::new());
    let exchanges: &Vec<Value> = vectors["exchanges"].as_array().expect("exchanges");
    for (index, step) in exchanges.iter().enumerate() {
        clock.0.store(step["at"].as_i64().expect("a time"), Ordering::SeqCst);
        let request: Vec<u8> = decode(&step["request"]);
        let actual: Answer = answer(&exchange(port, &request).await);
        let expected: Answer = answer(&decode(&step["response"]));
        let name: String = format!("<escalation-{index}>");
        minted_ts.extend(escalation_id(&expected).map(|id| (id, name.clone())));
        minted_rust.extend(escalation_id(&actual).map(|id| (id, name.clone())));
        let (expected_headers, expected_body) = without_request_id(&expected);
        let (actual_headers, actual_body) = without_request_id(&actual);
        let expected_body: String = with_escalations_named(&String::from_utf8_lossy(&expected_body), &minted_ts);
        let actual_body: String = with_escalations_named(&String::from_utf8_lossy(&actual_body), &minted_rust);
        let headers = |headers: Vec<(String, String)>| -> Vec<(String, String)> { headers.into_iter().filter(|(name, _)| name != "etag" && name != "content-length").collect() };
        if expected.status_line != actual.status_line || headers(expected_headers.clone()) != headers(actual_headers.clone()) || expected_body != actual_body {
            failures.push(format!(
                "{}\n      rust {:?} {:?} {}\n      ts   {:?} {:?} {}",
                shown(&request).lines().next().unwrap_or_default(),
                actual.status_line,
                actual_headers,
                actual_body,
                expected.status_line,
                expected_headers,
                expected_body
            ));
        }
    }
    tokio::time::sleep(Duration::from_millis(1500)).await;
    let fresh: [&str; 4] = ["lastUpdatedTimestamp", "submittedAtTimestamp", "failedAtTimestamp", "behavioralDataPacked._id"];
    failures.extend(compare_records(&vectors["after"]["powcaptchas"], &dump(database, "powcaptchas").await, &fresh));
    let sessions = |records: &[Value], minted: &[(String, String)], side: &str, failures: &mut Vec<String>| -> Vec<Value> {
        records
            .iter()
            .map(|record| {
                let mut record: Value = serde_json::from_str(&with_escalations_named(&record.to_string(), minted)).expect("JSON");
                record = with_fields_last(&record, &SUBMIT_RACE);
                if let Some(session) = record.as_object_mut().filter(|session| session.get("isEscalation") == Some(&json!(true))) {
                    session.insert("_id".to_string(), json!("<fresh>"));
                    session.insert("createdAt".to_string(), json!("<fresh>"));
                    masked_draws(session, side, failures);
                }
                record
            })
            .collect()
    };
    let expected_sessions: Vec<Value> = sessions(vectors["after"]["sessions"].as_array().expect("sessions"), &minted_ts, "ts", &mut failures);
    let actual_sessions: Vec<Value> = sessions(&dump(database, "sessions").await, &minted_rust, "rust", &mut failures);
    failures.extend(compare_records(&Value::Array(expected_sessions), &actual_sessions, &fresh));
    let cached = |entries: &[Value], minted: &[(String, String)], side: &str, failures: &mut Vec<String>| -> Vec<Value> {
        entries
            .iter()
            .map(|entry| {
                let key: String = with_escalations_named(entry["key"].as_str().unwrap_or_default(), minted);
                let raw: String = with_escalations_named(entry["raw"].as_str().unwrap_or_default(), minted);
                match serde_json::from_str::<Value>(&raw) {
                    Ok(Value::Object(mut session)) => {
                        if session.get("isEscalation") == Some(&json!(true)) {
                            session.insert("createdAt".to_string(), json!("<fresh>"));
                            masked_draws(&mut session, side, failures);
                        }
                        if session.contains_key("lastUpdatedTimestamp") {
                            session.insert("lastUpdatedTimestamp".to_string(), json!("<fresh>"));
                        }
                        json!({ "key": key, "raw": serde_json::to_string(&session).expect("JSON") })
                    }
                    _ => json!({ "key": key, "raw": raw }),
                }
            })
            .collect()
    };
    let mut expected_cache: Vec<Value> = cached(vectors["cacheAfter"].as_array().expect("cache"), &minted_ts, "ts", &mut failures);
    let mut actual_cache: Vec<Value> = cached(&cache_entries().await, &minted_rust, "rust", &mut failures);
    expected_cache.sort_by_key(|entry| entry["key"].to_string());
    actual_cache.sort_by_key(|entry| entry["key"].to_string());
    if expected_cache != actual_cache {
        failures.push(format!("cache differs\n  ts:   {}\n  rust: {}", json!(expected_cache), json!(actual_cache)));
    }
    let expected_counters: Vec<Value> = vectors["countersAfter"].as_array().expect("counters").iter().map(|entry| json!({ "key": entry["key"], "value": entry["value"] })).collect();
    if json!(expected_counters) != json!(usage_counters().await) {
        failures.push(format!("counters differ\n  ts:   {}\n  rust: {}", json!(expected_counters), json!(usage_counters().await)));
    }
    assert_eq!(minted_ts.len(), minted_rust.len(), "escalations minted");
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}

/// Replays a solution route's recorded submissions on the stores the TS started from, the clock
/// pinned to each send, and compares every answer, the given collections (the fields two
/// background writes race on compared regardless of their order), the cache and the counters.
/// The port, to send more on, and the differences.
async fn replay_solutions(vectors: &Value, collections: &[&str], extra_fresh: &[&str]) -> (u16, Vec<String>) {
    let database: &str = vectors["database"].as_str().expect("a database");
    reset(database).await;
    let ipapi: String = fake_ipapi(vectors["ipapi"].clone()).await;
    let pool = tempfile::TempDir::new().expect("a pool directory");
    for (name, contents) in vectors["poolFiles"].as_object().expect("pool files") {
        std::fs::write(pool.path().join(name), contents.as_str().expect("text")).expect("writes");
    }
    let mut variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    variables.insert("PROSOPO_IPAPI_URL".to_string(), ipapi);
    variables.insert("PROSOPO_DETECTOR_POOL_DIR".to_string(), pool.path().to_string_lossy().into_owned());
    variables.insert("NODE_ENV".to_string(), "production".to_string());
    let decoded: DecodedPayloads = vectors["decoded"]
        .as_array()
        .expect("decoded payloads")
        .iter()
        .map(|entry| {
            let ciphertext: String = entry["ciphertext"].as_str().expect("a payload").to_string();
            match entry["readings"].as_object() {
                Some(readings) => (ciphertext, Ok(readings.clone())),
                None => (ciphertext, Err(entry["error"].as_str().unwrap_or_default().to_string())),
            }
        })
        .collect();
    let clock: Arc<PinnedClock> = Arc::new(PinnedClock(AtomicI64::new(vectors["exchanges"][0]["at"].as_i64().expect("a time"))));
    let (router, _env) = live_app_with(&variables, clock.clone(), Some(Arc::new(RecordedDecoder(decoded))), None, None).await;
    restore_database(database, &vectors["seed"]).await;
    restore_hashes(&vectors["redis"]).await;
    let mut connection = redis().await;
    for entry in vectors["cache"].as_array().expect("cache entries") {
        let _: () = redis::cmd("SET").arg(entry["key"].as_str().expect("a key")).arg(entry["raw"].as_str().expect("a value")).arg("EX").arg(86400).query_async(&mut connection).await.expect("caches");
    }
    for entry in vectors["counters"].as_array().into_iter().flatten() {
        let _: () = redis::cmd("SET").arg(entry["key"].as_str().expect("a key")).arg(entry["value"].as_str().expect("a value")).arg("EX").arg(86400).query_async(&mut connection).await.expect("counts");
    }
    let port: u16 = serve(router).await;
    let (compared, mut failures) = replay_with(port, &vectors["exchanges"], |step| clock.0.store(step["at"].as_i64().expect("a time"), Ordering::SeqCst)).await;
    tokio::time::sleep(Duration::from_millis(1500)).await;
    let mut fresh: Vec<&str> = vec!["lastUpdatedTimestamp", "submittedAtTimestamp", "failedAtTimestamp", "behavioralDataPacked._id"];
    fresh.extend_from_slice(extra_fresh);
    for collection in collections {
        let raced = |records: &[Value]| -> Vec<Value> { records.iter().map(|record| with_fields_last(record, &SUBMIT_RACE)).collect() };
        let expected: Value = Value::Array(raced(vectors["after"][collection].as_array().expect("records")));
        let actual: Vec<Value> = raced(&dump(database, collection).await);
        failures.extend(compare_records(&expected, &actual, &fresh).into_iter().map(|failure| format!("{collection}: {failure}")));
    }
    let expected_cache: Vec<Value> = vectors["cacheAfter"].as_array().expect("cache").iter().map(cache_entry_without_time).collect();
    let actual_cache: Vec<Value> = cache_entries().await.iter().map(cache_entry_without_time).collect();
    if json!(expected_cache) != json!(actual_cache) {
        failures.push(format!("cache differs\n  ts:   {}\n  rust: {}", json!(expected_cache), json!(actual_cache)));
    }
    if let Some(counters) = vectors["countersAfter"].as_array() {
        let expected_counters: Vec<Value> = counters.iter().map(|entry| json!({ "key": entry["key"], "value": entry["value"] })).collect();
        if json!(expected_counters) != json!(usage_counters().await) {
            failures.push(format!("counters differ\n  ts:   {}\n  rust: {}", json!(expected_counters), json!(usage_counters().await)));
        }
    }
    assert_eq!(compared, vectors["exchanges"].as_array().map_or(0, Vec::len), "every exchange compared");
    (port, failures)
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn interactive_solutions_are_graded_as_the_express_app_grades_them() {
    let _live = LIVE.lock().await;
    let vectors: Value =
        serde_json::from_str(include_str!("../../provider/rust/equivalence/interactive-solution-live-vectors.json")).expect("interactive-solution-live-vectors.json parses");
    let (port, failures) = replay_solutions(&vectors, &["puzzlecaptchas", "audiocaptchas", "iconordercaptchas", "sessions"], &[]).await;
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));

    // DEVIATION: the TS graded both of two concurrent right answers to one puzzle (its claim
    // reads `userSubmitted` off the record it fetched); the Rust claims atomically, as the TS
    // does for audio and icon-order, so exactly one is graded.
    assert_eq!(vectors["race"]["verdicts"], json!([true, true]), "the TS run graded both");
    let race: Vec<u8> = base64::engine::general_purpose::STANDARD.decode(vectors["race"]["request"].as_str().expect("base64")).expect("base64 decodes");
    let (first, second) = tokio::join!(exchange(port, &race), exchange(port, &race));
    let verdicts: Vec<bool> = [first, second]
        .iter()
        .map(|raw| serde_json::from_slice::<Value>(&answer(raw).body).ok().and_then(|body| body["verified"].as_bool()).unwrap_or(false))
        .collect();
    assert_eq!(verdicts.iter().filter(|verdict| **verdict).count(), 1, "exactly one concurrent answer graded: {verdicts:?}");
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn image_solutions_are_graded_as_the_express_app_grades_them() {
    let _live = LIVE.lock().await;
    let vectors: Value = serde_json::from_str(include_str!("../../provider/rust/equivalence/image-solution-live-vectors.json")).expect("image-solution-live-vectors.json parses");
    // An upserted commitment or solution gets a fresh document id, and a solution its creation time.
    let (_, failures) = replay_solutions(&vectors, &["usercommitments", "usersolutions", "sessions"], &["_id", "createdAt"]).await;
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn detector_bundles_are_assigned_as_the_express_app_assigns_them() {
    let _live = LIVE.lock().await;
    let vectors: Value = serde_json::from_str(include_str!("../../provider/rust/equivalence/detector-assign-vectors.json")).expect("detector-assign-vectors.json parses");
    let database: &str = vectors["database"].as_str().expect("a database");
    reset(database).await;
    let pool = tempfile::TempDir::new().expect("a pool directory");
    for (name, contents) in vectors["poolFiles"].as_object().expect("pool files") {
        let bytes: Vec<u8> = base64::engine::general_purpose::STANDARD.decode(contents.as_str().expect("base64")).expect("base64 decodes");
        std::fs::write(pool.path().join(name), bytes).expect("writes");
    }
    let mut variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    variables.insert("PROSOPO_IPAPI_URL".to_string(), fake_ipapi(json!({})).await);
    variables.insert("PROSOPO_DETECTOR_POOL_DIR".to_string(), pool.path().to_string_lossy().into_owned());
    variables.insert("NODE_ENV".to_string(), "production".to_string());
    let (router, _env) = live_app(&variables).await;
    restore_database(database, &vectors["seed"]).await;
    let port: u16 = serve(router).await;
    let decode = |text: &Value| base64::engine::general_purpose::STANDARD.decode(text.as_str().expect("base64")).expect("base64 decodes");
    let session_id = |body: &[u8]| serde_json::from_slice::<Value>(body).ok().and_then(|body| body["detectorSessionId"].as_str().map(str::to_string));
    let mut failures: Vec<String> = Vec::new();
    let mut connection = redis().await;
    for step in vectors["exchanges"].as_array().expect("exchanges") {
        let request: Vec<u8> = decode(&step["request"]);
        let actual: Answer = answer(&exchange(port, &request).await);
        let expected: Answer = answer(&decode(&step["response"]));
        let masked = |answer: &Answer| -> (String, Vec<(String, String)>, String) {
            let (headers, body) = without_request_id(answer);
            let body: String = String::from_utf8_lossy(&body).into_owned();
            let body: String = session_id(body.as_bytes()).map_or(body.clone(), |id| body.replace(&id, "<detector session>"));
            (answer.status_line.clone(), headers.into_iter().filter(|(name, _)| name != "etag").collect(), body)
        };
        if masked(&expected) != masked(&actual) {
            failures.push(format!("{}\n      rust {:?}\n      ts   {:?}", shown(&request).lines().next().unwrap_or_default(), masked(&actual), masked(&expected)));
        }
        let expected_bundle: Option<&Value> = session_id(&expected.body).and_then(|id| vectors["bindings"].as_array().and_then(|bindings| bindings.iter().find(|binding| binding["key"] == json!(format!("cache:detector:{id}")))).map(|binding| &binding["value"]));
        if let Some(id) = session_id(&actual.body) {
            let bound: Option<String> = redis::cmd("GET").arg(format!("cache:detector:{id}")).query_async(&mut connection).await.expect("reads");
            let ttl: i64 = redis::cmd("TTL").arg(format!("cache:detector:{id}")).query_async(&mut connection).await.expect("reads");
            if expected_bundle != bound.map(Value::String).as_ref() || !(590..=600).contains(&ttl) {
                failures.push(format!("binding for {id}: rust {ttl}s, ts {expected_bundle:?}"));
            }
        }
    }
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB and Redis Stack"]
async fn detector_pools_are_replaced_as_the_express_app_replaces_them() {
    let _live = LIVE.lock().await;
    let vectors: Value = serde_json::from_str(include_str!("../../provider/rust/equivalence/pool-replace-vectors.json")).expect("pool-replace-vectors.json parses");
    let database: &str = vectors["database"].as_str().expect("a database");
    reset(database).await;
    let decode = |text: &Value| base64::engine::general_purpose::STANDARD.decode(text.as_str().expect("base64")).expect("base64 decodes");
    let pool = tempfile::TempDir::new().expect("a pool directory");
    for (name, contents) in vectors["poolBefore"].as_object().expect("pool files") {
        std::fs::write(pool.path().join(name), decode(contents)).expect("writes");
    }
    let read_pool = || -> Value {
        let mut names: Vec<String> = std::fs::read_dir(pool.path()).expect("lists").map(|entry| entry.expect("an entry").file_name().to_string_lossy().into_owned()).collect();
        names.sort();
        Value::Object(names.into_iter().map(|name| {
            let bytes: Vec<u8> = std::fs::read(pool.path().join(&name)).expect("reads");
            (name, json!(base64::engine::general_purpose::STANDARD.encode(bytes)))
        }).collect())
    };
    let mut variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    variables.insert("PROSOPO_IPAPI_URL".to_string(), fake_ipapi(json!({})).await);
    variables.insert("PROSOPO_DETECTOR_POOL_DIR".to_string(), pool.path().to_string_lossy().into_owned());
    variables.insert("NODE_ENV".to_string(), "production".to_string());
    let (router, _env) = live_app(&variables).await;
    restore_database(database, &vectors["seed"]).await;
    let port: u16 = serve(router).await;
    let mut failures: Vec<String> = Vec::new();
    for step in vectors["exchanges"].as_array().expect("exchanges") {
        let request: Vec<u8> = decode(&step["request"]);
        let actual: Answer = answer(&exchange(port, &with_admin_jwt(&request)).await);
        let expected: Answer = answer(&decode(&step["response"]));
        let masked = |answer: &Answer| -> (String, String) {
            let body: String = String::from_utf8_lossy(&without_request_id(answer).1).into_owned();
            let id: Option<String> = serde_json::from_str::<Value>(&body).ok().and_then(|body| body["detectorSessionId"].as_str().map(str::to_string));
            (answer.status_line.clone(), id.map_or(body.clone(), |id| body.replace(&id, "<detector session>")))
        };
        if masked(&expected) != masked(&actual) {
            let (status, body) = masked(&actual);
            failures.push(format!("{}\n      rust {status} {}\n      ts   {:?}", shown(&request).lines().next().unwrap_or_default(), &body[..body.len().min(300)], masked(&expected).0));
        }
        if read_pool() != step["pool"] {
            failures.push(format!("pool directory after {} differs", shown(&request).lines().next().unwrap_or_default()));
        }
    }
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}
