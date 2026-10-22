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

//! prosopo.config.ts: `getConfig`, the provider's config from the environment through
//! `ProsopoConfigSchema`, refusing what the schema refuses.

use crate::process_env::{get_address, get_password, get_secret};
use crate::rate_limiter::get_rate_limit_config;
use prosopo_api_route::{PathSegment, ValidationError, ValidationIssue};
use prosopo_logger::{parse_log_level, LogLevel};
use prosopo_types::config::{environment_types_schema, frictionless_penalties_schema, prosopo_config_schema, ProsopoConfig};
use prosopo_util::parse_int;
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::fmt;

/// The environment variables the config is read from.
pub struct Environment {
    variables: HashMap<String, String>,
}

impl Environment {
    pub fn from_process() -> Environment {
        Environment {
            variables: std::env::vars_os().map(|(name, value)| (name.to_string_lossy().into_owned(), value.to_string_lossy().into_owned())).collect(),
        }
    }

    pub fn from_map(variables: HashMap<String, String>) -> Environment {
        Environment { variables }
    }

    /// `process.env[name]`.
    pub fn get(&self, name: &str) -> Option<String> {
        self.variables.get(name).cloned()
    }

    /// `process.env[name]` unless empty, as `process.env[name] || …` reads it.
    pub fn truthy(&self, name: &str) -> Option<String> {
        self.get(name).filter(|value| !value.is_empty())
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum ConfigError {
    /// What zod's `parse` throws.
    Invalid(ValidationError),
    /// A number JS reads as ±Infinity, which the TS would accept and a JSON value cannot hold.
    Unrepresentable(String),
    /// The schema's output did not read as a config, which would be a bug in the schema.
    Unreadable(String),
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConfigError::Invalid(error) => write!(f, "{error}"),
            ConfigError::Unrepresentable(name) => write!(f, "{name} holds a number outside the range of a double"),
            ConfigError::Unreadable(error) => f.write_str(error),
        }
    }
}

impl std::error::Error for ConfigError {}

/// A JS value as `getConfig` builds it: `None` is `undefined`, which an object leaves out.
type JsValue = Option<Value>;

/// An object without its `undefined` entries.
fn object(entries: Vec<(&str, JsValue)>) -> Value {
    Value::Object(entries.into_iter().filter_map(|(key, value)| Some((key.to_string(), value?))).collect::<Map<String, Value>>())
}

fn string(value: Option<String>) -> JsValue {
    value.map(Value::String)
}

/// `Number.parseInt` of a set variable, else `default`. NaN, which JSON cannot hold, comes back
/// as `None` for [`nan_issues`] to report as zod would.
fn integer(env: &Environment, name: &str, default: i64) -> Result<Option<Value>, ConfigError> {
    let Some(text) = env.truthy(name) else {
        return Ok(Some(json!(default)));
    };
    let parsed: f64 = parse_int(&text, 0);
    if parsed.is_infinite() {
        return Err(ConfigError::Unrepresentable(name.to_string()));
    }
    Ok(serde_json::Number::from_f64(parsed).map(Value::Number))
}

/// zod's issue for a NaN where a number was wanted. The input carried `null` in its place.
fn nan_issues(error: ValidationError, nan_paths: &[Vec<PathSegment>]) -> ValidationError {
    let issues: Vec<ValidationIssue> = error
        .issues
        .into_iter()
        .map(|issue| {
            let received_null: bool = issue.code == "invalid_type" && issue.params.get("received") == Some(&json!("null"));
            if received_null && nan_paths.contains(&issue.path) {
                ValidationIssue::invalid_type(issue.path, "number", "nan")
            } else {
                issue
            }
        })
        .collect();
    ValidationError::new(issues)
}

/// `getMongoURI`.
fn mongo_uri(env: &Environment) -> String {
    let protocol: String = env.truthy("PROSOPO_DATABASE_PROTOCOL").unwrap_or_else(|| "mongodb".to_string());
    let srv: bool = protocol == "mongodb+srv";
    let password: String = env.truthy("PROSOPO_DATABASE_PASSWORD").unwrap_or_else(|| "root".to_string());
    let username: String = env.truthy("PROSOPO_DATABASE_USERNAME").unwrap_or_else(|| "root".to_string());
    let host: String = env.truthy("PROSOPO_DATABASE_HOST").unwrap_or_else(|| "localhost".to_string());
    let port: String = if srv { String::new() } else { format!(":{}", env.truthy("PROSOPO_DATABASE_PORT").unwrap_or_else(|| "27017".to_string())) };
    let retries: &str = if srv { "?retryWrites=true&w=majority" } else { "" };
    format!("{protocol}://{username}:{password}@{host}{port}/{retries}")
}

/// `JSON.parse` of a set variable, `None` when it is not JSON.
fn parsed(env: &Environment, name: &str) -> Result<Option<Value>, ConfigError> {
    let Some(text) = env.truthy(name) else {
        return Ok(None);
    };
    match serde_json::from_str::<Value>(&text) {
        Ok(value) => Ok(Some(value)),
        Err(error) if error.to_string().starts_with("number out of range") => Err(ConfigError::Unrepresentable(name.to_string())),
        Err(_) => Ok(None),
    }
}

/// A variable holding a JSON array of strings, else `undefined`.
fn string_list(env: &Environment, name: &str) -> Result<JsValue, ConfigError> {
    Ok(parsed(env, name)?.filter(|value| value.as_array().is_some_and(|items| items.iter().all(Value::is_string))))
}

fn account(env: &Environment, who: &str) -> Value {
    object(vec![
        ("address", string(get_address(env, Some(who)))),
        ("password", string(get_password(env, Some(who)))),
        ("secret", string(get_secret(env, Some(who)))),
    ])
}

