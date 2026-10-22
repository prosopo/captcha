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

//! The server-side config schemas of config/config.ts and config/frictionless.ts: the
//! provider's configuration, which the cli parses, and the server SDK's. The widget's
//! `ProcaptchaConfigSchema` has no Rust caller and stays TS.

use crate::provider_api::{
    api_path_rate_limits_schema, prosopo_captcha_count_config_schema, DEFAULT_SOLVED_COUNT,
    DEFAULT_UNSOLVED_COUNT, PROVIDER_DEFAULT_RATE_LIMITS,
};
use crate::timeouts::*;
use crate::wire_enum::wire_enum;
use prosopo_api_route::schema::{
    array, boolean, number, object, record, record_with_keys, string, string_enum, Schema,
};
use serde_json::{json, Map, Value};

pub const PENALTY_OLD_TIMESTAMP_DEFAULT: f64 = 0.2;
pub const PENALTY_ACCESS_RULE_DEFAULT: f64 = 0.5;
pub const PENALTY_UNVERIFIED_HOST_DEFAULT: f64 = 0.2;
pub const PENALTY_WEBVIEW_DEFAULT: f64 = 0.1;

/// `FrictionlessPenalties`.
pub fn frictionless_penalties_schema() -> Schema {
    let penalty = |default: f64| number().positive().optional().default(default);
    object(vec![
        (
            "PENALTY_OLD_TIMESTAMP",
            penalty(PENALTY_OLD_TIMESTAMP_DEFAULT),
        ),
        ("PENALTY_ACCESS_RULE", penalty(PENALTY_ACCESS_RULE_DEFAULT)),
        (
            "PENALTY_UNVERIFIED_HOST",
            penalty(PENALTY_UNVERIFIED_HOST_DEFAULT),
        ),
        ("PENALTY_WEBVIEW", penalty(PENALTY_WEBVIEW_DEFAULT)),
    ])
}

pub const LOG_LEVELS: [&str; 7] = ["trace", "debug", "info", "warn", "error", "fatal", "log"];
pub const DATABASE_TYPES: [&str; 5] = ["mongo", "mongoMemory", "provider", "client", "captcha"];

wire_enum! {
    /// `EnvironmentTypes`.
    pub enum EnvironmentTypes {
        Development: "development" = "development",
        Staging: "staging" = "staging",
        Production: "production" = "production",
    }
}

pub fn database_types_schema() -> Schema {
    string_enum(&DATABASE_TYPES)
}

pub fn environment_types_schema() -> Schema {
    string_enum(&EnvironmentTypes::ALL.map(EnvironmentTypes::as_str)).ts_named("EnvironmentTypesSchema")
}

/// `DatabaseConfigSchema`: per environment; only the environments present are checked.
pub fn database_config_schema() -> Schema {
    record_with_keys(
        environment_types_schema(),
        object(vec![
            ("type", string()),
            ("endpoint", string()),
            ("dbname", string().default("prosopo")),
            ("authSource", string().default("admin")),
        ]),
    )
}

fn account_schema() -> Schema {
    object(vec![
        ("address", string().optional()),
        ("secret", string().optional()),
        ("password", string().optional()),
    ])
}

pub fn prosopo_base_config_schema() -> Schema {
    object(vec![
        (
            "logLevel",
            string_enum(&LOG_LEVELS).optional().default("info"),
        ),
        (
            "defaultEnvironment",
            environment_types_schema().default("production"),
        ),
        ("account", account_schema()),
    ])
}

/// `PolkadotSecretJSONSpec`.
pub fn polkadot_secret_json_schema() -> Schema {
    object(vec![
        ("encoded", string()),
        (
            "encoding",
            object(vec![
                ("content", array(string())),
                ("type", array(string())),
                ("version", string()),
            ]),
        ),
        ("address", string()),
        (
            "meta",
            object(vec![
                ("genesisHash", string()),
                ("name", string()),
                ("whenCreated", number()),
            ]),
        ),
    ])
}

pub fn prosopo_basic_config_schema() -> Schema {
    prosopo_base_config_schema().merge(&object(vec![(
        "database",
        database_config_schema().optional(),
    )]))
}

/// `ProsopoApiConfigSchema`. As `server` it is `.optional()` outside the `.default()`, so an
/// absent `server` stays absent rather than taking the default.
pub fn prosopo_api_config_schema() -> Schema {
    object(vec![
        ("baseURL", string().url()),
        ("port", number().optional().default(9229)),
    ])
    .default(json!({ "baseURL": "http://localhost", "port": 9229 }))
}

