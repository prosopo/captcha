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

//! Ports of src/tests/redisClient.unit.test.ts and src/tests/redisIndex.integration.test.ts.
//!
//! The integration tests run against [`FakeRedis`], an in-memory model of the six commands
//! index setup sends, because the TS ones need a live Redis Stack.

use crate::client::{setup_redis_index_with_clock, spawn_connection};
use crate::error::RedisClientError;
use crate::index::{CreateOptions, IndexDataType, RediSearchSchema, RedisIndex, SchemaFieldType};
use crate::redis_index::{create_redis_index, delete_redis_index, IndexCommands, INDEX_HASHES_KEY};
use crate::{connect_to_redis, redact_redis_url, RedisConnection, RedisOptions};
use prosopo_logger::{
    get_logger_with_runtime, Clock, ConsoleMethod, DirectiveStore, LogLevel, LogRuntime, Logger,
    Sink, SystemClock,
};
use redis::RedisResult;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

#[derive(Default)]
struct CaptureSink {
    lines: Mutex<Vec<(ConsoleMethod, String)>>,
}

impl Sink for CaptureSink {
    fn write(&self, method: ConsoleMethod, line: &str) {
        self.lines
            .lock()
            .expect("capture lock")
            .push((method, line.to_string()));
    }
}

impl CaptureSink {
    fn records(&self) -> Vec<Value> {
        self.lines
            .lock()
            .expect("capture lock")
            .iter()
            .map(|(_, line): &(ConsoleMethod, String)| {
                serde_json::from_str(line).expect("log lines are JSON")
            })
            .collect()
    }

    fn error_messages(&self) -> Vec<String> {
        self.records()
            .iter()
            .filter(|record: &&Value| record["level"] == "error")
            .map(|record: &Value| record["msg"].as_str().unwrap_or("").to_string())
            .collect()
    }

    fn raw(&self) -> String {
        self.lines
            .lock()
            .expect("capture lock")
            .iter()
            .map(|(_, line): &(ConsoleMethod, String)| line.as_str())
            .collect::<Vec<&str>>()
            .join("\n")
    }
}

fn recording_logger() -> (Logger, Arc<CaptureSink>) {
    let sink: Arc<CaptureSink> = Arc::new(CaptureSink::default());
    let runtime: LogRuntime = LogRuntime {
        sink: sink.clone(),
        clock: Arc::new(SystemClock),
        directives: Arc::new(DirectiveStore::new("")),
    };
    (
        get_logger_with_runtime(LogLevel::Info, "redis-client-test", runtime),
        sink,
    )
}

async fn settle() {
    tokio::time::sleep(Duration::from_millis(50)).await;
}

fn io_error(message: &str) -> redis::RedisError {
    redis::RedisError::from(std::io::Error::other(message.to_string()))
}

#[derive(Debug, Clone, PartialEq)]
struct FakeIndex {
    key_type: Option<String>,
    attributes: Vec<String>,
}

const FIELD_TYPES: [&str; 5] = ["TEXT", "NUMERIC", "GEO", "TAG", "GEOSHAPE"];

impl FakeIndex {
    /// Reads `FT.CREATE name [ON type] ... SCHEMA field TYPE [options] ...`; an attribute is
    /// the token before each field type.
    fn parse(command: &[String]) -> (String, FakeIndex) {
        assert_eq!(command[0], "FT.CREATE");
        let schema_at: usize = command
            .iter()
            .position(|arg: &String| arg == "SCHEMA")
            .expect("FT.CREATE has SCHEMA");
        let header: &[String] = &command[2..schema_at];
        let key_type: Option<String> = header
            .iter()
            .position(|arg: &String| arg == "ON")
            .map(|at: usize| header[at + 1].clone());
        let schema: &[String] = &command[schema_at + 1..];
        let attributes: Vec<String> = schema
            .windows(2)
            .filter(|pair: &&[String]| FIELD_TYPES.contains(&pair[1].as_str()))
            .map(|pair: &[String]| pair[0].clone())
            .collect();
        (
            command[1].clone(),
            FakeIndex {
                key_type,
                attributes,
            },
        )
    }
}

