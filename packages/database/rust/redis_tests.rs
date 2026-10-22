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

//! The Redis cache against an in-memory Redis: the replay of rust/equivalence/redis.json, written
//! by redis.ts from the TS `RedisWriteQueue`, and redisCacheEscalation.unit.test.ts.

use crate::redis_cache::{tag_bigint, tagged_bigint, RedisWriteQueue, DETECTOR_BUNDLE_TTL_SECONDS};
use crate::source::Source;
use crate::testing::FakeRedis;
use bson::oid::ObjectId;
use bson::DateTime;
use prosopo_logger::{get_logger_with_runtime, ConsoleMethod, DirectiveStore, LogLevel, LogRuntime, Sink, SystemClock};
use prosopo_redis_client::RedisConnection;
use prosopo_types::timeouts::DEFAULT_MAX_TIMESTAMP_AGE;
use redis::aio::ConnectionLike;
use redis::{Arg, Cmd, Pipeline, RedisError, RedisFuture, Value as RedisValue};
use serde_json::{Map, Value};
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};

struct PinnedSource(DateTime);

impl Source for PinnedSource {
    fn now(&self) -> DateTime {
        self.0
    }

    fn random(&self) -> f64 {
        0.0
    }

    fn object_id(&self) -> ObjectId {
        ObjectId::new()
    }
}

#[derive(Default)]
struct Warnings(Mutex<usize>);

impl Sink for Warnings {
    fn write(&self, method: ConsoleMethod, _line: &str) {
        if method == ConsoleMethod::Warn {
            *self.0.lock().expect("lock") += 1;
        }
    }
}

impl Warnings {
    fn count(&self) -> usize {
        *self.0.lock().expect("lock")
    }
}

struct Fixture {
    queue: RedisWriteQueue<FakeRedis>,
    redis: FakeRedis,
    warnings: Arc<Warnings>,
}

fn fixture(now_ms: i64) -> Fixture {
    let redis: FakeRedis = FakeRedis::default();
    let warnings: Arc<Warnings> = Arc::new(Warnings::default());
    let runtime: LogRuntime = LogRuntime {
        sink: warnings.clone(),
        clock: Arc::new(SystemClock),
        directives: Arc::new(DirectiveStore::new("")),
    };
    let queue: RedisWriteQueue<FakeRedis> = RedisWriteQueue::new(
        RedisConnection::ready(redis.clone()),
        get_logger_with_runtime(LogLevel::Info, "cache", runtime),
        Arc::new(PinnedSource(DateTime::from_millis(now_ms))),
    );
    Fixture { queue, redis, warnings }
}

const VECTORS: &str = include_str!("equivalence/redis.json");

fn object(value: &Value) -> Map<String, Value> {
    value.as_object().expect("an object").clone()
}

fn ttl(args: &[Value], index: usize) -> Option<u64> {
    args.get(index).and_then(Value::as_u64)
}

