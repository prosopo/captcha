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

//! Replays rust/equivalence/vectors.json, written by generate.ts from mongoose 9.10.3 on Node 24
//! against a real mongod: every schema's declaration as mongoose sees it, the document
//! `Model.create` sends and the one mongod stores (byte for byte), the validation errors, and
//! the indexes declared and created.

use crate::captcha::{
    STORED_AUDIO_CAPTCHA_RECORD, STORED_ICON_ORDER_CAPTCHA_RECORD, STORED_POW_CAPTCHA_RECORD,
    STORED_PUZZLE_CAPTCHA_RECORD, STORED_USER_COMMITMENT_RECORD,
};
use crate::client::{
    ACCOUNT, AUDIO_RENDER_SETTINGS, IP_VALIDATION_RULES, PUZZLE_RENDER_SETTINGS, TRAFFIC_CATEGORY_POLICY, USER_DATA,
    USER_SETTINGS,
};
use crate::document::{create, stored, Issue};
use crate::projection::SESSION_PROJECTION_FIELDS;
use crate::provider::{
    AUDIO_CAPTCHA_RECORD, BANNED_DOMAIN_RECORD, CAPTCHA_RECORD, CLIENT_CONTEXT_ENTROPY_RECORD, CLIENT_RECORD,
    DATASET_RECORD, DECISION_MACHINE_ARTIFACT_RECORD, ICON_ORDER_CAPTCHA_RECORD, POW_CAPTCHA_RECORD,
    PUZZLE_CAPTCHA_RECORD, SCHEDULED_TASK_RECORD, SESSION_RECORD, SOLUTION_RECORD, SPAM_EMAIL_DOMAIN_RECORD,
    USER_COMMITMENT_RECORD, USER_SOLUTION_RECORD,
};
use crate::schema::{DefaultTiming, Ids, Kind, Path, Schema};
use crate::update::{cast_filter, cast_update, UpdateMethod};
use bson::oid::ObjectId;
use bson::{Bson, DateTime, Document};
use serde_json::{json, Map, Value};

const VECTORS: &str = include_str!("equivalence/vectors.json");

fn vectors() -> Value {
    serde_json::from_str(VECTORS).expect("vectors.json parses")
}

fn schema_for(name: &str) -> &'static Schema {
    match name {
        "Client" => &CLIENT_RECORD,
        "Captcha" => &CAPTCHA_RECORD,
        "PoWCaptcha" => &POW_CAPTCHA_RECORD,
        "PuzzleCaptcha" => &PUZZLE_CAPTCHA_RECORD,
        "IconOrderCaptcha" => &ICON_ORDER_CAPTCHA_RECORD,
        "AudioCaptcha" => &AUDIO_CAPTCHA_RECORD,
        "UserCommitment" => &USER_COMMITMENT_RECORD,
        "Dataset" => &DATASET_RECORD,
        "Solution" => &SOLUTION_RECORD,
        "UserSolution" => &USER_SOLUTION_RECORD,
        "Scheduler" => &SCHEDULED_TASK_RECORD,
        "Session" => &SESSION_RECORD,
        "DecisionMachine" => &DECISION_MACHINE_ARTIFACT_RECORD,
        "ClientContextEntropy" => &CLIENT_CONTEXT_ENTROPY_RECORD,
        "SpamEmailDomain" => &SPAM_EMAIL_DOMAIN_RECORD,
        "BannedDomain" => &BANNED_DOMAIN_RECORD,
        "UserData" => &USER_DATA,
        "Account" => &ACCOUNT,
        "UserSettings" => &USER_SETTINGS,
        "IPValidationRules" => &IP_VALIDATION_RULES,
        "PuzzleRenderSettings" => &PUZZLE_RENDER_SETTINGS,
        "AudioRenderSettings" => &AUDIO_RENDER_SETTINGS,
        "TrafficCategoryPolicy" => &TRAFFIC_CATEGORY_POLICY,
        "StoredUserCommitment" => &STORED_USER_COMMITMENT_RECORD,
        "StoredPoWCaptcha" => &STORED_POW_CAPTCHA_RECORD,
        "StoredPuzzleCaptcha" => &STORED_PUZZLE_CAPTCHA_RECORD,
        "StoredAudioCaptcha" => &STORED_AUDIO_CAPTCHA_RECORD,
        "StoredIconOrderCaptcha" => &STORED_ICON_ORDER_CAPTCHA_RECORD,
        other => panic!("no schema for {other}"),
    }
}

