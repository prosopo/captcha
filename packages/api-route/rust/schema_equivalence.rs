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

//! Replays rust/equivalence/schema-vectors.json, written by generate-schema.ts: each zod
//! schema there is built here with the schema module under the same name, and every input
//! must give the same parsed output (same keys, same order) or the same issues.

use crate::schema::{
    any, array, boolean, coerce_number, coerce_string, custom_with_message, literal, native_enum,
    number, object, preprocess, record, record_with_keys, string, string_enum, tuple, undefined,
    union, Data, IssueData, Schema,
};
use serde::Deserialize;
use serde_json::{json, Map, Value};
use std::collections::BTreeMap;

const VECTORS: &str = include_str!("equivalence/schema-vectors.json");

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Vectors {
    schemas: Vec<String>,
    vectors: Vec<Vector>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Input {
    #[serde(default, deserialize_with = "present")]
    value: Option<Value>,
}

/// A present `"value": null` is the input `null`, not an absent value.
fn present<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<Option<Value>, D::Error> {
    Value::deserialize(deserializer).map(Some)
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum Expected {
    Ok {
        ok: Value,
    },
    OkUndefined {
        #[serde(rename = "okUndefined")]
        _ok_undefined: bool,
    },
    Issues {
        issues: Value,
    },
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Vector {
    schema: String,
    input: Input,
    result: Expected,
}

fn no_control_characters(value: &str) -> bool {
    !value
        .chars()
        .any(|c| ('\u{0}'..='\u{1f}').contains(&c) || c == '\u{7f}')
}

fn battery() -> BTreeMap<&'static str, Schema> {
    let mut schemas: BTreeMap<&'static str, Schema> = BTreeMap::new();
    schemas.insert("str", string());
    schemas.insert("strBounds", string().min(2.0).max(5.0));
    schemas.insert("strLength", string().length(3));
    schemas.insert("email", string().email());
    schemas.insert("url", string().url());
    schemas.insert(
        "regex",
        string().regex_with_message(no_control_characters, "must not contain control characters"),
    );
    schemas.insert("startsWith", string().starts_with("0x"));
    schemas.insert("endsWith", string().ends_with(".js"));
    schemas.insert("includes", string().includes("ab"));
    schemas.insert("trimLower", string().trim().to_lower_case().min(1.0));
    schemas.insert("maxMessage", string().max_with_message(3.0, "too long"));
    schemas.insert("num", number());
    schemas.insert("intPositive", number().int().positive());
    schemas.insert("numRange", number().min(1.0).max(10.0));
    schemas.insert("nonnegative", number().nonnegative());
    schemas.insert("gtLt", number().gt(0.0).lt(1.0));
    schemas.insert("finite", number().finite());
    schemas.insert("coerceNumber", coerce_number());
    schemas.insert("coerceDefault", coerce_number().optional().default(42));
    schemas.insert("coerceString", coerce_string());
    schemas.insert("bool", boolean());
    schemas.insert("literalString", literal("dns"));
    schemas.insert("literalNumber", literal(3));
    schemas.insert("stringEnum", string_enum(&["a", "b"]));
    schemas.insert("nativeEnum", native_enum(&["a", "b"]));
    schemas.insert("nativeNumberEnum", native_enum(&[1, 2]));
    schemas.insert(
        "object",
        object(vec![
            ("a", string()),
            ("b", number().optional()),
            ("c", boolean().default(true)),
        ]),
    );
    schemas.insert("objectStrict", object(vec![("a", string())]).strict());
    schemas.insert(
        "objectPassthrough",
        object(vec![("a", string())]).passthrough(),
    );
    schemas.insert(
        "objectCatchall",
        object(vec![("a", string())]).catchall(number()),
    );
    schemas.insert(
        "objectNested",
        object(vec![
            ("inner", object(vec![("x", number())])),
            ("list", array(string()).max(2.0)),
        ]),
    );
    schemas.insert(
        "objectExtendMergePartial",
        object(vec![("a", string()), ("b", number())])
            .extend(vec![("b", string()), ("d", boolean())])
            .merge(&object(vec![("e", number().default(1))]))
            .partial(),
    );
    schemas.insert("array", array(number()).min(1.0).max(3.0));
    schemas.insert("arrayLength", array(number()).length(2));
    schemas.insert("tuple", tuple(vec![string(), number()]));
    schemas.insert("record", record(number()));
    schemas.insert("recordKeys", record_with_keys(string().min(2.0), boolean()));
    schemas.insert(
        "union",
        union(vec![string().max(3.0), array(number()).max(2.0)]),
    );
    schemas.insert("unionDirty", union(vec![string().min(5.0), number()]));
    schemas.insert(
        "unionTwoDirty",
        union(vec![string().min(5.0), string().max(2.0)]),
    );
    schemas.insert(
        "transformDirty",
        string().min(3.0).transform(|value, _ctx| {
            value
                .as_ref()
                .and_then(Value::as_str)
                .map(|s| Value::from(s.encode_utf16().count()))
        }),
    );
    schemas.insert(
        "intersection",
        object(vec![("a", string())]).and(object(vec![("b", number())])),
    );
    schemas.insert("optional", string().optional());
    schemas.insert("nullable", string().nullable());
    schemas.insert("nullish", string().nullish());
    schemas.insert("default", string().default("x"));
    schemas.insert(
        "refine",
        string().refine(
            |value: &Data| {
                value
                    .as_ref()
                    .and_then(Value::as_str)
                    .is_some_and(|s| s.encode_utf16().count() % 2 == 0)
            },
            Some("even".to_string()),
        ),
    );
    schemas.insert(
        "refineNoMessage",
        number().refine(
            |value: &Data| {
                value
                    .as_ref()
                    .and_then(Value::as_f64)
                    .is_some_and(|n| n > 0.0)
            },
            None,
        ),
    );
    schemas.insert(
        "superRefine",
        object(vec![("a", number()), ("b", number())]).super_refine(|value, ctx| {
            let field = |key: &str| {
                value
                    .as_ref()
                    .and_then(|object| object.get(key))
                    .and_then(Value::as_f64)
                    .unwrap_or(f64::NAN)
            };
            if field("a") > field("b") {
                ctx.add_issue(
                    IssueData::code("custom")
                        .with("message", "a>b")
                        .with("path", json!(["a"])),
                );
            }
        }),
    );
    schemas.insert(
        "transform",
        string().transform(|value, _ctx| {
            value
                .as_ref()
                .and_then(Value::as_str)
                .map(|s| Value::from(s.encode_utf16().count()))
        }),
    );
    schemas.insert(
        "preprocess",
        preprocess(
            |value, _ctx| match value {
                Some(Value::Number(n)) => Some(json!({ "n": n })),
                other => other,
            },
            object(vec![("n", number())]),
        ),
    );
    schemas.insert(
        "boundedArray",
        custom_with_message(
            |value: &Data| match value {
                Some(Value::Array(items)) => items.len() <= 2,
                _ => true,
            },
            "Array must contain at most 2 element(s)",
        )
        .pipe(array(string()).max(2.0)),
    );
    schemas.insert("any", any());
    schemas.insert("undefinedOnly", undefined());
    schemas.insert("stringOrUndefined", union(vec![string(), undefined()]));
    schemas.insert(
        "objectWithUndefinedUnion",
        object(vec![("id", union(vec![string(), undefined()]))]),
    );
    schemas.insert("arrayOfOptional", array(string().optional()));
    schemas
}

/// Same JSON, with object keys in the same order and numbers compared by value, because
/// serde_json and `JSON.stringify` write some numbers differently (`1e21` vs `1e+21`).
fn same_json(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
        (Value::Array(a), Value::Array(b)) => {
            a.len() == b.len() && a.iter().zip(b).all(|(a, b)| same_json(a, b))
        }
        (Value::Object(a), Value::Object(b)) => {
            a.len() == b.len()
                && a.iter()
                    .zip(b.iter())
                    .all(|((ka, va), (kb, vb))| ka == kb && same_json(va, vb))
        }
        (a, b) => a == b,
    }
}

#[test]
fn every_schema_matches_zod() {
    let vectors: Vectors = serde_json::from_str(VECTORS).expect("schema-vectors.json parses");
    let schemas: BTreeMap<&'static str, Schema> = battery();
    let recorded: Vec<&str> = vectors.schemas.iter().map(String::as_str).collect();
    let built: Vec<&str> = schemas.keys().copied().collect();
    let mut recorded_sorted: Vec<&str> = recorded.clone();
    recorded_sorted.sort_unstable();
    assert_eq!(recorded_sorted, built, "schema batteries differ");

    let mut failures: Vec<String> = Vec::new();
    for vector in &vectors.vectors {
        let schema: &Schema = &schemas[vector.schema.as_str()];
        let actual: Result<Data, Vec<Map<String, Value>>> =
            schema.safe_parse(vector.input.value.as_ref());
        let matches: bool = match (&actual, &vector.result) {
            (Ok(Some(value)), Expected::Ok { ok }) => same_json(value, ok),
            (Ok(None), Expected::OkUndefined { .. }) => true,
            (Err(issues), Expected::Issues { issues: expected }) => {
                let issues: Value =
                    Value::Array(issues.iter().cloned().map(Value::Object).collect());
                same_json(&issues, expected)
            }
            _ => false,
        };
        if !matches {
            failures.push(format!(
                "{} {:?}: got {}, zod gave {:?}",
                vector.schema,
                vector.input.value,
                match &actual {
                    Ok(value) => format!("ok {value:?}"),
                    Err(issues) => serde_json::to_string(issues).unwrap_or_default(),
                },
                vector.result
            ));
        }
    }
    assert!(
        failures.is_empty(),
        "{} of {} vectors differ:\n{}",
        failures.len(),
        vectors.vectors.len(),
        failures.join("\n")
    );
}

/// Keys in JSON text arrive in any order; JS enumerates array-index keys first, ascending.
#[test]
fn record_and_passthrough_output_follow_js_key_order() {
    let input: Value = serde_json::from_str(r#"{"b":1,"10":2,"a":3,"2":4}"#).expect("parses");
    let output: Data = record(number()).safe_parse(Some(&input)).expect("valid");
    let keys: Vec<String> = output
        .as_ref()
        .and_then(Value::as_object)
        .map(|object| object.keys().cloned().collect())
        .unwrap_or_default();
    assert_eq!(keys, ["2", "10", "b", "a"]);

    let passthrough: Data = object(vec![("a", number())])
        .passthrough()
        .safe_parse(Some(&input))
        .expect("valid");
    let keys: Vec<String> = passthrough
        .as_ref()
        .and_then(Value::as_object)
        .map(|object| object.keys().cloned().collect())
        .unwrap_or_default();
    assert_eq!(keys, ["2", "10", "a", "b"]);
}