#[tokio::test]
async fn the_cache_writes_and_reads_what_the_ts_writes_and_reads() {
    let vectors: Value = serde_json::from_str(VECTORS).expect("redis.json parses");
    let now_ms: i64 = vectors["nowMs"].as_i64().expect("nowMs");
    let mut failures: Vec<String> = Vec::new();
    for case in vectors["cases"].as_array().expect("cases") {
        let fixture: Fixture = fixture(now_ms);
        for (key, value) in case["before"].as_object().expect("before") {
            fixture.redis.store.lock().expect("lock").insert(key.clone(), (value.as_str().expect("text").to_string(), None));
        }
        let a: &Vec<Value> = case["args"].as_array().expect("args");
        let text = |index: usize| a[index].as_str().expect("a string");
        let queue: &RedisWriteQueue<FakeRedis> = &fixture.queue;
        let result: Value = match case["method"].as_str().expect("method") {
            "cacheSession" => Value::Bool(queue.cache_session(text(0), &object(&a[1]), ttl(a, 2)).await),
            "getCachedSession" => queue.get_cached_session(text(0)).await.map(Value::Object).unwrap_or(Value::Null),
            "patchCachedSession" => Value::Bool(queue.patch_cached_session(text(0), &object(&a[1]), ttl(a, 2)).await),
            "patchCachedSimdReadingsIfAbsent" => {
                Value::Bool(queue.patch_cached_simd_readings_if_absent(text(0), &a[1], text(2), ttl(a, 3)).await)
            }
            "cacheSessionByHash" => Value::Bool(queue.cache_session_by_hash(text(0), text(1), ttl(a, 2)).await),
            "getCachedSessionByHash" => queue.get_cached_session_by_hash(text(0)).await.map(Value::String).unwrap_or(Value::Null),
            "cacheDetectorBundle" => Value::Bool(queue.cache_detector_bundle(text(0), text(1), ttl(a, 2)).await),
            "getDetectorBundle" => queue.get_detector_bundle(text(0)).await.map(Value::String).unwrap_or(Value::Null),
            "cacheSessionEscalation" => Value::Bool(queue.cache_session_escalation(text(0), text(1), ttl(a, 2)).await),
            "getCachedSessionEscalation" => queue.get_cached_session_escalation(text(0)).await.map(Value::String).unwrap_or(Value::Null),
            "invalidateCachedSessionEscalation" => {
                queue.invalidate_cached_session_escalation(text(0)).await;
                Value::Null
            }
            "invalidateCachedSession" => {
                queue.invalidate_cached_session(text(0)).await;
                Value::Null
            }
            "invalidateCachedSessionByHash" => {
                queue.invalidate_cached_session_by_hash(text(0)).await;
                Value::Null
            }
            other => panic!("no method {other}"),
        };
        let name: &str = case["name"].as_str().expect("name");
        if result != case["result"] {
            failures.push(format!("{name}: result\n      rust {result}\n      ts   {}", case["result"]));
        }
        let expected: Vec<Vec<String>> = case["sent"]
            .as_array()
            .expect("sent")
            .iter()
            .map(|sent| {
                let mut command: Vec<String> = vec![sent["command"].as_str().expect("command").to_string()];
                command.extend(sent["args"].as_array().expect("args").iter().map(|arg| arg.as_str().expect("an argument").to_string()));
                command
            })
            .collect();
        let sent: Vec<Vec<String>> = fixture.redis.sent();
        if sent != expected {
            failures.push(format!("{name}: sent\n      rust {sent:?}\n      ts   {expected:?}"));
        }
    }
    assert!(failures.is_empty(), "{} problems:\n{}", failures.len(), failures.join("\n"));
}

/// A session built in Rust, rather than read from the TS's text, is still written as
/// `JSON.stringify` writes it: integer-like keys first and in order, `-0` as `0`.
#[tokio::test]
async fn a_session_built_in_rust_is_written_as_json_stringify_writes_it() {
    let fixture: Fixture = fixture(0);
    let mut session: Map<String, Value> = Map::new();
    session.insert("sessionId".to_string(), Value::String("s".to_string()));
    session.insert("10".to_string(), Value::Bool(true));
    session.insert("2".to_string(), Value::Bool(false));
    session.insert("score".to_string(), serde_json::json!(-0.0));
    session.insert("lower".to_string(), tag_bigint("3232235777"));
    fixture.queue.cache_session("s", &session, None).await;
    assert_eq!(
        fixture.redis.sent()[0][2],
        r#"{"2":false,"10":true,"sessionId":"s","score":0,"lower":"__bigint__:3232235777"}"#
    );
}

#[test]
fn a_bigint_is_tagged_as_the_ts_tags_it() {
    assert_eq!(tag_bigint("3232235777"), Value::String("__bigint__:3232235777".to_string()));
    assert_eq!(tagged_bigint(&tag_bigint("18446744073709551615")), Some("18446744073709551615"));
    assert_eq!(tagged_bigint(&Value::String("3232235777".to_string())), None);
}

/// detectorBundleTtl.unit.test.ts.
#[test]
fn the_detector_bundle_lives_as_long_as_its_payload_is_accepted() {
    const { assert!(DETECTOR_BUNDLE_TTL_SECONDS * 1000 == DEFAULT_MAX_TIMESTAMP_AGE) };
    const { assert!(DETECTOR_BUNDLE_TTL_SECONDS > 0) };
}

/// redisCacheEscalation.unit.test.ts.
mod session_escalation_mapping {
    use super::*;

