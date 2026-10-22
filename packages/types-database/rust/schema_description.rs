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

//! A schema described as mongoose describes one (`rust/equivalence/describe.ts`), so a Rust schema
//! can be checked against the mongoose schema it ports: its top-level keys, nested paths, and
//! every path's kind, constraints, default timing and subschema.

use crate::schema::{DefaultTiming, Kind, Path, Schema};
use serde_json::{json, Map, Value};

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
        Kind::Map(_) | Kind::ValueMap(_) => "Map".into(),
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
        "required": leaf.required || leaf.required_when.is_some(),
        "enumValues": enum_values,
        "min": number(leaf.min),
        "max": number(leaf.max),
        "default": timing,
        "expires": leaf.expires,
        "unique": leaf.unique.then_some(true),
        "schema": subschema.map(describe),
    })
}

pub fn describe(schema: &Schema) -> Value {
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
pub fn normalise(mut described: Value) -> Value {
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
pub fn first_difference(actual: &Value, expected: &Value, at: &str) -> Option<String> {
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