pub fn prosopo_captcha_solution_config_schema() -> Schema {
    object(vec![
        ("requiredNumberOfSolutions", number().positive().min(2.0)),
        ("solutionWinningPercentage", number().positive().max(100.0)),
        ("captchaBlockRecency", number().positive().min(2.0)),
    ])
}

/// `IpApiServiceSpec`.
pub fn ip_api_service_schema() -> Schema {
    object(vec![("apiKey", string()), ("baseUrl", string().url())])
}

/// `ProsopoClientConfigSchema`.
pub fn prosopo_client_config_schema() -> Schema {
    prosopo_basic_config_schema().merge(&object(vec![
        ("userAccountAddress", string().optional()),
        ("web2", boolean().optional().default(true)),
        (
            "solutionThreshold",
            number().positive().max(100.0).optional().default(80),
        ),
        ("dappName", string().optional().default("ProsopoClientDapp")),
        ("serverUrl", string().optional()),
    ]))
}

fn timeout(default: u64) -> Schema {
    number().positive().optional().default(default)
}

/// The defaults the TS passes to each `.default()`. The pow one names `challengeTimeout`,
/// not `verifiedTimeout`, so parsing it strips that and fills `verifiedTimeout` in.
fn default_captcha_timeouts() -> Value {
    json!({
        "image": {
            "challengeTimeout": DEFAULT_IMAGE_CAPTCHA_TIMEOUT,
            "solutionTimeout": DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT,
            "verifiedTimeout": DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT,
            "cachedTimeout": DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED,
        },
        "pow": {
            "challengeTimeout": DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
            "solutionTimeout": DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
            "cachedTimeout": DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT,
        },
        "puzzle": {
            "verifiedTimeout": DEFAULT_PUZZLE_CAPTCHA_VERIFIED_TIMEOUT,
            "solutionTimeout": DEFAULT_PUZZLE_CAPTCHA_SOLUTION_TIMEOUT,
            "cachedTimeout": DEFAULT_PUZZLE_CAPTCHA_CACHED_TIMEOUT,
        },
        "audio": {
            "verifiedTimeout": DEFAULT_AUDIO_CAPTCHA_VERIFIED_TIMEOUT,
            "solutionTimeout": DEFAULT_AUDIO_CAPTCHA_SOLUTION_TIMEOUT,
            "cachedTimeout": DEFAULT_AUDIO_CAPTCHA_CACHED_TIMEOUT,
        },
        "iconOrder": {
            "verifiedTimeout": DEFAULT_ICON_ORDER_CAPTCHA_VERIFIED_TIMEOUT,
            "solutionTimeout": DEFAULT_ICON_ORDER_CAPTCHA_SOLUTION_TIMEOUT,
            "cachedTimeout": DEFAULT_ICON_ORDER_CAPTCHA_CACHED_TIMEOUT,
        },
        "contract": { "maxVerifiedTime": DEFAULT_MAX_VERIFIED_TIME_CONTRACT },
    })
}