/// `getConfig(captchaSolutionsConfig, captchaServeConfig, who, admin)`.
pub fn get_config(
    env: &Environment,
    captcha_solutions: Option<Value>,
    captcha_serve: Option<Value>,
    who: Option<&str>,
    admin: Option<&str>,
) -> Result<ProsopoConfig, ConfigError> {
    let output: Value = config_output(env, captcha_solutions, captcha_serve, who, admin)?;
    serde_json::from_value(output).map_err(|error| ConfigError::Unreadable(error.to_string()))
}

/// What `ProsopoConfigSchema.parse` returns for the environment.
pub(crate) fn config_output(
    env: &Environment,
    captcha_solutions: Option<Value>,
    captcha_serve: Option<Value>,
    who: Option<&str>,
    admin: Option<&str>,
) -> Result<Value, ConfigError> {
    let who: &str = who.unwrap_or("PROVIDER");
    let admin: &str = admin.unwrap_or("ADMIN");
    let default_environment: Value = match env.truthy("PROSOPO_DEFAULT_ENVIRONMENT") {
        Some(name) => environment_types_schema().validate(Some(&Value::String(name))).map_err(ConfigError::Invalid)?,
        None => json!("development"),
    };
    let penalties: Value = frictionless_penalties_schema()
        .validate(Some(&object(vec![
            ("PENALTY_OLD_TIMESTAMP", string(env.get("PENALTY_OLD_TIMESTAMP"))),
            ("PENALTY_ACCESS_RULE", string(env.get("PENALTY_ACCESS_RULE"))),
            ("PENALTY_UNVERIFIED_HOST", string(env.get("PENALTY_UNVERIFIED_HOST"))),
        ])))
        .map_err(ConfigError::Invalid)?;
    let port: Option<Value> = integer(env, "PROSOPO_API_PORT", 9229)?;
    let proxy_count: Option<Value> = integer(env, "PROSOPO_PROXY_COUNT", 0)?;
    let nan_paths: Vec<Vec<PathSegment>> = [
        (port.is_none(), vec![PathSegment::from("server"), PathSegment::from("port")]),
        (proxy_count.is_none(), vec![PathSegment::from("proxyCount")]),
    ]
    .into_iter()
    .filter_map(|(nan, path)| nan.then_some(path))
    .collect();
    let database = || {
        object(vec![
            ("type", Some(json!("provider"))),
            ("endpoint", Some(json!(mongo_uri(env)))),
            ("dbname", string(env.get("PROSOPO_DATABASE_NAME"))),
            ("authSource", string(env.get("PROSOPO_DATABASE_AUTH_SOURCE"))),
        ])
    };
    let schedule = |name: &str| object(vec![("schedule", string(env.get(name)))]);
    let input: Value = object(vec![
        ("logLevel", Some(json!(parse_log_level(env.get("PROSOPO_LOG_LEVEL").as_deref(), LogLevel::Info).as_str()))),
        ("host", string(env.truthy("CADDY_DOMAIN"))),
        ("defaultEnvironment", Some(default_environment)),
        ("account", Some(account(env, who))),
        ("database", Some(json!({ "development": database(), "staging": database(), "production": database() }))),
        (
            "server",
            Some(json!({
                "baseURL": env.truthy("PROSOPO_API_BASE_URL").unwrap_or_else(|| "http://localhost".to_string()),
                "port": port.unwrap_or(Value::Null),
            })),
        ),
        ("captchaSolutions", captcha_solutions),
        ("captchas", captcha_serve),
        ("penalties", Some(penalties)),
        ("mongoEventsUri", Some(json!(env.truthy("PROSOPO_MONGO_EVENTS_URI").unwrap_or_default()))),
        ("mongoCaptchaUri", Some(json!(env.truthy("PROSOPO_MONGO_CAPTCHA_URI").unwrap_or_default()))),
        ("mongoClientUri", Some(json!(env.truthy("PROSOPO_MONGO_CLIENT_URI").unwrap_or_default()))),
        (
            "redisConnection",
            Some(json!({
                "url": env.truthy("REDIS_CONNECTION_URL").unwrap_or_default(),
                "password": env.truthy("REDIS_CONNECTION_PASSWORD").unwrap_or_default(),
            })),
        ),
        ("rateLimits", Some(get_rate_limit_config(env))),
        ("proxyCount", Some(proxy_count.unwrap_or(Value::Null))),
        (
            "scheduledTasks",
            Some(json!({
                "captchaScheduler": schedule("CAPTCHA_STORAGE_SCHEDULE"),
                "clientListScheduler": schedule("CLIENT_LIST_SCHEDULE"),
                "clientEntropyScheduler": schedule("CLIENT_ENTROPY_SCHEDULE"),
                "spamEmailDomainsScheduler": schedule("SPAM_EMAIL_DOMAINS_SCHEDULE"),
            })),
        ),
        ("lRules", Some(parsed(env, "L_RULES")?.unwrap_or_else(|| json!({})))),
        ("spamEmailDomainsUrls", string_list(env, "SPAM_EMAIL_DOMAINS_URLS")?),
        ("authAccount", Some(account(env, admin))),
        (
            "ipApi",
            Some(object(vec![("apiKey", string(env.get("PROSOPO_IPAPI_KEY"))), ("baseUrl", string(env.get("PROSOPO_IPAPI_URL")))])),
        ),
        ("maxmindDbPath", string(env.get("MAXMIND_DB_PATH"))),
        ("maxmindAsnDbPath", string(env.get("MAXMIND_ASN_DB_PATH"))),
        ("dnsServers", string_list(env, "PROSOPO_DNS_SERVERS")?),
    ]);
    prosopo_config_schema().validate(Some(&input)).map_err(|error| ConfigError::Invalid(nan_issues(error, &nan_paths)))
}