    #[tokio::test]
    async fn stores_the_mapping_under_the_documented_key() {
        let fixture: Fixture = fixture(0);
        assert!(fixture.queue.cache_session_escalation("origin-A", "escalation-B", None).await);
        assert_eq!(fixture.redis.sent(), vec![vec!["SET", "cache:session:escalation:origin-A", "escalation-B", "EX", "600"]]);
        assert_eq!(fixture.redis.live("cache:session:escalation:origin-A").as_deref(), Some("escalation-B"));
    }

    #[tokio::test]
    async fn returns_the_cached_value_when_present() {
        let fixture: Fixture = fixture(0);
        fixture.queue.cache_session_escalation("origin-A", "escalation-B", None).await;
        assert_eq!(fixture.queue.get_cached_session_escalation("origin-A").await.as_deref(), Some("escalation-B"));
    }

    #[tokio::test]
    async fn returns_nothing_when_no_mapping_was_recorded() {
        let fixture: Fixture = fixture(0);
        assert_eq!(fixture.queue.get_cached_session_escalation("unknown-origin").await, None);
    }

    #[tokio::test]
    async fn invalidating_drops_the_mapping() {
        let fixture: Fixture = fixture(0);
        fixture.queue.cache_session_escalation("origin-A", "escalation-B", None).await;
        fixture.redis.sent();
        fixture.queue.invalidate_cached_session_escalation("origin-A").await;
        assert_eq!(fixture.redis.sent(), vec![vec!["DEL", "cache:session:escalation:origin-A"]]);
        assert_eq!(fixture.queue.get_cached_session_escalation("origin-A").await, None);
    }

    #[tokio::test]
    async fn invalidating_a_missing_mapping_does_nothing() {
        let fixture: Fixture = fixture(0);
        fixture.queue.invalidate_cached_session_escalation("never-cached").await;
        assert_eq!(fixture.warnings.count(), 0);
    }

    #[tokio::test]
    async fn honours_a_custom_ttl() {
        let fixture: Fixture = fixture(0);
        fixture.queue.cache_session_escalation("origin-A", "escalation-B", Some(30)).await;
        assert_eq!(fixture.redis.sent(), vec![vec!["SET", "cache:session:escalation:origin-A", "escalation-B", "EX", "30"]]);
    }

    fn unavailable() -> RedisWriteQueue {
        let connection = prosopo_redis_client::connect_to_redis(prosopo_redis_client::RedisOptions {
            url: Some("redis://127.0.0.1:1".to_string()),
            password: None,
            logger: prosopo_logger::get_logger(LogLevel::Error, "test"),
        })
        .expect("a valid URL");
        RedisWriteQueue::new(connection, prosopo_logger::get_logger(LogLevel::Error, "test"), Arc::new(PinnedSource(DateTime::from_millis(0))))
    }

    #[tokio::test]
    async fn caching_fails_without_redis() {
        assert!(!unavailable().cache_session_escalation("origin-A", "escalation-B", None).await);
    }

    #[tokio::test]
    async fn reading_finds_nothing_without_redis() {
        assert_eq!(unavailable().get_cached_session_escalation("origin-A").await, None);
    }

    async fn fails_quietly(command: &str) -> Fixture {
        let fixture: Fixture = fixture(0);
        fixture.redis.failing.lock().expect("lock").push(command.to_string());
        fixture
    }

    #[tokio::test]
    async fn a_failed_set_is_false_and_a_warning() {
        let fixture: Fixture = fails_quietly("SET").await;
        assert!(!fixture.queue.cache_session_escalation("origin-A", "escalation-B", None).await);
        assert!(fixture.warnings.count() > 0);
    }

    #[tokio::test]
    async fn a_failed_get_is_nothing_and_a_warning() {
        let fixture: Fixture = fails_quietly("GET").await;
        assert_eq!(fixture.queue.get_cached_session_escalation("origin-A").await, None);
        assert!(fixture.warnings.count() > 0);
    }

    #[tokio::test]
    async fn a_failed_delete_is_a_warning() {
        let fixture: Fixture = fails_quietly("DEL").await;
        fixture.queue.invalidate_cached_session_escalation("origin-A").await;
        assert!(fixture.warnings.count() > 0);
    }

