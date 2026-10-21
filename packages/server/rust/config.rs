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

//! The server's configuration from the environment (src/config.ts).

use prosopo_load_balancer::EnvLookup;
use prosopo_types::config::{prosopo_server_config_schema, ProsopoServerConfig};
use serde_json::{json, Map, Value};
use std::fmt;

const DEFAULT_SERVER_URL: &str = "https://localhost:9228";
const DEFAULT_SERVER_PORT: &str = "9228";
const DEFAULT_DAPP_NAME: &str = "client-example-server";

/// `process.env.NAME || fallback`.
fn env_or(env: &EnvLookup, name: &str, fallback: &str) -> String {
    env(name)
        .filter(|value: &String| !value.is_empty())
        .unwrap_or_else(|| fallback.to_string())
}

/// `/:\d+/`.
fn has_port(url: &str) -> bool {
    url.as_bytes()
        .windows(2)
        .any(|pair: &[u8]| pair[0] == b':' && pair[1].is_ascii_digit())
}

/// `getServerUrl`: `PROSOPO_SERVER_URL`, with `PROSOPO_SERVER_PORT` (or 9228) appended when
/// it has no port.
pub fn get_server_url(env: &EnvLookup) -> String {
    match env("PROSOPO_SERVER_URL").filter(|url: &String| !url.is_empty()) {
        Some(url) if has_port(&url) => url,
        Some(url) => format!(
            "{url}:{}",
            env_or(env, "PROSOPO_SERVER_PORT", DEFAULT_SERVER_PORT)
        ),
        None => DEFAULT_SERVER_URL.to_string(),
    }
}

/// The issues `ProsopoServerConfigSchema` found, as zod reports them.
#[derive(Debug, Clone, PartialEq)]
pub struct ConfigError(pub Vec<Map<String, Value>>);

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&Value::from(self.0.clone()).to_string())
    }
}

impl std::error::Error for ConfigError {}

/// The object `getServerConfig` builds from the environment, before parsing.
pub fn server_config_input(env: &EnvLookup) -> Value {
    let mut input: Map<String, Value> = Map::new();
    if let Some(environment) = env("PROSOPO_DEFAULT_ENVIRONMENT") {
        input.insert("defaultEnvironment".to_string(), Value::from(environment));
    }
    input.insert("serverUrl".to_string(), Value::from(get_server_url(env)));
    input.insert(
        "dappName".to_string(),
        Value::from(env_or(env, "PROSOPO_DAPP_NAME", DEFAULT_DAPP_NAME)),
    );
    input.insert(
        "account".to_string(),
        json!({
            "password": "",
            "address": env_or(env, "PROSOPO_SITE_KEY", ""),
            "secret": env_or(env, "PROSOPO_SITE_PRIVATE_KEY", ""),
        }),
    );
    Value::Object(input)
}

/// `getServerConfig`.
pub fn get_server_config(env: &EnvLookup) -> Result<ProsopoServerConfig, ConfigError> {
    let parsed: Value = prosopo_server_config_schema()
        .safe_parse(Some(&server_config_input(env)))
        .map_err(ConfigError)?
        .unwrap_or(Value::Null);
    Ok(serde_json::from_value(parsed)
        .expect("ProsopoServerConfigSchema's output is a ProsopoServerConfig"))
}
