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

//! Reading rules from Redis (src/redis/reader/redisRulesReader.ts, redisAggregate.ts and
//! redisClient.ts).

use super::index::{ACCESS_RULES_REDIS_INDEX_NAME, ACCESS_RULE_REDIS_KEY_PREFIX};
use super::query::{
    build_scoped_rules_sub_queries, get_rules_redis_query, SubQuery, EMPTY_FILTER_QUERY,
    REDIS_QUERY_DIALECT,
};
use super::writer::{strip_prefix, REDIS_BATCH_SIZE};
use crate::input::parse_access_rule;
use crate::rule::{AccessPolicyType, AccessRule};
use crate::storage::{AccessRuleEntry, AccessRulesFilter, Result, RuleIdBatchHandler};
use futures_util::future::join_all;
use prosopo_logger::{ErrorObject, LogRecord, Logger};
use prosopo_redis_client::RedisClient;
use prosopo_types::JsNumber;
use redis::Value as RedisValue;
use serde_json::{json, Map, Value};

/// Candidates per split sub-query. Each probes one discriminating index, so this only bites
/// on pathological rule sets.
const SPLIT_MAX_CANDIDATES_PER_SUB: usize = 500;

/// Candidates for the admin (greedy) path.
const GREEDY_MAX_CANDIDATES: usize = REDIS_BATCH_SIZE * 10;

/// EXPIRETIME's answer for a key without one.
const UNSET_EXPIRATION_VALUE: i64 = -1;

fn text(value: &RedisValue) -> Option<String> {
    match value {
        RedisValue::BulkString(bytes) => Some(String::from_utf8_lossy(bytes).into_owned()),
        RedisValue::SimpleString(text) => Some(text.clone()),
        RedisValue::VerbatimString { text, .. } => Some(text.clone()),
        _ => None,
    }
}

/// A RESP3 map, or a RESP2 flat `[key, value, ...]` array, as pairs.
fn pairs(value: &RedisValue) -> Vec<(String, &RedisValue)> {
    match value {
        RedisValue::Map(entries) => entries
            .iter()
            .filter_map(|(key, value)| text(key).map(|key| (key, value)))
            .collect(),
        RedisValue::Array(items) => items
            .chunks(2)
            .filter_map(|pair| match pair {
                [key, value] => text(key).map(|key| (key, value)),
                _ => None,
            })
            .collect(),
        _ => Vec::new(),
    }
}

