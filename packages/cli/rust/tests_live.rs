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
use prosopo_provider::api::healthz_geo::HealthzProbe;
use prosopo_provider::http_replay::{answer, exchange, shown, Answer};
use prosopo_types::config::ProsopoConfig;
use prosopo_util_crypto::U8aLike;
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

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
    let config: ProsopoConfig = get_config(&Environment::from_map(variables.clone()), None, None, None, None).expect("a config");
    let pair: KeyringPair = get_pair(Some(Secret::Text(MNEMONIC)), None, None, None).expect("the provider pair");
    let admin: KeyringPair = get_pair(None, Some(U8aLike::Str(ADMIN)), None, None).expect("the admin pair");
    let mut env: ProviderEnvironment = ProviderEnvironment(BaseEnvironment::new(config, Some(pair), Some(admin)).expect("an environment"));
    env.is_ready().await.expect("ready");
    let env: Arc<ProviderEnvironment> = Arc::new(env);
    let reader: HashMap<String, String> = variables.clone();
    let probe: HealthzProbe = Arc::new(|_: String, _: Duration| Box::pin(async { false }));
    let parts: AppParts = AppParts {
        env: Arc::new(move |name: &str| reader.get(name).cloned()),
        probe,
        version: "dev".to_string(),
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

/// Replays the vectors' exchanges in order; the differences, as messages.
async fn replay(port: u16, exchanges: &Value) -> (usize, Vec<String>) {
    let decode = |text: &Value| base64::engine::general_purpose::STANDARD.decode(text.as_str().expect("base64")).expect("base64 decodes");
    let mut failures: Vec<String> = Vec::new();
    let mut compared: usize = 0;
    for step in exchanges.as_array().expect("exchanges") {
        let request: Vec<u8> = decode(&step["request"]);
        let actual: Answer = answer(&exchange(port, &request).await);
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

/// A stored record with the values a run makes fresh replaced.
fn normalised(record: &Value, fresh: &[&str]) -> String {
    let mut record: Map<String, Value> = record.as_object().expect("a record").clone();
    for field in fresh {
        if record.contains_key(*field) {
            record.insert(field.to_string(), json!("<fresh>"));
        }
    }
    Value::Object(record).to_string()
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
