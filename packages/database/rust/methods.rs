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

use crate::challenges::{Coords, Interactive, InteractiveAnswer, NewChallenge};
use crate::mongo::MongoError;
use crate::operation::{Executor, Operation, Reply, ReplyFuture};
use crate::provider::ProviderDatabase;
use crate::records::{CompositeIpAddress, IpHalf, StoredResult, UserCommitment};
use crate::captcha::{CaptchaBatch, CaptchaDatabase, CaptchaRecords};
use crate::clients::{ClientRecord, DecisionMachineArtifact, SpamEmailDomainUpdate};
use crate::streamer::CentralDbStreamer;
use crate::session::{DnsObservation, Session};
use prosopo_types_database::scheduled_task::ScheduledTaskResult;
use prosopo_types::api_types::CaptchaSolution;
use crate::source::Source;
use bson::oid::ObjectId;
use bson::{Bson, DateTime, Document};
use prosopo_common::ProsopoError;
use prosopo_logger::{get_logger, LogLevel};
use prosopo_types::datasets::{CaptchaStates, PoWChallengeComponents};
use prosopo_types::JsNumber;
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

/// Answers each command with the reply mongod gave the TS, noting any command that differs. In an
/// unordered scenario a command may match any recorded one not yet matched.
struct ReplayExecutor {
    expected: Mutex<VecDeque<Recorded>>,
    mismatches: Mutex<Vec<String>>,
    unordered: bool,
    /// The central database's index creation, which mongoose runs alongside the writes and so
    /// lands in whichever scenario is running: answered, and kept to compare as a set.
    indexes: Option<Mutex<Vec<String>>>,
}

/// Whether a recorded command went to the central database.
fn is_central(command: &Value) -> bool {
    command["central"].as_bool().unwrap_or(false)
}

/// A command whose place in the recording is a matter of timing: the central index creation.
fn is_timed(command: &Value) -> bool {
    is_central(command) && command["name"] == "createIndexes"
}

impl ReplayExecutor {
    fn new(scenario: &Value, central: bool) -> ReplayExecutor {
        let expected: VecDeque<Recorded> = scenario["commands"]
            .as_array()
            .expect("commands")
            .iter()
            .filter(|command| is_central(command) == central && !is_timed(command))
            .map(|command| Recorded {
                command: from_hex(command["hex"].as_str().expect("hex")),
                reply: command["reply"]["hex"].as_str().map(from_hex).unwrap_or_default(),
            })
            .collect();
        ReplayExecutor {
            expected: Mutex::new(expected),
            mismatches: Mutex::new(Vec::new()),
            unordered: scenario["unordered"].as_bool().unwrap_or(false),
            indexes: central.then(|| Mutex::new(Vec::new())),
        }
    }

    fn left_over(&self) -> usize {
        self.expected.lock().expect("lock").len()
    }
}

impl Executor for ReplayExecutor {
    fn run(&self, operation: Operation) -> ReplyFuture<'_> {
        let sent: Document = operation.command();
        if let (Some(indexes), true) = (&self.indexes, sent.contains_key("createIndexes")) {
            indexes.lock().expect("lock").push(to_hex(&sent));
            return Box::pin(async move { Ok(Reply::Value(None)) });
        }
        let next: Option<Recorded> = {
            let mut expected = self.expected.lock().expect("lock");
            if self.unordered {
                let wanted: String = to_hex(&normalise(&sent));
                match expected.iter().position(|recorded| to_hex(&normalise(&recorded.command)) == wanted) {
                    Some(index) => expected.remove(index),
                    None => expected.pop_front(),
                }
            } else {
                expected.pop_front()
            }
        };
        let reply: Result<Reply, MongoError> = match next {
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
                Ok(Reply::Documents(Vec::new()))
            }
        };
        Box::pin(async move { reply })
    }
}

/// The TS's time, random numbers and new ids: the pinned time, fixed process bytes and the
/// counter where the call began.
struct ReplaySource {
    now: DateTime,
    random: Mutex<VecDeque<f64>>,
    counter: Mutex<u32>,
}

impl ReplaySource {
    fn new(now: DateTime, scenario: &Value) -> ReplaySource {
        ReplaySource {
            now,
            random: Mutex::new(
                scenario["random"].as_array().expect("random").iter().map(|n| n.as_f64().expect("number")).collect(),
            ),
            counter: Mutex::new(scenario["idStart"].as_u64().unwrap_or(0) as u32),
        }
    }
}

impl Source for ReplaySource {
    fn now(&self) -> DateTime {
        self.now
    }

    fn random(&self) -> f64 {
        self.random.lock().expect("lock").pop_front().expect("the TS drew as many random numbers")
    }

    fn object_id(&self) -> ObjectId {
        let mut counter = self.counter.lock().expect("lock");
        *counter += 1;
        let mut bytes: [u8; 12] = [0; 12];
        bytes[..4].copy_from_slice(&((self.now.timestamp_millis() / 1000) as u32).to_be_bytes());
        bytes[4..9].copy_from_slice(&[0xa1, 0xb2, 0xc3, 0xd4, 0xe5]);
        bytes[9..].copy_from_slice(&counter.to_be_bytes()[1..]);
        ObjectId::from_bytes(bytes)
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
        (Err(error), Some(ts)) => same_error(&error, ts),
        (Ok(value), Some(ts)) => Some(format!("rust returned {value:?}, ts failed with {ts}")),
        (Err(error), None) => Some(format!("rust failed with {error:?}, ts returned {}", scenario["result"])),
    }
}

