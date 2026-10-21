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

//! `RedisWriteQueue` (redisCache.ts): the Redis read cache in front of the session records, and
//! the short-lived mappings the frictionless flow keeps. Every failure is logged and reads as a
//! miss: the cache is never why a request fails.
//!
//! Entries are the JSON text the TS writes, so a TS and a Rust provider sharing a Redis read each
//! other's: the TS `JSON.stringify` layout, a date as its ISO string, and a bigint as a string
//! tagged [`BIGINT_TAG`], which is kept as such in the values handed out here.

use crate::source::Source;
use prosopo_logger::{iso_timestamp, json_stringify, LogRecord, Logger};
use prosopo_redis_client::{RedisClient, RedisConnection};
use prosopo_types::timeouts::DEFAULT_MAX_TIMESTAMP_AGE;
use redis::aio::ConnectionLike;
use serde_json::{Map, Value};
use std::sync::Arc;
use std::time::Duration;

pub const BIGINT_TAG: &str = "__bigint__:";

const SESSION_PATCH_MAX_ATTEMPTS: usize = 5;

/// SET KEYS[1] to ARGV[2] with EX ARGV[3] only if it still holds ARGV[1].
const COMPARE_AND_SET_SCRIPT: &str = r#"
if redis.call("GET", KEYS[1]) ~= ARGV[1] then return 0 end
redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[3])
return 1
"#;

const SESSION_KEY_PATTERNS: [&str; 2] = ["cache:session:*", "cache:detector:*"];

pub const SESSION_TTL_SECONDS: u64 = 86_400;
pub const SESSION_BY_HASH_TTL_SECONDS: u64 = 3_600;
pub const SESSION_ESCALATION_TTL_SECONDS: u64 = 600;

/// How long a detector session's bundle is remembered: as long as the frictionless flow still
/// accepts its payload, since the bundle is what decrypts it.
pub const DETECTOR_BUNDLE_TTL_SECONDS: u64 = DEFAULT_MAX_TIMESTAMP_AGE / 1000;

/// A bigint as the cache holds it.
pub fn tag_bigint(digits: &str) -> Value {
    Value::String(format!("{BIGINT_TAG}{digits}"))
}

/// The digits of a cached bigint.
pub fn tagged_bigint(value: &Value) -> Option<&str> {
    value.as_str().and_then(|text| text.strip_prefix(BIGINT_TAG))
}

fn session_key(session_id: &str) -> String {
    format!("cache:session:{session_id}")
}

fn hash_key(user_sitekey_ip_hash: &str) -> String {
    format!("cache:session:hash:{user_sitekey_ip_hash}")
}

fn escalation_key(origin_session_id: &str) -> String {
    format!("cache:session:escalation:{origin_session_id}")
}

fn detector_key(detector_session_id: &str) -> String {
    format!("cache:detector:{detector_session_id}")
}

/// JS truthiness of a JSON value.
fn truthy(value: Option<&Value>) -> bool {
    match value {
        None | Some(Value::Null) | Some(Value::Bool(false)) => false,
        Some(Value::String(text)) => !text.is_empty(),
        Some(Value::Number(number)) => number.as_f64().is_some_and(|n| n != 0.0 && !n.is_nan()),
        Some(_) => true,
    }
}

fn parse_session(text: &str) -> Result<Map<String, Value>, String> {
    match serde_json::from_str::<Value>(text).map_err(|error| error.to_string())? {
        Value::Object(session) => Ok(session),
        other => Err(format!("not a session: {other}")),
    }
}

pub struct RedisWriteQueue<C: Clone = RedisClient> {
    connection: RedisConnection<C>,
    logger: Logger,
    source: Arc<dyn Source>,
}

