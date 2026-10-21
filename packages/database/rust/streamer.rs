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

//! Sends each captcha record to the central database as it is written (centralDbStreamer.ts).
//! It runs in the background: a failure is logged, and never reaches the method that wrote the
//! record.

use crate::captcha::{CaptchaDatabase, StoredKind};
use crate::mongo::{MongoConnectionTimeouts, MongoDatabase, MongoError};
use crate::source::SystemSource;
use bson::{Bson, DateTime, Document};
use prosopo_common::ProsopoError;
use prosopo_logger::{LogRecord, Logger};
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::task::JoinHandle;

pub type BoxedFuture<T> = Pin<Box<dyn Future<Output = T> + Send>>;

/// Marks the local record stored, given the `lastUpdatedTimestamp` of the copy that was sent.
pub type MarkStored = Box<dyn FnOnce(DateTime) -> BoxedFuture<Result<(), String>> + Send>;

/// The local record as it is now, for an update to send.
pub type FetchRecord = BoxedFuture<Result<Option<Document>, ProsopoError>>;

const RECONNECT_COOLDOWN: Duration = Duration::from_millis(5_000);

/// The central database is far from some providers: the TLS handshake alone can take most of
/// the driver's default ten seconds, so the streamer allows far longer.
const CONNECT_TIMEOUT_MS: u64 = 45_000;
const SERVER_SELECTION_TIMEOUT_MS: u64 = 45_000;

fn label(kind: StoredKind) -> &'static str {
    match kind {
        StoredKind::Pow => "PoW",
        StoredKind::Commitment => "image",
        StoredKind::Puzzle => "puzzle",
        StoredKind::Audio => "audio",
        StoredKind::IconOrder => "icon-order",
        StoredKind::Session => "session",
    }
}

/// The time the record was last changed, which a later local change is compared against.
fn record_timestamp(record: &Document, now: DateTime) -> DateTime {
    ["lastUpdatedTimestamp", "createdAt", "requestedAtTimestamp"]
        .iter()
        .find_map(|field| match record.get(*field) {
            Some(Bson::DateTime(at)) => Some(*at),
            _ => None,
        })
        .unwrap_or(now)
}

pub struct CentralDbStreamer {
    central: CaptchaDatabase,
    logger: Logger,
    last_failure: tokio::sync::Mutex<Option<Instant>>,
    in_flight: Mutex<Vec<JoinHandle<()>>>,
}

impl CentralDbStreamer {
    /// The streamer the provider runs: to the central database at `url`, with the long
    /// timeouts a distant provider needs.
    pub fn connect_to(url: &str, logger: Logger) -> Result<CentralDbStreamer, MongoError> {
        let timeouts: MongoConnectionTimeouts = MongoConnectionTimeouts {
            connect_timeout_ms: Some(CONNECT_TIMEOUT_MS),
            server_selection_timeout_ms: Some(SERVER_SELECTION_TIMEOUT_MS),
        };
        let mongo: MongoDatabase = MongoDatabase::new(url, None, None, Some(logger.clone()), timeouts)?;
        Ok(CentralDbStreamer::new(CaptchaDatabase::new(mongo, Arc::new(SystemSource), logger.clone()), logger))
    }

    pub fn new(central: CaptchaDatabase, logger: Logger) -> CentralDbStreamer {
        CentralDbStreamer {
            central,
            logger,
            last_failure: tokio::sync::Mutex::new(None),
            in_flight: Mutex::new(Vec::new()),
        }
    }

    /// Connects unless connected, but not again within the cooldown of a failed attempt.
    async fn ensure_connected(&self) -> Result<(), String> {
        let mut last_failure = self.last_failure.lock().await;
        if self.central.connected() {
            return Ok(());
        }
        if last_failure.is_some_and(|at| at.elapsed() < RECONNECT_COOLDOWN) {
            return Err("CentralDbStreamer reconnect cooldown".to_string());
        }
        match self.central.connect().await {
            Ok(()) => Ok(()),
            Err(error) => {
                self.logger.error(|| LogRecord::msg("CentralDbStreamer failed to connect").with_err(error.message().to_string()));
                *last_failure = Some(Instant::now());
                Err(error.message().to_string())
            }
        }
    }

    fn spawn(&self, task: impl Future<Output = ()> + Send + 'static) {
        let handle: JoinHandle<()> = tokio::spawn(task);
        let mut in_flight = self.in_flight.lock().expect("lock");
        in_flight.retain(|running| !running.is_finished());
        in_flight.push(handle);
    }

    async fn send(self: Arc<Self>, kind: StoredKind, record: Document, mark_stored: Option<MarkStored>) {
        let timestamp: DateTime = record_timestamp(&record, self.central.now());
        let sent: Result<(), String> = match self.ensure_connected().await {
            Ok(()) => self.central.upsert_record(kind, &record).await.map_err(|error| error.message().to_string()),
            Err(error) => Err(error),
        };
        let marked: Result<(), String> = match (sent, mark_stored) {
            (Ok(()), Some(mark_stored)) => mark_stored(timestamp).await,
            (sent, _) => sent,
        };
        if let Err(error) = marked {
            self.logger
                .error(|| LogRecord::msg(format!("Failed to stream {} record to central DB", label(kind))).with_err(error));
        }
    }

    /// `stream*Record`: sends the record, then marks it stored.
    pub fn stream_record(self: &Arc<Self>, kind: StoredKind, record: Document, mark_stored: Option<MarkStored>) {
        let streamer: Arc<CentralDbStreamer> = self.clone();
        self.spawn(streamer.send(kind, record, mark_stored));
    }

    /// `stream*Update`: reads the record as it now is and sends that; nothing if it is gone.
    pub fn stream_update(self: &Arc<Self>, kind: StoredKind, fetch: FetchRecord, mark_stored: Option<MarkStored>) {
        let streamer: Arc<CentralDbStreamer> = self.clone();
        self.spawn(async move {
            match fetch.await {
                Ok(Some(record)) => streamer.send(kind, record, mark_stored).await,
                Ok(None) => {}
                Err(error) => streamer.logger.error(|| {
                    LogRecord::msg(format!("Failed to fetch {} record for central DB streaming", label(kind)))
                        .with_err(error.message().to_string())
                }),
            }
        });
    }

    /// Waits for every record sent so far to have been handled.
    pub async fn idle(&self) {
        loop {
            let pending: Vec<JoinHandle<()>> = std::mem::take(&mut *self.in_flight.lock().expect("lock"));
            if pending.is_empty() {
                return;
            }
            for handle in pending {
                let _ = handle.await;
            }
        }
    }
}