/// The same translation key, or with none on either side, the same message.
fn same_error(error: &ProsopoError, ts: &Value) -> Option<String> {
    let ts_key: Option<&str> = ts["translationKey"].as_str();
    match (error.translation_key(), ts_key) {
        (None, None) => (Some(error.message()) != ts["message"].as_str())
            .then(|| format!("message {:?}, ts {}", error.message(), ts["message"])),
        (key, ts_key) => (key != ts_key).then(|| format!("error {key:?}, ts {ts_key:?}")),
    }
}

/// A number as the JS number the TS holds: its recorded result says `$numberLong` for a whole
/// number past int32 that mongod holds as a double.
fn as_js(value: Bson) -> Bson {
    match value {
        Bson::Int32(n) => Bson::Double(f64::from(n)),
        Bson::Int64(n) => Bson::Double(n as f64),
        Bson::Array(items) => Bson::Array(items.into_iter().map(as_js).collect()),
        Bson::Document(fields) => Bson::Document(fields.into_iter().map(|(key, value)| (key, as_js(value))).collect()),
        other => other,
    }
}

/// Raw documents, their numbers compared as JS numbers. A live run's upserts get ids of their
/// own from mongod, so there the top-level `_id` is left out of the comparison; the replay
/// compares it too.
fn check_documents(scenario: &Value, actual: Result<Vec<Document>, ProsopoError>, live: bool) -> Option<String> {
    let strip = |documents: Vec<Document>| -> Vec<Bson> {
        documents
            .into_iter()
            .map(|mut document| {
                if live {
                    document.remove("_id");
                }
                as_js(Bson::Document(document))
            })
            .collect()
    };
    match (actual, scenario.get("error")) {
        (Ok(documents), None) => {
            let expected: Vec<Bson> = strip(ts_result(scenario));
            let documents: Vec<Bson> = strip(documents);
            (documents != expected).then(|| format!("documents\n      rust {documents:?}\n      ts   {expected:?}"))
        }
        (actual, _) => check(scenario, actual),
    }
}

/// A unit result, which the TS records as null.
fn check_unit(scenario: &Value, actual: Result<(), ProsopoError>) -> Option<String> {
    match (actual, scenario.get("error")) {
        (Ok(()), None) => None,
        (Err(error), Some(ts)) => same_error(&error, ts),
        (Ok(()), Some(ts)) => Some(format!("rust succeeded, ts failed with {ts}")),
        (Err(error), None) => Some(format!("rust failed with {error:?}")),
    }
}

fn optional_number(value: &Value) -> Option<f64> {
    value.as_f64()
}

/// The arguments as BSON, from their canonical extended JSON.
fn bson_args(scenario: &Value) -> Vec<Bson> {
    scenario["args"]
        .as_array()
        .expect("args")
        .iter()
        .map(|arg| Bson::try_from(arg.clone()).expect("extended JSON"))
        .collect()
}

fn given(args: &[Bson], index: usize) -> Option<&Bson> {
    args.get(index).filter(|value| !matches!(value, Bson::Undefined | Bson::Null))
}

fn bson_str(value: &Bson) -> &str {
    value.as_str().expect("a string")
}

fn bson_f64(value: &Bson) -> f64 {
    match value {
        Bson::Int32(n) => f64::from(*n),
        Bson::Int64(n) => *n as f64,
        Bson::Double(n) => *n,
        other => panic!("not a number: {other}"),
    }
}

fn ip_half(value: &Bson) -> IpHalf {
    match value {
        Bson::Document(tagged) => IpHalf(tagged.get_str("$bigint").expect("a bigint").parse().expect("u64")),
        other => IpHalf::from_bson(other).expect("an IP half"),
    }
}

fn ip_address(value: &Bson) -> CompositeIpAddress {
    let fields: &Document = value.as_document().expect("an address");
    CompositeIpAddress {
        lower: ip_half(fields.get("lower").expect("lower")),
        upper: fields.get("upper").map(ip_half),
        ip_type: fields.get_str("type").expect("type").parse().expect("v4 or v6"),
    }
}

fn components(value: &Bson) -> PoWChallengeComponents {
    let fields: &Document = value.as_document().expect("components");
    PoWChallengeComponents {
        requested_at_timestamp: JsNumber(bson_f64(fields.get("requestedAtTimestamp").expect("timestamp"))),
        user_account: fields.get_str("userAccount").expect("user").to_string(),
        dapp_account: fields.get_str("dappAccount").expect("dapp").to_string(),
    }
}

fn stored_result(value: &Bson) -> StoredResult {
    let fields: &Document = value.as_document().expect("a result");
    StoredResult::new(
        fields.get_str("status").expect("status").parse().expect("a status"),
        fields.get_str("reason").ok(),
    )
}

fn coords(value: Option<&Bson>) -> Option<Coords> {
    value.map(|value| {
        value
            .as_array()
            .expect("coords")
            .iter()
            .map(|path| {
                path.as_array()
                    .expect("a path")
                    .iter()
                    .map(|point| point.as_array().expect("a point").iter().map(bson_f64).collect())
                    .collect()
            })
            .collect()
    })
}

