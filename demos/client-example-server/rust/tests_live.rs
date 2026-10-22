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

//! The live equivalence test: the exchanges `rust/equivalence/generate-app.ts` recorded from the
//! express app replayed against the Rust app, on the same MongoDB and at the same clock, with
//! stand-ins for siteverify and the provider at the ports the recorded tokens name. Ignored by
//! default; run with `cargo test -p prosopo-client-example-server --test live -- --ignored` with
//! MongoDB on 127.0.0.1:${PROSOPO_TEST_MONGO_PORT:-27999} (user root/root). It drops its database.
//!
//! Answers are compared without `Date`, and without `Content-Length` on a 204: Node sends
//! `Content-Length: 0` there and hyper will not, since RFC 9110 §8.6 forbids it. Stored records as canonical extended JSON, so field order
//! and BSON types count. What a run makes fresh is masked and checked instead: each user's `_id`,
//! salt and password hash (the hash must be the blake2b of the password and that salt), a session
//! JWT (it must verify with the demo's secret and carry the email and a one-hour expiry), and the
//! site's signature in a provider verify request.

use axum::extract::State;
use axum::Router;
use base64::Engine;
use bson::{Bson, Document};
use prosopo_client_example_server::app::{create_app, AppState, VerificationType};
use prosopo_client_example_server::auth::hash_password;
use prosopo_client_example_server::jwt;
use prosopo_client_example_server::users::UserStore;
use prosopo_keyring::{get_pair, Secret};
use prosopo_load_balancer::{EnvLookup, LoadBalancer, ProviderDirectory, ReqwestFetch};
use prosopo_provider::http_replay::{answer, exchange, Answer};
use prosopo_server::get_server_config;
use prosopo_types::config::ProsopoServerConfig;
use prosopo_types::decode_procaptcha_output;
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::{Arc, Mutex};

/// The passwords the recorded signups use, for checking a fresh hash.
const PASSWORDS: [&str; 3] = ["hunter2", "pw", "a b+c"];

fn mongo_url(database: &str) -> String {
    let port: String = std::env::var("PROSOPO_TEST_MONGO_PORT").unwrap_or_else(|_| "27999".to_string());
    format!("mongodb://root:root@127.0.0.1:{port}/{database}?authSource=admin")
}

async fn client(database: &str) -> mongodb::Client {
    mongodb::Client::with_uri_str(mongo_url(database)).await.expect("connects")
}

/// Every collection that holds documents, as canonical extended JSON in `_id` order.
async fn dump(database: &str) -> Map<String, Value> {
    let mongo: mongodb::Client = client(database).await;
    let mut names: Vec<String> = mongo.database(database).list_collection_names().await.expect("lists");
    names.sort();
    let mut out: Map<String, Value> = Map::new();
    for name in names {
        let mut cursor = mongo.database(database).collection::<Document>(&name).find(Document::new()).sort(bson::doc! { "_id": 1 }).await.expect("finds");
        let mut documents: Vec<Value> = Vec::new();
        while cursor.advance().await.expect("reads") {
            documents.push(Bson::Document(cursor.deserialize_current().expect("a document")).into_canonical_extjson());
        }
        if !documents.is_empty() {
            out.insert(name, Value::Array(documents));
        }
    }
    out
}