    #[tokio::test]
    async fn entries_expire_after_their_ttl() {
        let fixture: Fixture = fixture(0);
        fixture.queue.cache_session_escalation("origin-A", "escalation-B", Some(1)).await;
        assert_eq!(fixture.queue.get_cached_session_escalation("origin-A").await.as_deref(), Some("escalation-B"));
        fixture.redis.now_ms.store(2_000, Ordering::SeqCst);
        assert_eq!(fixture.queue.get_cached_session_escalation("origin-A").await, None);
    }
}

#[tokio::test]
async fn clearing_at_start_up_removes_the_session_and_detector_keys_only() {
    let fixture: Fixture = fixture(0);
    for key in ["cache:session:a", "cache:session:hash:b", "cache:detector:c", "unrelated"] {
        fixture.redis.store.lock().expect("lock").insert(key.to_string(), ("x".to_string(), None));
    }
    fixture.queue.clear_all_session_records(None).await;
    let left: Vec<String> = fixture.redis.store.lock().expect("lock").keys().cloned().collect();
    assert_eq!(left, vec!["unrelated".to_string()]);
}

/// redisCacheSessionPatch.integration.test.ts, against the Redis at `REDIS_CONNECTION_URL`.
mod live_session_patches {
    use super::*;
    use prosopo_redis_client::{connect_to_redis, RedisClient, RedisOptions};
    use std::future::Future;
    use std::pin::Pin;

    type Interleave = Pin<Box<dyn Future<Output = ()> + Send>>;

    /// A client that, after the first GET it answers, lets something else happen first.
    #[derive(Clone)]
    struct Interleaving {
        inner: RedisClient,
        then: Arc<Mutex<Option<Interleave>>>,
    }

    impl ConnectionLike for Interleaving {
        fn req_packed_command<'a>(&'a mut self, cmd: &'a Cmd) -> RedisFuture<'a, RedisValue> {
            Box::pin(async move {
                let is_get: bool = matches!(cmd.args_iter().next(), Some(Arg::Simple(name)) if name.eq_ignore_ascii_case(b"GET"));
                let reply: Result<RedisValue, RedisError> = self.inner.req_packed_command(cmd).await;
                if is_get {
                    let interleave: Option<Interleave> = self.then.lock().expect("lock").take();
                    if let Some(interleave) = interleave {
                        interleave.await;
                    }
                }
                reply
            })
        }

        fn req_packed_commands<'a>(&'a mut self, pipeline: &'a Pipeline, offset: usize, count: usize) -> RedisFuture<'a, Vec<RedisValue>> {
            self.inner.req_packed_commands(pipeline, offset, count)
        }

        fn get_db(&self) -> i64 {
            self.inner.get_db()
        }
    }

    struct Live {
        client: RedisClient,
        queue: RedisWriteQueue<Interleaving>,
        other: Arc<RedisWriteQueue<RedisClient>>,
        then: Arc<Mutex<Option<Interleave>>>,
        session_id: String,
    }

