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

//! Replays rust/equivalence/vectors.json (written by generate.ts from the TS implementation,
//! node-redis 6.3 and @redis/search 6.3) and asserts the Rust port produces the same outputs.

use std::collections::BTreeSet;
use std::path::PathBuf;
use std::sync::OnceLock;

use redis::io::tcp::socket2::TcpKeepalive;
use redis::{ConnectionAddr, ConnectionInfo, ProtocolVersion};
use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::error::RedisClientError;
use crate::index::{
    create_index_args, create_index_hash, CreateOptions, IndexDataType, NumericField,
    RediSearchSchema, RedisIndex, RedisVariadic, SchemaEntry, SchemaField, SchemaFieldDefinition,
    TagField, TextField,
};
use crate::js::number_to_js_string;
use crate::options::{resolve_client_options, ResolvedClientOptions, KEEP_ALIVE_INITIAL_DELAY};
use crate::url::redact_redis_url;

const VECTORS: &str = include_str!("equivalence/vectors.json");

const SECTIONS: [(&str, usize); 3] = [("indexes", 19), ("redact", 34), ("clientOptions", 60)];

/// The hash production Redis holds in `_index_hashes` for user-access-policy's index. If the
/// Rust definition ever hashes differently, the service drops and rebuilds it at start-up.
const ACCESS_RULES_INDEX_HASH: &str =
    "307752cbe2d708646962bced56d045fea16afea7b734f1d0f0cc7b65580cacd8";
const ACCESS_RULES_LABEL: &str = "user-access-policy accessRulesRedisIndex";
const RENAMED_ACCESS_RULES_LABEL: &str =
    "user-access-policy index renamed like database/provider.ts";

fn vectors() -> &'static serde_json::Map<String, Value> {
    static PARSED: OnceLock<serde_json::Map<String, Value>> = OnceLock::new();
    PARSED.get_or_init(|| serde_json::from_str(VECTORS).expect("vectors.json parses"))
}

fn section<T: DeserializeOwned>(name: &str) -> Vec<T> {
    let raw: &Value = vectors()
        .get(name)
        .unwrap_or_else(|| panic!("section {name} missing from vectors.json"));
    let cases: Vec<T> = serde_json::from_value(raw.clone())
        .unwrap_or_else(|e: serde_json::Error| panic!("section {name} does not deserialize: {e}"));
    let expected: usize = SECTIONS
        .iter()
        .find(|(section, _): &&(&str, usize)| *section == name)
        .map(|(_, count): &(&str, usize)| *count)
        .unwrap_or_else(|| panic!("section {name} is not replayed"));
    assert!(!cases.is_empty(), "section {name} has no cases");
    assert_eq!(cases.len(), expected, "section {name} case count");
    cases
}