fn date(value: Option<&Bson>) -> Option<DateTime> {
    value.map(|value| *value.as_datetime().expect("a date"))
}

/// A document argument, with each recorded bigint as the Decimal128 a Rust `IpHalf` writes.
fn document(value: &Bson) -> Document {
    fn translate(value: &Bson) -> Bson {
        match value {
            Bson::Document(fields) if fields.contains_key("$bigint") => ip_half(value).to_bson(),
            Bson::Document(fields) => Bson::Document(fields.iter().map(|(k, v)| (k.clone(), translate(v))).collect()),
            Bson::Array(items) => Bson::Array(items.iter().map(translate).collect()),
            other => other.clone(),
        }
    }
    match translate(value) {
        Bson::Document(document) => document,
        other => panic!("not a document: {other}"),
    }
}

fn new_challenge<'a>(
    args: &'a [Bson],
    parts: &'a PoWChallengeComponents,
    address: &'a CompositeIpAddress,
    headers: &'a Document,
    at: usize,
) -> NewChallenge<'a> {
    NewChallenge {
        challenge: bson_str(&args[0]),
        components: parts,
        provider_signature: bson_str(&args[at]),
        ip_address: address,
        headers,
        ja4: bson_str(&args[at + 3]),
        session_id: given(args, at + 4).map(bson_str),
        ip_info: None,
    }
}

fn interactive(method: &str) -> Option<Interactive> {
    if method.contains("Puzzle") {
        Some(Interactive::Puzzle)
    } else if method.contains("IconOrder") {
        Some(Interactive::IconOrder)
    } else if method.contains("Audio") {
        Some(Interactive::Audio)
    } else {
        None
    }
}

async fn run_challenge_scenario(db: &ProviderDatabase, scenario: &Value, live: bool) -> Option<Option<String>> {
    let b: Vec<Bson> = bson_args(scenario);
    let method: &str = scenario["method"].as_str().expect("method");
    let outcome: Option<String> = match method {
        "storePowCaptchaRecord" => {
            let (parts, address, headers) = (components(&b[1]), ip_address(&b[4]), document(&b[5]));
            let mut new: NewChallenge = new_challenge(&b, &parts, &address, &headers, 3);
            new.ip_info = given(&b, 11);
            check_unit(
                scenario,
                db.store_pow_captcha_record(
                    &new,
                    bson_f64(&b[2]),
                    given(&b, 8).and_then(Bson::as_bool).unwrap_or(false),
                    given(&b, 9).and_then(Bson::as_bool).unwrap_or(false),
                    given(&b, 10).map(bson_str),
                )
                .await,
            )
        }
        "getPowCaptchaRecordByChallenge" => check(scenario, db.get_pow_captcha_record_by_challenge(bson_str(&b[0])).await),
        "updatePowCaptchaRecordResult" => check_unit(
            scenario,
            db.update_pow_captcha_record_result(
                bson_str(&b[0]),
                &stored_result(&b[1]),
                given(&b, 2).and_then(Bson::as_bool).unwrap_or(false),
                given(&b, 3).and_then(Bson::as_bool).unwrap_or(false),
                given(&b, 4).map(bson_str),
                coords(given(&b, 5)).as_ref(),
            )
            .await,
        ),
        "updatePowCaptchaRecord" => check_unit(scenario, db.update_pow_captcha_record(bson_str(&b[0]), &document(&b[1])).await),
        "getUnstoredDappUserPoWCommitments" => check_documents(
            scenario,
            db.get_unstored_dapp_user_pow_commitments(given(&b, 0).map(bson_f64), given(&b, 1)).await,
            live,
        ),
        "markDappUserPoWCommitmentsStored" => check_unit(
            scenario,
            db.mark_dapp_user_pow_commitments_stored(&bson_strings(&b[0]), date(given(&b, 1))).await,
        ),
        "markDappUserPoWCommitmentsChecked" => check(scenario, db.mark_dapp_user_pow_commitments_checked(&bson_strings(&b[0])).await),
        "countCommitmentsByNormalisedEmail" => check(
            scenario,
            db.count_commitments_by_normalised_email(bson_str(&b[0]), bson_str(&b[1])).await,
        ),
        method if method.starts_with("store") => {
            let kind: Interactive = interactive(method)?;
            let (answer, at): (InteractiveAnswer, usize) = match kind {
                Interactive::Puzzle => (
                    InteractiveAnswer::Puzzle {
                        target_x: bson_f64(&b[2]),
                        target_y: bson_f64(&b[3]),
                        origin_x: bson_f64(&b[4]),
                        origin_y: bson_f64(&b[5]),
                        tolerance: bson_f64(&b[6]),
                    },
                    7,
                ),
                Interactive::Audio => (InteractiveAnswer::Audio { answer: bson_str(&b[2]).to_string() }, 3),
                Interactive::IconOrder => (
                    InteractiveAnswer::IconOrder {
                        targets: bson::deserialize_from_bson(b[2].clone()).expect("targets"),
                        tolerance: bson_f64(&b[3]),
                    },
                    4,
                ),
            };
            let (parts, address, headers) = (components(&b[1]), ip_address(&b[at + 1]), document(&b[at + 2]));
            let mut new: NewChallenge = new_challenge(&b, &parts, &address, &headers, at);
            new.ip_info = given(&b, at + 5);
            check_unit(scenario, db.store_interactive_captcha_record(&new, &answer).await)
        }
        method if method.starts_with("get") && method.ends_with("CaptchaRecordByChallenge") => {
            check(scenario, db.get_interactive_captcha_record_by_challenge(interactive(method)?, bson_str(&b[0])).await)
        }
        method if method.starts_with("claim") => {
            check(scenario, db.claim_interactive_captcha_submission(interactive(method)?, bson_str(&b[0])).await)
        }
        method if method.ends_with("CaptchaRecordResult") => check_unit(
            scenario,
            db.update_interactive_captcha_record_result(
                interactive(method)?,
                bson_str(&b[0]),
                &stored_result(&b[1]),
                given(&b, 2).and_then(Bson::as_bool).unwrap_or(false),
                given(&b, 3).and_then(Bson::as_bool).unwrap_or(false),
                given(&b, 4).map(bson_str),
                coords(given(&b, 5)).as_ref(),
                date(given(&b, 6)),
            )
            .await,
        ),
        method if method.starts_with("update") && method.ends_with("CaptchaRecord") => check_unit(
            scenario,
            db.update_interactive_captcha_record(interactive(method)?, bson_str(&b[0]), &document(&b[1])).await,
        ),
        method if method.starts_with("mark") && method.ends_with("RecordChecked") => {
            check(scenario, db.mark_interactive_captcha_record_checked(interactive(method)?, bson_str(&b[0])).await)
        }
        _ => return None,
    };
    Some(outcome)
}

