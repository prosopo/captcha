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

//! Replays rust/equivalence/vectors.json, recorded from the TS by generate.ts. The vectors
//! write a bigint as `{"$bigint": "123"}`; it is decoded to the decimal text the Rust types
//! serialise. The `redis` section runs against a live Redis Stack (see `live`).

use crate::api::{
    get_api_rule_rate_limits, sanitize_access_policy, AccessRuleApiPath, DeleteSiteGroups,
    FetchRulesOptions, InsertRulesArgs, MissingIds, RuleFilters,
};
use crate::redis::{
    build_scoped_rules_sub_queries, get_block_pool_clause, get_redis_rule_value,
    get_rules_redis_query,
};
use crate::*;
use prosopo_api_route::schema::Schema;
use prosopo_api_route::{RouteKey, Validate};
use prosopo_types::JsNumber;
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::sync::LazyLock;

const VECTORS: &str = include_str!("equivalence/vectors.json");

static DATA: LazyLock<Value> =
    LazyLock::new(|| serde_json::from_str(VECTORS).expect("vectors.json parses"));

fn section(name: &str) -> &'static Vec<Value> {
    DATA[name]
        .as_array()
        .unwrap_or_else(|| panic!("no section {name}"))
}

fn text(value: &Value) -> &str {
    value
        .as_str()
        .unwrap_or_else(|| panic!("expected a string: {value}"))
}

/// `{"$bigint": "123"}` as `"123"`.
fn decode(value: &Value) -> Value {
    match value {
        Value::Object(map) if map.len() == 1 && map.contains_key("$bigint") => {
            map["$bigint"].clone()
        }
        Value::Object(map) if map.contains_key("$number") => {
            panic!("a non-finite number in {value}")
        }
        Value::Object(map) => {
            Value::Object(map.iter().map(|(k, v)| (k.clone(), decode(v))).collect())
        }
        Value::Array(items) => Value::Array(items.iter().map(decode).collect()),
        other => other.clone(),
    }
}

fn typed<T: serde::de::DeserializeOwned>(value: &Value) -> T {
    serde_json::from_value(decode(value)).unwrap_or_else(|error| panic!("{error}: {value}"))
}

fn sorted(value: &Value) -> Value {
    match value {
        Value::Object(map) => {
            let mut keys: Vec<&String> = map.keys().collect();
            keys.sort();
            Value::Object(
                keys.into_iter()
                    .map(|key| (key.clone(), sorted(&map[key])))
                    .collect(),
            )
        }
        Value::Array(items) => Value::Array(items.iter().map(sorted).collect()),
        other => other.clone(),
    }
}

/// Numbers compare by value: `5` and `5.0` are the same JS number.
fn same(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Number(x), Value::Number(y)) => x.as_f64() == y.as_f64(),
        (Value::Array(x), Value::Array(y)) => {
            x.len() == y.len() && x.iter().zip(y).all(|(x, y)| same(x, y))
        }
        (Value::Object(x), Value::Object(y)) => {
            x.len() == y.len()
                && x.iter()
                    .zip(y)
                    .all(|((kx, vx), (ky, vy))| kx == ky && same(vx, vy))
        }
        (x, y) => x == y,
    }
}

fn encode<T: serde::Serialize>(value: &T) -> Value {
    serde_json::to_value(value).expect("serialises")
}

// ---------------------------------------------------------------- hashing and records

#[test]
fn rule_hashes_match_the_ts() {
    let cases: &Vec<Value> = section("ruleHashes");
    for case in cases {
        let rule: AccessRule = typed(&case["rule"]);
        assert_eq!(
            text(&case["hash"]),
            make_access_rule_hash(&rule),
            "{}",
            case["rule"]
        );
    }
    assert_eq!(cases.len(), 613);
}

