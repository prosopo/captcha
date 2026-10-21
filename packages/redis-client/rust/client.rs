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

//! `connectToRedis` and `setupRedisIndex`: both return at once and do their work in a
//! background task, exposing readiness, how long the work has taken, and the shared result.

use crate::error::RedisClientError;
use crate::index::RedisIndex;
use crate::options::{connection_manager_config, resolve_client_options};
use crate::redis_index::{create_redis_index, IndexCommands, OnConnection};
use crate::url::redact_redis_url;
use prosopo_logger::{Clock, ErrorObject, LogObject, LogRecord, Logger, SystemClock};
use redis::aio::{ConnectionLike, ConnectionManager};
use redis::{Client, Cmd, Pipeline, RedisError, RedisFuture, RedisResult, Value};
use serde_json::{json, Map};
use std::future::Future;
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::sync::Arc;
use tokio::sync::watch;

pub struct RedisOptions {
    pub url: Option<String>,
    pub password: Option<String>,
    pub logger: Logger,
}

/// A connected client. Cloning is cheap and shares the one underlying connection, which
/// redis-rs re-establishes on its own after a disconnect.
#[derive(Clone)]
pub struct RedisClient {
    manager: ConnectionManager,
    logger: Logger,
}

impl RedisClient {
    /// node-redis reports socket failures through its `error` event, which the TS logs once
    /// the client is ready; redis-rs hands them to the command that hit them instead.
    fn observe<T>(&self, result: RedisResult<T>) -> RedisResult<T> {
        if let Err(error) = &result {
            if error.is_unrecoverable_error() {
                log_client_error(&self.logger, error);
            }
        }
        result
    }
}

fn log_client_error(logger: &Logger, error: &RedisError) {
    logger.error(|| {
        LogRecord::msg("Redis client error").with_err(ErrorObject::from_std_error(error))
    });
}

impl ConnectionLike for RedisClient {
    fn req_packed_command<'a>(&'a mut self, cmd: &'a Cmd) -> RedisFuture<'a, Value> {
        Box::pin(async move {
            let result: RedisResult<Value> = self.manager.req_packed_command(cmd).await;
            self.observe(result)
        })
    }

    fn req_packed_commands<'a>(
        &'a mut self,
        pipeline: &'a Pipeline,
        offset: usize,
        count: usize,
    ) -> RedisFuture<'a, Vec<Value>> {
        Box::pin(async move {
            let result: RedisResult<Vec<Value>> = self
                .manager
                .req_packed_commands(pipeline, offset, count)
                .await;
            self.observe(result)
        })
    }

    fn get_db(&self) -> i64 {
        self.manager.get_db()
    }
}

impl IndexCommands for RedisClient {
    async fn ft_list(&mut self) -> RedisResult<Vec<String>> {
        OnConnection(self).ft_list().await
    }

    async fn hget(&mut self, key: &str, field: &str) -> RedisResult<Option<String>> {
        OnConnection(self).hget(key, field).await
    }

    async fn hset(&mut self, key: &str, field: &str, value: &str) -> RedisResult<()> {
        OnConnection(self).hset(key, field, value).await
    }

    async fn hdel(&mut self, key: &str, field: &str) -> RedisResult<()> {
        OnConnection(self).hdel(key, field).await
    }

    async fn ft_dropindex(&mut self, index_name: &str) -> RedisResult<()> {
        OnConnection(self).ft_dropindex(index_name).await
    }

    async fn ft_create(&mut self, command: &[String]) -> RedisResult<()> {
        OnConnection(self).ft_create(command).await
    }
}

type Outcome<C> = Option<Result<C, RedisClientError>>;

/// `isReady` / `getClient` / `getAwaitingTimeMs`. Clones are handles to the same state.
#[derive(Clone)]
pub struct RedisConnection<C: Clone = RedisClient> {
    state: Arc<Progress>,
    outcome: watch::Receiver<Outcome<C>>,
}

/// Epoch milliseconds, as `Date.now()`; `started_at` stays 0 until the work starts.
struct Progress {
    clock: Arc<dyn Clock>,
    ready: AtomicBool,
    started_at: AtomicI64,
    finished_at: AtomicI64,
}

impl Progress {
    fn new(clock: Arc<dyn Clock>, started_at: i64) -> Progress {
        Progress {
            clock,
            ready: AtomicBool::new(false),
            started_at: AtomicI64::new(started_at),
            finished_at: AtomicI64::new(0),
        }
    }

    fn start(&self) {
        self.started_at
            .store(self.clock.now_ms(), Ordering::Release);
    }

    /// Returns the awaiting time it records.
    fn finish(&self) -> i64 {
        let finished_at: i64 = self.clock.now_ms();
        self.finished_at.store(finished_at, Ordering::Release);
        self.ready.store(true, Ordering::Release);
        finished_at - self.started_at.load(Ordering::Acquire)
    }
}

impl<C: Clone> RedisConnection<C> {
    pub fn is_ready(&self) -> bool {
        self.state.ready.load(Ordering::Acquire)
    }

    /// Waits for the background work; every caller gets the same client or the same error.
    pub async fn get_client(&self) -> Result<C, RedisClientError> {
        let mut outcome: watch::Receiver<Outcome<C>> = self.outcome.clone();
        let settled: watch::Ref<'_, Outcome<C>> = outcome
            .wait_for(|outcome: &Outcome<C>| outcome.is_some())
            .await
            .map_err(|_: watch::error::RecvError| RedisClientError::Abandoned)?;
        settled.clone().unwrap_or(Err(RedisClientError::Abandoned))
    }