async fn restore(database: &str, seed: &Value) {
    let mongo: mongodb::Client = client(database).await;
    mongo.database(database).drop().await.expect("drops");
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

/// What a stand-in was sent, as the generator records it.
type Received = Arc<Mutex<Vec<Value>>>;

/// A stand-in's answer to a request body.
type Reply = fn(&str) -> String;

/// A server on a fixed port recording every request and answering it with `reply(body)`.
async fn stand_in(port: u16, received: Received, reply: Reply) {
    async fn handle(State((received, reply)): State<(Received, Reply)>, request: axum::extract::Request) -> axum::response::Response {
        let (parts, body) = request.into_parts();
        let body = axum::body::to_bytes(body, usize::MAX).await.expect("a body");
        let body: String = String::from_utf8_lossy(&body).into_owned();
        let content_type: Option<String> = parts.headers.get("content-type").and_then(|value| value.to_str().ok()).map(str::to_string);
        received.lock().expect("unpoisoned").push(json!({ "method": parts.method.as_str(), "url": parts.uri.to_string(), "contentType": content_type, "body": body }));
        let mut response = axum::response::Response::new(axum::body::Body::from(reply(&body)));
        response.headers_mut().insert(http::header::CONTENT_TYPE, http::HeaderValue::from_static("application/json"));
        response
    }
    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind(("127.0.0.1", port)).await.expect("binds the recorded port");
    let router: Router = Router::new().fallback(handle).with_state((received, reply));
    tokio::spawn(async move { axum::serve(listener, router).await.expect("serves") });
}

fn siteverify_reply(body: &str) -> String {
    let token: String = serde_json::from_str::<Value>(body).ok().and_then(|body| body["token"].as_str().map(str::to_string)).unwrap_or_default();
    match token.as_str() {
        "0x01" => r#"{"verified":true,"status":"ok"}"#.to_string(),
        "0x02" => r#"{"verified":false,"status":"no"}"#.to_string(),
        "0x03" => "not json".to_string(),
        "0x04" => r#"{"verified":"yes"}"#.to_string(),
        _ => r#"{"verified":false}"#.to_string(),
    }
}

fn provider_reply(body: &str) -> String {
    let token: String = serde_json::from_str::<Value>(body).ok().and_then(|body| body["token"].as_str().map(str::to_string)).unwrap_or_default();
    let bob: String = get_pair(Some(Secret::Text("//Bob")), None, None, None).expect("Bob").address().expect("an address");
    let user: Option<String> = decode_procaptcha_output(&token).ok().map(|output| output.user);
    json!({ "status": "ok", "verified": user.as_deref() == Some(bob.as_str()) }).to_string()
}

/// A session JWT checked and masked: it verifies with the demo's secret, carries `email` and
/// expires an hour after it was issued.
fn masked_jwt(token: &str, email: &Value) -> Result<String, String> {
    let payload: Value = jwt::verify(token, "secret", 0.0)?;
    let header: Vec<u8> = base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(token.split('.').next().unwrap_or_default()).map_err(|error| error.to_string())?;
    let issued: f64 = payload["iat"].as_f64().ok_or("no iat")?;
    if header != br#"{"alg":"HS256","typ":"JWT"}"# || &payload["email"] != email || payload["exp"].as_f64() != Some(issued + 3600.0) {
        return Err(format!("unexpected session token {payload}"));
    }
    Ok("<jwt>".to_string())
}

/// An answer as compared: status line, headers without the ETag of a masked body, and the body
/// with a session token masked.
fn comparable(answer: &Answer, email: &Value) -> Result<Value, String> {
    let mut body: Value = serde_json::from_slice(&answer.body).unwrap_or_else(|_| json!(String::from_utf8_lossy(&answer.body)));
    let masked: bool = match body.get("token").and_then(Value::as_str) {
        Some(token) => {
            body["token"] = json!(masked_jwt(token, email)?);
            true
        }
        None => false,
    };
    let headers: Vec<(String, String)> = answer.headers.iter().filter(|(name, _)| !(masked && name == "etag")).cloned().collect();
    let no_content: bool = answer.status_line.starts_with("HTTP/1.1 204 ");
    let length: Value = if masked || no_content { Value::Null } else { json!(answer.content_length) };
    Ok(json!({ "status": answer.status_line, "headers": headers, "length": length, "body": body }))
}

/// A provider verify request with the site's signature masked.
fn comparable_received(received: &[Value]) -> Vec<Value> {
    received
        .iter()
        .map(|entry| {
            let mut entry: Value = entry.clone();
            if let Ok(mut body) = serde_json::from_str::<Value>(entry["body"].as_str().unwrap_or_default()) {
                if body.get("dappSignature").is_some() {
                    body["dappSignature"] = json!("<signature>");
                    entry["body"] = json!(body.to_string());
                }
            }
            entry
        })
        .collect()
}

/// Users with their fresh fields masked, after checking each hash is of a recorded password.
fn comparable_users(users: &Value) -> Result<Vec<String>, String> {
    let mut out: Vec<String> = Vec::new();
    for user in users.as_array().cloned().unwrap_or_default() {
        let salt: &str = user["salt"].as_str().unwrap_or_default();
        let hash: &str = user["password"].as_str().unwrap_or_default();
        if !PASSWORDS.iter().any(|password| hash_password(&format!("{password}{salt}")) == hash) {
            return Err(format!("{} has a hash of no recorded password", user["email"]));
        }
        let mut user: Value = user.clone();
        for field in ["_id", "salt", "password"] {
            user[field] = json!("<fresh>");
        }
        out.push(user.to_string());
    }
    out.sort();
    Ok(out)
}