/// The ids the generator's pinned bson mints: the pinned time, the pinned process bytes and a
/// counter from 1.
struct ReplayIds {
    seconds: u32,
    process_unique: [u8; 5],
    counter: u32,
    now: DateTime,
}

impl ReplayIds {
    fn new(vectors: &Value) -> ReplayIds {
        let now_ms: i64 = vectors["nowMs"].as_i64().expect("nowMs");
        let unique: Vec<u8> = hex::decode(vectors["processUnique"].as_str().expect("processUnique")).expect("hex");
        ReplayIds {
            seconds: (now_ms / 1000) as u32,
            process_unique: unique.try_into().expect("5 bytes"),
            counter: 0,
            now: DateTime::from_millis(now_ms),
        }
    }
}

impl Ids for ReplayIds {
    fn object_id(&mut self) -> ObjectId {
        self.counter += 1;
        let mut bytes: [u8; 12] = [0; 12];
        bytes[..4].copy_from_slice(&self.seconds.to_be_bytes());
        bytes[4..9].copy_from_slice(&self.process_unique);
        bytes[9..].copy_from_slice(&self.counter.to_be_bytes()[1..]);
        ObjectId::from_bytes(bytes)
    }

    fn now(&mut self) -> DateTime {
        self.now
    }
}

fn extended_json(document: &Document) -> String {
    Bson::Document(document.clone()).into_canonical_extjson().to_string()
}

/// Where two documents first differ, key order included.
fn document_difference(actual: &Bson, expected: &Bson, at: &str) -> Option<String> {
    match (actual, expected) {
        (Bson::Document(left), Bson::Document(right)) => {
            let left_keys: Vec<&String> = left.keys().collect();
            let right_keys: Vec<&String> = right.keys().collect();
            if left_keys != right_keys {
                return Some(format!("{at}: keys\n    rust     {left_keys:?}\n    mongoose {right_keys:?}"));
            }
            left.iter().find_map(|(key, value)| document_difference(value, &right[key], &format!("{at}.{key}")))
        }
        (Bson::Array(left), Bson::Array(right)) if left.len() == right.len() => left
            .iter()
            .zip(right.iter())
            .enumerate()
            .find_map(|(index, (l, r))| document_difference(l, r, &format!("{at}[{index}]"))),
        _ => {
            let left: String = actual.clone().into_canonical_extjson().to_string();
            let right: String = expected.clone().into_canonical_extjson().to_string();
            (left != right).then(|| format!("{at}: rust {left} vs mongoose {right}"))
        }
    }
}

fn from_hex(hex_bytes: &str) -> Document {
    Document::from_reader(hex::decode(hex_bytes).expect("hex").as_slice()).expect("a BSON document")
}

fn to_bytes(document: &Document) -> String {
    let mut bytes: Vec<u8> = Vec::new();
    document.to_writer(&mut bytes).expect("serialises");
    hex::encode(bytes)
}