fn infinite_rule(field: &str, value: f64) -> AccessRule {
    let mut rule: AccessRule = AccessRule::new(AccessPolicy::new(AccessPolicyType::Restrict));
    let number: Option<JsNumber> = Some(JsNumber(value));
    match field {
        "solvedImagesCount" => rule.policy.challenge_level = number.map(ChallengeLevel::Unpinned),
        "frictionlessScore" => rule.policy.frictionless_score = number,
        "asn" => rule.scope.asn = number,
        "powDifficulty" => rule.policy.pow_difficulty = number,
        other => panic!("no field {other}"),
    }
    rule
}

#[test]
fn non_finite_numbers_hash_and_store_as_in_the_ts() {
    for case in section("infiniteRules") {
        let value: f64 = match text(&case["value"]) {
            "Infinity" => f64::INFINITY,
            "-Infinity" => f64::NEG_INFINITY,
            "NaN" => f64::NAN,
            other => panic!("{other}"),
        };
        let rule: AccessRule = infinite_rule(text(&case["field"]), value);
        assert_eq!(text(&case["hash"]), make_access_rule_hash(&rule), "{case}");
        let stored: Value = Value::Object(
            get_redis_rule_value(&rule)
                .into_iter()
                .map(|(k, v)| (k, Value::String(v)))
                .collect(),
        );
        assert_eq!(sorted(&case["redisValue"]), sorted(&stored), "{case}");
        assert_eq!(
            case["record"].get("error").is_some(),
            transform_access_rule_into_record(&rule).is_err(),
            "{case}"
        );
    }
}

fn record_error_class(error: &RecordError) -> &'static str {
    match error {
        RecordError::Invalid(_) => "ZodError",
        RecordError::Address(message) if message.starts_with("IPv") => "AddressError",
        RecordError::Address(_) => "Error",
    }
}

#[test]
fn rule_records_match_the_ts() {
    for case in section("ruleRecords") {
        let rule: AccessRule = typed(&case["rule"]);
        match (
            &case["record"].get("result"),
            transform_access_rule_into_record(&rule),
        ) {
            (Some(expected), Ok(record)) => assert!(
                same(&decode(expected), &encode(&record)),
                "{}\nTS   {expected}\nRust {}",
                case["rule"],
                encode(&record)
            ),
            (None, Err(error)) => {
                let expected: &Value = &case["record"]["error"];
                assert_eq!(
                    text(&expected["class"]),
                    record_error_class(&error),
                    "{}",
                    case["rule"]
                );
                if let RecordError::Address(message) = &error {
                    assert_eq!(text(&expected["message"]), message, "{}", case["rule"]);
                }
            }
            (expected, actual) => panic!("{}: TS gave {expected:?}, Rust {actual:?}", case["rule"]),
        }
    }
}

#[test]
fn redis_values_match_the_ts() {
    for case in section("redisValues") {
        let rule: AccessRule = typed(&case["rule"]);
        let stored: Value = Value::Object(
            get_redis_rule_value(&rule)
                .into_iter()
                .map(|(k, v)| (k, Value::String(v)))
                .collect(),
        );
        assert_eq!(sorted(&case["value"]), sorted(&stored), "{}", case["rule"]);
    }
}

#[test]
fn matched_rules_match_the_ts() {
    for case in section("matchedRules") {
        let rule: AccessRule = typed(&case["rule"]);
        assert_eq!(
            case["matched"],
            encode(&describe_matched_rule(&rule)),
            "{}",
            case["rule"]
        );
    }
}

#[test]
fn user_scope_records_match_the_ts() {
    for case in section("userScopeRecords") {
        let rule: AccessRule = typed(&case["rule"]);
        let Some(expected) = case["scope"].as_object() else {
            assert!(
                transform_access_rule_into_record(&rule).is_err(),
                "{}",
                case["rule"]
            );
            continue;
        };
        let record: AccessRuleRecord = transform_access_rule_into_record(&rule).expect("a record");
        let expected: Vec<(&str, String)> = expected
            .iter()
            .map(|(field, value)| {
                let value: String = match value {
                    Value::String(text) => text.clone(),
                    Value::Number(n) => {
                        prosopo_util_crypto::js::js_number_to_string(n.as_f64().expect("a number"))
                    }
                    other => panic!("{other}"),
                };
                (field.as_str(), value)
            })
            .collect();
        assert_eq!(expected, record.user_scope_record(), "{}", case["rule"]);
    }
}