    impl Live {
        async fn new(name: &str) -> Live {
            let logger = || prosopo_logger::get_logger(LogLevel::Error, "test");
            let connection = connect_to_redis(RedisOptions {
                url: Some(std::env::var("REDIS_CONNECTION_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string())),
                password: Some(std::env::var("REDIS_CONNECTION_PASSWORD").unwrap_or_else(|_| "root".to_string())),
                logger: logger(),
            })
            .expect("a valid URL");
            let client: RedisClient = connection.get_client().await.expect("connects");
            let then: Arc<Mutex<Option<Interleave>>> = Arc::new(Mutex::new(None));
            let interleaving: Interleaving = Interleaving { inner: client.clone(), then: then.clone() };
            let source = || -> Arc<dyn Source> { Arc::new(crate::source::SystemSource) };
            let live: Live = Live {
                client,
                queue: RedisWriteQueue::new(RedisConnection::ready(interleaving), logger(), source()),
                other: Arc::new(RedisWriteQueue::new(connection, logger(), source())),
                then,
                session_id: format!("patch-race-{name}-{}", std::process::id()),
            };
            live.forget().await;
            live
        }

        fn key(&self) -> String {
            format!("cache:session:{}", self.session_id)
        }

        fn after_the_first_read(&self, interleave: Interleave) {
            *self.then.lock().expect("lock") = Some(interleave);
        }

        async fn exists(&self) -> bool {
            let mut client: RedisClient = self.client.clone();
            redis::cmd("EXISTS").arg(self.key()).query_async::<i64>(&mut client).await.expect("EXISTS") == 1
        }

        async fn forget(&self) {
            let mut client: RedisClient = self.client.clone();
            let _: i64 = redis::cmd("DEL").arg(self.key()).query_async(&mut client).await.expect("DEL");
        }

        async fn cache(&self, session: Value) {
            assert!(self.queue.cache_session(&self.session_id, &object(&session), Some(60)).await);
        }
    }

    fn deleting(live: &Live) -> Interleave {
        let mut client: RedisClient = live.client.clone();
        let key: String = live.key();
        Box::pin(async move {
            let _: i64 = redis::cmd("DEL").arg(key).query_async(&mut client).await.expect("DEL");
        })
    }

    #[tokio::test]
    #[ignore = "needs a Redis at REDIS_CONNECTION_URL"]
    async fn a_patch_does_not_recreate_a_session_invalidated_meanwhile() {
        let live: Live = Live::new("invalidated").await;
        live.cache(serde_json::json!({ "score": 0.5 })).await;
        live.after_the_first_read(deleting(&live));
        assert!(!live.queue.patch_cached_session(&live.session_id, &object(&serde_json::json!({ "score": 0.9 })), None).await);
        assert!(!live.exists().await);
    }

    #[tokio::test]
    #[ignore = "needs a Redis at REDIS_CONNECTION_URL"]
    async fn attaching_readings_does_not_recreate_a_session_invalidated_meanwhile() {
        let live: Live = Live::new("invalidated-simd").await;
        live.cache(serde_json::json!({ "score": 0.5 })).await;
        live.after_the_first_read(deleting(&live));
        assert!(!live.queue.patch_cached_simd_readings_if_absent(&live.session_id, &serde_json::json!({ "a": 1 }), "load", None).await);
        assert!(!live.exists().await);
    }

    #[tokio::test]
    #[ignore = "needs a Redis at REDIS_CONNECTION_URL"]
    async fn a_patch_keeps_a_field_a_concurrent_patch_wrote() {
        let live: Live = Live::new("concurrent").await;
        live.cache(serde_json::json!({ "score": 0.5 })).await;
        let (other, session_id) = (live.other.clone(), live.session_id.clone());
        live.after_the_first_read(Box::pin(async move {
            other.patch_cached_session(&session_id, &object(&serde_json::json!({ "token": "abc" })), None).await;
        }));
        assert!(live.queue.patch_cached_session(&live.session_id, &object(&serde_json::json!({ "score": 0.9 })), None).await);
        let stored: Map<String, Value> = live.queue.get_cached_session(&live.session_id).await.expect("cached");
        assert_eq!(stored.get("score"), Some(&serde_json::json!(0.9)));
        assert_eq!(stored.get("token"), Some(&serde_json::json!("abc")));
        live.forget().await;
    }

    #[tokio::test]
    #[ignore = "needs a Redis at REDIS_CONNECTION_URL"]
    async fn the_first_readings_win_over_a_concurrent_hop() {
        let live: Live = Live::new("first-readings").await;
        live.cache(serde_json::json!({ "score": 0.5 })).await;
        let (other, session_id) = (live.other.clone(), live.session_id.clone());
        live.after_the_first_read(Box::pin(async move {
            other.patch_cached_simd_readings_if_absent(&session_id, &serde_json::json!({ "first": 1 }), "load", None).await;
        }));
        assert!(!live.queue.patch_cached_simd_readings_if_absent(&live.session_id, &serde_json::json!({ "second": 2 }), "submit", None).await);
        let stored: Map<String, Value> = live.queue.get_cached_session(&live.session_id).await.expect("cached");
        assert_eq!(stored.get("simdReadings"), Some(&serde_json::json!({ "first": 1 })));
        assert_eq!(stored.get("simdReadingsStage"), Some(&serde_json::json!("load")));
        live.forget().await;
    }

    #[tokio::test]
    #[ignore = "needs a Redis at REDIS_CONNECTION_URL"]
    async fn a_patch_merges_the_updates_and_refreshes_the_ttl() {
        let live: Live = Live::new("merge").await;
        live.cache(serde_json::json!({ "score": 0.5, "bigint": tag_bigint("7") })).await;
        assert!(live.queue.patch_cached_session(&live.session_id, &object(&serde_json::json!({ "score": 0.9 })), Some(120)).await);
        let stored: Map<String, Value> = live.queue.get_cached_session(&live.session_id).await.expect("cached");
        assert_eq!(stored.get("score"), Some(&serde_json::json!(0.9)));
        assert_eq!(stored.get("bigint").and_then(tagged_bigint), Some("7"));
        let mut client: RedisClient = live.client.clone();
        let ttl: i64 = redis::cmd("TTL").arg(live.key()).query_async(&mut client).await.expect("TTL");
        assert!(ttl > 60, "ttl {ttl}");
        live.forget().await;
    }

    #[tokio::test]
    #[ignore = "needs a Redis at REDIS_CONNECTION_URL"]
    async fn a_patch_of_an_uncached_session_does_nothing() {
        let live: Live = Live::new("miss").await;
        assert!(!live.queue.patch_cached_session(&live.session_id, &object(&serde_json::json!({ "score": 1 })), None).await);
        assert!(!live.exists().await);
    }
}

/// `ProviderDatabase`'s Redis: the getters before `setupRedis` ran, and after, against the Redis
/// at `REDIS_CONNECTION_URL`.
mod provider_redis {
    use crate::operation::{Executor, Operation, ReplyFuture};
    use crate::provider::{ProviderDatabase, RedisSettings};
    use crate::source::SystemSource;
    use prosopo_logger::{get_logger, LogLevel};
    use std::sync::Arc;