#[test]
fn documents_are_the_bytes_mongoose_sends_and_mongod_stores() {
    let vectors: Value = vectors();
    let mut failures: Vec<String> = Vec::new();
    let mut checked: usize = 0;
    for (name, model) in vectors["models"].as_object().expect("models") {
        let schema: &Schema = schema_for(name);
        for (index, vector) in model["vectors"].as_array().expect("vectors").iter().enumerate() {
            let parsed = Bson::try_from(vector["input"].clone());
            let input: Document = match parsed.unwrap_or_else(|error| panic!("{name} #{index}: {error}: {}", vector["input"])) {
                Bson::Document(document) => document,
                other => panic!("{name} #{index}: input is not a document: {other:?}"),
            };
            let mut ids: ReplayIds = ReplayIds::new(&vectors);
            let outcome: &Value = &vector["outcome"];
            let actual = create(schema, &input, &mut ids);
            checked += 1;
            match (outcome.get("errors"), actual) {
                (Some(errors), Err(error)) => {
                    let expected: Vec<Issue> = errors
                        .as_array()
                        .expect("errors")
                        .iter()
                        .map(|pair| Issue {
                            path: pair[0].as_str().expect("path").to_string(),
                            kind: pair[1].as_str().expect("kind").to_string(),
                        })
                        .collect();
                    if expected != error.issues {
                        failures.push(format!("{name} #{index}: errors {:?}, mongoose {:?}", error.issues, expected));
                    }
                }
                (Some(errors), Ok(sent)) => {
                    failures.push(format!("{name} #{index}: accepted ({}) but mongoose refused: {errors}", extended_json(&sent)))
                }
                (None, Err(error)) => failures.push(format!("{name} #{index}: refused with {error}, mongoose accepted")),
                (None, Ok(sent)) => {
                    let expected_sent: &str = outcome["sent"].as_str().expect("sent");
                    if to_bytes(&sent) != expected_sent {
                        let difference: Option<String> = document_difference(
                            &Bson::Document(sent.clone()),
                            &Bson::Document(from_hex(expected_sent)),
                            "",
                        );
                        failures.push(format!(
                            "{name} #{index}: sent {}",
                            difference.unwrap_or_else(|| "differs only in its bytes".to_string())
                        ));
                        continue;
                    }
                    if let Some(expected_stored) = outcome.get("stored").and_then(Value::as_str) {
                        let stored: Document = stored(sent);
                        if to_bytes(&stored) != expected_stored {
                            failures.push(format!(
                                "{name} #{index}: stored\n  rust   {}\n  mongod {}",
                                extended_json(&stored),
                                extended_json(&from_hex(expected_stored))
                            ));
                        }
                    }
                }
            }
        }
    }
    assert!(checked > 3000, "only {checked} vectors");
    assert!(
        failures.is_empty(),
        "{} of {checked} differ:\n{}",
        failures.len(),
        failures.iter().take(12).cloned().collect::<Vec<String>>().join("\n")
    );
}

fn kind_name(kind: &Kind) -> String {
    match kind {
        Kind::String => "String".into(),
        Kind::Number => "Number".into(),
        Kind::Boolean => "Boolean".into(),
        Kind::Date => "Date".into(),
        Kind::ObjectId => "ObjectId".into(),
        Kind::Mixed => "Mixed".into(),
        Kind::IpHalf => "Decimal128".into(),
        Kind::Array(element) => format!("Array<{}>", kind_name(element)),
        Kind::DocumentArray(_) => "DocumentArray".into(),
        Kind::Subdocument(_) => "Embedded".into(),
        Kind::Map(_) => "Map".into(),
    }
}

fn describe_path(path: &str, leaf: &Path) -> Value {
    let enum_values: Value = match (&leaf.kind, &leaf.enum_values) {
        (Kind::String, Some(values)) => json!(values),
        (Kind::Array(element), Some(values)) if matches!(**element, Kind::String) => json!(values),
        _ => Value::Null,
    };
    let subschema: Option<&'static Schema> = match &leaf.kind {
        Kind::DocumentArray(schema) | Kind::Subdocument(schema) | Kind::Map(schema) => Some(schema),
        _ => None,
    };
    let timing: &str = match leaf.timing() {
        DefaultTiming::None => "none",
        DefaultTiming::Before if matches!(leaf.default, crate::schema::Default::Value(_)) && !matches!(leaf.kind, Kind::Array(_)) => {
            "value"
        }
        DefaultTiming::Before => "before",
        DefaultTiming::After => "after",
    };
    let number = |value: Option<f64>| -> Value {
        match value {
            Some(value) if value.fract() == 0.0 => json!(value as i64),
            Some(value) => json!(value),
            None => Value::Null,
        }
    };
    json!({
        "path": path,
        "kind": kind_name(&leaf.kind),
        "required": leaf.required,
        "enumValues": enum_values,
        "min": number(leaf.min),
        "max": number(leaf.max),
        "default": timing,
        "expires": leaf.expires,
        "unique": leaf.unique.then_some(true),
        "schema": subschema.map(describe),
    })
}

