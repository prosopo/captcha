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

//! Replays rust/equivalence/methods.json, written by methods.ts from the TS ProviderDatabase on
//! Node 24 against a real mongod. Each Rust method runs against an executor that checks every
//! command it sends against the one the TS sent at that point, and answers with the reply mongod
//! gave the TS; its result must then be the TS's. The time, `Math.random()` and new ids are the
//! ones the TS used.
//!
//! Commands are compared byte for byte, except the order of the top-level keys inside each update
//! operator (and of the operators): mongod 5.0 and later applies a single update's fields in
//! lexicographic order whatever order they are sent in, so that order cannot reach a stored
//! document. Every value is compared byte for byte.

use crate::operation::{Executor, Operation, Reply, ReplyFuture};
use crate::provider::ProviderDatabase;
use crate::source::Source;
use bson::oid::ObjectId;
use bson::{Bson, DateTime, Document};
use prosopo_common::ProsopoError;
use prosopo_logger::{get_logger, LogLevel};
use prosopo_types::datasets::CaptchaStates;
use serde::de::DeserializeOwned;
use serde_json::Value;
use std::collections::VecDeque;
use std::fmt::Debug;
use std::sync::{Arc, Mutex};

const METHODS: &str = include_str!("equivalence/methods.json");

fn methods() -> Value {
    serde_json::from_str(METHODS).expect("methods.json parses")
}

fn from_hex(hex_bytes: &str) -> Document {
    Document::from_reader(hex::decode(hex_bytes).expect("hex").as_slice()).expect("a BSON document")
}

fn to_hex(document: &Document) -> String {
    let mut bytes: Vec<u8> = Vec::new();
    document.to_writer(&mut bytes).expect("serialises");
    hex::encode(bytes)
}

/// An update command with each operator's keys, and the operators, in lexicographic order.
fn normalise(command: &Document) -> Document {
    let mut out: Document = command.clone();
    if let Ok(statements) = command.get_array("updates") {
        let statements: Vec<Bson> = statements
            .iter()
            .map(|statement| {
                let mut statement: Document = statement.as_document().cloned().unwrap_or_default();
                if let Ok(update) = statement.get_document("u") {
                    let mut operators: Vec<(String, Bson)> = update
                        .iter()
                        .map(|(op, value)| {
                            let value: Bson = match value {
                                Bson::Document(fields) => {
                                    let mut sorted: Vec<(String, Bson)> =
                                        fields.iter().map(|(k, v)| (k.clone(), v.clone())).collect();
                                    sorted.sort_by(|a, b| a.0.cmp(&b.0));
                                    Bson::Document(sorted.into_iter().collect())
                                }
                                other => other.clone(),
                            };
                            (op.clone(), value)
                        })
                        .collect();
                    operators.sort_by(|a, b| a.0.cmp(&b.0));
                    statement.insert("u", operators.into_iter().collect::<Document>());
                }
                Bson::Document(statement)
            })
            .collect();
        out.insert("updates", statements);
    }
    out
}

struct Recorded {
    command: Document,
    reply: Document,
}

/// Answers each command with the reply mongod gave the TS, noting any command that differs.
struct ReplayExecutor {
    expected: Mutex<VecDeque<Recorded>>,
    mismatches: Mutex<Vec<String>>,
}

impl ReplayExecutor {
    fn new(scenario: &Value) -> ReplayExecutor {
        let expected: VecDeque<Recorded> = scenario["commands"]
            .as_array()
            .expect("commands")
            .iter()
            .map(|command| Recorded {
                command: from_hex(command["hex"].as_str().expect("hex")),
                reply: command["reply"]["hex"].as_str().map(from_hex).unwrap_or_default(),
            })
            .collect();
        ReplayExecutor {
            expected: Mutex::new(expected),
            mismatches: Mutex::new(Vec::new()),
        }
    }

    fn left_over(&self) -> usize {
        self.expected.lock().expect("lock").len()
    }
}