fn opt_str(fields: &Document, key: &str) -> Option<String> {
    fields.get_str(key).ok().map(str::to_string)
}

fn opt_date(fields: &Document, key: &str) -> Option<DateTime> {
    fields.get_datetime(key).ok().copied()
}

/// A `UserCommitment` from the TS object the generator passed.
fn user_commitment(value: &Bson) -> UserCommitment {
    let f: &Document = value.as_document().expect("a commitment");
    UserCommitment {
        user_account: f.get_str("userAccount").expect("user").to_string(),
        dapp_account: f.get_str("dappAccount").expect("dapp").to_string(),
        dataset_id: f.get_str("datasetId").expect("dataset").to_string(),
        provider_account: f.get_str("providerAccount").expect("provider").to_string(),
        id: f.get_str("id").expect("id").to_string(),
        result: stored_result(f.get("result").expect("result")),
        user_signature: f.get_str("userSignature").expect("signature").to_string(),
        ip_address: ip_address(f.get("ipAddress").expect("ip")),
        provided_ip: f.get("providedIp").map(ip_address),
        metadata: f.get("metadata").map(|m| bson::deserialize_from_bson(m.clone()).expect("metadata")),
        client_meta_data: f.get("clientMetaData").map(|m| bson::deserialize_from_bson(m.clone()).expect("client metadata")),
        headers: f.get_document("headers").expect("headers").clone(),
        ja4: f.get_str("ja4").expect("ja4").to_string(),
        user_submitted: f.get_bool("userSubmitted").expect("submitted"),
        server_checked: f.get_bool("serverChecked").expect("checked"),
        ip_info: f.get("ipInfo").cloned(),
        parsed_user_agent_info: f.get("parsedUserAgentInfo").cloned(),
        stored_at_timestamp: opt_date(f, "storedAtTimestamp"),
        requested_at_timestamp: *f.get_datetime("requestedAtTimestamp").expect("requested"),
        submitted_at_timestamp: opt_date(f, "submittedAtTimestamp"),
        verified_at_timestamp: opt_date(f, "verifiedAtTimestamp"),
        failed_at_timestamp: opt_date(f, "failedAtTimestamp"),
        last_updated_timestamp: opt_date(f, "lastUpdatedTimestamp"),
        pending_stage: f.get_bool("pendingStage").ok(),
        session_id: opt_str(f, "sessionId"),
        coords: coords(f.get("coords")),
        input_methods: f.get("inputMethods").map(|m| bson::deserialize_from_bson(m.clone()).expect("input methods")),
        pending: f.get_bool("pending").expect("pending"),
        salt: f.get_str("salt").expect("salt").to_string(),
        request_hash: f.get_str("requestHash").expect("hash").to_string(),
        deadline_timestamp: *f.get_datetime("deadlineTimestamp").expect("deadline"),
        threshold: bson_f64(f.get("threshold").expect("threshold")),
        device_capability: opt_str(f, "deviceCapability"),
        behavioral_data_packed: f.get("behavioralDataPacked").cloned(),
        label: f.get_str("label").ok().map(|label| label.parse().expect("a label")),
        label_reason: opt_str(f, "labelReason"),
        labelled_by: opt_str(f, "labelledBy"),
        labelled_at: opt_date(f, "labelledAt"),
    }
}

