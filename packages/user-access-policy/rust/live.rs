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

//! Ports of src/tests/redis/redisRulesStorage.integration.test.ts and the two reader
//! benchmarks, against Redis Stack at redis://localhost:6379 (password root), where the TS
//! runs them. Ignored by default; run with `cargo test -p prosopo-user-access-policy --
//! --ignored`. They share one Redis, so they take [`LIVE`] in turn. Not ported: the six
//! `findRulesRanked` cases, because nothing calls that private method.

use crate::redis::{
    access_rule_redis_key, access_rules_redis_index, get_redis_rule_value, RedisRulesReader,
    RedisRulesWriter, ACCESS_RULE_REDIS_KEY_PREFIX,
};
use crate::*;
use ::redis::AsyncCommands;
use ::redis::Value as RedisValue;
use num_bigint::BigInt;
use prosopo_logger::{get_logger, LogLevel};
use prosopo_redis_client::{
    connect_to_redis, create_redis_index, RedisClient, RedisIndex, RedisOptions,
};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::time::{Duration, Instant};
use tokio::sync::{Mutex, MutexGuard};

pub(crate) static LIVE: Mutex<()> = Mutex::const_new(());

pub(crate) const NEEDS_REDIS: &str = "needs Redis Stack at redis://localhost:6379 (password root)";

pub(crate) async fn redis_client() -> RedisClient {
    let mut client: RedisClient = connect_to_redis(RedisOptions {
        url: Some("redis://localhost:6379".to_string()),
        password: Some("root".to_string()),
        logger: get_logger(LogLevel::Fatal, "uap-live"),
    })
    .expect("valid options")
    .get_client()
    .await
    .expect("connects");
    create_redis_index(&mut client, &access_rules_redis_index())
        .await
        .expect("the rules index");
    client
}

fn unique() -> String {
    let nanos: u128 = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("after the epoch")
        .as_nanos();
    format!("{nanos:x}{:04x}", fastrand_u16())
}

fn fastrand_u16() -> u16 {
    use std::sync::atomic::{AtomicU16, Ordering};
    static NEXT: AtomicU16 = AtomicU16::new(1);
    NEXT.fetch_add(7919, Ordering::Relaxed)
}

/// One test's Redis: a second index over the rule keys to count them by, dropped with its
/// documents afterwards, as the TS `beforeEach`/`afterEach` do.
struct Fixture {
    _guard: MutexGuard<'static, ()>,
    client: RedisClient,
    index: String,
    reader: RedisRulesReader,
    writer: RedisRulesWriter,
}

impl Fixture {
    async fn new() -> Fixture {
        let guard: MutexGuard<'static, ()> = LIVE.lock().await;
        let mut client: RedisClient = redis_client().await;
        let index: String = format!("0x{}", unique());
        let counting: RedisIndex = RedisIndex {
            name: index.clone(),
            ..access_rules_redis_index()
        };
        create_redis_index(&mut client, &counting)
            .await
            .expect("the test index");
        Fixture {
            _guard: guard,
            reader: RedisRulesReader::new(client.clone(), get_logger(LogLevel::Fatal, "uap-live")),
            writer: RedisRulesWriter::new(client.clone()),
            client,
            index,
        }
    }

    /// The TS `insertRules` helper: each rule's hash written directly, a batch per `MULTI`.
    async fn insert(&self, rules: &[AccessRule]) {
        for batch in rules.chunks(1_000) {
            let mut pipe: ::redis::Pipeline = ::redis::pipe();
            pipe.atomic();
            for rule in batch {
                pipe.hset_multiple(access_rule_redis_key(rule), &get_redis_rule_value(rule))
                    .ignore();
            }
            pipe.query_async::<()>(&mut self.client.clone())
                .await
                .expect("inserts");
        }
    }

    async fn count(&self) -> i64 {
        index_docs(&mut self.client.clone(), &self.index).await
    }

    async fn find(
        &self,
        filter: Value,
        matching_fields_only: bool,
        skip_empty: bool,
    ) -> Vec<AccessRule> {
        let filter: AccessRulesFilter = serde_json::from_value(filter).expect("a filter");
        self.reader
            .find_rules(&filter, matching_fields_only, skip_empty)
            .await
    }

    async fn hash(&self, rule: &AccessRule) -> HashMap<String, String> {
        self.client
            .clone()
            .hgetall(access_rule_redis_key(rule))
            .await
            .expect("hgetall")
    }

    async fn finish(self) {
        let _: Result<(), _> = ::redis::cmd("FT.DROPINDEX")
            .arg(&self.index)
            .arg("DD")
            .query_async(&mut self.client.clone())
            .await;
    }
}

/// `FT.INFO index` → `num_docs`.
async fn index_docs(client: &mut RedisClient, index: &str) -> i64 {
    let info: RedisValue = ::redis::cmd("FT.INFO")
        .arg(index)
        .query_async(client)
        .await
        .expect("FT.INFO");
    let pairs: Vec<(RedisValue, RedisValue)> = match info {
        RedisValue::Map(pairs) => pairs,
        RedisValue::Array(items) => items
            .chunks(2)
            .map(|pair| (pair[0].clone(), pair[1].clone()))
            .collect(),
        other => panic!("unexpected FT.INFO reply {other:?}"),
    };
    let value: RedisValue = pairs
        .into_iter()
        .find(|(key, _)| {
            ::redis::from_redis_value::<String>(key.clone()).is_ok_and(|key| key == "num_docs")
        })
        .map(|(_, value)| value)
        .expect("num_docs");
    match value {
        RedisValue::Int(n) => n,
        RedisValue::Double(n) => n as i64,
        other => ::redis::from_redis_value::<String>(other)
            .expect("a count")
            .parse::<f64>()
            .expect("a number") as i64,
    }
}

fn r(value: Value) -> AccessRule {
    serde_json::from_value(value).expect("a rule")
}

fn as_hash(rule: &AccessRule) -> HashMap<String, String> {
    get_redis_rule_value(rule).into_iter().collect()
}