#[derive(Default)]
struct FakeState {
    indexes: HashMap<String, FakeIndex>,
    hashes: HashMap<String, HashMap<String, String>>,
    creates: usize,
}

/// Clones share one server, as clones of a real client share one connection.
#[derive(Clone, Default)]
struct FakeRedis {
    state: Arc<Mutex<FakeState>>,
    ft_list_error: Option<&'static str>,
}

impl FakeRedis {
    fn with_state<T>(&self, f: impl FnOnce(&mut FakeState) -> T) -> T {
        f(&mut self.state.lock().expect("fake redis lock"))
    }

    fn index_names(&self) -> Vec<String> {
        self.with_state(|state: &mut FakeState| state.indexes.keys().cloned().collect())
    }

    fn info(&self, name: &str) -> FakeIndex {
        self.with_state(|state: &mut FakeState| state.indexes[name].clone())
    }

    /// `FT.ALTER name SCHEMA ADD field TAG`.
    fn alter_add(&self, name: &str, field: &str) {
        self.with_state(|state: &mut FakeState| {
            state
                .indexes
                .get_mut(name)
                .expect("index to alter")
                .attributes
                .push(field.to_string())
        });
    }
}

impl IndexCommands for FakeRedis {
    async fn ft_list(&mut self) -> RedisResult<Vec<String>> {
        match self.ft_list_error {
            Some(message) => Err(io_error(message)),
            None => Ok(self.index_names()),
        }
    }

    async fn hget(&mut self, key: &str, field: &str) -> RedisResult<Option<String>> {
        Ok(self.with_state(|state: &mut FakeState| {
            state
                .hashes
                .get(key)
                .and_then(|hash: &HashMap<String, String>| hash.get(field).cloned())
        }))
    }

    async fn hset(&mut self, key: &str, field: &str, value: &str) -> RedisResult<()> {
        self.with_state(|state: &mut FakeState| {
            state
                .hashes
                .entry(key.to_string())
                .or_default()
                .insert(field.to_string(), value.to_string())
        });
        Ok(())
    }

    async fn hdel(&mut self, key: &str, field: &str) -> RedisResult<()> {
        self.with_state(|state: &mut FakeState| {
            if let Some(hash) = state.hashes.get_mut(key) {
                hash.remove(field);
            }
        });
        Ok(())
    }

    async fn ft_dropindex(&mut self, index_name: &str) -> RedisResult<()> {
        self.with_state(
            |state: &mut FakeState| match state.indexes.remove(index_name) {
                Some(_) => Ok(()),
                None => Err(io_error("Unknown Index name")),
            },
        )
    }

    async fn ft_create(&mut self, command: &[String]) -> RedisResult<()> {
        let (name, index): (String, FakeIndex) = FakeIndex::parse(command);
        self.with_state(|state: &mut FakeState| {
            if state.indexes.contains_key(&name) {
                return Err(io_error("Index already exists"));
            }
            state.indexes.insert(name, index);
            state.creates += 1;
            Ok(())
        })
    }
}

fn connected<C: Clone + Send + Sync + 'static>(client: C, logger: &Logger) -> RedisConnection<C> {
    let clock: Arc<dyn Clock> = Arc::new(SystemClock);
    spawn_connection(
        async move { Ok::<C, RedisClientError>(client) },
        Some("redis://localhost"),
        logger,
        clock,
    )
}

fn tag_index(name: &str) -> RedisIndex {
    RedisIndex {
        name: name.to_string(),
        schema: RediSearchSchema::new().with("tagField", SchemaFieldType::Tag),
        options: CreateOptions::default(),
    }
}

mod redact_redis_url {
    use super::*;