async fn run_image_scenario(db: &ProviderDatabase, scenario: &Value, live: bool) -> Option<Option<String>> {
    let b: Vec<Bson> = bson_args(scenario);
    let method: &str = scenario["method"].as_str().expect("method");
    let outcome: Option<String> = match method {
        "storePendingImageCommitment" => check_unit(
            scenario,
            db.store_pending_image_commitment(
                bson_str(&b[0]),
                bson_str(&b[1]),
                bson_str(&b[2]),
                *b[3].as_datetime().expect("deadline"),
                *b[4].as_datetime().expect("requested"),
                &ip_address(&b[5]),
                bson_f64(&b[6]),
                given(&b, 7).map(bson_str),
                given(&b, 8),
            )
            .await,
        ),
        "getPendingImageCommitment" => check(scenario, db.get_pending_image_commitment(bson_str(&b[0])).await),
        "updatePendingImageCommitmentStatus" => check(scenario, db.update_pending_image_commitment_status(bson_str(&b[0])).await),
        "storeUserImageCaptchaSolution" => {
            let solutions: Vec<CaptchaSolution> = bson::deserialize_from_bson(b[0].clone()).expect("solutions");
            check_unit(scenario, db.store_user_image_captcha_solution(&solutions, &user_commitment(&b[1])).await)
        }
        "getDappUserCommitmentById" => check(scenario, db.get_dapp_user_commitment_by_id(bson_str(&b[0])).await),
        "getDappUserCommitmentByAccount" => {
            check(scenario, db.get_dapp_user_commitment_by_account(bson_str(&b[0]), bson_str(&b[1])).await)
        }
        "getAllDappUserSolutions" => check(scenario, db.get_all_dapp_user_solutions(&bson_strings(&b[0])).await),
        "getDappUserSolutionById" => check(scenario, db.get_dapp_user_solution_by_id(bson_str(&b[0])).await),
        "approveDappUserCommitment" => {
            check_unit(scenario, db.approve_dapp_user_commitment(bson_str(&b[0]), coords(given(&b, 1)).as_ref()).await)
        }
        "disapproveDappUserCommitment" => check_unit(
            scenario,
            db.disapprove_dapp_user_commitment(bson_str(&b[0]), given(&b, 1).map(bson_str), coords(given(&b, 2)).as_ref()).await,
        ),
        "updateDappUserCommitment" => check_unit(scenario, db.update_dapp_user_commitment(bson_str(&b[0]), &document(&b[1])).await),
        "getCheckedDappUserCommitments" => check_documents(scenario, db.get_checked_dapp_user_commitments().await, live),
        "getUnstoredDappUserCommitments" => check_documents(
            scenario,
            db.get_unstored_dapp_user_commitments(given(&b, 0).map(bson_f64), given(&b, 1)).await,
            live,
        ),
        "markDappUserCommitmentsStored" => {
            check_unit(scenario, db.mark_dapp_user_commitments_stored(&bson_strings(&b[0]), date(given(&b, 1))).await)
        }
        "markDappUserCommitmentsChecked" => check(scenario, db.mark_dapp_user_commitments_checked(&bson_strings(&b[0])).await),
        "flagProcessedDappUserSolutions" => check_unit(scenario, db.flag_processed_dapp_user_solutions(&bson_strings(&b[0])).await),
        "flagProcessedDappUserCommitments" => {
            check_unit(scenario, db.flag_processed_dapp_user_commitments(&bson_strings(&b[0])).await)
        }
        _ => return None,
    };
    Some(outcome)
}

fn session(value: &Bson) -> Session {
    bson::deserialize_from_document(document(value)).expect("a session")
}

fn dns_observation(value: &Bson) -> DnsObservation {
    let fields: &Document = value.as_document().expect("an observation");
    DnsObservation {
        resolver_ip: fields.get_str("resolverIp").ok().map(str::to_string),
        peer_ip: fields.get_str("peerIp").ok().map(str::to_string),
        path_valid: fields.get_bool("pathValid").ok(),
    }
}

async fn run_session_scenario(db: &ProviderDatabase, scenario: &Value, live: bool) -> Option<Option<String>> {
    let b: Vec<Bson> = bson_args(scenario);
    let method: &str = scenario["method"].as_str().expect("method");
    let outcome: Option<String> = match method {
        "storeSessionRecord" => check_unit(scenario, db.store_session_record(&session(&b[0])).await),
        "storeBlockedSession" => {
            db.store_blocked_session(&session(&b[0])).await;
            check_unit(scenario, Ok(()))
        }
        "getSessionRecordBySessionId" => check(scenario, db.get_session_record_by_session_id(bson_str(&b[0])).await),
        "getSessionRecordByToken" => check(scenario, db.get_session_record_by_token(bson_str(&b[0])).await),
        "getSessionByuserSitekeyIpHash" => check(scenario, db.get_session_by_user_sitekey_ip_hash(bson_str(&b[0])).await),
        "checkAndRemoveSession" => check(scenario, db.check_and_remove_session(bson_str(&b[0])).await),
        "claimSessionServerCheck" => check(scenario, db.claim_session_server_check(bson_str(&b[0])).await),
        "updateSessionRecord" => check_unit(scenario, db.update_session_record(bson_str(&b[0]), &document(&b[1]), given(&b, 2).and_then(Bson::as_bool).unwrap_or(false)).await),
        "recordSessionSimdReadingsIfAbsent" => check_unit(
            scenario,
            db.record_session_simd_readings_if_absent(bson_str(&b[0]), &b[1], bson_str(&b[2]).parse().expect("a stage")).await,
        ),
        "mergeSessionDnsEvent" => check(
            scenario,
            db.merge_session_dns_event(bson_str(&b[0]), &dns_observation(&b[1]), *b[2].as_datetime().expect("a date")).await,
        ),
        "getUnstoredSessionRecords" => check_documents(
            scenario,
            db.get_unstored_session_records(given(&b, 0).map(bson_f64), given(&b, 1)).await,
            live,
        ),
        "markSessionRecordsStored" => {
            check_unit(scenario, db.mark_session_records_stored(&bson_strings(&b[0]), date(given(&b, 1))).await)
        }
        _ => return None,
    };
    Some(outcome)
}