fn describe(schema: &Schema) -> Value {
    let paths: Vec<Value> = schema
        .paths()
        .iter()
        .map(|(path, leaf)| {
            let mut described: Value = describe_path(path, leaf);
            sort_enum(described.as_object_mut().expect("path"));
            described
        })
        .collect();
    json!({
        "tree": schema.tree_keys(),
        "nested": schema.nested_paths(),
        "timestamps": schema.timestamps,
        "paths": paths,
    })
}

/// mongoose's description, without what never holds a value while a document is built: the
/// `id` virtual and `__v`. A path's `required` is absent unless declared, which is `false`.
fn normalise(mut described: Value) -> Value {
    let holds_value = |key: &str, described: &Value| -> bool {
        let prefix: String = format!("{key}.");
        key != "__v"
            && described["paths"]
                .as_array()
                .is_some_and(|paths| paths.iter().any(|path| path["path"] == key || path["path"].as_str().is_some_and(|p| p.starts_with(&prefix))))
    };
    let tree: Vec<Value> = described["tree"]
        .as_array()
        .expect("tree")
        .iter()
        .filter(|key| holds_value(key.as_str().expect("key"), &described))
        .cloned()
        .collect();
    described["tree"] = Value::Array(tree);
    if let Some(paths) = described["paths"].as_array_mut() {
        paths.retain(|path| path["path"] != "__v" && !path["path"].as_str().is_some_and(|p| p.contains("$*")));
        for path in paths.iter_mut() {
            let entry: &mut Map<String, Value> = path.as_object_mut().expect("path");
            sort_enum(entry);
            if !entry.contains_key("required") || entry["required"].is_null() {
                entry.insert("required".into(), Value::Bool(false));
            }
            if let Some(Value::Object(_)) = entry.get("schema") {
                let inner: Value = entry["schema"].take();
                entry.insert("schema".into(), normalise(inner));
            }
        }
    }
    described
}

/// Where two JSON values first differ, as a path and the two values there. Key order is not
/// compared: it means nothing in a schema description.
fn first_difference(actual: &Value, expected: &Value, at: &str) -> Option<String> {
    match (actual, expected) {
        (Value::Object(left), Value::Object(right)) => {
            let mut left_keys: Vec<&String> = left.keys().collect();
            let mut right_keys: Vec<&String> = right.keys().collect();
            left_keys.sort();
            right_keys.sort();
            if left_keys != right_keys {
                return Some(format!("{at}: keys {left_keys:?} vs {right_keys:?}"));
            }
            left.iter().find_map(|(key, value)| first_difference(value, &right[key], &format!("{at}.{key}")))
        }
        (Value::Array(left), Value::Array(right)) => {
            let shared: Option<String> = left
                .iter()
                .zip(right.iter())
                .enumerate()
                .find_map(|(index, (l, r))| first_difference(l, r, &format!("{at}[{index}]")));
            shared.or_else(|| (left.len() != right.len()).then(|| format!("{at}: {} items vs {}", left.len(), right.len())))
        }
        _ => (actual != expected).then(|| format!("{at}: {actual} vs {expected}")),
    }
}

/// mongoose lists the values of a TS enum object in reverse; only membership matters.
fn sort_enum(entry: &mut Map<String, Value>) {
    if let Some(Value::Array(values)) = entry.get_mut("enumValues") {
        values.sort_by(|a, b| a.as_str().cmp(&b.as_str()));
    }
}

#[test]
fn every_schema_is_declared_as_mongoose_declares_it() {
    let vectors: Value = vectors();
    let mut failures: Vec<String> = Vec::new();
    for (name, model) in vectors["models"].as_object().expect("models") {
        let expected: Value = normalise(model["schema"].clone());
        let actual: Value = describe(schema_for(name));
        if let Some(difference) = first_difference(&actual, &expected, name) {
            failures.push(difference);
        }
    }
    assert!(failures.is_empty(), "rust vs mongoose:\n{}", failures.join("\n"));
}

fn index_json(keys: &[(String, i32)], options: &Document) -> Value {
    let keys: Document = keys.iter().map(|(key, direction)| (key.clone(), Bson::Int32(*direction))).collect();
    json!([
        Bson::Document(keys).into_canonical_extjson(),
        Bson::Document(options.clone()).into_canonical_extjson()
    ])
}