#[test]
fn cidrs_match_the_ts() {
    for case in section("cidrs") {
        let start: num_bigint::BigInt = text(&case["start"]).parse().expect("a bigint");
        let end: num_bigint::BigInt = text(&case["end"]).parse().expect("a bigint");
        let rust: Value = match cidr_from_numeric_ip_range(&start, &end) {
            Ok(cidr) => json!({ "result": cidr }),
            Err(error) => json!({ "error": { "message": error.to_string() } }),
        };
        match &case["cidr"].get("error") {
            Some(error) => assert_eq!(error["message"], rust["error"]["message"], "{case}"),
            None => assert_eq!(case["cidr"], rust, "{case}"),
        }
    }
}

// ---------------------------------------------------------------- inputs

/// The TS outcome against the schema's: the same output (in the same key order), the same
/// issues, or for a TS throw, a failure of the Rust's own.
fn check_parse(schema: &Schema, case: &Value, label: &str) {
    let input: Value = decode(&case["input"]);
    let rust = schema.safe_parse(Some(&input));
    let expected: &Value = &case["output"];
    match (expected.get("result"), expected.get("issues"), rust) {
        (Some(result), _, Ok(output)) => {
            let output: Value = output.unwrap_or(Value::Null);
            assert!(
                same(&decode(result), &output),
                "{label} {}\nTS   {result}\nRust {output}",
                case["input"]
            );
        }
        (_, Some(issues), Err(rust)) => {
            let rust: Value = Value::Array(rust.into_iter().map(Value::Object).collect());
            assert!(
                same(issues, &rust),
                "{label} {}\nTS   {issues}\nRust {rust}",
                case["input"]
            );
        }
        (None, None, Err(_)) => assert!(expected.get("error").is_some(), "{label} {case}"),
        (_, _, rust) => panic!(
            "{label} {}: TS gave {expected}, Rust {rust:?}",
            case["input"]
        ),
    }
}

/// A TS throw out of `safeParse`, which the Rust reports as issues (see MIGRATION-LOG).
fn ts_threw(case: &Value) -> bool {
    case["output"].get("error").is_some()
}

#[test]
fn rule_inputs_match_the_ts() {
    let schema: Schema = access_rule_input();
    let cases: &Vec<Value> = section("ruleInputs");
    for case in cases {
        check_parse(&schema, case, "accessRuleInput");
        let parsed: Result<AccessRule, _> = parse_access_rule(&decode(&case["input"]));
        assert_eq!(
            parsed.is_ok(),
            case["output"].get("result").is_some(),
            "{}",
            case["input"]
        );
        if let (Ok(rule), Some(result)) = (&parsed, case["output"].get("result")) {
            let ts_rule: AccessRule = typed(result);
            assert_eq!(&ts_rule, rule, "typed {}", case["input"]);
        }
    }
    assert_eq!(cases.iter().filter(|case| ts_threw(case)).count(), 6);
}

#[test]
fn policy_inputs_match_the_ts() {
    let schema: Schema = access_policy_input();
    for case in section("policyInputs") {
        check_parse(&schema, case, "accessPolicyInput");
        if let Some(sanitized) = case["sanitized"].as_object() {
            let policy: AccessPolicy = typed(&case["output"]["result"]);
            assert_eq!(
                Value::Object(sanitized.clone()),
                encode(&sanitize_access_policy(&policy)),
                "{case}"
            );
        }
    }
    for case in section("sanitizedPolicies") {
        let policy: AccessPolicy = typed(&case["policy"]);
        assert_eq!(
            case["sanitized"],
            encode(&sanitize_access_policy(&policy)),
            "{case}"
        );
    }
}