    #[test]
    fn redacts_credentials() {
        let cases: [(&str, &str); 4] = [
            (
                "redis://default:hunter2@redis.internal:6379",
                "redis://redacted:redacted@redis.internal:6379",
            ),
            (
                "rediss://:hunter2@redis.internal:6380/2",
                "rediss://:redacted@redis.internal:6380/2",
            ),
            ("redis://redis.internal:6379", "redis://redis.internal:6379"),
            ("redis://localhost", "redis://localhost"),
        ];
        for (input, expected) in cases {
            assert_eq!(
                redact_redis_url(Some(input)).as_deref(),
                Some(expected),
                "{input}"
            );
        }
    }

    #[test]
    fn does_not_echo_a_url_it_cannot_parse() {
        assert_eq!(
            redact_redis_url(Some("not a url with hunter2")).as_deref(),
            Some("[unparseable redis url]")
        );
    }

    #[test]
    fn passes_undefined_through() {
        assert_eq!(redact_redis_url(None), None);
    }
}

mod connect_to_redis {
    use super::*;

    #[tokio::test]
    async fn never_binds_the_password_to_the_logger() {
        let (logger, sink): (Logger, Arc<CaptureSink>) = recording_logger();
        let _connection: RedisConnection = connect_to_redis(RedisOptions {
            url: Some("redis://default:hunter2@redis.internal:6379".to_string()),
            password: None,
            logger,
        })
        .expect("valid options");

        let records: Vec<Value> = sink.records();
        assert!(!sink.raw().contains("hunter2"), "{}", sink.raw());
        assert_eq!(records[0]["msg"], "Connecting to Redis");
        assert_eq!(
            records[0]["data"]["url"],
            "redis://redacted:redacted@redis.internal:6379"
        );
    }

    #[tokio::test]
    async fn a_failed_first_connect_is_logged_and_handed_to_callers() {
        let (logger, sink): (Logger, Arc<CaptureSink>) = recording_logger();
        let clock: Arc<dyn Clock> = Arc::new(SystemClock);
        let connection: RedisConnection<FakeRedis> = spawn_connection(
            async { Err::<FakeRedis, RedisClientError>(io_error("ECONNREFUSED").into()) },
            Some("redis://localhost"),
            &logger,
            clock,
        );
        settle().await;

        assert!(sink
            .error_messages()
            .contains(&"Redis connection failed".to_string()));
        let error: RedisClientError = connection
            .get_client()
            .await
            .err()
            .expect("getClient rejects");
        assert!(error.to_string().contains("ECONNREFUSED"), "{error}");
        assert!(!connection.is_ready());
    }
}

mod setup_redis_index {
    use super::*;

    #[tokio::test]
    async fn a_failed_index_setup_is_logged_and_handed_to_callers() {
        let (logger, sink): (Logger, Arc<CaptureSink>) = recording_logger();
        let client: FakeRedis = FakeRedis {
            ft_list_error: Some("ERR unknown command 'FT._LIST'"),
            ..FakeRedis::default()
        };
        let connection: RedisConnection<FakeRedis> = connected(client, &logger);
        let index: RedisIndex = RedisIndex {
            name: "probe".to_string(),
            schema: RediSearchSchema::new(),
            options: CreateOptions::default(),
        };

        let clock: Arc<dyn Clock> = Arc::new(SystemClock);
        let indexed: RedisConnection<FakeRedis> =
            setup_redis_index_with_clock(&connection, index, &logger, clock);
        settle().await;

        assert!(sink
            .error_messages()
            .contains(&"Redis index setup failed".to_string()));
        let error: RedisClientError = indexed.get_client().await.err().expect("getClient rejects");
        assert!(error.to_string().contains("FT._LIST"), "{error}");
        assert!(!indexed.is_ready());
    }