    struct NoDatabase;

    impl Executor for NoDatabase {
        fn run(&self, _operation: Operation) -> ReplyFuture<'_> {
            Box::pin(async { Err(crate::mongo::MongoError::Unavailable("no database".to_string())) })
        }
    }

    fn provider() -> ProviderDatabase {
        ProviderDatabase::new(Arc::new(NoDatabase), Arc::new(SystemSource), get_logger(LogLevel::Error, "test"))
    }

    #[test]
    fn the_redis_getters_fail_until_redis_is_set_up() {
        let db: ProviderDatabase = provider();
        assert_eq!(db.get_redis_connection().err().and_then(|error| error.translation_key().map(str::to_string)).as_deref(), Some("DATABASE.REDIS_ACCESS_RULES_CONNECTION_UNDEFINED"));
        assert_eq!(
            db.get_redis_access_rules_connection().err().and_then(|error| error.translation_key().map(str::to_string)).as_deref(),
            Some("DATABASE.REDIS_ACCESS_RULES_CONNECTION_UNDEFINED")
        );
        assert_eq!(
            db.get_user_access_rules_storage().err().and_then(|error| error.translation_key().map(str::to_string)).as_deref(),
            Some("DATABASE.USER_ACCESS_RULES_STORAGE_UNDEFINED")
        );
    }

    #[tokio::test]
    #[ignore = "needs a Redis at REDIS_CONNECTION_URL"]
    async fn sets_up_the_access_rules_index_under_the_name_given() {
        let db: ProviderDatabase = provider();
        let name: String = format!("index:test-provider-redis-{}", std::process::id());
        db.setup_redis(&RedisSettings {
            url: Some(std::env::var("REDIS_CONNECTION_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string())),
            password: Some(std::env::var("REDIS_CONNECTION_PASSWORD").unwrap_or_else(|_| "root".to_string())),
            index_name: Some(name.clone()),
        })
        .expect("sets up");
        let mut client = db.get_redis_access_rules_connection().expect("set up").get_client().await.expect("connects");
        let indexes: Vec<String> = redis::cmd("FT._LIST").query_async(&mut client).await.expect("lists");
        assert!(indexes.contains(&name), "{indexes:?}");
        assert!(db.get_redis_connection().expect("set up").is_ready());
        let _: () = redis::cmd("FT.DROPINDEX").arg(&name).query_async(&mut client).await.expect("drops");
    }
}