/// `CaptchaTimeoutSchema`.
pub fn captcha_timeout_schema() -> Schema {
    let defaults: Value = default_captcha_timeouts();
    let verified_solution_cached = |kind: &str, verified: u64, solution: u64, cached: u64| {
        object(vec![
            ("verifiedTimeout", timeout(verified)),
            ("solutionTimeout", timeout(solution)),
            ("cachedTimeout", timeout(cached)),
        ])
        .default(defaults[kind].clone())
    };
    object(vec![
        (
            "image",
            object(vec![
                ("challengeTimeout", timeout(DEFAULT_IMAGE_CAPTCHA_TIMEOUT)),
                (
                    "solutionTimeout",
                    timeout(DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT),
                ),
                (
                    "verifiedTimeout",
                    timeout(DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT),
                ),
                (
                    "cachedTimeout",
                    timeout(DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED),
                ),
            ])
            .default(defaults["image"].clone()),
        ),
        (
            "pow",
            verified_solution_cached(
                "pow",
                DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
                DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
                DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT,
            ),
        ),
        (
            "puzzle",
            verified_solution_cached(
                "puzzle",
                DEFAULT_PUZZLE_CAPTCHA_VERIFIED_TIMEOUT,
                DEFAULT_PUZZLE_CAPTCHA_SOLUTION_TIMEOUT,
                DEFAULT_PUZZLE_CAPTCHA_CACHED_TIMEOUT,
            ),
        ),
        (
            "audio",
            verified_solution_cached(
                "audio",
                DEFAULT_AUDIO_CAPTCHA_VERIFIED_TIMEOUT,
                DEFAULT_AUDIO_CAPTCHA_SOLUTION_TIMEOUT,
                DEFAULT_AUDIO_CAPTCHA_CACHED_TIMEOUT,
            ),
        ),
        (
            "iconOrder",
            verified_solution_cached(
                "iconOrder",
                DEFAULT_ICON_ORDER_CAPTCHA_VERIFIED_TIMEOUT,
                DEFAULT_ICON_ORDER_CAPTCHA_SOLUTION_TIMEOUT,
                DEFAULT_ICON_ORDER_CAPTCHA_CACHED_TIMEOUT,
            ),
        ),
        (
            "contract",
            object(vec![(
                "maxVerifiedTime",
                timeout(DEFAULT_MAX_VERIFIED_TIME_CONTRACT),
            )])
            .default(defaults["contract"].clone()),
        ),
    ])
    .default(defaults)
}

/// `ProsopoServerConfigSchema`: the server SDK's configuration.
pub fn prosopo_server_config_schema() -> Schema {
    prosopo_client_config_schema().merge(&object(vec![
        ("serverUrl", string().url().optional()),
        (
            "timeouts",
            captcha_timeout_schema()
                .optional()
                .default(default_captcha_timeouts()),
        ),
        (
            "providerRequestTimeoutMs",
            number()
                .int()
                .positive()
                .optional()
                .default(DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS),
        ),
    ]))
}

fn schedule() -> Schema {
    object(vec![("schedule", string().optional())]).optional()
}

/// `ProviderDefaultRateLimits` as the object the TS passes to `.default()`.
fn default_rate_limits() -> Value {
    Value::Object(
        PROVIDER_DEFAULT_RATE_LIMITS
            .iter()
            .map(|(path, window_ms, limit)| {
                (
                    path.to_string(),
                    json!({ "windowMs": window_ms, "limit": limit }),
                )
            })
            .collect::<Map<String, Value>>(),
    )
}

/// `ProsopoConfigSchema`: the provider's whole configuration.
pub fn prosopo_config_schema() -> Schema {
    prosopo_basic_config_schema().merge(&object(vec![
        ("host", string()),
        (
            "captchas",
            prosopo_captcha_count_config_schema()
                .optional()
                .default(json!({
                    "solved": { "count": DEFAULT_SOLVED_COUNT },
                    "unsolved": { "count": DEFAULT_UNSOLVED_COUNT },
                })),
        ),
        (
            "penalties",
            frictionless_penalties_schema().optional().default(json!({
                "PENALTY_OLD_TIMESTAMP": PENALTY_OLD_TIMESTAMP_DEFAULT,
                "PENALTY_ACCESS_RULE": PENALTY_ACCESS_RULE_DEFAULT,
                "PENALTY_UNVERIFIED_HOST": PENALTY_UNVERIFIED_HOST_DEFAULT,
                "PENALTY_WEBVIEW": PENALTY_WEBVIEW_DEFAULT,
            })),
        ),
        (
            "scheduledTasks",
            object(vec![
                ("captchaScheduler", schedule()),
                ("clientListScheduler", schedule()),
                ("clientEntropyScheduler", schedule()),
                ("spamEmailDomainsScheduler", schedule()),
            ])
            .optional(),
        ),
        ("server", prosopo_api_config_schema().optional()),
        ("mongoEventsUri", string().optional()),
        ("mongoCaptchaUri", string().optional()),
        ("mongoClientUri", string().optional()),
        ("ipApi", ip_api_service_schema().optional()),
        ("spamEmailDomainsUrls", array(string()).optional()),
        (
            "redisConnection",
            object(vec![
                ("url", string()),
                ("password", string()),
                ("indexName", string().optional()),
            ])
            .default(json!({ "url": "redis://localhost:6379", "password": "root" })),
        ),
        (
            "rateLimits",
            api_path_rate_limits_schema().default(default_rate_limits()),
        ),
        ("proxyCount", number().optional().default(0)),
        ("lRules", record(number()).optional()),
        ("maxmindDbPath", string().optional()),
        ("maxmindCityDbPath", string().optional()),
        ("maxmindAsnDbPath", string().optional()),
        ("authAccount", account_schema()),
        ("dnsServers", array(string()).optional()),
    ]))
}