    #[tokio::test]
    async fn hands_out_the_client_once_the_index_exists() {
        let (logger, sink): (Logger, Arc<CaptureSink>) = recording_logger();
        let redis: FakeRedis = FakeRedis::default();
        let connection: RedisConnection<FakeRedis> = connected(redis.clone(), &logger);

        let clock: Arc<dyn Clock> = Arc::new(SystemClock);
        let indexed: RedisConnection<FakeRedis> =
            setup_redis_index_with_clock(&connection, tag_index("ready"), &logger, clock);
        indexed.get_client().await.expect("index setup succeeds");

        assert!(indexed.is_ready());
        assert_eq!(redis.index_names(), vec!["ready".to_string()]);
        assert!(sink.error_messages().is_empty());
        let messages: Vec<Value> = sink
            .records()
            .iter()
            .map(|record: &Value| record["msg"].clone())
            .collect();
        assert!(
            messages.contains(&Value::from("Index setup")),
            "{messages:?}"
        );
    }
}

mod redis_index {
    use super::*;

    #[tokio::test]
    async fn creates_new_index() {
        let mut redis: FakeRedis = FakeRedis::default();
        let index: RedisIndex = tag_index("test-index:0");

        create_redis_index(&mut redis, &index)
            .await
            .expect("create");

        assert!(redis.index_names().contains(&index.name));
    }

    #[tokio::test]
    async fn does_not_re_create_existing_index_when_no_changes_declared() {
        let mut redis: FakeRedis = FakeRedis::default();
        let index: RedisIndex = tag_index("test-index:1");

        create_redis_index(&mut redis, &index)
            .await
            .expect("create");
        redis.alter_add(&index.name, "anotherField");
        create_redis_index(&mut redis, &index)
            .await
            .expect("re-create");

        assert!(redis.index_names().contains(&index.name));
        assert_eq!(redis.info(&index.name).attributes.len(), 2);
        assert_eq!(redis.with_state(|state: &mut FakeState| state.creates), 1);
    }

    #[tokio::test]
    async fn re_creates_existing_index_when_schema_changes_made() {
        let mut redis: FakeRedis = FakeRedis::default();
        let mut index: RedisIndex = tag_index("test-index:2");

        create_redis_index(&mut redis, &index)
            .await
            .expect("create");
        index.schema.insert("newField", SchemaFieldType::Tag);
        create_redis_index(&mut redis, &index)
            .await
            .expect("re-create");

        assert!(redis.index_names().contains(&index.name));
        assert_eq!(
            redis.info(&index.name).attributes,
            vec!["tagField".to_string(), "newField".to_string()]
        );
    }

    #[tokio::test]
    async fn re_creates_existing_index_when_option_changes_made() {
        let mut redis: FakeRedis = FakeRedis::default();
        let mut index: RedisIndex = tag_index("test-index:3");

        create_redis_index(&mut redis, &index)
            .await
            .expect("create");
        assert_eq!(redis.info(&index.name).key_type, None);
        index.options = CreateOptions {
            on: Some(IndexDataType::Hash),
            ..CreateOptions::default()
        };
        create_redis_index(&mut redis, &index)
            .await
            .expect("re-create");

        assert!(redis.index_names().contains(&index.name));
        assert_eq!(redis.info(&index.name).key_type.as_deref(), Some("HASH"));
    }

    #[tokio::test]
    async fn delete_drops_the_index_and_forgets_its_hash() {
        let mut redis: FakeRedis = FakeRedis::default();
        let index: RedisIndex = tag_index("test-index:4");

        create_redis_index(&mut redis, &index)
            .await
            .expect("create");
        assert!(redis
            .hget(INDEX_HASHES_KEY, &index.name)
            .await
            .expect("hget")
            .is_some());
        delete_redis_index(&mut redis, &index.name)
            .await
            .expect("delete");

        assert!(redis.index_names().is_empty());
        assert_eq!(
            redis
                .hget(INDEX_HASHES_KEY, &index.name)
                .await
                .expect("hget"),
            None
        );
    }
}