fn compare_stores(expected: &Value, actual: &Map<String, Value>) -> Vec<String> {
    let mut failures: Vec<String> = Vec::new();
    let expected: &Map<String, Value> = expected.as_object().expect("collections");
    match (comparable_users(&expected["users"]), comparable_users(actual.get("users").unwrap_or(&json!([])))) {
        (Ok(expected), Ok(actual)) if expected == actual => {}
        (Ok(expected), Ok(actual)) => failures.push(format!("users differ:\n    ts   {expected:?}\n    rust {actual:?}")),
        (_, Err(error)) | (Err(error), _) => failures.push(error),
    }
    let counters = |store: &Value| -> Vec<Value> {
        store.as_array().cloned().unwrap_or_default().into_iter().map(|mut counter| {
            counter["_id"] = json!("<fresh>");
            counter
        }).collect()
    };
    let (ts, rust) = (counters(&expected["identitycounters"]), counters(actual.get("identitycounters").unwrap_or(&json!([]))));
    if ts != rust {
        failures.push(format!("counters differ: ts {ts:?}, rust {rust:?}"));
    }
    failures
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs MongoDB"]
async fn the_app_answers_and_stores_as_the_express_app_does() {
    let vectors: Value = serde_json::from_str(include_str!("equivalence/app-vectors.json")).expect("app-vectors.json parses");
    let database: &str = vectors["database"].as_str().expect("a database");
    client(database).await.database(database).drop().await.expect("drops");
    let received: Received = Arc::new(Mutex::new(Vec::new()));
    let port = |name: &str| u16::try_from(vectors[name].as_u64().expect("a port")).expect("a port");
    stand_in(port("siteverifyPort"), received.clone(), siteverify_reply).await;
    stand_in(port("providerPort"), received.clone(), provider_reply).await;
    let variables: HashMap<String, String> = serde_json::from_value(vectors["variables"].clone()).expect("variables");
    let env: EnvLookup = Arc::new(move |name: &str| variables.get(name).cloned());
    let config: ProsopoServerConfig = get_server_config(&env).expect("a config");
    let clock: Arc<AtomicI64> = Arc::new(AtomicI64::new(0));
    let users: Arc<UserStore> = Arc::new(UserStore::new(&client(database).await));
    let mut ports: HashMap<String, u16> = HashMap::new();
    for (name, verify_type) in [("api", VerificationType::Api), ("local", VerificationType::Local)] {
        let mut state: AppState =
            AppState::new(users.clone(), config.clone(), vectors["siteverifyUrl"].as_str().expect("a URL").to_string(), verify_type, false);
        let now = clock.clone();
        state.now_ms = Arc::new(move || now.load(Ordering::SeqCst) as f64);
        state.providers = Arc::new(ProviderDirectory::new(Arc::new(LoadBalancer::with(Arc::new(ReqwestFetch::default()), env.clone()))));
        let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind("127.0.0.1:0").await.expect("binds");
        ports.insert(name.to_string(), listener.local_addr().expect("an address").port());
        let app: Router = create_app(Arc::new(state));
        tokio::spawn(async move { axum::serve(listener, app).await.expect("serves") });
    }
    let mut failures: Vec<String> = Vec::new();
    let replay = |step: Value| {
        let (ports, clock, received) = (ports.clone(), clock.clone(), received.clone());
        async move {
            clock.store(step["at"].as_i64().expect("a time"), Ordering::SeqCst);
            let before: usize = received.lock().expect("unpoisoned").len();
            let request: Vec<u8> = step["request"].as_str().expect("a request").chars().map(|c| c as u8).collect();
            let rust: Answer = answer(&exchange(ports[step["app"].as_str().expect("an app")], &request).await);
            let ts: Answer = answer(&step["response"].as_str().expect("a response").chars().map(|c| c as u8).collect::<Vec<u8>>());
            let shown: String = step["request"].as_str().unwrap_or_default().lines().next().unwrap_or_default().to_string()
                + " "
                + step["request"].as_str().unwrap_or_default().rsplit("\r\n").next().unwrap_or_default().chars().take(90).collect::<String>().as_str();
            let email: Value = serde_json::from_slice::<Value>(request.rsplitn(2, |&byte| byte == b'\n').next().unwrap_or_default()).ok().and_then(|body| body.get("email").cloned()).unwrap_or(Value::Null);
            let mut failures: Vec<String> = Vec::new();
            match (comparable(&ts, &email), comparable(&rust, &email)) {
                (Ok(ts), Ok(rust)) if ts == rust => {}
                (Ok(ts), Ok(rust)) => failures.push(format!("{shown}\n  answer:\n    ts   {ts}\n    rust {rust}")),
                (Err(error), _) | (_, Err(error)) => failures.push(format!("{shown}\n  {error}")),
            }
            let sent: Vec<Value> = received.lock().expect("unpoisoned")[before..].to_vec();
            let expected: Vec<Value> = step["received"].as_array().cloned().unwrap_or_default();
            if comparable_received(&sent) != comparable_received(&expected) {
                failures.push(format!("{shown}\n  sent:\n    ts   {expected:?}\n    rust {sent:?}"));
            }
            (shown, failures)
        }
    };
    for step in vectors["seedExchanges"].as_array().expect("seed exchanges") {
        let (shown, step_failures) = replay(step.clone()).await;
        failures.extend(step_failures);
        failures.extend(compare_stores(&step["after"], &dump(database).await).into_iter().map(|failure| format!("{shown} (from empty)\n  {failure}")));
    }
    restore(database, &vectors["seed"]).await;
    for step in vectors["exchanges"].as_array().expect("exchanges") {
        let (shown, step_failures) = replay(step.clone()).await;
        failures.extend(step_failures);
        failures.extend(compare_stores(&step["after"], &dump(database).await).into_iter().map(|failure| format!("{shown}\n  {failure}")));
    }
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}
