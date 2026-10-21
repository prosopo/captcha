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

//! Replays rust/equivalence/config-vectors.json, written by generate-config.ts on Node 24:
//! the server-side config schemas, and their typed outputs.

use crate::config::*;
use prosopo_api_route::schema::{Data as Input, Schema};
use serde::Deserialize;
use serde_json::{Map, Value};
use std::collections::BTreeMap;

const VECTORS: &str = include_str!("equivalence/config-vectors.json");

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Vectors {
    penalty_defaults: Vec<f64>,
    schemas: Vec<String>,
    schema_vectors: Vec<SchemaVector>,
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
struct SchemaVector {
    schema: String,
    #[serde(default, deserialize_with = "present")]
    input: Option<Value>,
    result: Expected,
}

fn present<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<Option<Value>, D::Error> {
    Value::deserialize(deserializer).map(Some)
}

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

fn schemas() -> BTreeMap<&'static str, Schema> {
    BTreeMap::from([
        ("frictionlessPenalties", frictionless_penalties_schema()),
        ("databaseTypes", database_types_schema()),
        ("environmentTypes", environment_types_schema()),
        ("databaseConfig", database_config_schema()),
        ("prosopoBaseConfig", prosopo_base_config_schema()),
        ("polkadotSecretJson", polkadot_secret_json_schema()),
        ("prosopoBasicConfig", prosopo_basic_config_schema()),
        ("prosopoApiConfig", prosopo_api_config_schema()),
        (
            "prosopoCaptchaSolutionConfig",
            prosopo_captcha_solution_config_schema(),
        ),
        ("ipApiService", ip_api_service_schema()),
        ("prosopoConfig", prosopo_config_schema()),
        ("prosopoClientConfig", prosopo_client_config_schema()),
        ("captchaTimeout", captcha_timeout_schema()),
        ("prosopoServerConfig", prosopo_server_config_schema()),
    ])
}

fn round_trip<T: serde::de::DeserializeOwned + serde::Serialize>(value: &Value) -> Option<Value> {
    let typed: T = serde_json::from_value(value.clone()).ok()?;
    serde_json::to_value(&typed).ok()
}

fn typed_round_trip(schema: &str, value: &Value) -> Option<Option<Value>> {
    let round_tripped: Option<Value> = match schema {
        "frictionlessPenalties" => round_trip::<FrictionlessPenalties>(value),
        "prosopoApiConfig" => round_trip::<ServerConfig>(value),
        "prosopoCaptchaSolutionConfig" => round_trip::<CaptchaSolutionConfig>(value),
        "ipApiService" => round_trip::<IpApiService>(value),
        "prosopoConfig" => round_trip::<ProsopoConfig>(value),
        "captchaTimeout" => round_trip::<CaptchaTimeoutConfig>(value),
        "prosopoServerConfig" => round_trip::<ProsopoServerConfig>(value),
        _ => return None,
    };
    Some(round_tripped)
}

#[test]
fn schemas_match_the_ts() {
    let vectors: Vectors = serde_json::from_str(VECTORS).expect("config-vectors.json parses");
    assert_eq!(
        vectors.penalty_defaults,
        vec![
            PENALTY_OLD_TIMESTAMP_DEFAULT,
            PENALTY_ACCESS_RULE_DEFAULT,
            PENALTY_UNVERIFIED_HOST_DEFAULT,
            PENALTY_WEBVIEW_DEFAULT,
        ]
    );
    let schemas: BTreeMap<&'static str, Schema> = schemas();
    let mut recorded: Vec<&str> = vectors.schemas.iter().map(String::as_str).collect();
    recorded.sort_unstable();
    assert_eq!(recorded, schemas.keys().copied().collect::<Vec<&str>>());
    let mut failures: Vec<String> = Vec::new();
    let mut typed: usize = 0;
    for vector in &vectors.schema_vectors {
        let actual: Result<Input, Vec<Map<String, Value>>> =
            schemas[vector.schema.as_str()].safe_parse(vector.input.as_ref());
        let matches: bool = match (&actual, &vector.result) {
            (Ok(Some(value)), Expected::Ok { ok }) => {
                let round_trips: bool = match typed_round_trip(&vector.schema, value) {
                    Some(Some(round_tripped)) => {
                        typed += 1;
                        same_json(&round_tripped, value)
                    }
                    Some(None) => false,
                    None => true,
                };
                round_trips && same_json(value, ok)
            }
            (Ok(None), Expected::OkUndefined { .. }) => true,
            (Err(issues), Expected::Issues { issues: expected }) => same_json(
                &Value::Array(issues.iter().cloned().map(Value::Object).collect()),
                expected,
            ),
            _ => false,
        };
        if !matches {
            failures.push(format!(
                "{} {:?}: got {:?}",
                vector.schema,
                vector.input,
                actual.map_err(|issues| serde_json::to_string(&issues).unwrap_or_default())
            ));
        }
    }
    assert!(
        failures.is_empty(),
        "{} differ:\n{}",
        failures.len(),
        failures.join("\n")
    );
    assert!(
        typed > 20,
        "only {typed} outputs round-tripped through their structs"
    );
}