/// `account` and `authAccount`.
#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct AccountConfig {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub address: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub secret: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseConfig {
    #[serde(rename = "type")]
    pub database_type: String,
    pub endpoint: String,
    pub dbname: String,
    pub auth_source: String,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[allow(non_snake_case)]
pub struct FrictionlessPenalties {
    pub PENALTY_OLD_TIMESTAMP: crate::JsNumber,
    pub PENALTY_ACCESS_RULE: crate::JsNumber,
    pub PENALTY_UNVERIFIED_HOST: crate::JsNumber,
    pub PENALTY_WEBVIEW: crate::JsNumber,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct ScheduleConfig {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub schedule: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledTasksConfig {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub captcha_scheduler: Option<ScheduleConfig>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_list_scheduler: Option<ScheduleConfig>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_entropy_scheduler: Option<ScheduleConfig>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub spam_email_domains_scheduler: Option<ScheduleConfig>,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct ServerConfig {
    #[serde(rename = "baseURL")]
    pub base_url: String,
    pub port: crate::JsNumber,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IpApiService {
    pub api_key: String,
    pub base_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RedisConnectionConfig {
    pub url: String,
    pub password: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub index_name: Option<String>,
}

/// `ProsopoConfigOutput`.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProsopoConfig {
    pub log_level: String,
    pub default_environment: String,
    pub account: AccountConfig,
    /// By environment, in JS key order.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub database: Option<indexmap::IndexMap<String, DatabaseConfig>>,
    pub host: String,
    pub captchas: crate::api_types::CaptchaCountConfig,
    pub penalties: FrictionlessPenalties,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scheduled_tasks: Option<ScheduledTasksConfig>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub server: Option<ServerConfig>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mongo_events_uri: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mongo_captcha_uri: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mongo_client_uri: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ip_api: Option<IpApiService>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub spam_email_domains_urls: Option<Vec<String>>,
    pub redis_connection: RedisConnectionConfig,
    pub rate_limits: crate::api_types::ApiPathRateLimits,
    pub proxy_count: crate::JsNumber,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub l_rules: Option<indexmap::IndexMap<String, crate::JsNumber>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub maxmind_db_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub maxmind_city_db_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub maxmind_asn_db_path: Option<String>,
    pub auth_account: AccountConfig,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dns_servers: Option<Vec<String>>,
}

/// `ProsopoCaptchaSolutionConfigSchema` output.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptchaSolutionConfig {
    pub required_number_of_solutions: crate::JsNumber,
    pub solution_winning_percentage: crate::JsNumber,
    pub captcha_block_recency: crate::JsNumber,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageCaptchaTimeouts {
    pub challenge_timeout: crate::JsNumber,
    pub solution_timeout: crate::JsNumber,
    pub verified_timeout: crate::JsNumber,
    pub cached_timeout: crate::JsNumber,
}

/// The timeouts of every captcha type but image.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptchaTimeouts {
    pub verified_timeout: crate::JsNumber,
    pub solution_timeout: crate::JsNumber,
    pub cached_timeout: crate::JsNumber,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractTimeouts {
    pub max_verified_time: crate::JsNumber,
}

/// `CaptchaTimeoutOutput`.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptchaTimeoutConfig {
    pub image: ImageCaptchaTimeouts,
    pub pow: CaptchaTimeouts,
    pub puzzle: CaptchaTimeouts,
    pub audio: CaptchaTimeouts,
    pub icon_order: CaptchaTimeouts,
    pub contract: ContractTimeouts,
}

/// `ProsopoServerConfigOutput`.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProsopoServerConfig {
    pub log_level: String,
    pub default_environment: EnvironmentTypes,
    pub account: AccountConfig,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub database: Option<indexmap::IndexMap<String, DatabaseConfig>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_account_address: Option<String>,
    pub web2: bool,
    pub solution_threshold: crate::JsNumber,
    pub dapp_name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub server_url: Option<String>,
    pub timeouts: CaptchaTimeoutConfig,
    pub provider_request_timeout_ms: crate::JsNumber,
}