#[test]
fn scope_inputs_match_the_ts() {
    let user_scope: Schema = user_scope_input();
    for case in section("scopeInputs") {
        check_parse(&user_scope, case, "userScopeInput");
    }
    let policy_scope: Schema = policy_scope_input();
    for case in section("policyScopeInputs") {
        check_parse(&policy_scope, case, "policyScopeInput");
    }
    let exclusions: Schema = policy_scope_exclusions_input();
    for case in section("exclusionInputs") {
        check_parse(&exclusions, case, "policyScopeExclusionsInput");
    }
    let entry: Schema = rule_entry_input();
    for case in section("entryInputs") {
        check_parse(&entry, case, "ruleEntryInput");
    }
}

#[test]
fn filter_inputs_match_the_ts() {
    let schema: Schema = access_rules_filter_input();
    for case in section("filterInputs") {
        check_parse(&schema, case, "accessRulesFilterInput");
        if let Some(filters) = case["filters"].as_array() {
            let input: AccessRulesFilterInput = typed(&case["output"]["result"]);
            let rust: Vec<Value> = get_access_rule_filters_from_input(&input)
                .iter()
                .map(encode)
                .collect();
            let expected: Vec<Value> = filters.iter().map(decode).collect();
            assert_eq!(
                expected.iter().map(sorted).collect::<Vec<Value>>(),
                rust.iter().map(sorted).collect::<Vec<Value>>(),
                "{case}"
            );
        }
    }
}

#[test]
fn endpoint_inputs_match_the_ts() {
    for case in section("endpointInputs") {
        let input: Value = decode(&case["input"]);
        let rust = match text(&case["endpoint"]) {
            "insertRules" => InsertRulesArgs::validate(Some(&input)),
            "fetchRules" => FetchRulesOptions::validate(Some(&input)),
            "findRuleIds" => RuleFilters::validate(Some(&input)),
            "getMissingIds" => MissingIds::validate(Some(&input)),
            "deleteRuleGroups" => DeleteSiteGroups::validate(Some(&input)),
            other => panic!("no endpoint {other}"),
        };
        let expected: &Value = &case["output"];
        match (expected.get("result"), rust) {
            (Some(result), Ok(output)) => {
                assert!(same(&decode(result), &output), "{case}\nRust {output}")
            }
            (None, Err(error)) => {
                if let Some(issues) = expected.get("issues") {
                    assert!(
                        same(issues, &encode(&error.issues)),
                        "{case}\nRust {}",
                        encode(&error.issues)
                    );
                }
            }
            (_, rust) => panic!("{case}: Rust {rust:?}"),
        }
    }
}

// ---------------------------------------------------------------- matching

fn headers(value: &Value) -> HashMap<String, String> {
    typed(value)
}

#[test]
fn header_conditions_match_the_ts() {
    for case in section("headerConditions") {
        let operator: HeaderOperator = text(&case["operator"]).parse().expect("an operator");
        let result: bool = evaluate_header_condition(
            text(&case["name"]),
            operator,
            text(&case["value"]),
            &headers(&case["headers"]),
        );
        assert_eq!(case["result"], json!(result), "{case}");
    }
    for case in section("ruleHeaderMatches") {
        let mut rule: AccessRule = AccessRule::new(AccessPolicy::new(AccessPolicyType::Block));
        let field = |name: &str| case["rule"].get(name).map(|value| text(value).to_string());
        rule.scope.header_name = field("headerName");
        rule.scope.header_operator = field("headerOperator");
        rule.scope.header_value = field("headerValue");
        assert_eq!(
            case["result"],
            json!(access_rule_header_matches(
                &rule,
                &headers(&case["headers"])
            )),
            "{case}"
        );
    }
    for case in section("headerLists") {
        assert_eq!(
            case["decoded"],
            encode(&decode_header_value_list(text(&case["value"]))),
            "{case}"
        );
    }
    for case in section("headerEncodings") {
        let values: Vec<String> = typed(&case["values"]);
        assert_eq!(
            text(&case["encoded"]),
            encode_header_value_list(&values),
            "{case}"
        );
    }
}