impl Executor for ReplayExecutor {
    fn run(&self, operation: Operation) -> ReplyFuture<'_> {
        let sent: Document = operation.command();
        let next: Option<Recorded> = self.expected.lock().expect("lock").pop_front();
        let reply: Reply = match next {
            Some(recorded) => {
                let (rust, ts): (Document, Document) = (normalise(&sent), normalise(&recorded.command));
                if to_hex(&rust) != to_hex(&ts) {
                    self.mismatches.lock().expect("lock").push(format!(
                        "sent {}\n      ts {}",
                        Bson::Document(rust).into_canonical_extjson(),
                        Bson::Document(ts).into_canonical_extjson()
                    ));
                }
                Reply::from_command_reply(&operation, &recorded.reply)
            }
            None => {
                self.mismatches
                    .lock()
                    .expect("lock")
                    .push(format!("sent {} after the TS stopped", Bson::Document(sent).into_canonical_extjson()));
                Reply::Documents(Vec::new())
            }
        };
        Box::pin(async move { Ok(reply) })
    }
}

/// The TS's time and random numbers.
struct ReplaySource {
    now: DateTime,
    random: Mutex<VecDeque<f64>>,
}

impl Source for ReplaySource {
    fn now(&self) -> DateTime {
        self.now
    }

    fn random(&self) -> f64 {
        self.random.lock().expect("lock").pop_front().expect("the TS drew as many random numbers")
    }

    fn object_id(&self) -> ObjectId {
        ObjectId::new()
    }
}

/// The arguments as plain JSON (they are recorded as canonical extended JSON).
fn args(scenario: &Value) -> Vec<Value> {
    scenario["args"]
        .as_array()
        .expect("args")
        .iter()
        .map(|arg| Bson::try_from(arg.clone()).expect("extended JSON").into_relaxed_extjson())
        .collect()
}

fn string(value: &Value) -> String {
    value.as_str().expect("a string").to_string()
}

fn strings(value: &Value) -> Vec<String> {
    value.as_array().expect("an array").iter().map(string).collect()
}

/// The TS result read as the Rust type, from its canonical extended JSON.
fn ts_result<T: DeserializeOwned>(scenario: &Value) -> T {
    let bson: Bson = Bson::try_from(scenario["result"].clone()).expect("extended JSON");
    bson::deserialize_from_bson(bson).expect("the TS result reads as the Rust type")
}

/// The Rust result against the TS's: equal values, or the same error key.
fn check<T: DeserializeOwned + PartialEq + Debug>(scenario: &Value, actual: Result<T, ProsopoError>) -> Option<String> {
    match (actual, scenario.get("error")) {
        (Ok(value), None) => {
            let expected: T = ts_result(scenario);
            (value != expected).then(|| format!("result\n      rust {value:?}\n      ts   {expected:?}"))
        }
        (Err(error), Some(ts)) => {
            let key: Option<&str> = error.translation_key();
            (Some(ts["translationKey"].as_str().unwrap_or("")) != key)
                .then(|| format!("error {key:?}, ts {}", ts["translationKey"]))
        }
        (Ok(value), Some(ts)) => Some(format!("rust returned {value:?}, ts failed with {ts}")),
        (Err(error), None) => Some(format!("rust failed with {error:?}, ts returned {}", scenario["result"])),
    }
}

/// A unit result, which the TS records as null.
fn check_unit(scenario: &Value, actual: Result<(), ProsopoError>) -> Option<String> {
    match (actual, scenario.get("error")) {
        (Ok(()), None) => None,
        (Err(error), Some(ts)) => (Some(ts["translationKey"].as_str().unwrap_or("")) != error.translation_key())
            .then(|| format!("error {:?}, ts {}", error.translation_key(), ts["translationKey"])),
        (Ok(()), Some(ts)) => Some(format!("rust succeeded, ts failed with {ts}")),
        (Err(error), None) => Some(format!("rust failed with {error:?}")),
    }
}