fn get<'a>(pairs: &'a [(String, &'a RedisValue)], key: &str) -> Option<&'a RedisValue> {
    pairs
        .iter()
        .find(|(name, _)| name == key)
        .map(|(_, value)| *value)
}

/// HGETALL as the JSON object the record schema parses.
fn hash_record(value: &RedisValue) -> Map<String, Value> {
    pairs(value)
        .into_iter()
        .filter_map(|(key, value)| text(value).map(|value| (key, Value::String(value))))
        .collect()
}

/// The keys of an `FT.SEARCH ... NOCONTENT` reply.
pub(crate) fn search_keys(reply: &RedisValue) -> Vec<String> {
    match reply {
        RedisValue::Map(_) => {
            let fields = pairs(reply);
            match get(&fields, "results") {
                Some(RedisValue::Array(results)) => results
                    .iter()
                    .filter_map(|result| get(&pairs(result), "id").and_then(text))
                    .collect(),
                _ => Vec::new(),
            }
        }
        RedisValue::Array(items) => items.iter().skip(1).filter_map(text).collect(),
        _ => Vec::new(),
    }
}

/// `FT.SEARCH index query NOCONTENT LIMIT 0 max DIALECT 2`.
pub(crate) fn search_keys_command(query: &str, max_keys: usize) -> redis::Cmd {
    let mut command: redis::Cmd = redis::cmd("FT.SEARCH");
    command
        .arg(ACCESS_RULES_REDIS_INDEX_NAME)
        .arg(query)
        .arg("NOCONTENT")
        .arg("LIMIT")
        .arg(0)
        .arg(max_keys)
        .arg("DIALECT")
        .arg(REDIS_QUERY_DIALECT);
    command
}

/// The rows of one aggregate reply, each the loaded fields of a document.
fn aggregate_rows(results: &RedisValue) -> Vec<Map<String, Value>> {
    let row = |row: &RedisValue| -> Map<String, Value> {
        let fields = pairs(row);
        let loaded: &RedisValue = get(&fields, "extra_attributes").unwrap_or(row);
        hash_record(loaded)
    };
    match results {
        RedisValue::Map(_) => match get(&pairs(results), "results") {
            Some(RedisValue::Array(rows)) => rows.iter().map(row).collect(),
            _ => Vec::new(),
        },
        RedisValue::Array(items) => items.iter().skip(1).map(row).collect(),
        _ => Vec::new(),
    }
}

/// `[results, cursor]` from `FT.AGGREGATE ... WITHCURSOR` or `FT.CURSOR READ`.
fn cursor_reply(reply: &RedisValue) -> (Vec<Map<String, Value>>, i64) {
    match reply {
        RedisValue::Array(parts) if parts.len() == 2 => {
            let cursor: i64 = match &parts[1] {
                RedisValue::Int(cursor) => *cursor,
                other => text(other).and_then(|t| t.parse().ok()).unwrap_or(0),
            };
            (aggregate_rows(&parts[0]), cursor)
        }
        _ => (Vec::new(), 0),
    }
}

/// Specificity as the reader sorts by it: one point per populated scope field. Header rules
/// count nothing here.
fn reader_specificity(rule: &AccessRule) -> usize {
    let scope = &rule.scope;
    [
        rule.client_id.is_some(),
        scope.user_id.is_some(),
        scope.ja4_hash.is_some(),
        scope.headers_hash.is_some(),
        scope.user_agent_hash.is_some(),
        scope.head_hash.is_some(),
        scope.coords.is_some(),
        scope.country_code.is_some(),
        scope.asn.is_some(),
        scope.os.is_some(),
        scope.browser.is_some(),
        scope.numeric_ip.is_some(),
        scope.numeric_ip_mask_min.is_some(),
    ]
    .into_iter()
    .filter(|set: &bool| *set)
    .count()
}

/// Specificity descending, then Block first.
fn sort_by_reader_rank(mut rules: Vec<AccessRule>) -> Vec<AccessRule> {
    rules.sort_by(|a: &AccessRule, b: &AccessRule| {
        let block = |rule: &AccessRule| usize::from(rule.policy.kind == AccessPolicyType::Block);
        reader_specificity(b)
            .cmp(&reader_specificity(a))
            .then_with(|| block(b).cmp(&block(a)))
    });
    rules
}

#[derive(Clone)]
pub struct RedisRulesReader {
    client: RedisClient,
    logger: Logger,
}

impl RedisRulesReader {
    pub fn new(client: RedisClient, logger: Logger) -> RedisRulesReader {
        RedisRulesReader { client, logger }
    }

    fn client(&self) -> RedisClient {
        self.client.clone()
    }

    /// The records that parse as rules; the others are logged and skipped.
    fn parse_records(&self, records: Vec<Map<String, Value>>) -> Vec<(usize, AccessRule)> {
        records
            .into_iter()
            .enumerate()
            .filter(|(_, record)| !record.is_empty())
            .filter_map(|(index, record)| {
                let record: Value = Value::Object(record);
                match parse_access_rule(&record) {
                    Ok(rule) => Some((index, rule)),
                    Err(error) => {
                        self.logger.error(|| {
                            LogRecord::msg("Failed to parse Redis record").with_data(json!({
                                "record": record,
                                "error": error,
                            }))
                        });
                        None
                    }
                }
            })
            .collect()
    }

    async fn hash_records(&self, keys: &[String]) -> Result<Vec<Map<String, Value>>> {
        let mut pipe: redis::Pipeline = redis::pipe();
        pipe.atomic();
        for key in keys {
            pipe.hgetall(key);
        }
        let replies: Vec<RedisValue> = pipe.query_async(&mut self.client()).await?;
        Ok(replies.iter().map(hash_record).collect())
    }

    async fn expirations(&self, keys: &[String]) -> Result<Vec<Option<JsNumber>>> {
        let mut pipe: redis::Pipeline = redis::pipe();
        pipe.atomic();
        for key in keys {
            pipe.cmd("EXPIRETIME").arg(key);
        }
        let replies: Vec<i64> = pipe.query_async(&mut self.client()).await?;
        Ok(replies
            .into_iter()
            .map(|seconds: i64| {
                (seconds != UNSET_EXPIRATION_VALUE).then_some(JsNumber(seconds as f64))
            })
            .collect())
    }

    pub async fn get_missing_rule_ids(&self, rule_ids: &[String]) -> Result<Vec<String>> {
        let keys: Vec<String> = self.rule_keys(rule_ids);
        let mut missing: Vec<String> = Vec::new();
        for batch in keys.chunks(REDIS_BATCH_SIZE) {
            let mut pipe: redis::Pipeline = redis::pipe();
            pipe.atomic();
            for key in batch {
                pipe.exists(key);
            }
            let exists: Vec<i64> = pipe.query_async(&mut self.client()).await?;
            missing.extend(
                batch
                    .iter()
                    .zip(exists)
                    .filter(|(_, exists)| *exists == 0)
                    .map(|(key, _)| strip_prefix(key)),
            );
        }
        Ok(missing)
    }

    pub async fn fetch_rules(&self, rule_ids: &[String]) -> Result<Vec<AccessRuleEntry>> {
        let keys: Vec<String> = self.rule_keys(rule_ids);
        let mut entries: Vec<AccessRuleEntry> = Vec::new();
        for batch in keys.chunks(REDIS_BATCH_SIZE) {
            let records: Vec<Map<String, Value>> = self.hash_records(batch).await?;
            let expirations: Vec<Option<JsNumber>> = self.expirations(batch).await?;
            for (index, rule) in self.parse_records(records) {
                entries.push(AccessRuleEntry {
                    rule,
                    expires_unix_timestamp: expirations.get(index).copied().flatten(),
                });
            }
        }
        Ok(entries)
    }

    /// `findRules`. A strict lookup with a user scope goes through one probe per populated
    /// field; everything else is the admin path. An empty filter finds nothing unless
    /// `skip_empty_user_scopes` is off.
    pub async fn find_rules(
        &self,
        filter: &AccessRulesFilter,
        matching_fields_only: bool,
        skip_empty_user_scopes: bool,
    ) -> Vec<AccessRule> {
        let query: String = get_rules_redis_query(filter, matching_fields_only);
        if skip_empty_user_scopes && query == EMPTY_FILTER_QUERY {
            return Vec::new();
        }
        if matching_fields_only && filter.user_scope.is_some() {
            return self.find_rules_split(filter).await;
        }
        self.find_rules_greedy(filter, &query).await
    }

    async fn find_rules_split(&self, filter: &AccessRulesFilter) -> Vec<AccessRule> {
        let Some(scope) = &filter.user_scope else {
            return Vec::new();
        };
        let client_id: Option<&str> = filter
            .policy_scope
            .as_ref()
            .and_then(|p| p.client_id.as_deref());
        let sub_queries: Vec<SubQuery> = build_scoped_rules_sub_queries(
            scope,
            client_id,
            filter.block_only == Some(true),
            filter.include_deferred == Some(true),
        );
        let key_lists: Vec<Vec<String>> =
            join_all(sub_queries.iter().map(|sub: &SubQuery| async move {
                match self
                    .search_keys_bounded(&sub.query, SPLIT_MAX_CANDIDATES_PER_SUB)
                    .await
                {
                    Ok(keys) => keys,
                    Err(error) => {
                        self.logger.error(|| {
                            LogRecord::msg("failed to execute split rule sub-query")
                                .with_err(ErrorObject::from_std_error(&error))
                                .with_data(json!({ "subKind": sub.kind, "query": sub.query }))
                        });
                        Vec::new()
                    }
                }
            }))
            .await;
        let mut keys: Vec<String> = Vec::new();
        for key in key_lists.into_iter().flatten() {
            if !keys.contains(&key) {
                keys.push(key);
            }
        }
        if keys.is_empty() {
            return Vec::new();
        }
        match self.hash_records(&keys).await {
            Ok(records) => sort_by_reader_rank(
                self.parse_records(records)
                    .into_iter()
                    .map(|(_, rule)| rule)
                    .collect(),
            ),
            Err(error) => {
                self.logger.error(|| {
                    LogRecord::msg("failed to execute split rule query set")
                        .with_err(ErrorObject::from_std_error(&error))
                });
                Vec::new()
            }
        }
    }

    async fn find_rules_greedy(&self, filter: &AccessRulesFilter, query: &str) -> Vec<AccessRule> {
        let found = async {
            let keys: Vec<String> = self
                .aggregate_keys(query, None, Some(GREEDY_MAX_CANDIDATES))
                .await?;
            if keys.is_empty() {
                return Ok(Vec::new());
            }
            let records: Vec<Map<String, Value>> = self.hash_records(&keys).await?;
            Ok::<Vec<AccessRule>, crate::storage::RulesStorageError>(
                self.parse_records(records)
                    .into_iter()
                    .map(|(_, rule)| rule)
                    .collect(),
            )
        };
        found.await.unwrap_or_else(|error| {
            self.logger.error(|| {
                LogRecord::msg("failed to execute greedy search query")
                    .with_err(ErrorObject::from_std_error(&error))
                    .with_data(json!({ "query": query, "filter": filter }))
            });
            Vec::new()
        })
    }

    pub async fn find_rule_ids(
        &self,
        filter: &AccessRulesFilter,
        matching_fields_only: bool,
    ) -> Vec<String> {
        let query: String = get_rules_redis_query(filter, matching_fields_only);
        match self.aggregate_keys(&query, None, None).await {
            Ok(keys) => keys.iter().map(|key: &String| strip_prefix(key)).collect(),
            Err(error) => {
                self.logger.error(|| {
                    LogRecord::msg("Failed to execute search query for rule IDs")
                        .with_err(ErrorObject::from_std_error(&error))
                        .with_data(json!({ "query": query, "filter": filter }))
                });
                Vec::new()
            }
        }
    }

    pub async fn fetch_all_rule_ids(&self, handler: &mut dyn RuleIdBatchHandler) -> Result<()> {
        self.aggregate_keys("*", Some(handler), None)
            .await
            .map(|_| ())
    }

    /// `searchRedisKeysBounded`: `FT.SEARCH ... NOCONTENT`, whose flat reply has no tuples
    /// that can come back null.
    async fn search_keys_bounded(&self, query: &str, max_keys: usize) -> Result<Vec<String>> {
        let reply: RedisValue = search_keys_command(query, max_keys)
            .query_async(&mut self.client())
            .await?;
        Ok(search_keys(&reply))
    }

    /// `aggregateRedisKeys`: every key the query matches, read through a cursor. With a
    /// handler each batch goes to it instead; with `max_keys` reading stops once it is hit.
    async fn aggregate_keys(
        &self,
        query: &str,
        mut handler: Option<&mut dyn RuleIdBatchHandler>,
        max_keys: Option<usize>,
    ) -> Result<Vec<String>> {
        let reply: RedisValue = redis::cmd("FT.AGGREGATE")
            .arg(ACCESS_RULES_REDIS_INDEX_NAME)
            .arg(query)
            .arg("LOAD")
            .arg(1)
            .arg("@__key")
            .arg("DIALECT")
            .arg(REDIS_QUERY_DIALECT)
            .arg("WITHCURSOR")
            .arg("COUNT")
            .arg(REDIS_BATCH_SIZE)
            .query_async(&mut self.client())
            .await?;
        let mut found: Vec<String> = Vec::new();
        let (mut rows, mut cursor): (Vec<Map<String, Value>>, i64) = cursor_reply(&reply);
        loop {
            let keys: Vec<String> = rows
                .into_iter()
                .filter_map(|row: Map<String, Value>| match row.get("__key") {
                    Some(Value::String(key)) => Some(key.clone()),
                    _ => {
                        self.logger.error(|| {
                            LogRecord::msg("Failed to parse Redis record")
                                .with_data(json!({ "record": row }))
                        });
                        None
                    }
                })
                .collect();
            match handler.as_deref_mut() {
                Some(handler) => {
                    handler
                        .handle(keys.iter().map(|key| strip_prefix(key)).collect())
                        .await?
                }
                None => match max_keys {
                    Some(max) if found.len() + keys.len() > max => {
                        let remaining: usize = max.saturating_sub(found.len());
                        found.extend(keys.into_iter().take(remaining));
                        self.logger.warn(|| {
                            LogRecord::msg("Redis aggregation candidate cap hit; truncating result set. This can suppress less-frequent rules and should be investigated.")
                                .with_data(json!({ "maxKeys": max, "query": query }))
                        });
                        return Ok(found);
                    }
                    _ => found.extend(keys),
                },
            }
            if cursor == 0 {
                return Ok(found);
            }
            let next: RedisValue = redis::cmd("FT.CURSOR")
                .arg("READ")
                .arg(ACCESS_RULES_REDIS_INDEX_NAME)
                .arg(cursor)
                .arg("COUNT")
                .arg(REDIS_BATCH_SIZE)
                .query_async(&mut self.client())
                .await?;
            (rows, cursor) = cursor_reply(&next);
        }
    }

    fn rule_keys(&self, rule_ids: &[String]) -> Vec<String> {
        rule_ids
            .iter()
            .map(|id: &String| format!("{ACCESS_RULE_REDIS_KEY_PREFIX}{id}"))
            .collect()
    }
}