#[test]
fn user_agent_classifications_match_the_ts() {
    for case in section("classifications") {
        let user_agent: Option<&str> = case["userAgent"].as_str();
        assert_eq!(
            text(&case["os"]),
            classify_os(user_agent).as_str(),
            "{case}"
        );
        assert_eq!(
            text(&case["browser"]),
            classify_browser(user_agent).as_str(),
            "{case}"
        );
    }
}

// ---------------------------------------------------------------- queries

#[test]
fn rule_queries_match_the_ts() {
    let cases: &Vec<Value> = section("queries");
    for case in cases {
        let filter: AccessRulesFilter = typed(&case["filter"]);
        let matching: bool = case["matchingFieldsOnly"] == json!(true);
        assert_eq!(
            text(&case["query"]),
            get_rules_redis_query(&filter, matching),
            "{case}"
        );
    }
    assert_eq!(cases.len(), 618);
    let clauses: &Value = &DATA["blockPoolClauses"];
    assert_eq!(text(&clauses["deferred"]), get_block_pool_clause(true));
    assert_eq!(text(&clauses["plain"]), get_block_pool_clause(false));
}

#[test]
fn split_sub_queries_match_the_ts() {
    for case in section("subQueries") {
        let scope: UserScope = typed(&case["userScope"]);
        let options: &Value = &case["options"];
        let queries = build_scoped_rules_sub_queries(
            &scope,
            case["clientId"].as_str(),
            options["blockOnly"] == json!(true),
            options["includeDeferred"] == json!(true),
        );
        assert_eq!(case["subQueries"], encode(&queries), "{case}");
    }
}

// ---------------------------------------------------------------- rate limits

/// Deviation, best-effort per MIGRATION.md §0: a negative limit (`"-3"`), which the TS hands
/// to express-rate-limit as it is, falls back to the default here; `ApiRouteLimit` is unsigned.
#[test]
fn rate_limits_match_the_ts() {
    for case in section("rateLimits") {
        let env: HashMap<String, String> = typed(&case["env"]);
        let limits = get_api_rule_rate_limits(&|name: &str| env.get(name).cloned());
        for route in AccessRuleApiPath::ALL {
            let expected: &Value = &case["limits"][route.path()];
            let actual = limits.get(*route);
            let negative: bool = expected["limit"].as_i64().is_some_and(|limit| limit < 0);
            let expected_limit: u64 = if negative {
                5
            } else {
                expected["limit"].as_u64().expect("a limit")
            };
            assert_eq!(expected_limit, actual.limit, "{case} {route:?}");
            assert_eq!(
                expected["windowMs"].as_u64(),
                Some(actual.window_ms),
                "{case} {route:?}"
            );
        }
    }
}

#[test]
fn records_round_trip_as_in_the_ts() {
    for case in section("recordRoundTrips") {
        let rule: AccessRule = typed(&case["rule"]);
        let Some(back) = case["back"].as_object() else {
            assert!(transform_access_rule_into_record(&rule).is_err(), "{case}");
            continue;
        };
        let record: AccessRuleRecord = transform_access_rule_into_record(&rule).expect("a record");
        let rust = parse_access_rule(&encode(&record));
        match (back.get("result"), rust) {
            (Some(expected), Ok(rule)) => {
                assert!(
                    same(&sorted(&decode(expected)), &sorted(&encode(&rule))),
                    "{case}\nRust {}",
                    encode(&rule)
                )
            }
            (None, Err(_)) => {}
            (expected, rust) => panic!("{case}: TS {expected:?}, Rust {rust:?}"),
        }
    }
}

#[test]
fn user_scope_record_fields_match_the_ts() {
    assert_eq!(
        DATA["userScopeRecordFields"],
        json!(USER_SCOPE_RECORD_FIELDS)
    );
}