/// As [`check`], each side first passed through `normalise`.
fn check_normalised<T: DeserializeOwned + PartialEq + Debug>(scenario: &Value, actual: Result<T, ProsopoError>, normalise: impl Fn(T) -> T) -> Option<String> {
    match (actual, scenario.get("error")) {
        (Ok(value), None) => {
            let value: T = normalise(value);
            let expected: T = normalise(ts_result(scenario));
            (value != expected).then(|| format!("result\n      rust {value:?}\n      ts   {expected:?}"))
        }
        (actual, _) => check(scenario, actual),
    }
}

fn decode_arg<T: DeserializeOwned>(value: &Bson) -> T {
    bson::deserialize_from_document(document(value)).expect("an argument of the type")
}

/// An artifact a live run upserted has an id mongod gave it; there the ids are not compared.
fn artifact_ids(live: bool) -> impl Fn(Option<DecisionMachineArtifact>) -> Option<DecisionMachineArtifact> {
    move |artifact| artifact.map(|artifact| DecisionMachineArtifact { id: if live { None } else { artifact.id }, ..artifact })
}

async fn run_admin_scenario(db: &ProviderDatabase, scenario: &Value, live: bool) -> Option<Option<String>> {
    let b: Vec<Bson> = bson_args(scenario);
    let method: &str = scenario["method"].as_str().expect("method");
    let parse = |value: &Bson| bson_str(value).to_string();
    let outcome: Option<String> = match method {
        "createScheduledTaskStatus" => check(
            scenario,
            db.create_scheduled_task_status(parse(&b[0]).parse().expect("a task"), parse(&b[1]).parse().expect("a status")).await,
        ),
        "getScheduledTaskStatus" => check(
            scenario,
            db.get_scheduled_task_status(b[0].as_object_id().expect("an id"), parse(&b[1]).parse().expect("a status")).await,
        ),
        "getLastScheduledTaskStatus" => check(
            scenario,
            db.get_last_scheduled_task_status(
                parse(&b[0]).parse().expect("a task"),
                given(&b, 1).map(|status| bson_str(status).parse().expect("a status")),
            )
            .await,
        ),
        "updateScheduledTaskStatus" => {
            let result: Option<ScheduledTaskResult> = given(&b, 2).map(decode_arg);
            check_unit(
                scenario,
                db.update_scheduled_task_status(b[0].as_object_id().expect("an id"), parse(&b[1]).parse().expect("a status"), result.as_ref())
                    .await,
            )
        }
        "cleanupScheduledTaskStatus" => check_unit(scenario, db.cleanup_scheduled_task_status(parse(&b[0]).parse().expect("a status")).await),
        "updateClientRecords" => {
            let records: Vec<ClientRecord> = b[0].as_array().expect("records").iter().map(decode_arg).collect();
            check_unit(scenario, db.update_client_records(&records).await)
        }
        "removeClientRecords" => check_unit(scenario, db.remove_client_records(&bson_strings(&b[0])).await),
        "getAllClientRecords" => check(scenario, db.get_all_client_records().await),
        "getClientRecord" => check(scenario, db.get_client_record(bson_str(&b[0])).await),
        "upsertDecisionMachineArtifact" => check_unit(scenario, db.upsert_decision_machine_artifact(&decode_arg(&b[0])).await),
        "getDecisionMachineArtifact" => check_normalised(
            scenario,
            db.get_decision_machine_artifact(
                parse(&b[0]).parse().expect("a scope"),
                given(&b, 1).map(bson_str),
                given(&b, 2).map(|kind| bson_str(kind).parse().expect("a kind")),
            )
            .await,
            artifact_ids(live),
        ),
        "getAllDecisionMachineArtifacts" => check_normalised(scenario, db.get_all_decision_machine_artifacts().await, |artifacts: Vec<DecisionMachineArtifact>| {
            artifacts.into_iter().filter_map(|artifact| artifact_ids(live)(Some(artifact))).collect()
        }),
        "getDecisionMachineArtifactById" => check(scenario, db.get_decision_machine_artifact_by_id(bson_str(&b[0])).await),
        "removeDecisionMachineArtifact" => check(scenario, db.remove_decision_machine_artifact(bson_str(&b[0])).await),
        "removeAllDecisionMachineArtifacts" => check(scenario, db.remove_all_decision_machine_artifacts().await.map(|n| n as i64)),
        "bulkUpdateSpamEmailDomains" => {
            let domains: Vec<SpamEmailDomainUpdate> = b[0]
                .as_array()
                .expect("domains")
                .iter()
                .map(|entry| {
                    let entry: &Document = entry.as_document().expect("an entry");
                    SpamEmailDomainUpdate {
                        filter: entry.get_document("filter").and_then(|filter| filter.get_str("domain")).expect("a filter").to_string(),
                        update: entry.get_document("update").and_then(|update| update.get_str("domain")).expect("an update").to_string(),
                    }
                })
                .collect();
            check_unit(scenario, db.bulk_update_spam_email_domains(&domains, b[1].as_bool().expect("upsert")).await)
        }
        "getSpamEmailDomain" => check(scenario, db.get_spam_email_domain(bson_str(&b[0])).await),
        _ => return None,
    };
    Some(outcome)
}

