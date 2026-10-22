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

//! Replays rust/equivalence/config-vectors.json, written by generate-config.ts from the TS
//! `getConfig` and its helpers over 232 environments.

use crate::config::{config_output, get_config, ConfigError, Environment};
use crate::process_env::{get_address, get_db, get_password, get_secret};
use crate::rate_limiter::get_rate_limit_config;
use serde_json::{json, Value};
use std::collections::HashMap;

const VECTORS: &str = include_str!("equivalence/config-vectors.json");

/// JSON equality with numbers compared as the JS numbers they are.
fn same(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
        (Value::Array(a), Value::Array(b)) => a.len() == b.len() && a.iter().zip(b).all(|(a, b)| same(a, b)),
        (Value::Object(a), Value::Object(b)) => a.len() == b.len() && a.iter().all(|(key, value)| b.get(key).is_some_and(|other| same(value, other))),
        (a, b) => a == b,
    }
}

fn outcome(result: Result<Value, String>) -> Value {
    match result {
        Ok(value) => json!({ "ok": value }),
        Err(error) => json!({ "error": error }),
    }
}

fn config_outcome(result: Result<Value, ConfigError>) -> Value {
    match result {
        Ok(value) => json!({ "ok": value }),
        Err(ConfigError::Invalid(error)) => json!({ "error": "ZodError", "issues": error.issues }),
        Err(error) => json!({ "error": error.to_string() }),
    }
}

/// The variables JS reads as ±Infinity, where the TS starts with an infinite number in the
/// config and the Rust refuses to start (a JSON value cannot hold it, and dropping the
/// variable would silently lose the operator's setting).
const UNREPRESENTABLE: [(&str, &str); 3] = [("L_RULES", "{\"a\":1e400}"), ("PROSOPO_API_PORT", ""), ("PROSOPO_PROXY_COUNT", "")];

fn unrepresentable(environment: &HashMap<String, String>) -> Option<&'static str> {
    UNREPRESENTABLE.iter().find_map(|(name, text)| {
        let value: &String = environment.get(*name)?;
        let infinite: bool = if text.is_empty() { value.len() > 309 } else { value == text };
        infinite.then_some(*name)
    })
}

#[test]
fn the_config_is_what_the_ts_builds_from_the_same_environment() {
    let cases: Vec<Value> = serde_json::from_str(VECTORS).expect("config-vectors.json parses");
    let mut failures: Vec<String> = Vec::new();
    let mut accepted: usize = 0;
    let mut deviations: usize = 0;
    for (index, case) in cases.iter().enumerate() {
        let variables: HashMap<String, String> = serde_json::from_value(case["environment"].clone()).expect("an environment");
        let deviation: Option<&str> = unrepresentable(&variables);
        let env: Environment = Environment::from_map(variables);
        let captchas: Value = json!({ "solved": { "count": 2 }, "unsolved": { "count": 0 } });
        for (key, captchas) in [("config", None), ("configWithCaptchas", Some(captchas))] {
            let actual: Value = config_outcome(config_output(&env, None, captchas.clone(), None, None));
            if let Some(name) = deviation {
                deviations += 1;
                let expected: Value = json!({ "error": ConfigError::Unrepresentable(name.to_string()).to_string() });
                if actual != expected || case[key].get("ok").is_none() {
                    failures.push(format!("#{index} {key}: expected the TS to accept and the Rust to refuse {name}\n      rust {actual}\n      ts   {}", case[key]));
                }
                continue;
            }
            if !same(&actual, &case[key]) {
                failures.push(format!("#{index} {key}\n      rust {actual}\n      ts   {}", case[key]));
            }
            if actual.get("ok").is_some() {
                accepted += 1;
                if let Err(error) = get_config(&env, None, captchas, None, None) {
                    failures.push(format!("#{index} {key}: the output does not read as a config: {error}"));
                }
            }
        }
        let rate_limits: Value = json!({ "ok": get_rate_limit_config(&env) });
        if !same(&rate_limits, &case["rateLimits"]) {
            failures.push(format!("#{index} rate limits\n      rust {rate_limits}\n      ts   {}", case["rateLimits"]));
        }
        for (key, who) in [("provider", None), ("admin", Some("admin"))] {
            let actual: Value = json!({
                "address": get_address(&env, who),
                "password": get_password(&env, who),
                "secret": get_secret(&env, who),
            });
            if !same(&actual, &case[key]) {
                failures.push(format!("#{index} {key} account\n      rust {actual}\n      ts   {}", case[key]));
            }
        }
        let db: Value = outcome(get_db(&env).map(Value::String).map_err(|error| error.translation_key().unwrap_or_default().to_string()));
        if !same(&db, &case["db"]) {
            failures.push(format!("#{index} db\n      rust {db}\n      ts   {}", case["db"]));
        }
    }
    assert!(accepted > 200, "only {accepted} configs accepted");
    assert_eq!(deviations, 2 * UNREPRESENTABLE.len(), "each unrepresentable variable is in the vectors once");
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.iter().take(20).cloned().collect::<Vec<String>>().join("\n"));
}