#[test]
fn every_schema_declares_the_indexes_mongoose_declares() {
    let vectors: Value = vectors();
    for (name, model) in vectors["models"].as_object().expect("models") {
        let actual: Vec<Value> = schema_for(name)
            .indexes()
            .iter()
            .map(|index| index_json(&index.keys, &index.options.to_document()))
            .collect();
        assert_eq!(Value::Array(actual), model["declaredIndexes"], "{name}");
    }
}

/// `listIndexes` after the index specs are created: version 2, the key, the driver's name
/// (`<key>_<direction>` joined by `_`) unless one is given, then the options.
#[test]
fn every_index_is_the_one_mongod_lists() {
    let vectors: Value = vectors();
    for (name, model) in vectors["models"].as_object().expect("models") {
        let Some(listed) = model["serverIndexes"].as_array() else {
            continue;
        };
        let mut expected: Vec<Value> = vec![json!({ "v": { "$numberInt": "2" }, "key": { "_id": { "$numberInt": "1" } }, "name": "_id_" })];
        for index in schema_for(name).indexes() {
            let mut spec: Document = Document::new();
            spec.insert("v", 2);
            spec.insert(
                "key",
                index.keys.iter().map(|(key, direction)| (key.clone(), Bson::Int32(*direction))).collect::<Document>(),
            );
            spec.insert("name", index.name());
            let mut options: Document = index.options.to_document();
            options.remove("name");
            spec.extend(options);
            expected.push(Bson::Document(spec).into_canonical_extjson());
        }
        assert_eq!(&Value::Array(expected), &Value::Array(listed.clone()), "{name}");
    }
}

#[test]
fn the_session_projection_is_the_ts_one() {
    let vectors: Value = vectors();
    let expected: Vec<String> = vectors["sessionProjection"].as_object().expect("projection").keys().cloned().collect();
    assert_eq!(SESSION_PROJECTION_FIELDS.to_vec(), expected);
}

fn input_document(value: &Value, what: &str) -> Document {
    match Bson::try_from(value.clone()).unwrap_or_else(|error| panic!("{what}: {error}")) {
        Bson::Document(document) => document,
        other => panic!("{what} is not a document: {other:?}"),
    }
}

/// What the Rust would put on the wire for one update: the cast filter and update, nothing (an
/// update cast to empty, which mongoose does not send), or a refusal.
enum Wire {
    Sent(Document),
    NotSent,
    Refused(String),
}

fn rust_update(schema: &Schema, method: &str, upsert: bool, filter: &Document, update: &Document, ids: &mut dyn Ids) -> Wire {
    let filter_cast: Document = match cast_filter(schema, filter, upsert, ids) {
        Ok(cast) => cast,
        Err(error) => return Wire::Refused(error.to_string()),
    };
    let update_method: UpdateMethod = match method {
        "updateOne" => UpdateMethod::UpdateOne,
        "updateMany" => UpdateMethod::UpdateMany,
        "bulkWrite" => UpdateMethod::BulkWriteUpdateOne,
        "findOneAndUpdate" => UpdateMethod::FindOneAndUpdate,
        other => panic!("no method {other}"),
    };
    let update_cast: Document = match cast_update(schema, update_method, update, &filter_cast, upsert, ids) {
        Ok(cast) => cast,
        Err(error) => return Wire::Refused(error.to_string()),
    };
    if update_cast.is_empty() {
        return if method == "bulkWrite" { Wire::Refused("Update document requires atomic operators".into()) } else { Wire::NotSent };
    }
    let mut statement: Document = Document::new();
    statement.insert("q", filter_cast);
    statement.insert("u", update_cast);
    Wire::Sent(statement)
}

/// mongoose applies an IP half's setter to an equality but not to an operand such as `$lte`, so a
/// JS bigint there cannot be cast and the query throws. The vectors hand the Rust a bigint as the
/// Decimal128 it is stored as (the Rust has no bigint: an IP half is that Decimal128), which casts.
/// No caller is affected: the one range query on IP halves (captchaSearch in captcha-private)
/// builds the Decimal128 itself. Logged as a DEVIATION; only this exact refusal is accepted here.
fn is_bigint_operand_on_an_ip_half(outcome: &Value) -> bool {
    outcome["error"].as_str().is_some_and(|error| {
        error.starts_with("CastError: Cast to Decimal128 failed for value")
            && error.contains("n\" (type bigint) at path \"ipAddress.")
    })
}