fn documents(value: Option<&Bson>) -> Vec<Document> {
    value
        .and_then(Bson::as_array)
        .map(|items| items.iter().map(|item| item.as_document().cloned().expect("a record")).collect())
        .unwrap_or_default()
}

async fn run_central_scenario(central: &CaptchaDatabase, scenario: &Value, live: bool) -> Option<String> {
    let b: Vec<Bson> = bson_args(scenario);
    match scenario["method"].as_str().expect("method") {
        "saveCaptchas" => {
            let batch: CaptchaBatch = CaptchaBatch {
                sessions: documents(b.first()),
                commitments: documents(b.get(1)),
                pow: documents(b.get(2)),
                puzzle: documents(b.get(3)),
                icon_order: documents(b.get(4)),
                audio: documents(b.get(5)),
            };
            check_unit(scenario, central.save_captchas(&batch).await)
        }
        "getCaptchas" => {
            let filter: Document = given(&b, 0).map(document).unwrap_or_default();
            let as_ts = |records: CaptchaRecords| -> CaptchaRecords {
                let each = |documents: Vec<Document>| -> Vec<Document> {
                    documents
                        .into_iter()
                        .map(|mut document| {
                            if live {
                                document.remove("_id");
                            }
                            match as_js(Bson::Document(document)) {
                                Bson::Document(document) => document,
                                _ => unreachable!(),
                            }
                        })
                        .collect()
                };
                CaptchaRecords {
                    user_commitment_records: each(records.user_commitment_records),
                    pow_captcha_records: each(records.pow_captcha_records),
                    puzzle_captcha_records: each(records.puzzle_captcha_records),
                    audio_captcha_records: each(records.audio_captcha_records),
                    icon_order_captcha_records: each(records.icon_order_captcha_records),
                }
            };
            check_normalised(scenario, central.get_captchas(&filter, given(&b, 1).map(bson_f64)).await, as_ts)
        }
        other => Some(format!("no central method {other}")),
    }
}

fn bson_strings(value: &Bson) -> Vec<String> {
    value.as_array().expect("an array").iter().map(|item| bson_str(item).to_string()).collect()
}