/// production's `_index_hashes` value for the rules index; another hash would make the Rust
/// service drop and rebuild the index at start-up.
const PRODUCTION_INDEX_HASH: &str =
    "307752cbe2d708646962bced56d045fea16afea7b734f1d0f0cc7b65580cacd8";

#[test]
fn the_rules_index_hashes_as_the_ts_stored_it() {
    let hash: String =
        prosopo_redis_client::create_index_hash(&crate::redis::access_rules_redis_index());
    assert_eq!(
        text(&DATA["redis"]["indexHash"]),
        hash,
        "what the TS stored in _index_hashes"
    );
    assert_eq!(PRODUCTION_INDEX_HASH, hash);
}

/// `getRedisRuleValue` as a JSON object, in the field order it writes.
fn stored(rule: &AccessRule) -> Map<String, Value> {
    get_redis_rule_value(rule)
        .into_iter()
        .map(|(k, v)| (k, Value::String(v)))
        .collect()
}

/// Against a live Redis Stack at redis://localhost:6379 (password root), where generate.ts
/// records the `redis` section: the TS's writes are reproduced by the Rust's, and what the
/// Rust reads back from either matches what the TS read.
mod live {
    use super::*;
    use crate::redis::{access_rules_redis_index, RedisRulesReader, RedisRulesWriter};
    use prosopo_logger::{get_logger, LogLevel, Logger};
    use prosopo_redis_client::{connect_to_redis, create_redis_index, RedisClient, RedisOptions};

    async fn client() -> RedisClient {
        let logger: Logger = get_logger(LogLevel::Fatal, "uap-live");
        let mut client: RedisClient = connect_to_redis(RedisOptions {
            url: Some("redis://localhost:6379".to_string()),
            password: Some("root".to_string()),
            logger,
        })
        .expect("valid options")
        .get_client()
        .await
        .expect("connects");
        create_redis_index(&mut client, &access_rules_redis_index())
            .await
            .expect("the index");
        client
    }