#[test]
fn every_section_is_replayed() {
    let present: BTreeSet<&str> = vectors().keys().map(String::as_str).collect();
    let replayed: BTreeSet<&str> = SECTIONS
        .iter()
        .map(|(name, _): &(&str, usize)| *name)
        .collect();
    assert_eq!(present, replayed);
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct IndexCase {
    label: String,
    json: String,
    hash: String,
    #[serde(rename = "createArgs")]
    create_args: Vec<String>,
}

/// Each recorded `JSON.stringify(index)` is parsed back into a `RedisIndex`, which must
/// serialise to the same bytes, hash to the same digest and build the same `FT.CREATE`.
#[test]
fn indexes() {
    for case in section::<IndexCase>("indexes") {
        let label: &str = &case.label;
        let index: RedisIndex = serde_json::from_str(&case.json)
            .unwrap_or_else(|e: serde_json::Error| panic!("{label}: {e}"));
        assert_eq!(index.to_json(), case.json, "{label}: JSON");
        assert_eq!(
            hex::encode(Sha256::digest(case.json.as_bytes())),
            case.hash,
            "{label}: recorded hash is sha256 of recorded JSON"
        );
        assert_eq!(create_index_hash(&index), case.hash, "{label}: hash");
        assert_eq!(
            create_index_args(&index),
            case.create_args,
            "{label}: FT.CREATE"
        );
    }
}

fn tag_missing() -> TagField {
    TagField {
        index_missing: Some(true),
        ..TagField::default()
    }
}

fn numeric_missing() -> NumericField {
    NumericField {
        index_missing: Some(true),
        ..NumericField::default()
    }
}

/// packages/user-access-policy/src/redis/redisRuleIndex.ts, written out the way a Rust caller
/// would build it rather than parsed from the recorded JSON.
fn access_rules_redis_index() -> RedisIndex {
    let tag: fn() -> SchemaField = || SchemaField::Tag(tag_missing());
    let numeric: fn() -> SchemaField = || SchemaField::Numeric(numeric_missing());
    let schema: RediSearchSchema = RediSearchSchema::new()
        .with("clientId", tag())
        .with("userId", tag())
        .with("ja4Hash", tag())
        .with("headersHash", tag())
        .with("userAgentHash", tag())
        .with("headHash", tag())
        .with(
            "coords",
            TagField {
                separator: Some("|".to_string()),
                ..tag_missing()
            },
        )
        .with("countryCode", tag())
        .with("asn", numeric())
        .with("os", tag())
        .with("browser", tag())
        .with("headerMatch", tag())
        .with("headerName", tag())
        .with("headerValue", tag())
        .with("headerOperator", tag())
        .with("webBotAuthAgent", tag())
        .with("numericIpMaskMin", numeric())
        .with("numericIpMaskMax", numeric())
        .with("numericIp", numeric())
        .with("groupId", tag())
        .with("type", tag())
        .with("deferToVerify", tag());
    RedisIndex {
        name: "index:user-access-rules".to_string(),
        schema,
        options: CreateOptions {
            on: Some(IndexDataType::Hash),
            prefix: Some(RedisVariadic::Many(vec!["uar:".to_string()])),
            ..CreateOptions::default()
        },
    }
}

fn index_case(label: &str) -> IndexCase {
    section::<IndexCase>("indexes")
        .into_iter()
        .find(|case: &IndexCase| case.label == label)
        .unwrap_or_else(|| panic!("no index case {label}"))
}

#[test]
fn access_rules_index_built_in_rust_matches_production() {
    let recorded: IndexCase = index_case(ACCESS_RULES_LABEL);
    assert_eq!(recorded.hash, ACCESS_RULES_INDEX_HASH);
    let index: RedisIndex = access_rules_redis_index();
    assert_eq!(index.to_json(), recorded.json);
    assert_eq!(create_index_hash(&index), ACCESS_RULES_INDEX_HASH);
    assert_eq!(create_index_args(&index), recorded.create_args);

    let renamed_recorded: IndexCase = index_case(RENAMED_ACCESS_RULES_LABEL);
    let renamed: RedisIndex = RedisIndex {
        name: "index:custom-access-rules".to_string(),
        ..access_rules_redis_index()
    };
    assert_eq!(create_index_hash(&renamed), renamed_recorded.hash);
    assert_eq!(create_index_args(&renamed), renamed_recorded.create_args);
}

/// The TS writes `WEIGHT: -0`, which its JSON records as `0`, so parsing the vector never
/// yields a negative zero. A Rust caller can still build one, and it must hash and send as `0`.
#[test]
fn negative_zero_weight_built_in_rust_matches_the_ts() {
    let recorded: IndexCase = index_case("text options");
    let mut index: RedisIndex = serde_json::from_str(&recorded.json).expect("text options parse");
    match index.schema.get("wNegZero") {
        Some(SchemaEntry::One(SchemaFieldDefinition::Field(SchemaField::Text(field)))) => {
            let mut field: TextField = field.clone();
            field.weight = Some(-0.0);
            index.schema.insert("wNegZero", field);
        }
        other => panic!("wNegZero is not a text field: {other:?}"),
    }
    assert_eq!(create_index_hash(&index), recorded.hash);
    assert_eq!(create_index_args(&index), recorded.create_args);
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct RedactCase {
    input: Option<String>,
    output: Option<String>,
}

#[test]
fn redact() {
    for case in section::<RedactCase>("redact") {
        assert_eq!(
            redact_redis_url(case.input.as_deref()),
            case.output,
            "{:?}",
            case.input
        );
    }
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ResolvedCase {
    host: Option<String>,
    port: Option<u16>,
    path: Option<String>,
    tls: Option<bool>,
    database: Option<Value>,
    username: Option<String>,
    password: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum ClientOptionsResult {
    Error { error: String },
    Resolved(ResolvedCase),
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ClientOptionsCase {
    url: Option<String>,
    password: Option<String>,
    result: ClientOptionsResult,
}

/// generate.ts records a non-finite database as its JS string so JSON keeps it.
fn database_matches(actual: Option<f64>, recorded: &Option<Value>) -> bool {
    match (actual, recorded) {
        (None, None) => true,
        (Some(actual), Some(Value::Number(number))) => number.as_f64() == Some(actual),
        (Some(actual), Some(Value::String(text))) => number_to_js_string(actual) == *text,
        _ => false,
    }
}

#[derive(Debug, Default)]
struct MappingCoverage {
    tcp: usize,
    tls: usize,
    unix: usize,
    selected_database: usize,
    unsupported_database: usize,
    credentials: usize,
}

/// node-redis connects to `localhost:6379` unless told otherwise, sends `SELECT` only for a
/// truthy database, authenticates with whatever credentials survived option resolution, keeps
/// TCP keep-alive on with a 5 s initial delay and speaks RESP3.
fn assert_connection_info(
    label: &str,
    resolved: &ResolvedClientOptions,
    coverage: &mut MappingCoverage,
) {
    let database: f64 = resolved.database.unwrap_or(0.0);
    let info: ConnectionInfo = match resolved.connection_info() {
        Ok(info) => info,
        Err(RedisClientError::UnsupportedDatabase(shown)) => {
            assert!(database.fract() != 0.0 || !database.is_finite(), "{label}");
            assert_eq!(shown, number_to_js_string(database), "{label}");
            coverage.unsupported_database += 1;
            return;
        }
        Err(error) => panic!("{label}: {error}"),
    };
    let host: String = resolved
        .host
        .clone()
        .filter(|host: &String| !host.is_empty())
        .unwrap_or_else(|| "localhost".to_string());
    let port: u16 = resolved.port.unwrap_or(6379);
    let expected_addr: ConnectionAddr = match (&resolved.path, resolved.tls) {
        (Some(path), _) => {
            coverage.unix += 1;
            ConnectionAddr::Unix(PathBuf::from(path))
        }
        (None, Some(true)) => {
            coverage.tls += 1;
            ConnectionAddr::TcpTls {
                host,
                port,
                insecure: false,
                tls_params: None,
            }
        }
        (None, _) => {
            coverage.tcp += 1;
            ConnectionAddr::Tcp(host, port)
        }
    };
    assert_eq!(*info.addr(), expected_addr, "{label}: address");
    assert_eq!(
        info.redis_settings().db() as f64,
        database,
        "{label}: SELECT"
    );
    if database != 0.0 {
        coverage.selected_database += 1;
    }
    assert_eq!(
        info.redis_settings().username(),
        resolved.username.as_deref(),
        "{label}: username"
    );
    assert_eq!(
        info.redis_settings().password(),
        resolved.password.as_deref(),
        "{label}: password"
    );
    if resolved.username.is_some() || resolved.password.is_some() {
        coverage.credentials += 1;
    }
    assert_eq!(
        info.redis_settings().protocol(),
        ProtocolVersion::RESP3,
        "{label}"
    );
    assert!(info.tcp_settings().nodelay(), "{label}: noDelay");
    assert_eq!(
        format!("{:?}", info.tcp_settings().keepalive()),
        format!(
            "{:?}",
            Some(TcpKeepalive::new().with_time(KEEP_ALIVE_INITIAL_DELAY))
        ),
        "{label}: keepAliveInitialDelay"
    );
}

/// The options node-redis resolves from `createClient({ url, password, ... })` (or the error
/// it throws), then the redis-rs connection settings built from them.
#[test]
fn client_options() {
    let mut coverage: MappingCoverage = MappingCoverage::default();
    for case in section::<ClientOptionsCase>("clientOptions") {
        let label: String = format!("url {:?}, password {:?}", case.url, case.password);
        let actual: Result<ResolvedClientOptions, RedisClientError> =
            resolve_client_options(case.url.as_deref(), case.password.as_deref());
        match (&case.result, actual) {
            (ClientOptionsResult::Error { error }, Err(actual)) => {
                assert_eq!(actual.to_string(), *error, "{label}");
            }
            (ClientOptionsResult::Resolved(expected), Ok(actual)) => {
                assert_eq!(actual.host, expected.host, "{label}: host");
                assert_eq!(actual.port, expected.port, "{label}: port");
                assert_eq!(actual.path, expected.path, "{label}: path");
                assert_eq!(actual.tls, expected.tls, "{label}: tls");
                assert!(
                    database_matches(actual.database, &expected.database),
                    "{label}: database {:?} vs {:?}",
                    actual.database,
                    expected.database
                );
                assert_eq!(actual.username, expected.username, "{label}: username");
                assert_eq!(actual.password, expected.password, "{label}: password");
                assert_connection_info(&label, &actual, &mut coverage);
            }
            (expected, actual) => panic!("{label}: expected {expected:?}, got {actual:?}"),
        }
    }
    for (name, count) in [
        ("tcp", coverage.tcp),
        ("tls", coverage.tls),
        ("unix", coverage.unix),
        ("selected database", coverage.selected_database),
        ("unsupported database", coverage.unsupported_database),
        ("credentials", coverage.credentials),
    ] {
        assert!(count > 0, "no client option case exercises {name}");
    }
}