fn optional_number(value: &Value) -> Option<f64> {
    value.as_f64()
}

async fn run_scenario(db: &ProviderDatabase, scenario: &Value) -> Option<String> {
    let a: Vec<Value> = args(scenario);
    match scenario["method"].as_str().expect("method") {
        "storeDataset" => check_unit(scenario, db.store_dataset(&a[0]).await),
        "getSolutions" => check(scenario, db.get_solutions(&string(&a[0])).await),
        "getSolutionByCaptchaId" => check(scenario, db.get_solution_by_captcha_id(&string(&a[0])).await),
        "getDataset" => check(scenario, db.get_dataset(&string(&a[0])).await),
        "getDatasetDetails" => check(scenario, db.get_dataset_details(&string(&a[0])).await),
        "getMostRecentDatasetId" => check(scenario, db.get_most_recent_dataset_id().await),
        "getRandomCaptcha" => check(
            scenario,
            db.get_random_captcha(a[0].as_bool().expect("solved"), &string(&a[1]), optional_number(a.get(2).unwrap_or(&Value::Null)))
                .await,
        ),
        "getCaptchaById" => check(scenario, db.get_captcha_by_id(&strings(&a[0])).await),
        "removeCaptchas" => check_unit(scenario, db.remove_captchas(&strings(&a[0])).await),
        "getAllCaptchasByDatasetId" => {
            let state: Option<CaptchaStates> = a.get(1).and_then(Value::as_str).map(|s| s.parse().expect("a state"));
            check(scenario, db.get_all_captchas_by_dataset_id(&string(&a[0]), state).await)
        }
        "getDatasetIdWithSolvedCaptchasOfSizeN" => {
            check(scenario, db.get_dataset_id_with_solved_captchas_of_size_n(a[0].as_f64().expect("count")).await)
        }
        "getRandomSolvedCaptchasFromSingleDataset" => check(
            scenario,
            db.get_random_solved_captchas_from_single_dataset(&string(&a[0]), a[1].as_f64().expect("size")).await,
        ),
        other => Some(format!("no Rust method for {other}")),
    }
}

#[tokio::test]
async fn methods_send_the_commands_the_ts_sends_and_return_what_it_returns() {
    let methods: Value = methods();
    let now: DateTime = DateTime::from_millis(methods["nowMs"].as_i64().expect("nowMs"));
    let mut failures: Vec<String> = Vec::new();
    let scenarios: &Vec<Value> = methods["scenarios"].as_array().expect("scenarios");
    for scenario in scenarios.iter().filter(|scenario| scenario["method"] != "__setup") {
        let executor: Arc<ReplayExecutor> = Arc::new(ReplayExecutor::new(scenario));
        let source: Arc<ReplaySource> = Arc::new(ReplaySource {
            now,
            random: Mutex::new(
                scenario["random"].as_array().expect("random").iter().map(|n| n.as_f64().expect("number")).collect(),
            ),
        });
        let db: ProviderDatabase = ProviderDatabase::new(executor.clone(), source.clone(), get_logger(LogLevel::Error, "test"));
        let name: &str = scenario["name"].as_str().expect("name");
        if let Some(problem) = run_scenario(&db, scenario).await {
            failures.push(format!("{name}: {problem}"));
        }
        for mismatch in executor.mismatches.lock().expect("lock").iter() {
            failures.push(format!("{name}: {mismatch}"));
        }
        if executor.left_over() > 0 {
            failures.push(format!("{name}: the TS sent {} more commands", executor.left_over()));
        }
        let unused: usize = source.random.lock().expect("lock").len();
        if unused > 0 {
            failures.push(format!("{name}: the TS drew {unused} more random numbers"));
        }
    }
    assert!(scenarios.len() >= 30, "only {} scenarios", scenarios.len());
    assert!(failures.is_empty(), "{} problems:\n{}", failures.len(), failures.join("\n"));
}