    fn redis_section() -> &'static Value {
        &DATA["redis"]
    }

    fn corpus() -> Vec<AccessRuleEntry> {
        typed(&redis_section()["corpus"])
    }

    fn ids() -> Vec<String> {
        typed(&redis_section()["ids"])
    }

    async fn check_reads(reader: &RedisRulesReader, label: &str) {
        let section: &Value = redis_section();
        let mut requested: Vec<String> = ids();
        requested.push("missing-id".to_string());
        let fetched: Vec<AccessRuleEntry> = reader.fetch_rules(&requested).await.expect("fetches");
        assert!(
            same(&decode(&section["fetched"]), &encode(&fetched)),
            "{label} fetchRules\nRust {}",
            encode(&fetched)
        );
        let mut probe: Vec<String> = ids()[..3].to_vec();
        probe.extend(["missing-id".to_string(), "other".to_string()]);
        assert_eq!(
            section["missing"],
            json!(reader.get_missing_rule_ids(&probe).await.expect("checks")),
            "{label}"
        );
        for case in section["found"].as_array().expect("found") {
            let filter: AccessRulesFilter = typed(&case["filter"]);
            let matching: bool = case["matchingFieldsOnly"] == json!(true);
            let rules: Vec<AccessRule> = reader.find_rules(&filter, matching, true).await;
            assert!(
                same(&decode(&case["rules"]), &encode(&rules)),
                "{label} findRules {}\nRust {}",
                case["filter"],
                encode(&rules)
            );
            let mut rule_ids: Vec<String> = reader.find_rule_ids(&filter, matching).await;
            rule_ids.sort();
            assert_eq!(
                case["ruleIds"],
                json!(rule_ids),
                "{label} findRuleIds {}",
                case["filter"]
            );
        }
    }

    struct Collect(Vec<String>);

    impl RuleIdBatchHandler for Collect {
        fn handle(&mut self, rule_ids: Vec<String>) -> BoxFuture<'_, crate::storage::Result<()>> {
            self.0.extend(rule_ids);
            Box::pin(async { Ok(()) })
        }
    }

    #[tokio::test]
    #[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
    async fn rust_writes_what_the_ts_wrote_and_reads_it_back_the_same() {
        let _live = crate::live::LIVE.lock().await;
        let client: RedisClient = client().await;
        let writer: RedisRulesWriter = RedisRulesWriter::new(client.clone());
        let reader: RedisRulesReader =
            RedisRulesReader::new(client.clone(), get_logger(LogLevel::Fatal, "uap-live"));
        writer.delete_all_rules().await.expect("clears");

        let section: &Value = redis_section();
        let inserted: Vec<String> = writer.insert_rules(&corpus()).await.expect("inserts");
        assert_eq!(
            ids(),
            inserted,
            "every id, without the prefix (the TS drops 4 per batch; MIGRATION-LOG)"
        );
        let mut redis: RedisClient = client.clone();
        for case in section["stored"].as_array().expect("stored") {
            let key: String = format!("uar:{}", text(&case["id"]));
            let hash: HashMap<String, String> = ::redis::AsyncCommands::hgetall(&mut redis, &key)
                .await
                .expect("hgetall");
            let expected: HashMap<String, String> = typed(&case["hash"]);
            assert_eq!(expected, hash, "{key}");
            let expire: i64 = ::redis::cmd("EXPIRETIME")
                .arg(&key)
                .query_async(&mut redis)
                .await
                .expect("expiretime");
            assert_eq!(case["expireTime"], json!(expire), "{key}");
        }
        check_reads(&reader, "Rust-written").await;

        let mut collect: Collect = Collect(Vec::new());
        reader
            .fetch_all_rule_ids(&mut collect)
            .await
            .expect("aggregates");
        collect.0.sort();
        assert_eq!(section["allIds"], json!(collect.0));
        writer.delete_rules(&ids()[..2]).await.expect("deletes");
        assert_eq!(
            section["afterDelete"],
            json!(reader.get_missing_rule_ids(&ids()).await.expect("checks"))
        );
        assert_eq!(
            section["deletedCount"],
            json!(writer.delete_all_rules().await.expect("clears"))
        );
    }

    #[tokio::test]
    #[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
    async fn rust_reads_the_hashes_the_ts_stored() {
        let _live = crate::live::LIVE.lock().await;
        let client: RedisClient = client().await;
        let writer: RedisRulesWriter = RedisRulesWriter::new(client.clone());
        let reader: RedisRulesReader =
            RedisRulesReader::new(client.clone(), get_logger(LogLevel::Fatal, "uap-live"));
        writer.delete_all_rules().await.expect("clears");
        let mut redis: RedisClient = client.clone();
        for case in redis_section()["stored"].as_array().expect("stored") {
            let key: String = format!("uar:{}", text(&case["id"]));
            let hash: Vec<(String, String)> = typed::<Map<String, Value>>(&case["hash"])
                .into_iter()
                .map(|(k, v)| (k, text(&v).to_string()))
                .collect();
            let _: () = ::redis::AsyncCommands::hset_multiple(&mut redis, &key, &hash)
                .await
                .expect("hset");
            if let Some(at) = case["expireTime"].as_i64().filter(|at| *at > 0) {
                let _: () = ::redis::cmd("EXPIREAT")
                    .arg(&key)
                    .arg(at)
                    .query_async(&mut redis)
                    .await
                    .expect("expireat");
            }
        }
        check_reads(&reader, "TS-written").await;
        writer.delete_all_rules().await.expect("clears");
    }

    #[test]
    fn the_rust_and_ts_write_the_same_hash_for_every_corpus_rule() {
        for (entry, case) in corpus()
            .iter()
            .zip(redis_section()["stored"].as_array().expect("stored"))
        {
            let expected: Map<String, Value> = typed(&case["hash"]);
            assert_eq!(
                sorted(&Value::Object(expected)),
                sorted(&Value::Object(stored(&entry.rule)))
            );
        }
    }
}
