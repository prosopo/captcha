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

//! Writing rules to Redis (src/redis/redisRulesWriter.ts).

use super::index::{access_rule_redis_key, ACCESS_RULE_REDIS_KEY_PREFIX};
use crate::rule::{AccessRule, RuleValue, GLOBAL_CLIENT_SCOPE_SENTINEL};
use crate::storage::{AccessRuleEntry, Result, RulesStorageError};
use crate::transform::js_string;
use prosopo_redis_client::RedisClient;
use prosopo_util_crypto::js::js_number_to_string;

pub const REDIS_BATCH_SIZE: usize = 1_000;

const EXCLUDED_CLIENT_IDS_FIELD: &str = "excludedClientIds";

/// Unix timestamps in milliseconds are above this; in seconds they will not reach it until 2286.
const MILLISECOND_THRESHOLD: f64 = 10_000_000_000.0;

/// `getRedisRuleValue`: the hash a rule is stored as. Lists are joined on `,` (the TAG
/// separator) and dropped when empty; a global rule gets the `global` sentinel as its client.
pub fn get_redis_rule_value(rule: &AccessRule) -> Vec<(String, String)> {
    let mut fields: Vec<(String, String)> = rule
        .entries()
        .into_iter()
        .filter(|(_, value)| !matches!(value, RuleValue::List(items) if items.is_empty()))
        .map(|(key, value)| (key.to_string(), js_string(&value)))
        .collect();
    if !fields.iter().any(|(key, _)| key == "clientId") {
        fields.push((
            "clientId".to_string(),
            GLOBAL_CLIENT_SCOPE_SENTINEL.to_string(),
        ));
    }
    fields
}

pub(crate) fn strip_prefix(key: &str) -> String {
    key.strip_prefix(ACCESS_RULE_REDIS_KEY_PREFIX)
        .unwrap_or(key)
        .to_string()
}

#[derive(Clone)]
pub struct RedisRulesWriter {
    client: RedisClient,
}

impl RedisRulesWriter {
    pub fn new(client: RedisClient) -> RedisRulesWriter {
        RedisRulesWriter { client }
    }

    /// Writes every entry, a batch per `MULTI`, and returns their ids. An expiry that looks
    /// like milliseconds fails the batch it is in, after the batches before it are written.
    pub async fn insert_rules(&self, entries: &[AccessRuleEntry]) -> Result<Vec<String>> {
        let mut ids: Vec<String> = Vec::with_capacity(entries.len());
        for batch in entries.chunks(REDIS_BATCH_SIZE) {
            let mut pipe: redis::Pipeline = redis::pipe();
            pipe.atomic();
            for entry in batch {
                let key: String = access_rule_redis_key(&entry.rule);
                let value: Vec<(String, String)> = get_redis_rule_value(&entry.rule);
                pipe.hset_multiple(&key, &value).ignore();
                // hSet merges into an existing hash and exclusions are not part of the key, so a
                // rule pushed again without them would keep its previous list.
                if !value
                    .iter()
                    .any(|(field, _)| field == EXCLUDED_CLIENT_IDS_FIELD)
                {
                    pipe.hdel(&key, EXCLUDED_CLIENT_IDS_FIELD).ignore();
                }
                let expires: f64 = entry.expires_unix_timestamp.map_or(0.0, |n| n.get());
                if expires != 0.0 && !expires.is_nan() {
                    if expires > MILLISECOND_THRESHOLD {
                        return Err(RulesStorageError::InvalidExpiry(format!(
                            "Invalid expiry timestamp: {}. Timestamp must be in seconds, not milliseconds.",
                            js_number_to_string(expires)
                        )));
                    }
                    pipe.cmd("EXPIREAT")
                        .arg(&key)
                        .arg(js_number_to_string(expires))
                        .ignore();
                }
                ids.push(strip_prefix(&key));
            }
            let mut client: RedisClient = self.client.clone();
            pipe.query_async::<()>(&mut client).await?;
        }
        Ok(ids)
    }

    pub async fn delete_rules(&self, rule_ids: &[String]) -> Result<()> {
        let keys: Vec<String> = rule_ids
            .iter()
            .map(|id: &String| format!("{ACCESS_RULE_REDIS_KEY_PREFIX}{id}"))
            .collect();
        for batch in keys.chunks(REDIS_BATCH_SIZE) {
            let mut pipe: redis::Pipeline = redis::pipe();
            pipe.atomic();
            for key in batch {
                pipe.del(key).ignore();
            }
            let mut client: RedisClient = self.client.clone();
            pipe.query_async::<()>(&mut client).await?;
        }
        Ok(())
    }

    /// Deletes every `uar:` key, scanning in batches; returns how many it found.
    pub async fn delete_all_rules(&self) -> Result<usize> {
        let mut cursor: String = "0".to_string();
        let mut total: usize = 0;
        loop {
            let mut client: RedisClient = self.client.clone();
            let (next, keys): (String, Vec<String>) = redis::cmd("SCAN")
                .arg(&cursor)
                .arg("MATCH")
                .arg(format!("{ACCESS_RULE_REDIS_KEY_PREFIX}*"))
                .arg("COUNT")
                .arg(REDIS_BATCH_SIZE)
                .query_async(&mut client)
                .await?;
            let ids: Vec<String> = keys.iter().map(|key: &String| strip_prefix(key)).collect();
            self.delete_rules(&ids).await?;
            total += ids.len();
            cursor = next;
            if cursor == "0" {
                return Ok(total);
            }
        }
    }
}