/// Whether a scenario's result came from mongod's `$sample`, and so differs from run to run.
fn sampled(scenario: &Value) -> bool {
    scenario["commands"].as_array().is_some_and(|commands| {
        commands.iter().any(|command| command["json"]["pipeline"].to_string().contains("\"$sample\""))
    })
}

/// Runs operations on a real database, keeping the commands it sent.
struct RecordingExecutor {
    inner: crate::operation::DriverExecutor,
    sent: Mutex<Vec<Document>>,
}

impl Executor for RecordingExecutor {
    fn run(&self, operation: Operation) -> ReplyFuture<'_> {
        self.sent.lock().expect("lock").push(operation.command());
        self.inner.run(operation)
    }
}

/// The same scenarios on a real mongod: every command the Rust sends must be the TS's, and every
/// result the TS's, except those mongod samples at random, whose success alone is compared.
#[tokio::test]
#[ignore = "needs a mongod at PROSOPO_TEST_MONGO_URL"]
async fn methods_do_on_a_real_database_what_the_ts_did() {
    use crate::mongo::{MongoConnectionTimeouts, MongoDatabase};
    let url: String = std::env::var("PROSOPO_TEST_MONGO_URL").expect("PROSOPO_TEST_MONGO_URL");
    let mongo: MongoDatabase =
        MongoDatabase::new(&url, Some("prosopo-test-database-methods"), None, None, MongoConnectionTimeouts::default())
            .expect("a valid URL");
    mongo.connect().await.expect("connects");
    let database = mongo.database().await.expect("open");
    database.drop().await.expect("drops");
    let methods: Value = methods();
    let now: DateTime = DateTime::from_millis(methods["nowMs"].as_i64().expect("nowMs"));
    let mut failures: Vec<String> = Vec::new();
    for scenario in methods["scenarios"].as_array().expect("scenarios") {
        let name: &str = scenario["name"].as_str().expect("name");
        if scenario["method"] == "__setup" {
            for command in scenario["commands"].as_array().expect("commands") {
                database.run_command(from_hex(command["hex"].as_str().expect("hex"))).await.expect("setup runs");
            }
            continue;
        }
        let executor: Arc<RecordingExecutor> = Arc::new(RecordingExecutor {
            inner: crate::operation::DriverExecutor::new(database.clone()),
            sent: Mutex::new(Vec::new()),
        });
        let source: Arc<ReplaySource> = Arc::new(ReplaySource {
            now,
            random: Mutex::new(
                scenario["random"].as_array().expect("random").iter().map(|n| n.as_f64().expect("number")).collect(),
            ),
        });
        let db: ProviderDatabase = ProviderDatabase::new(executor.clone(), source, get_logger(LogLevel::Error, "test"));
        let sampled: bool = sampled(scenario);
        if let Some(problem) = run_scenario(&db, scenario).await {
            let same_outcome: bool = !problem.starts_with("rust failed") && !problem.starts_with("rust returned");
            if !(sampled && same_outcome) {
                failures.push(format!("{name}: {problem}"));
            }
        }
        let sent: Vec<Document> = executor.sent.lock().expect("lock").clone();
        let expected: Vec<Document> = scenario["commands"]
            .as_array()
            .expect("commands")
            .iter()
            .map(|command| from_hex(command["hex"].as_str().expect("hex")))
            .collect();
        let sent_hex: Vec<String> = sent.iter().map(|command| to_hex(&normalise(command))).collect();
        let expected_hex: Vec<String> = expected.iter().map(|command| to_hex(&normalise(command))).collect();
        if sent_hex != expected_hex {
            failures.push(format!("{name}: sent {} commands that differ from the TS's {}", sent.len(), expected.len()));
        }
    }
    database.drop().await.expect("drops");
    mongo.close().await;
    assert!(failures.is_empty(), "{} problems:\n{}", failures.len(), failures.join("\n"));
}