#[test]
fn updates_are_the_filters_and_updates_mongoose_sends() {
    let vectors: Value = vectors();
    let mut failures: Vec<String> = Vec::new();
    let mut checked: usize = 0;
    let mut bigint_operands: usize = 0;
    for (name, model) in vectors["models"].as_object().expect("models") {
        let schema: &Schema = schema_for(name);
        for (index, vector) in model["updates"].as_array().expect("updates").iter().enumerate() {
            let method: &str = vector["method"].as_str().expect("method");
            let upsert: bool = vector["upsert"].as_bool().expect("upsert");
            let filter: Document = input_document(&vector["filter"], "filter");
            let update: Document = input_document(&vector["update"], "update");
            let mut ids: ReplayIds = ReplayIds::new(&vectors);
            let actual: Wire = rust_update(schema, method, upsert, &filter, &update, &mut ids);
            let outcome: &Value = &vector["outcome"];
            checked += 1;
            let label: String = format!("{name} update #{index} ({method}, upsert {upsert})");
            match (actual, outcome) {
                (Wire::Sent(sent), outcome) if outcome.get("sent").is_some() => {
                    let expected: Document = from_hex(outcome["sent"]["hex"].as_str().expect("hex"));
                    if to_bytes(&sent) != to_bytes(&expected) {
                        let difference: Option<String> =
                            document_difference(&Bson::Document(sent.clone()), &Bson::Document(expected), "");
                        failures.push(format!("{label}: {}", difference.unwrap_or_else(|| "bytes differ".into())));
                    }
                }
                (Wire::NotSent, outcome) if outcome.get("notSent").is_some() => {}
                (Wire::Refused(_), outcome) if outcome.get("error").is_some() => {}
                (Wire::Sent(_), outcome) if is_bigint_operand_on_an_ip_half(outcome) => bigint_operands += 1,
                (Wire::Sent(sent), outcome) => failures.push(format!("{label}: rust sent {}, mongoose {outcome}", extended_json(&sent))),
                (Wire::NotSent, outcome) => failures.push(format!("{label}: rust sent nothing, mongoose {outcome}")),
                (Wire::Refused(why), outcome) => failures.push(format!("{label}: rust refused ({why}), mongoose {outcome}")),
            }
        }
    }
    assert!(checked > 1500, "only {checked} updates");
    assert!(bigint_operands <= 6, "{bigint_operands} bigint operands");
    assert!(
        failures.is_empty(),
        "{} of {checked} differ:\n{}",
        failures.len(),
        failures.iter().take(14).cloned().collect::<Vec<String>>().join("\n")
    );
}

#[test]
fn filters_inside_a_document_array_are_cast_as_mongoose_casts_them() {
    let vectors: Value = vectors();
    let mut failures: Vec<String> = Vec::new();
    let filters: &Vec<Value> = vectors["subpathFilters"].as_array().expect("subpathFilters");
    for (index, vector) in filters.iter().enumerate() {
        let model: &str = vector["model"].as_str().expect("model");
        let filter: Document = input_document(&vector["filter"], "filter");
        let mut ids: ReplayIds = ReplayIds::new(&vectors);
        let cast = cast_filter(schema_for(model), &filter, false, &mut ids);
        let label: String = format!("{model} filter #{index} {}", extended_json(&filter));
        match (cast, vector["outcome"].get("cast")) {
            (Ok(cast), Some(expected)) => {
                let expected: Document = from_hex(expected["hex"].as_str().expect("hex"));
                if to_bytes(&cast) != to_bytes(&expected) {
                    failures.push(format!("{label}: rust {}, mongoose {}", extended_json(&cast), extended_json(&expected)));
                }
            }
            (Err(_), None) => {}
            (cast, _) => failures.push(format!("{label}: rust {cast:?}, mongoose {}", vector["outcome"])),
        }
    }
    assert!(filters.len() >= 100, "only {} filters", filters.len());
    assert!(failures.is_empty(), "{} of {} differ:\n{}", failures.len(), filters.len(), failures.join("\n"));
}