    /// While not ready this is the time since the work started; before index setup has
    /// started it is measured from 0, as the TS does, so it equals the current epoch time.
    pub fn get_awaiting_time_ms(&self) -> i64 {
        let state: &Progress = &self.state;
        if self.is_ready() {
            state.finished_at.load(Ordering::Acquire) - state.started_at.load(Ordering::Acquire)
        } else {
            state.clock.now_ms() - state.started_at.load(Ordering::Acquire)
        }
    }
}

/// `connectToRedis`. Starts connecting in the background and returns at once; node-redis
/// retries an unreachable server forever, and so does this. Fails straight away only for
/// options `createClient` would throw on. Must be called within a tokio runtime.
pub fn connect_to_redis(options: RedisOptions) -> Result<RedisConnection, RedisClientError> {
    let resolved = resolve_client_options(options.url.as_deref(), options.password.as_deref())?;
    let client: Client = Client::open(resolved.connection_info()?)?;
    let error_logger: Logger = options.logger.clone();
    let connect = async move {
        let manager: ConnectionManager =
            ConnectionManager::new_with_config(client, connection_manager_config()).await?;
        Ok(RedisClient {
            manager,
            logger: error_logger,
        })
    };
    Ok(spawn_connection(
        connect,
        options.url.as_deref(),
        &options.logger,
        Arc::new(SystemClock),
    ))
}

/// A logger carrying `{ url }`. When there is no URL the TS still binds `{ url: undefined }`,
/// which serialises as no key but makes every record carry a `data` object.
struct UrlLog {
    logger: Logger,
    url_is_undefined: bool,
}

impl UrlLog {
    fn new(logger: &Logger, url: Option<&str>) -> UrlLog {
        match redact_redis_url(url) {
            Some(redacted) => {
                let mut bindings: LogObject = Map::new();
                bindings.insert("url".to_string(), json!(redacted));
                UrlLog {
                    logger: logger.with(&bindings, None),
                    url_is_undefined: false,
                }
            }
            None => UrlLog {
                logger: logger.clone(),
                url_is_undefined: true,
            },
        }
    }

    fn record(&self, record: LogRecord) -> LogRecord {
        match record.data {
            None if self.url_is_undefined => record.with_data(json!({})),
            _ => record,
        }
    }
}

pub(crate) fn spawn_connection<C, F>(
    connect: F,
    url: Option<&str>,
    logger: &Logger,
    clock: Arc<dyn Clock>,
) -> RedisConnection<C>
where
    C: Clone + Send + Sync + 'static,
    F: Future<Output = Result<C, RedisClientError>> + Send + 'static,
{
    let state: Arc<Progress> = Arc::new(Progress::new(clock.clone(), clock.now_ms()));
    let (sender, outcome) = watch::channel::<Outcome<C>>(None);
    let log: UrlLog = UrlLog::new(logger, url);
    log.logger
        .info(|| log.record(LogRecord::msg("Connecting to Redis")));

    let task_state: Arc<Progress> = state.clone();
    tokio::spawn(async move {
        let result: Result<C, RedisClientError> = connect.await;
        match &result {
            Ok(_) => {
                let awaiting_time_ms: i64 = task_state.finish();
                log.logger.info(|| {
                    log.record(
                        LogRecord::msg("Redis connected")
                            .with_data(json!({ "awaitingTimeMs": awaiting_time_ms })),
                    )
                });
            }
            Err(error) => log.logger.error(|| {
                log.record(
                    LogRecord::msg("Redis connection failed")
                        .with_err(ErrorObject::from_std_error(error)),
                )
            }),
        }
        sender.send_replace(Some(result));
    });

    RedisConnection { state, outcome }
}

/// `setupRedisIndex`: once `connection` has a client, creates `index` on it (see
/// [`create_redis_index`]) and hands out the same client when that is done.
pub fn setup_redis_index<C>(
    connection: &RedisConnection<C>,
    index: RedisIndex,
    logger: &Logger,
) -> RedisConnection<C>
where
    C: IndexCommands + Clone + Send + Sync + 'static,
{
    setup_redis_index_with_clock(connection, index, logger, Arc::new(SystemClock))
}

pub(crate) fn setup_redis_index_with_clock<C>(
    connection: &RedisConnection<C>,
    index: RedisIndex,
    logger: &Logger,
    clock: Arc<dyn Clock>,
) -> RedisConnection<C>
where
    C: IndexCommands + Clone + Send + Sync + 'static,
{
    let state: Arc<Progress> = Arc::new(Progress::new(clock, 0));
    let (sender, outcome) = watch::channel::<Outcome<C>>(None);
    let mut bindings: LogObject = Map::new();
    bindings.insert("name".to_string(), json!(index.name));
    let log: Logger = logger.with(&bindings, None);

    let base: RedisConnection<C> = connection.clone();
    let task_state: Arc<Progress> = state.clone();
    tokio::spawn(async move {
        let result: Result<C, RedisClientError> = async {
            let mut client: C = base.get_client().await?;
            task_state.start();
            log.info(|| LogRecord::msg("Setting up Redis index"));
            create_redis_index(&mut client, &index).await?;
            let awaiting_time_ms: i64 = task_state.finish();
            log.info(|| {
                LogRecord::msg("Index setup")
                    .with_data(json!({ "awaitingTimeMs": awaiting_time_ms }))
            });
            Ok(client)
        }
        .await;
        if let Err(error) = &result {
            log.error(|| {
                LogRecord::msg("Redis index setup failed")
                    .with_err(ErrorObject::from_std_error(error))
            });
        }
        sender.send_replace(Some(result));
    });

    RedisConnection { state, outcome }
}