// ---------------------------------------------------------------- writer

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn inserts_rule() {
    let _ = NEEDS_REDIS;
    let fixture: Fixture = Fixture::new().await;
    let rule: AccessRule = r(json!({ "type": "block", "clientId": "clientId" }));
    fixture
        .writer
        .insert_rules(&[AccessRuleEntry {
            rule: rule.clone(),
            expires_unix_timestamp: None,
        }])
        .await
        .expect("inserts");
    assert_eq!(
        fixture.hash(&rule).await,
        HashMap::from([
            ("type".to_string(), "block".to_string()),
            ("clientId".to_string(), "clientId".to_string())
        ])
    );
    assert_eq!(fixture.count().await, 1);
    fixture.finish().await;
}

fn now_seconds() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("after the epoch")
        .as_secs() as i64
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn inserts_time_limited_rule() {
    let fixture: Fixture = Fixture::new().await;
    let rule: AccessRule = r(json!({ "type": "block", "clientId": "clientId" }));
    let expires: i64 = now_seconds() + 60 * 60;
    let entry: AccessRuleEntry = AccessRuleEntry {
        rule: rule.clone(),
        expires_unix_timestamp: Some(prosopo_types::JsNumber(expires as f64)),
    };
    fixture
        .writer
        .insert_rules(&[entry])
        .await
        .expect("inserts");
    let key: String = access_rule_redis_key(&rule);
    assert_eq!(fixture.hash(&rule).await, as_hash(&rule));
    let expire_at: i64 = fixture
        .client
        .clone()
        .expire_at(&key, expires)
        .await
        .expect("expireat");
    assert_eq!(expire_at, 1);
    let ttl: i64 = fixture.client.clone().ttl(&key).await.expect("ttl");
    assert!(ttl <= expires);
    assert_eq!(fixture.count().await, 1);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn expired_rule_is_no_longer_returned_by_the_reader_after_its_ttl_fires() {
    let fixture: Fixture = Fixture::new().await;
    let rule: AccessRule =
        r(json!({ "type": "block", "clientId": format!("expiring-{}", unique()) }));
    let entry: AccessRuleEntry = AccessRuleEntry {
        rule: rule.clone(),
        expires_unix_timestamp: Some(prosopo_types::JsNumber((now_seconds() + 2) as f64)),
    };
    fixture
        .writer
        .insert_rules(&[entry])
        .await
        .expect("inserts");
    assert_eq!(fixture.hash(&rule).await, as_hash(&rule));
    tokio::time::sleep(Duration::from_millis(3_500)).await;
    assert!(fixture.hash(&rule).await.is_empty());
    assert_eq!(fixture.count().await, 0);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn deletes_rules() {
    let fixture: Fixture = Fixture::new().await;
    let john: AccessRule = r(json!({ "type": "block", "clientId": unique() }));
    let doe: AccessRule = r(json!({ "type": "block", "clientId": unique() }));
    fixture.insert(&[john.clone(), doe.clone()]).await;
    let john_id: String =
        access_rule_redis_key(&john)[ACCESS_RULE_REDIS_KEY_PREFIX.len()..].to_string();
    fixture
        .writer
        .delete_rules(&[john_id])
        .await
        .expect("deletes");
    assert_eq!(fixture.hash(&doe).await, as_hash(&doe));
    assert_eq!(fixture.count().await, 1);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn deletes_all_rules() {
    let fixture: Fixture = Fixture::new().await;
    fixture
        .insert(&[
            r(json!({ "type": "block", "clientId": unique() })),
            r(json!({ "type": "block", "clientId": unique() })),
        ])
        .await;
    fixture.writer.delete_all_rules().await.expect("deletes");
    assert_eq!(fixture.count().await, 0);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn deletes_all_rules_when_there_are_1_million_rules() {
    let fixture: Fixture = Fixture::new().await;
    let prefix: String = unique();
    for batch in 0..100 {
        let rules: Vec<AccessRule> = (0..10_000)
            .map(|i| r(json!({ "type": "block", "clientId": format!("{prefix}-{batch}-{i}") })))
            .collect();
        fixture.insert(&rules).await;
    }
    assert_eq!(fixture.count().await, 1_000_000);
    fixture.writer.delete_all_rules().await.expect("deletes");
    assert_eq!(fixture.count().await, 0);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn re_pushing_a_rule_without_exclusions_clears_the_previous_list() {
    let fixture: Fixture = Fixture::new().await;
    let rule: AccessRule = r(json!({ "type": "block", "numericIp": "100" }));
    let key: String = access_rule_redis_key(&rule);
    let excluded: AccessRule = AccessRule {
        excluded_client_ids: Some(vec!["site-a".to_string()]),
        ..rule.clone()
    };
    fixture
        .writer
        .insert_rules(&[AccessRuleEntry {
            rule: excluded,
            expires_unix_timestamp: None,
        }])
        .await
        .expect("inserts");
    let stored: Option<String> = fixture
        .client
        .clone()
        .hget(&key, "excludedClientIds")
        .await
        .expect("hget");
    assert_eq!(stored.as_deref(), Some("site-a"));
    fixture
        .writer
        .insert_rules(&[AccessRuleEntry {
            rule,
            expires_unix_timestamp: None,
        }])
        .await
        .expect("inserts");
    let cleared: Option<String> = fixture
        .client
        .clone()
        .hget(&key, "excludedClientIds")
        .await
        .expect("hget");
    assert_eq!(cleared, None);
    fixture.finish().await;
}

// ---------------------------------------------------------------- reader

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_client_and_global_rules_by_greedy_policy_scope_match() {
    let fixture: Fixture = Fixture::new().await;
    let john_id: String = unique();
    let john: AccessRule = r(json!({ "type": "block", "clientId": john_id }));
    let doe: AccessRule = r(json!({ "type": "block", "clientId": unique() }));
    let global: AccessRule = r(json!({ "type": "block" }));
    fixture
        .insert(&[john.clone(), doe.clone(), global.clone()])
        .await;
    let by_client = fixture
        .find(
            json!({ "policyScope": { "clientId": john_id }, "policyScopeMatch": "greedy" }),
            false,
            true,
        )
        .await;
    let all = fixture
        .find(json!({ "policyScopeMatch": "greedy" }), false, true)
        .await;
    assert_eq!(fixture.count().await, 3);
    assert_eq!(by_client, vec![john.clone(), global.clone()]);
    assert_eq!(all, vec![john, doe, global]);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_client_or_global_rules_by_exact_policy_scope_match() {
    let fixture: Fixture = Fixture::new().await;
    let john_id: String = unique();
    let john: AccessRule = r(json!({ "type": "block", "clientId": john_id }));
    let doe: AccessRule = r(json!({ "type": "block", "clientId": unique() }));
    let global: AccessRule = r(json!({ "type": "block" }));
    fixture.insert(&[john.clone(), doe, global.clone()]).await;
    let client_rules = fixture
        .find(
            json!({ "policyScope": { "clientId": john_id }, "policyScopeMatch": "exact" }),
            false,
            true,
        )
        .await;
    let global_rules = fixture
        .find(json!({ "policyScopeMatch": "exact" }), false, false)
        .await;
    assert_eq!(fixture.count().await, 3);
    assert_eq!(client_rules, vec![john]);
    assert_eq!(global_rules, vec![global]);
    fixture.finish().await;
}

const HEADERS_HASH: &str = "00110110100001111101001101100101101101001000011111010011011001010101000110000111110100110110010111010100100011011101101010000011";

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_rules_by_greedy_user_scope_match() {
    let fixture: Fixture = Fixture::new().await;
    let john_id: String = unique();
    let john_ip: AccessRule =
        r(json!({ "type": "block", "clientId": john_id, "numericIp": "100" }));
    let doe_ip: AccessRule =
        r(json!({ "type": "block", "clientId": unique(), "numericIp": "100" }));
    let header: AccessRule = r(json!({ "type": "block", "headersHash": HEADERS_HASH }));
    let ja4: AccessRule = r(json!({ "type": "block", "ja4Hash": "windows" }));
    fixture
        .insert(&[john_ip.clone(), doe_ip, header, ja4.clone()])
        .await;
    let found = fixture
        .find(json!({ "policyScope": { "clientId": john_id }, "userScope": { "numericIp": "100", "ja4Hash": "windows" }, "userScopeMatch": "greedy" }), false, true)
        .await;
    assert_eq!(fixture.count().await, 4);
    assert_eq!(found, vec![john_ip, ja4]);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_rules_by_exact_user_scope_match() {
    let fixture: Fixture = Fixture::new().await;
    let john_id: String = unique();
    let john_target: AccessRule = r(
        json!({ "type": "block", "clientId": john_id, "numericIp": "100", "ja4Hash": "windows" }),
    );
    let doe_target: AccessRule = r(
        json!({ "type": "block", "clientId": unique(), "numericIp": "100", "ja4Hash": "windows" }),
    );
    let header: AccessRule = r(json!({ "type": "block", "headersHash": HEADERS_HASH }));
    let global_target: AccessRule =
        r(json!({ "type": "block", "numericIp": "100", "ja4Hash": "windows" }));
    let global_ja4: AccessRule = r(json!({ "type": "block", "ja4Hash": "windows" }));
    fixture
        .insert(&[
            john_target.clone(),
            doe_target,
            header,
            global_target.clone(),
            global_ja4,
        ])
        .await;
    let found = fixture
        .find(json!({ "policyScope": { "clientId": john_id }, "userScope": { "numericIp": "100", "ja4Hash": "windows" }, "userScopeMatch": "exact" }), false, true)
        .await;
    assert_eq!(fixture.count().await, 5);
    assert_eq!(found, vec![john_target, global_target]);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_rules_by_greedy_ip_match() {
    let fixture: Fixture = Fixture::new().await;
    let john_id: String = unique();
    let john_mask: AccessRule = r(
        json!({ "clientId": john_id, "type": "block", "numericIpMaskMin": "0", "numericIpMaskMax": "100" }),
    );
    let john_ip: AccessRule =
        r(json!({ "clientId": john_id, "type": "block", "numericIp": "100" }));
    let global_mask: AccessRule =
        r(json!({ "type": "block", "numericIpMaskMin": "100", "numericIpMaskMax": "200" }));
    let doe_mask: AccessRule = r(
        json!({ "clientId": unique(), "type": "block", "numericIpMaskMin": "200", "numericIpMaskMax": "300" }),
    );
    fixture
        .insert(&[
            john_mask.clone(),
            john_ip.clone(),
            global_mask.clone(),
            doe_mask,
        ])
        .await;
    let at = |ip: &'static str| json!({ "policyScope": { "clientId": john_id }, "userScope": { "numericIp": ip }, "userScopeMatch": "greedy" });
    assert_eq!(fixture.count().await, 4);
    assert_eq!(
        fixture.find(at("0"), false, true).await,
        vec![john_mask.clone()]
    );
    assert_eq!(
        fixture.find(at("99"), false, true).await,
        vec![john_mask.clone()]
    );
    assert_eq!(
        fixture.find(at("100"), false, true).await,
        vec![john_mask, john_ip, global_mask.clone()]
    );
    assert_eq!(
        fixture.find(at("101"), false, true).await,
        vec![global_mask]
    );
    assert_eq!(
        fixture.find(at("201"), false, true).await,
        Vec::<AccessRule>::new()
    );
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_rules_by_exact_ip_match_with_exact_policy_match() {
    let fixture: Fixture = Fixture::new().await;
    let john_id: String = unique();
    let john_mask: AccessRule = r(
        json!({ "clientId": john_id, "type": "block", "numericIpMaskMin": "0", "numericIpMaskMax": "100" }),
    );
    let john_ip: AccessRule =
        r(json!({ "clientId": john_id, "type": "block", "numericIp": "100" }));
    let global_mask: AccessRule =
        r(json!({ "type": "block", "numericIpMaskMin": "100", "numericIpMaskMax": "200" }));
    let global_ip: AccessRule = r(json!({ "type": "block", "numericIp": "100" }));
    fixture
        .insert(&[john_mask.clone(), john_ip.clone(), global_mask, global_ip])
        .await;
    let at = |ip: &'static str| json!({ "policyScope": { "clientId": john_id }, "policyScopeMatch": "exact", "userScope": { "numericIp": ip }, "userScopeMatch": "exact" });
    assert_eq!(fixture.count().await, 4);
    assert_eq!(
        fixture.find(at("0"), false, true).await,
        vec![john_mask.clone()]
    );
    assert_eq!(
        fixture.find(at("100"), false, true).await,
        vec![john_mask, john_ip]
    );
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_rules_by_exact_ip_match_with_exact_policy_match_2() {
    let fixture: Fixture = Fixture::new().await;
    let john_id: String = unique();
    let john_mask: AccessRule = r(
        json!({ "clientId": john_id, "type": "block", "numericIpMaskMin": "0", "numericIpMaskMax": "100" }),
    );
    let john_ip: AccessRule =
        r(json!({ "clientId": john_id, "type": "block", "numericIp": "100" }));
    let global_mask: AccessRule =
        r(json!({ "type": "block", "numericIpMaskMin": "100", "numericIpMaskMax": "200" }));
    let global_ip: AccessRule = r(json!({ "type": "block", "numericIp": "100" }));
    fixture
        .insert(&[
            john_mask.clone(),
            john_ip,
            global_mask.clone(),
            global_ip.clone(),
        ])
        .await;
    let client_at_0 = fixture
        .find(json!({ "policyScope": { "clientId": john_id }, "policyScopeMatch": "exact", "userScope": { "numericIp": "0" }, "userScopeMatch": "exact" }), false, true)
        .await;
    let global_at_100 = fixture.find(json!({ "policyScopeMatch": "exact", "userScope": { "numericIp": "100" }, "userScopeMatch": "exact" }), false, true).await;
    assert_eq!(fixture.count().await, 4);
    assert_eq!(client_at_0, vec![john_mask]);
    assert_eq!(global_at_100, vec![global_mask, global_ip]);
    fixture.finish().await;
}

fn client_query(user_scope: Value, scope_match: &str) -> Value {
    json!({ "policyScope": { "clientId": "clientId" }, "policyScopeMatch": "exact", "userScope": user_scope, "userScopeMatch": scope_match })
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn does_not_find_rules_when_some_criteria_do_not_match_and_user_scope_match_is_exact() {
    let fixture: Fixture = Fixture::new().await;
    fixture.insert(&[r(json!({ "type": "restrict", "clientId": "clientId", "userAgentHash": "userAgentHash1", "ja4Hash": "ja4Hash" }))]).await;
    let found = fixture
        .find(
            client_query(
                json!({ "ja4Hash": "ja4Hash", "userAgentHash": "userAgentHash2" }),
                "exact",
            ),
            false,
            true,
        )
        .await;
    assert!(found.is_empty());
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn does_not_find_rules_when_query_is_more_exact_than_rule_and_user_scope_match_is_exact() {
    let fixture: Fixture = Fixture::new().await;
    fixture
        .insert(&[r(
            json!({ "type": "restrict", "clientId": "clientId", "ja4Hash": "ja4Hash" }),
        )])
        .await;
    let found = fixture
        .find(
            client_query(
                json!({ "ja4Hash": "ja4Hash", "userAgentHash": "userAgentHash" }),
                "exact",
            ),
            false,
            true,
        )
        .await;
    assert!(found.is_empty());
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn does_find_rules_when_query_is_more_exact_than_rule_and_user_scope_match_is_greedy() {
    let fixture: Fixture = Fixture::new().await;
    let rule: AccessRule =
        r(json!({ "type": "restrict", "clientId": "clientId", "ja4Hash": "ja4Hash" }));
    fixture.insert(std::slice::from_ref(&rule)).await;
    let found = fixture
        .find(
            client_query(
                json!({ "ja4Hash": "ja4Hash", "userAgentHash": "userAgentHash" }),
                "greedy",
            ),
            false,
            true,
        )
        .await;
    assert_eq!(found, vec![rule]);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn does_find_rules_when_some_criteria_do_not_match_and_user_scope_match_is_exact() {
    let fixture: Fixture = Fixture::new().await;
    let rule: AccessRule = r(
        json!({ "type": "restrict", "clientId": "clientId", "userAgentHash": "userAgentHash", "ja4Hash": "ja4Hash" }),
    );
    fixture.insert(std::slice::from_ref(&rule)).await;
    let found = fixture
        .find(
            client_query(
                json!({ "ja4Hash": "ja4Hash", "userAgentHash": "userAgentHash" }),
                "greedy",
            ),
            false,
            true,
        )
        .await;
    assert_eq!(found, vec![rule]);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn both_an_ip_rule_and_an_ip_mask_rule_are_returned_with_the_more_specific_ip_rule_first() {
    let fixture: Fixture = Fixture::new().await;
    let ip: AccessRule =
        r(json!({ "type": "restrict", "clientId": "clientId", "numericIp": "10" }));
    let range: AccessRule = r(
        json!({ "type": "restrict", "clientId": "clientId", "numericIpMaskMin": "10", "numericIpMaskMax": "20" }),
    );
    fixture.insert(&[ip.clone(), range.clone()]).await;
    let found = fixture
        .find(
            client_query(json!({ "numericIp": "10" }), "exact"),
            false,
            true,
        )
        .await;
    assert_eq!(found, vec![ip, range]);
    fixture.finish().await;
}

async fn finds_one_of_two(field: &str, wanted: Value, other: Value, other_kind: &str) {
    let fixture: Fixture = Fixture::new().await;
    let mut wanted_rule: Value = json!({ "type": "block", "clientId": "clientId" });
    let mut other_rule: Value = json!({ "type": other_kind, "clientId": "clientId" });
    for (key, value) in wanted.as_object().expect("an object") {
        wanted_rule[key] = value.clone();
    }
    for (key, value) in other.as_object().expect("an object") {
        other_rule[key] = value.clone();
    }
    let wanted_rule: AccessRule = r(wanted_rule);
    fixture.insert(&[wanted_rule.clone(), r(other_rule)]).await;
    let found = fixture
        .find(client_query(wanted, "exact"), false, true)
        .await;
    assert_eq!(found, vec![wanted_rule], "{field}");
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_rules_by_head_hash_with_exact_match() {
    finds_one_of_two(
        "headHash",
        json!({ "headHash": "abc123def456" }),
        json!({ "headHash": "xyz789ghi012" }),
        "block",
    )
    .await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_rules_by_coords_with_exact_match() {
    finds_one_of_two(
        "coords",
        json!({ "coords": "[[[100,200]]]" }),
        json!({ "coords": "[[[300,400]]]" }),
        "block",
    )
    .await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_rules_by_combined_head_hash_and_coords_with_exact_match() {
    finds_one_of_two(
        "headHash+coords",
        json!({ "headHash": "abc123def456", "coords": "[[[100,200]]]" }),
        json!({ "headHash": "abc123def456" }),
        "restrict",
    )
    .await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_rules_by_country_code_with_exact_match() {
    finds_one_of_two(
        "countryCode",
        json!({ "countryCode": "US" }),
        json!({ "countryCode": "GB" }),
        "block",
    )
    .await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_rules_by_combined_country_code_and_user_id_with_exact_match() {
    finds_one_of_two(
        "countryCode+userId",
        json!({ "countryCode": "US", "userId": "user123" }),
        json!({ "countryCode": "US" }),
        "restrict",
    )
    .await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn returns_remaining_rules_when_a_matched_documents_hash_key_has_been_deleted() {
    let fixture: Fixture = Fixture::new().await;
    let client_id: String = unique();
    let surviving: AccessRule =
        r(json!({ "type": "block", "clientId": client_id, "userId": "user1" }));
    let deleted: AccessRule =
        r(json!({ "type": "block", "clientId": client_id, "userId": "user2" }));
    fixture.insert(&[surviving.clone(), deleted.clone()]).await;
    let _: () = fixture
        .client
        .clone()
        .del(access_rule_redis_key(&deleted))
        .await
        .expect("del");
    let found = fixture
        .find(json!({ "policyScope": { "clientId": client_id }, "policyScopeMatch": "exact", "userScope": { "userId": "user1" }, "userScopeMatch": "greedy" }), false, true)
        .await;
    assert_eq!(found, vec![surviving]);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn returns_empty_array_without_throwing_when_all_matched_documents_have_been_deleted() {
    let fixture: Fixture = Fixture::new().await;
    let client_id: String = unique();
    let rule: AccessRule = r(json!({ "type": "block", "clientId": client_id, "userId": "user1" }));
    fixture.insert(std::slice::from_ref(&rule)).await;
    let _: () = fixture
        .client
        .clone()
        .del(access_rule_redis_key(&rule))
        .await
        .expect("del");
    let found = fixture
        .find(json!({ "policyScope": { "clientId": client_id }, "policyScopeMatch": "exact", "userScope": { "userId": "user1" }, "userScopeMatch": "greedy" }), false, true)
        .await;
    assert!(found.is_empty());
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn returns_all_matches_when_the_candidate_set_exceeds_the_ft_search_page_size() {
    let fixture: Fixture = Fixture::new().await;
    let client_id: String = unique();
    let ja4: String = format!("t13d1516h2_{}", unique());
    let target: AccessRule = r(
        json!({ "type": "block", "clientId": client_id, "ja4Hash": ja4, "coords": "[[[867,60]]]" }),
    );
    let mut rules: Vec<AccessRule> = vec![target.clone()];
    rules.extend((0..1_500).map(|i| {
        r(json!({ "type": "restrict", "clientId": client_id, "ja4Hash": ja4, "coords": format!("[[[{},{}]]]", i % 1024, 60 + (i % 32)), "description": format!("noise-{i}") }))
    }));
    fixture.insert(&rules).await;
    assert_eq!(fixture.count().await, 1_501);
    let found = fixture
        .find(json!({ "policyScope": { "clientId": client_id }, "policyScopeMatch": "greedy", "userScope": { "ja4Hash": ja4, "coords": "[[[867,60]]]" }, "userScopeMatch": "greedy" }), false, true)
        .await;
    assert_eq!(found.len(), 1_501);
    assert!(found.contains(&target));
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn keeps_a_block_rules_message_key_through_the_request_time_block_lookup() {
    let fixture: Fixture = Fixture::new().await;
    let (client_id, user_id): (String, String) = (unique(), unique());
    let rule: AccessRule = r(
        json!({ "type": "block", "clientId": client_id, "userId": user_id, "messageKey": "API.TOO_MANY_LOCALHOST" }),
    );
    fixture.insert(std::slice::from_ref(&rule)).await;
    let found = fixture
        .find(json!({ "policyScope": { "clientId": client_id }, "policyScopeMatch": "exact", "userScope": { "userId": user_id }, "userScopeMatch": "exact", "blockOnly": true }), true, true)
        .await;
    assert_eq!(found, vec![rule]);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_rules_with_matching_fields_only_when_only_user_id_is_set_and_all_ip_fields_are_missing(
) {
    let fixture: Fixture = Fixture::new().await;
    let (client_id, user_id): (String, String) = (unique(), unique());
    let rule: AccessRule = r(json!({ "type": "block", "clientId": client_id, "userId": user_id }));
    fixture.insert(std::slice::from_ref(&rule)).await;
    let found = fixture
        .find(json!({ "policyScope": { "clientId": client_id }, "policyScopeMatch": "exact", "userScope": { "userId": user_id }, "userScopeMatch": "exact" }), true, true)
        .await;
    assert_eq!(found, vec![rule]);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn block_only_filter_returns_only_block_rules_even_when_restrict_rules_share_the_same_user_scope(
) {
    let fixture: Fixture = Fixture::new().await;
    let client_id: String = unique();
    let ja4: &str = "t13d_blockonly";
    fixture
        .insert(&[
            r(json!({ "type": "block", "clientId": client_id, "ja4Hash": ja4 })),
            r(json!({ "type": "block", "clientId": client_id, "ja4Hash": ja4, "coords": "[[[1,2]]]" })),
            r(json!({ "type": "restrict", "clientId": client_id, "ja4Hash": ja4 })),
            r(json!({ "type": "restrict", "clientId": client_id, "ja4Hash": ja4, "coords": "[[[3,4]]]" })),
            r(json!({ "type": "block", "clientId": unique(), "ja4Hash": ja4 })),
        ])
        .await;
    let query = |block_only: bool| json!({ "policyScope": { "clientId": client_id }, "policyScopeMatch": "greedy", "userScope": { "ja4Hash": ja4 }, "userScopeMatch": "greedy", "blockOnly": block_only });
    let mixed = fixture.find(query(false), false, true).await;
    let mut kinds: Vec<&str> = mixed.iter().map(|rule| rule.policy.kind.as_str()).collect();
    kinds.sort();
    assert_eq!(kinds, ["block", "block", "restrict", "restrict"]);
    let block_only = fixture.find(query(true), false, true).await;
    assert_eq!(block_only.len(), 2);
    for rule in &block_only {
        assert_eq!(rule.policy.kind, AccessPolicyType::Block);
        assert_eq!(rule.client_id.as_deref(), Some(client_id.as_str()));
    }
    let mut coords: Vec<Option<String>> = block_only
        .iter()
        .map(|rule| rule.scope.coords.clone())
        .collect();
    coords.sort();
    assert_eq!(coords, [None, Some("[[[1,2]]]".to_string())]);
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn block_only_composes_with_matching_fields_only_on_the_hot_path() {
    let fixture: Fixture = Fixture::new().await;
    let client_id: String = unique();
    let ja4: &str = "t13d_hotpath";
    fixture
        .insert(&[
            r(json!({ "type": "block", "clientId": client_id, "ja4Hash": ja4 })),
            r(json!({ "type": "restrict", "clientId": client_id, "ja4Hash": ja4 })),
            r(json!({ "type": "restrict", "clientId": client_id, "ja4Hash": ja4, "coords": "[[[5,6]]]" })),
        ])
        .await;
    let found = fixture
        .find(json!({ "policyScope": { "clientId": client_id }, "policyScopeMatch": "greedy", "userScope": { "ja4Hash": ja4 }, "userScopeMatch": "greedy", "blockOnly": true }), true, true)
        .await;
    assert!(!found
        .iter()
        .any(|rule| rule.policy.kind == AccessPolicyType::Restrict));
    assert!(found
        .iter()
        .any(|rule| rule.policy.kind == AccessPolicyType::Block
            && rule.scope.ja4_hash.as_deref() == Some(ja4)));
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn specific_ip_restrict_rule_survives_when_many_higher_specificity_irrelevant_rules_co_exist()
{
    let fixture: Fixture = Fixture::new().await;
    let client_id: String = unique();
    let target_ip: &str = "1376899398";
    let mut rules: Vec<AccessRule> = vec![r(
        json!({ "type": "restrict", "clientId": client_id, "numericIp": target_ip, "description": "Too Many Requests" }),
    )];
    for i in 0..20u64 {
        let ip: String = (2_000_000_000 + i).to_string();
        rules.push(r(json!({ "type": "block", "clientId": client_id, "numericIp": ip, "numericIpMaskMin": ip, "numericIpMaskMax": ip, "description": "SIMD_REPLAY" })));
    }
    for i in 0..20 {
        rules.push(r(json!({ "type": "block", "clientId": client_id, "ja4Hash": format!("t13d_other_{i}"), "coords": format!("[[[{},{}]]]", 100 + i, 200 + i), "description": "SUDDEN_VOLUME_INCREASE" })));
    }
    fixture.insert(&rules).await;
    let found = fixture
        .find(
            json!({
                "policyScope": { "clientId": client_id }, "policyScopeMatch": "greedy",
                "userScope": { "numericIp": target_ip, "ja4Hash": "t13d1516h2_request_ja4", "userAgentHash": "sha256:request_ua", "userId": unique() },
                "userScopeMatch": "greedy",
            }),
            true,
            true,
        )
        .await;
    assert!(found.iter().any(|rule| {
        rule.policy.kind == AccessPolicyType::Restrict
            && rule.scope.numeric_ip == Some(target_ip.parse::<BigInt>().expect("an ip"))
            && rule.policy.description.as_deref() == Some("Too Many Requests")
    }));
    fixture.finish().await;
}

#[tokio::test]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn returns_a_global_rules_exclusions_on_the_request_time_path_so_the_ranker_can_apply_them() {
    let fixture: Fixture = Fixture::new().await;
    let excluded_site: String = unique();
    let other_site: String = unique();
    let ip: &str = "1482864477";
    fixture
        .insert(&[
            r(json!({ "type": "block", "numericIp": ip, "description": "excluding", "excludedClientIds": [excluded_site, other_site] })),
            r(json!({ "type": "block", "numericIp": ip, "description": "plain" })),
            r(json!({ "type": "block", "numericIp": ip, "clientId": excluded_site, "description": "own" })),
        ])
        .await;
    let found = fixture
        .find(json!({ "policyScope": { "clientId": excluded_site }, "policyScopeMatch": "greedy", "userScope": { "numericIp": ip }, "userScopeMatch": "greedy", "blockOnly": true }), true, true)
        .await;
    let mut descriptions: Vec<String> = found
        .iter()
        .filter_map(|rule| rule.policy.description.clone())
        .collect();
    descriptions.sort();
    assert_eq!(descriptions, ["excluding", "own", "plain"]);
    let excluding = found
        .iter()
        .find(|rule| rule.policy.description.as_deref() == Some("excluding"))
        .expect("the excluding rule");
    assert_eq!(
        excluding.excluded_client_ids,
        Some(vec![excluded_site.clone(), other_site])
    );
    fixture.finish().await;
}

// ---------------------------------------------------------------- benchmarks

fn percentile(sorted: &[f64], q: f64) -> f64 {
    match sorted.len() {
        0 => 0.0,
        len => sorted[((len - 1) as f64 * q).floor().min((len - 1) as f64) as usize],
    }
}

/// The benchmark seeding: rules written into the production index, removed afterwards.
struct Seeded {
    _guard: MutexGuard<'static, ()>,
    client: RedisClient,
    reader: RedisRulesReader,
    keys: Vec<String>,
}

impl Seeded {
    async fn new(rules: Vec<AccessRule>) -> Seeded {
        let guard: MutexGuard<'static, ()> = LIVE.lock().await;
        let client: RedisClient = redis_client().await;
        let mut keys: Vec<String> = Vec::with_capacity(rules.len());
        for batch in rules.chunks(1_000) {
            let mut pipe: ::redis::Pipeline = ::redis::pipe();
            pipe.atomic();
            for rule in batch {
                let key: String = access_rule_redis_key(rule);
                pipe.hset_multiple(&key, &get_redis_rule_value(rule))
                    .ignore();
                keys.push(key);
            }
            pipe.query_async::<()>(&mut client.clone())
                .await
                .expect("seeds");
        }
        let docs: i64 = index_docs(
            &mut client.clone(),
            crate::redis::ACCESS_RULES_REDIS_INDEX_NAME,
        )
        .await;
        assert!(docs as f64 > rules.len() as f64 * 0.9);
        Seeded {
            _guard: guard,
            reader: RedisRulesReader::new(client.clone(), get_logger(LogLevel::Fatal, "uap-bench")),
            client,
            keys,
        }
    }

    async fn find(&self, filter: Value) -> Vec<AccessRule> {
        let filter: AccessRulesFilter = serde_json::from_value(filter).expect("a filter");
        self.reader.find_rules(&filter, true, true).await
    }

    async fn finish(self) {
        for batch in self.keys.chunks(1_000) {
            let mut pipe: ::redis::Pipeline = ::redis::pipe();
            pipe.atomic();
            for key in batch {
                pipe.del(key).ignore();
            }
            pipe.query_async::<()>(&mut self.client.clone())
                .await
                .expect("unseeds");
        }
    }
}

fn rank_rule(i: usize) -> AccessRule {
    let ja4: String = format!("t13d_bench_{:03}", i % 50);
    let description: String = format!("bench-rule-{i}");
    match (i % 10, i % 3) {
        (0..=6, 0) => r(json!({ "type": "block", "description": description, "ja4Hash": ja4 })),
        (0..=6, 1) => {
            r(json!({ "type": "block", "description": description, "asn": 1000 + (i % 500) }))
        }
        (0..=6, _) => r(
            json!({ "type": "restrict", "description": description, "countryCode": format!("C{}", i % 30) }),
        ),
        (7..=8, _) => {
            let mut rule: Value = json!({ "type": "block", "description": description, "clientId": format!("client{}", i % 20), "ja4Hash": ja4 });
            if i % 2 == 0 {
                rule["userAgentHash"] = json!(format!("ua{}", i % 100));
            }
            r(rule)
        }
        _ => r(json!({
            "type": "block", "description": description, "clientId": format!("client{}", i % 20), "ja4Hash": ja4,
            "userAgentHash": format!("ua{}", i % 100), "headersHash": format!("hh{}", i % 200), "countryCode": format!("C{}", i % 30),
        })),
    }
}

fn rank_request(i: usize) -> Value {
    json!({
        "policyScope": { "clientId": format!("client{}", i % 20) },
        "policyScopeMatch": "greedy",
        "userScope": {
            "ja4Hash": format!("t13d_bench_{:03}", i % 50),
            "userAgentHash": format!("ua{}", i % 100),
            "headersHash": format!("hh{}", i % 200),
            "countryCode": format!("C{}", i % 30),
            "asn": 1000 + (i % 500),
        },
        "userScopeMatch": "greedy",
    })
}

fn rank_seed() -> Vec<AccessRule> {
    (0..10_000).map(rank_rule).collect()
}

// redisRulesReaderRank.benchmark.integration.test.ts. Each case seeds its own 10,000 rules,
// where the TS seeds once in `beforeAll`.

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn ranked_find_rules_p50_p99_over_200_queries_against_10000_rules() {
    let seeded: Seeded = Seeded::new(rank_seed()).await;
    seeded
        .find(json!({ "policyScope": { "clientId": "warmup" }, "policyScopeMatch": "greedy", "userScope": { "ja4Hash": "warmup" }, "userScopeMatch": "greedy" }))
        .await;
    let mut samples: Vec<f64> = Vec::new();
    for i in 0..200 {
        let start: Instant = Instant::now();
        seeded.find(rank_request(i)).await;
        samples.push(start.elapsed().as_secs_f64() * 1000.0);
    }
    samples.sort_by(f64::total_cmp);
    let (p50, p99) = (percentile(&samples, 0.5), percentile(&samples, 0.99));
    println!(
        "ranked findRules: p50={p50:.2}ms p99={p99:.2}ms n={}",
        samples.len()
    );
    assert!(p50 < 80.0 && p99 < 250.0, "p50={p50} p99={p99}");
    seeded.finish().await;
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn split_find_rules_returns_every_applicable_candidate() {
    let seeded: Seeded = Seeded::new(rank_seed()).await;
    assert!(!seeded.find(rank_request(0)).await.is_empty());
    seeded.finish().await;
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn ranked_path_returns_full_rules() {
    let seeded: Seeded = Seeded::new(rank_seed()).await;
    let results = seeded.find(rank_request(0)).await;
    assert!(!results.is_empty());
    for rule in &results {
        assert!(!rule.policy.kind.as_str().is_empty());
    }
    seeded.finish().await;
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn ranked_find_rules_returns_rules_in_specificity_descending_order() {
    let seeded: Seeded = Seeded::new(rank_seed()).await;
    let results = seeded.find(rank_request(9)).await;
    if let Some(top) = results.first() {
        let count = |rule: &AccessRule| -> usize {
            let scope = &rule.scope;
            [
                scope.user_id.is_some(),
                scope.ja4_hash.is_some(),
                scope.headers_hash.is_some(),
                scope.user_agent_hash.is_some(),
                scope.head_hash.is_some(),
                scope.coords.is_some(),
                scope.country_code.is_some(),
                scope.asn.is_some(),
                rule.client_id.is_some(),
                scope.numeric_ip.is_some() || scope.numeric_ip_mask_min.is_some(),
            ]
            .into_iter()
            .filter(|set| *set)
            .count()
        };
        let top_score: usize = count(top);
        assert!(results.iter().all(|rule| count(rule) <= top_score));
    }
    seeded.finish().await;
}

fn load_ip(i: u64) -> BigInt {
    BigInt::from((10u64 << 24) + i)
}

fn load_cidr(i: u64) -> (BigInt, BigInt) {
    let base: u64 = (192 << 24) + (168 << 16) + ((i % 256) << 8);
    (BigInt::from(base), BigInt::from(base + 255))
}

fn load_rules() -> Vec<AccessRule> {
    let mut rules: Vec<AccessRule> = (0..17_000u64)
        .map(|i| r(json!({ "type": "block", "description": format!("bulk-ban-ip-{i}"), "numericIp": load_ip(i).to_string() })))
        .collect();
    rules.extend((0..1_300u64).map(|i| {
        let (min, max) = load_cidr(i);
        r(json!({ "type": "block", "description": format!("bulk-ban-cidr-{i}"), "numericIpMaskMin": min.to_string(), "numericIpMaskMax": max.to_string() }))
    }));
    rules.extend((0..1_000usize).map(|i| match i % 4 {
        0 => r(json!({ "type": "block", "description": format!("mixed-{i}"), "clientId": format!("client{}", i % 30), "ja4Hash": format!("t13d_load_{}", i % 50) })),
        1 => r(json!({ "type": "restrict", "description": format!("mixed-{i}"), "countryCode": format!("C{}", i % 30) })),
        2 => r(json!({ "type": "block", "description": format!("mixed-{i}"), "asn": 1000 + (i % 500) })),
        _ => r(json!({ "type": "block", "description": format!("mixed-{i}"), "clientId": format!("client{}", i % 30), "userAgentHash": format!("ua{}", i % 100) })),
    }));
    rules
}

fn block_lookup(client_id: &str, scope: Value) -> Value {
    json!({ "policyScope": { "clientId": client_id }, "policyScopeMatch": "greedy", "userScope": scope, "userScopeMatch": "greedy", "blockOnly": true })
}

// redisRulesReaderLoad.benchmark.integration.test.ts. Each case seeds its own 19,300 rules.

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn split_query_hot_path_stays_flat_under_19300_rules() {
    let seeded: Seeded = Seeded::new(load_rules()).await;
    seeded
        .find(block_lookup(
            "warmup",
            json!({ "numericIp": load_ip(999_999).to_string() }),
        ))
        .await;
    let mut samples: Vec<f64> = Vec::new();
    for i in 0..300u64 {
        let ip: BigInt = if i % 2 == 0 {
            load_ip(i % 17_000)
        } else {
            load_ip(17_000 + i + 1_000_000)
        };
        let scope: Value = json!({
            "numericIp": ip.to_string(), "ja4Hash": format!("t13d_load_{}", i % 50), "userAgentHash": format!("ua{}", i % 100),
            "countryCode": format!("C{}", i % 30), "asn": 1000 + (i % 500),
        });
        let start: Instant = Instant::now();
        seeded
            .find(block_lookup(&format!("client{}", i % 30), scope))
            .await;
        samples.push(start.elapsed().as_secs_f64() * 1000.0);
    }
    samples.sort_by(f64::total_cmp);
    let (p50, p99) = (percentile(&samples, 0.5), percentile(&samples, 0.99));
    println!(
        "split-query load: p50={p50:.2}ms p99={p99:.2}ms n={}",
        samples.len()
    );
    assert!(p50 < 120.0 && p99 < 400.0, "p50={p50} p99={p99}");
    seeded.finish().await;
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_exact_ip_bulk_ban_rule_for_matching_request() {
    let seeded: Seeded = Seeded::new(load_rules()).await;
    let target: BigInt = load_ip(42);
    let found = seeded
        .find(block_lookup(
            "client1",
            json!({ "numericIp": target.to_string(), "ja4Hash": "t13d_load_1" }),
        ))
        .await;
    let hit = found
        .iter()
        .find(|rule| rule.scope.numeric_ip.as_ref() == Some(&target))
        .expect("the exact-IP rule");
    assert_eq!(hit.policy.kind, AccessPolicyType::Block);
    seeded.finish().await;
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_cidr_range_bulk_ban_rule_for_request_ip_inside_the_range() {
    let seeded: Seeded = Seeded::new(load_rules()).await;
    let (min, max) = load_cidr(7);
    let inside: BigInt = &min + 42;
    assert!(inside <= max);
    let found = seeded
        .find(block_lookup(
            "client1",
            json!({ "numericIp": inside.to_string() }),
        ))
        .await;
    assert!(found.iter().any(|rule| {
        rule.scope.numeric_ip_mask_min.as_ref() == Some(&min)
            && rule.scope.numeric_ip_mask_max.as_ref() == Some(&max)
            && rule.policy.kind == AccessPolicyType::Block
    }));
    seeded.finish().await;
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn finds_ja4_scoped_rule_via_the_split_query_ja4_probe() {
    let seeded: Seeded = Seeded::new(load_rules()).await;
    let found = seeded
        .find(block_lookup(
            "client0",
            json!({ "numericIp": load_ip(999_998).to_string(), "ja4Hash": "t13d_load_0" }),
        ))
        .await;
    assert!(found
        .iter()
        .any(|rule| rule.scope.ja4_hash.as_deref() == Some("t13d_load_0")
            && rule.client_id.as_deref() == Some("client0")));
    seeded.finish().await;
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn returns_no_match_when_request_ip_is_outside_every_rule_range() {
    let seeded: Seeded = Seeded::new(load_rules()).await;
    let found = seeded
        .find(block_lookup(
            "client99",
            json!({ "numericIp": load_ip(9_999_999).to_string() }),
        ))
        .await;
    assert!(!found.iter().any(|rule| {
        rule.scope.numeric_ip.is_some()
            || (rule.scope.numeric_ip_mask_min.is_some()
                && rule.scope.numeric_ip_mask_max.is_some())
    }));
    seeded.finish().await;
}

#[tokio::test(flavor = "multi_thread")]
#[ignore = "needs Redis Stack at redis://localhost:6379 (password root)"]
async fn concurrent_retry_storm_100_in_flight_by_10_waves_against_19300_rules() {
    let seeded: Seeded = Seeded::new(load_rules()).await;
    let target: BigInt = load_ip(42);
    seeded
        .find(block_lookup(
            "client1",
            json!({ "numericIp": load_ip(999_997).to_string() }),
        ))
        .await;
    let storm: Value = json!({ "numericIp": target.to_string(), "ja4Hash": "t13d_load_1", "userAgentHash": "ua5", "countryCode": "C5", "asn": 1005 });
    let mut all: Vec<f64> = Vec::new();
    let mut first_wave_p99: f64 = 0.0;
    for wave in 0..10 {
        let mut wave_samples: Vec<f64> = futures_util::future::join_all((0..100).map(|_| {
            let filter: Value = block_lookup("client1", storm.clone());
            let seeded: &Seeded = &seeded;
            let target: &BigInt = &target;
            async move {
                let start: Instant = Instant::now();
                let found = seeded.find(filter).await;
                assert!(found
                    .iter()
                    .any(|rule| rule.scope.numeric_ip.as_ref() == Some(target)));
                start.elapsed().as_secs_f64() * 1000.0
            }
        }))
        .await;
        wave_samples.sort_by(f64::total_cmp);
        if wave == 0 {
            first_wave_p99 = percentile(&wave_samples, 0.99);
        }
        all.extend(wave_samples);
    }
    all.sort_by(f64::total_cmp);
    let (p50, p99) = (percentile(&all, 0.5), percentile(&all, 0.99));
    println!("storm 100x10: p50={p50:.2}ms p99={p99:.2}ms first-wave p99={first_wave_p99:.2}ms");
    assert!(
        p50 < 200.0 && p99 < 800.0 && first_wave_p99 < 800.0,
        "p50={p50} p99={p99} first={first_wave_p99}"
    );
    seeded.finish().await;
}