async fn run_scenario(db: &ProviderDatabase, scenario: &Value, live: bool) -> Option<String> {
    if let Some(outcome) = run_challenge_scenario(db, scenario, live).await {
        return outcome;
    }
    if let Some(outcome) = run_image_scenario(db, scenario, live).await {
        return outcome;
    }
    if let Some(outcome) = run_session_scenario(db, scenario, live).await {
        return outcome;
    }
    if let Some(outcome) = run_admin_scenario(db, scenario, live).await {
        return outcome;
    }
    let a: Vec<Value> = args(scenario);
    match scenario["method"].as_str().expect("method") {
        "autoIndexed" => {
            db.auto_index().await;
            check_unit(scenario, Ok(()))
        }
        "ensureIndexes" => {
            db.ensure_indexes().await;
            check_unit(scenario, Ok(()))
        }
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

/// The databases one scenario runs against: the provider's, and the central one its streamer
/// and the sweep write to.
struct Databases {
    provider: ProviderDatabase,
    central: Arc<CaptchaDatabase>,
    streamer: Arc<CentralDbStreamer>,
}

impl Databases {
    fn new(local: Arc<dyn Executor>, central: Arc<dyn Executor>, source: Arc<ReplaySource>) -> Databases {
        let provider: ProviderDatabase = ProviderDatabase::new(local, source.clone(), get_logger(LogLevel::Error, "test"));
        let central_db = || CaptchaDatabase::with_executor(central.clone(), source.clone(), get_logger(LogLevel::Error, "test"));
        let streamer: Arc<CentralDbStreamer> = Arc::new(CentralDbStreamer::new(central_db(), get_logger(LogLevel::Error, "test")));
        Databases {
            provider,
            central: Arc::new(central_db()),
            streamer,
        }
    }

    /// The scenario's call, on the database its group names, with every record it streams sent.
    async fn run(&self, scenario: &Value, live: bool) -> Option<String> {
        match scenario["group"].as_str() {
            Some("central") => run_central_scenario(&self.central, scenario, live).await,
            Some("streaming") => {
                self.provider.set_central_db_streamer(self.streamer.clone());
                let outcome: Option<String> = run_scenario(&self.provider, scenario, live).await;
                self.streamer.idle().await;
                outcome
            }
            _ => run_scenario(&self.provider, scenario, live).await,
        }
    }
}

fn central_indexes_of_the_ts(scenarios: &[Value]) -> Vec<String> {
    let mut indexes: Vec<String> = scenarios
        .iter()
        .flat_map(|scenario| scenario["commands"].as_array().expect("commands").iter())
        .filter(|command| is_timed(command))
        .map(|command| to_hex(&from_hex(command["hex"].as_str().expect("hex"))))
        .collect();
    indexes.sort();
    indexes.dedup();
    indexes
}

#[tokio::test]
async fn methods_send_the_commands_the_ts_sends_and_return_what_it_returns() {
    let methods: Value = methods();
    let now: DateTime = DateTime::from_millis(methods["nowMs"].as_i64().expect("nowMs"));
    let mut failures: Vec<String> = Vec::new();
    let scenarios: &Vec<Value> = methods["scenarios"].as_array().expect("scenarios");
    let mut central_indexes: Vec<String> = Vec::new();
    for scenario in scenarios.iter().filter(|scenario| scenario["method"] != "__setup") {
        let local: Arc<ReplayExecutor> = Arc::new(ReplayExecutor::new(scenario, false));
        let central: Arc<ReplayExecutor> = Arc::new(ReplayExecutor::new(scenario, true));
        let source: Arc<ReplaySource> = Arc::new(ReplaySource::new(now, scenario));
        let databases: Databases = Databases::new(local.clone(), central.clone(), source.clone());
        let name: &str = scenario["name"].as_str().expect("name");
        if let Some(problem) = databases.run(scenario, false).await {
            failures.push(format!("{name}: {problem}"));
        }
        for (label, executor) in [("", &local), ("central: ", &central)] {
            for mismatch in executor.mismatches.lock().expect("lock").iter() {
                failures.push(format!("{name}: {label}{mismatch}"));
            }
            if executor.left_over() > 0 {
                failures.push(format!("{name}: {label}the TS sent {} more commands", executor.left_over()));
            }
        }
        central_indexes.extend(central.indexes.as_ref().expect("central").lock().expect("lock").iter().cloned());
        let unused: usize = source.random.lock().expect("lock").len();
        if unused > 0 {
            failures.push(format!("{name}: the TS drew {unused} more random numbers"));
        }
    }
    central_indexes.sort();
    central_indexes.dedup();
    if central_indexes != central_indexes_of_the_ts(scenarios) {
        failures.push(format!(
            "the central indexes differ: rust created {}, the ts {}",
            central_indexes.len(),
            central_indexes_of_the_ts(scenarios).len()
        ));
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
    let open = |name: &str| MongoDatabase::new(&url, Some(name), None, None, MongoConnectionTimeouts::default()).expect("a valid URL");
    let (mongo, central_mongo): (MongoDatabase, MongoDatabase) = (open("prosopo-test-database-methods"), open("prosopo-test-database-central"));
    mongo.connect().await.expect("connects");
    central_mongo.connect().await.expect("connects");
    let database = mongo.database().await.expect("open");
    let central_database = central_mongo.database().await.expect("open");
    database.drop().await.expect("drops");
    central_database.drop().await.expect("drops");
    let methods: Value = methods();
    let now: DateTime = DateTime::from_millis(methods["nowMs"].as_i64().expect("nowMs"));
    let mut failures: Vec<String> = Vec::new();
    for scenario in methods["scenarios"].as_array().expect("scenarios") {
        let name: &str = scenario["name"].as_str().expect("name");
        if scenario["method"] == "__setup" {
            for command in scenario["commands"].as_array().expect("commands") {
                let target = if is_central(command) { &central_database } else { &database };
                target.run_command(from_hex(command["hex"].as_str().expect("hex"))).await.expect("setup runs");
            }
            continue;
        }
        let recording = |on: &mongodb::Database| {
            Arc::new(RecordingExecutor {
                inner: crate::operation::DriverExecutor::new(on.clone()),
                sent: Mutex::new(Vec::new()),
            })
        };
        let (local, central): (Arc<RecordingExecutor>, Arc<RecordingExecutor>) = (recording(&database), recording(&central_database));
        let source: Arc<ReplaySource> = Arc::new(ReplaySource::new(now, scenario));
        let databases: Databases = Databases::new(local.clone(), central.clone(), source);
        let sampled: bool = sampled(scenario);
        if let Some(problem) = databases.run(scenario, true).await {
            let same_outcome: bool = !problem.starts_with("rust failed") && !problem.starts_with("rust returned");
            if !(sampled && same_outcome) {
                failures.push(format!("{name}: {problem}"));
            }
        }
        for (to_central, executor) in [(false, &local), (true, &central)] {
            let mut sent_hex: Vec<String> = executor
                .sent
                .lock()
                .expect("lock")
                .iter()
                .filter(|command| !(to_central && command.contains_key("createIndexes")))
                .map(|command| to_hex(&normalise(command)))
                .collect();
            let mut expected_hex: Vec<String> = scenario["commands"]
                .as_array()
                .expect("commands")
                .iter()
                .filter(|command| is_central(command) == to_central && !is_timed(command))
                .map(|command| to_hex(&normalise(&from_hex(command["hex"].as_str().expect("hex")))))
                .collect();
            if scenario["unordered"].as_bool().unwrap_or(false) {
                sent_hex.sort();
                expected_hex.sort();
            }
            if sent_hex != expected_hex {
                let label: &str = if to_central { "central" } else { "provider" };
                failures.push(format!("{name}: sent {} {label} commands that differ from the TS's {}", sent_hex.len(), expected_hex.len()));
            }
        }
    }
    database.drop().await.expect("drops");
    central_database.drop().await.expect("drops");
    mongo.close().await;
    central_mongo.close().await;
    assert!(failures.is_empty(), "{} problems:\n{}", failures.len(), failures.join("\n"));
}