impl<C> RedisWriteQueue<C>
where
    C: ConnectionLike + Clone + Send + Sync + 'static,
{
    pub fn new(connection: RedisConnection<C>, logger: Logger, source: Arc<dyn Source>) -> RedisWriteQueue<C> {
        RedisWriteQueue { connection, logger, source }
    }

    async fn client(&self) -> Option<C> {
        if !self.connection.is_ready() {
            return None;
        }
        self.connection.get_client().await.ok()
    }

    /// `new Date()` as `JSON.stringify` writes it.
    fn now(&self) -> Value {
        Value::String(iso_timestamp(self.source.now().timestamp_millis()))
    }

    fn warn(&self, msg: &str, error: impl ToString) {
        self.logger.warn(|| LogRecord::msg(msg).with_err(error.to_string()));
    }

    async fn set(&self, key: &str, value: &str, ttl_seconds: u64, failure: &str) -> bool {
        let Some(mut client) = self.client().await else {
            return false;
        };
        let set: redis::RedisResult<()> =
            redis::cmd("SET").arg(key).arg(value).arg("EX").arg(ttl_seconds).query_async(&mut client).await;
        match set {
            Ok(()) => true,
            Err(error) => {
                self.warn(failure, error);
                false
            }
        }
    }

    async fn get(&self, key: &str, failure: &str) -> Option<String> {
        let mut client: C = self.client().await?;
        let got: redis::RedisResult<Option<String>> = redis::cmd("GET").arg(key).query_async(&mut client).await;
        match got {
            Ok(value) => value,
            Err(error) => {
                self.warn(failure, error);
                None
            }
        }
    }

    async fn delete(&self, key: &str, failure: &str) {
        let Some(mut client) = self.client().await else {
            return;
        };
        let deleted: redis::RedisResult<i64> = redis::cmd("DEL").arg(key).query_async(&mut client).await;
        if let Err(error) = deleted {
            self.warn(failure, error);
        }
    }

    /// `cacheSession`.
    pub async fn cache_session(&self, session_id: &str, session: &Map<String, Value>, ttl_seconds: Option<u64>) -> bool {
        let text: String = json_stringify(&Value::Object(session.clone()), 0);
        self.set(&session_key(session_id), &text, ttl_seconds.unwrap_or(SESSION_TTL_SECONDS), "Failed to cache session in Redis")
            .await
    }

    /// `getCachedSession`.
    pub async fn get_cached_session(&self, session_id: &str) -> Option<Map<String, Value>> {
        let failure: &str = "Failed to get cached session from Redis";
        let text: String = self.get(&session_key(session_id), failure).await.filter(|text| !text.is_empty())?;
        match parse_session(&text) {
            Ok(session) => Some(session),
            Err(error) => {
                self.warn(failure, error);
                None
            }
        }
    }

    /// `patchCachedSession`: the updates merged over the cached session, unless it is not
    /// cached, in which case the next read fills it from the database.
    pub async fn patch_cached_session(&self, session_id: &str, updates: &Map<String, Value>, ttl_seconds: Option<u64>) -> bool {
        self.compare_and_set_cached_session(session_id, ttl_seconds.unwrap_or(SESSION_TTL_SECONDS), |existing| {
            let mut next: Map<String, Value> = existing;
            next.extend(updates.clone());
            next.insert("lastUpdatedTimestamp".to_string(), self.now());
            Some(next)
        })
        .await
    }

    /// `patchCachedSimdReadingsIfAbsent`: the first readings win, as in the database.
    pub async fn patch_cached_simd_readings_if_absent(&self, session_id: &str, readings: &Value, stage: &str, ttl_seconds: Option<u64>) -> bool {
        self.compare_and_set_cached_session(session_id, ttl_seconds.unwrap_or(SESSION_TTL_SECONDS), |existing| {
            if truthy(existing.get("simdReadings")) {
                return None;
            }
            let mut next: Map<String, Value> = existing;
            next.insert("simdReadings".to_string(), readings.clone());
            next.insert("simdReadingsStage".to_string(), Value::String(stage.to_string()));
            next.insert("lastUpdatedTimestamp".to_string(), self.now());
            Some(next)
        })
        .await
    }

    /// A read-modify-write that lands only if the entry is unchanged since it was read, so a
    /// session invalidated meanwhile is not recreated and a concurrent patch is not lost. On a
    /// conflict the patch is made again on the new value.
    async fn compare_and_set_cached_session(
        &self,
        session_id: &str,
        ttl_seconds: u64,
        patch: impl Fn(Map<String, Value>) -> Option<Map<String, Value>>,
    ) -> bool {
        let Some(mut client) = self.client().await else {
            return false;
        };
        let key: String = session_key(session_id);
        let attempt = async {
            for _ in 0..SESSION_PATCH_MAX_ATTEMPTS {
                let current: Option<String> = redis::cmd("GET").arg(&key).query_async(&mut client).await.map_err(|error| error.to_string())?;
                let Some(current) = current.filter(|text| !text.is_empty()) else {
                    return Ok(false);
                };
                let Some(next) = patch(parse_session(&current)?) else {
                    return Ok(false);
                };
                let written: i64 = redis::cmd("EVAL")
                    .arg(COMPARE_AND_SET_SCRIPT)
                    .arg(1)
                    .arg(&key)
                    .arg(&current)
                    .arg(json_stringify(&Value::Object(next), 0))
                    .arg(ttl_seconds.to_string())
                    .query_async(&mut client)
                    .await
                    .map_err(|error| error.to_string())?;
                if written == 1 {
                    return Ok(true);
                }
            }
            self.logger.warn(|| LogRecord::msg("Gave up patching cached session after repeated conflicts"));
            Ok::<bool, String>(false)
        };
        match attempt.await {
            Ok(written) => written,
            Err(error) => {
                self.warn("Failed to patch cached session in Redis", error);
                false
            }
        }
    }

    /// `invalidateCachedSession`.
    pub async fn invalidate_cached_session(&self, session_id: &str) {
        self.delete(&session_key(session_id), "Failed to invalidate cached session in Redis").await;
    }

    /// `invalidateCachedSessionByHash`: to go with [`Self::invalidate_cached_session`] when a
    /// session is consumed, or the hash keeps leading to it.
    pub async fn invalidate_cached_session_by_hash(&self, user_sitekey_ip_hash: &str) {
        self.delete(&hash_key(user_sitekey_ip_hash), "Failed to invalidate cached session hash in Redis").await;
    }

    /// `cacheSessionByHash`: the session a user, site key and IP already have.
    pub async fn cache_session_by_hash(&self, user_sitekey_ip_hash: &str, session_id: &str, ttl_seconds: Option<u64>) -> bool {
        self.set(
            &hash_key(user_sitekey_ip_hash),
            session_id,
            ttl_seconds.unwrap_or(SESSION_BY_HASH_TTL_SECONDS),
            "Failed to cache session hash in Redis",
        )
        .await
    }

    /// `getCachedSessionByHash`.
    pub async fn get_cached_session_by_hash(&self, user_sitekey_ip_hash: &str) -> Option<String> {
        self.get(&hash_key(user_sitekey_ip_hash), "Failed to get cached session hash from Redis").await
    }

    /// `cacheDetectorBundle`: false when Redis is unavailable, so the caller can fail closed.
    pub async fn cache_detector_bundle(&self, detector_session_id: &str, bundle_id: &str, ttl_seconds: Option<u64>) -> bool {
        self.set(
            &detector_key(detector_session_id),
            bundle_id,
            ttl_seconds.unwrap_or(DETECTOR_BUNDLE_TTL_SECONDS),
            "Failed to cache detector bundle assignment in Redis",
        )
        .await
    }

    /// `getDetectorBundle`.
    pub async fn get_detector_bundle(&self, detector_session_id: &str) -> Option<String> {
        self.get(&detector_key(detector_session_id), "Failed to get detector bundle assignment from Redis").await
    }

    /// `cacheSessionEscalation`: where a session the post-PoW routing escalated went, for a
    /// widget that comes back with the old session id.
    pub async fn cache_session_escalation(&self, origin_session_id: &str, escalation_session_id: &str, ttl_seconds: Option<u64>) -> bool {
        self.set(
            &escalation_key(origin_session_id),
            escalation_session_id,
            ttl_seconds.unwrap_or(SESSION_ESCALATION_TTL_SECONDS),
            "Failed to cache session escalation mapping in Redis",
        )
        .await
    }

    /// `getCachedSessionEscalation`.
    pub async fn get_cached_session_escalation(&self, origin_session_id: &str) -> Option<String> {
        self.get(&escalation_key(origin_session_id), "Failed to get cached session escalation mapping from Redis").await
    }

    /// `invalidateCachedSessionEscalation`.
    pub async fn invalidate_cached_session_escalation(&self, origin_session_id: &str) {
        self.delete(&escalation_key(origin_session_id), "Failed to invalidate cached session escalation mapping").await;
    }

    /// `clearAllSessionRecords`: at start-up, every session and detector key a previous run
    /// left, found with SCAN. Waits for the connection rather than asking whether it is ready,
    /// since it runs before it is, but not past `timeout`.
    pub async fn clear_all_session_records(&self, timeout: Option<Duration>) {
        self.logger.info(|| LogRecord::msg("Clearing Redis session records at startup"));
        let connected = tokio::time::timeout(timeout.unwrap_or(Duration::from_millis(5_000)), self.connection.get_client()).await;
        let mut client: C = match connected {
            Ok(Ok(client)) => client,
            Ok(Err(error)) => return self.warn("Skipped Redis session cleanup — Redis not reachable", error),
            Err(_) => return self.warn("Skipped Redis session cleanup — Redis not reachable", "Redis connection timeout"),
        };
        let cleared = async {
            let mut total_deleted: usize = 0;
            for pattern in SESSION_KEY_PATTERNS {
                let mut cursor: u64 = 0;
                loop {
                    let (next, keys): (u64, Vec<String>) =
                        redis::cmd("SCAN").arg(cursor).arg("MATCH").arg(pattern).arg("COUNT").arg(500).query_async(&mut client).await?;
                    if !keys.is_empty() {
                        let _: i64 = redis::cmd("DEL").arg(&keys).query_async(&mut client).await?;
                        total_deleted += keys.len();
                    }
                    if next == 0 {
                        break;
                    }
                    cursor = next;
                }
            }
            Ok::<usize, redis::RedisError>(total_deleted)
        };
        match cleared.await {
            Ok(total_deleted) => self.logger.info(|| {
                LogRecord::msg("Cleared Redis session records at startup").with_data(serde_json::json!({ "totalDeleted": total_deleted }))
            }),
            Err(error) => self.warn("Failed to clear Redis session records at startup", error),
        }
    }

    pub fn is_ready(&self) -> bool {
        self.connection.is_ready()
    }
}
