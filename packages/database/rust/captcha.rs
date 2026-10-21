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

//! The central database every provider sends its captcha records to (captcha.ts).

use crate::connection::{raw_error, ManagedConnection, Target};
use crate::mongo::MongoDatabase;
use crate::operation::{Executor, Operation, Reply, UpdateStatement};
use crate::provider::{collections, create_index_command, db_error};
use crate::source::{Source, SourceIds};
use bson::{doc, Document};
use prosopo_common::{ErrorContext, ProsopoError};
use prosopo_logger::{LogRecord, Logger};
use prosopo_types_database::captcha::{
    STORED_AUDIO_CAPTCHA_RECORD, STORED_ICON_ORDER_CAPTCHA_RECORD, STORED_POW_CAPTCHA_RECORD, STORED_PUZZLE_CAPTCHA_RECORD,
    STORED_SESSION_RECORD, STORED_USER_COMMITMENT_RECORD,
};
use prosopo_types_database::schema::Schema;
use prosopo_types_database::update::{cast_filter, cast_update, UpdateMethod};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// A kind of record the central database holds.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StoredKind {
    Session,
    Pow,
    Commitment,
    Puzzle,
    Audio,
    IconOrder,
}

impl StoredKind {
    /// `CAPTCHA_TABLES`, in its order.
    pub const ALL: [StoredKind; 6] = [
        StoredKind::Session,
        StoredKind::Pow,
        StoredKind::Commitment,
        StoredKind::Puzzle,
        StoredKind::Audio,
        StoredKind::IconOrder,
    ];

    pub fn collection(self) -> &'static str {
        match self {
            StoredKind::Session => collections::SESSION,
            StoredKind::Pow => collections::POW_CAPTCHA,
            StoredKind::Commitment => collections::COMMITMENT,
            StoredKind::Puzzle => collections::PUZZLE_CAPTCHA,
            StoredKind::Audio => collections::AUDIO_CAPTCHA,
            StoredKind::IconOrder => collections::ICON_ORDER_CAPTCHA,
        }
    }

    pub fn schema(self) -> &'static Schema {
        match self {
            StoredKind::Session => &STORED_SESSION_RECORD,
            StoredKind::Pow => &STORED_POW_CAPTCHA_RECORD,
            StoredKind::Commitment => &STORED_USER_COMMITMENT_RECORD,
            StoredKind::Puzzle => &STORED_PUZZLE_CAPTCHA_RECORD,
            StoredKind::Audio => &STORED_AUDIO_CAPTCHA_RECORD,
            StoredKind::IconOrder => &STORED_ICON_ORDER_CAPTCHA_RECORD,
        }
    }

    /// The field a record is upserted by.
    pub fn key(self) -> &'static str {
        match self {
            StoredKind::Session => "sessionId",
            StoredKind::Commitment => "id",
            StoredKind::Pow | StoredKind::Puzzle | StoredKind::Audio | StoredKind::IconOrder => "challenge",
        }
    }
}

/// One sweep's worth of records, as read from the provider's collections.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct CaptchaBatch {
    pub sessions: Vec<Document>,
    pub commitments: Vec<Document>,
    pub pow: Vec<Document>,
    pub puzzle: Vec<Document>,
    pub icon_order: Vec<Document>,
    pub audio: Vec<Document>,
}

/// What `getCaptchas` reads, as stored.
#[derive(Debug, Clone, Default, PartialEq, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptchaRecords {
    pub user_commitment_records: Vec<Document>,
    pub pow_captcha_records: Vec<Document>,
    pub puzzle_captcha_records: Vec<Document>,
    pub audio_captcha_records: Vec<Document>,
    pub icon_order_captcha_records: Vec<Document>,
}

pub struct CaptchaDatabase {
    connection: ManagedConnection,
    source: Arc<dyn Source>,
    logger: Logger,
    indexes_ensured: AtomicBool,
}

fn central_tables() -> Vec<(&'static str, &'static Schema)> {
    StoredKind::ALL.iter().map(|kind| (kind.collection(), kind.schema())).collect()
}

impl CaptchaDatabase {
    pub fn new(mongo: MongoDatabase, source: Arc<dyn Source>, logger: Logger) -> CaptchaDatabase {
        CaptchaDatabase::with_target(Target::Mongo(mongo), source, logger)
    }

    pub fn with_executor(executor: Arc<dyn Executor>, source: Arc<dyn Source>, logger: Logger) -> CaptchaDatabase {
        CaptchaDatabase::with_target(Target::Fixed(executor), source, logger)
    }

    fn with_target(target: Target, source: Arc<dyn Source>, logger: Logger) -> CaptchaDatabase {
        CaptchaDatabase {
            connection: ManagedConnection::new(target, central_tables()),
            source,
            logger,
            indexes_ensured: AtomicBool::new(false),
        }
    }

    pub(crate) fn now(&self) -> bson::DateTime {
        self.source.now()
    }

    pub fn connected(&self) -> bool {
        self.connection.connected()
    }

    /// Opens the connection unless it is open, and on a new one indexes the collections as
    /// mongoose's autoIndex does when the TS loads its models on it.
    pub async fn connect(&self) -> Result<(), ProsopoError> {
        self.connection.connect(&self.logger).await
    }

    pub async fn close(&self) {
        self.connection.close().await;
    }

    async fn executor(&self) -> Result<Arc<dyn Executor>, ProsopoError> {
        self.connection.executor().await
    }

    /// `ensureIndexes`: each collection's indexes dropped and created again, once.
    pub async fn ensure_indexes(&self) {
        if self.indexes_ensured.load(Ordering::SeqCst) {
            return;
        }
        if !self.connected() {
            for (collection, _) in self.connection.tables() {
                self.logger.info(|| LogRecord::msg(format!("Skipping index creation for collection {collection} as not connected")));
            }
        } else if let Ok(executor) = self.executor().await {
            for kind in StoredKind::ALL {
                let mut commands: Vec<Document> = vec![doc! { "dropIndexes": kind.collection(), "index": "*" }];
                commands.extend(kind.schema().indexes().iter().map(|index| create_index_command(kind.collection(), index)));
                for command in commands {
                    if let Err(error) = executor.run(Operation::Command(command)).await {
                        self.logger.warn(|| {
                            LogRecord::msg(format!("Error creating indexes for collection {}", kind.collection())).with_err(error.to_string())
                        });
                        break;
                    }
                }
            }
        }
        self.indexes_ensured.store(true, Ordering::SeqCst);
    }

    /// The upsert of one record by its key, `_id` left out, cast as mongoose casts it for
    /// `method`.
    fn upsert_statement(&self, kind: StoredKind, record: &Document, method: UpdateMethod) -> Result<UpdateStatement, String> {
        let mut fields: Document = record.clone();
        fields.remove("_id");
        let key: bson::Bson = fields.get(kind.key()).cloned().unwrap_or(bson::Bson::Undefined);
        let mut ids: SourceIds = SourceIds(self.source.as_ref());
        let q: Document = cast_filter(kind.schema(), &doc! { kind.key(): key }, true, &mut ids).map_err(|error| error.to_string())?;
        let u: Document = cast_update(kind.schema(), method, &doc! { "$set": fields }, &q, true, &mut ids).map_err(|error| error.to_string())?;
        Ok(UpdateStatement::one(q, u).upsert(true))
    }

    /// The streamer's write: one record upserted by its key.
    pub async fn upsert_record(&self, kind: StoredKind, record: &Document) -> Result<(), ProsopoError> {
        let statement: UpdateStatement = self.upsert_statement(kind, record, UpdateMethod::UpdateOne).map_err(raw_error)?;
        let executor: Arc<dyn Executor> = self.executor().await?;
        executor.run(Operation::update(kind.collection(), vec![statement])).await.map_err(raw_error)?;
        Ok(())
    }

    async fn upsert_batch(&self, executor: &Arc<dyn Executor>, kind: StoredKind, records: &[Document], msg: &str) -> Result<(), ProsopoError> {
        if records.is_empty() {
            return Ok(());
        }
        let statements: Vec<UpdateStatement> = records
            .iter()
            .map(|record| self.upsert_statement(kind, record, UpdateMethod::BulkWriteUpdateOne))
            .collect::<Result<Vec<UpdateStatement>, String>>()
            .map_err(raw_error)?;
        let reply: Reply = executor.run(Operation::update(kind.collection(), statements)).await.map_err(raw_error)?;
        if let Reply::Update { matched, modified, upserted } = reply {
            self.logger.info(|| {
                LogRecord::msg(msg).with_data(serde_json::json!({
                    "upsertedCount": upserted,
                    "matchedCount": matched,
                    "modifiedCount": modified,
                    "totalProcessed": records.len(),
                }))
            });
        }
        Ok(())
    }

    /// `saveCaptchas`: every record upserted by its key, a kind at a time, on a connection
    /// opened for the purpose and closed after.
    pub async fn save_captchas(&self, batch: &CaptchaBatch) -> Result<(), ProsopoError> {
        self.connect().await?;
        let executor: Arc<dyn Executor> = self.executor().await?;
        let kinds: [(StoredKind, &[Document], &str); 6] = [
            (StoredKind::Session, &batch.sessions, "Mongo Saved Session Events"),
            (StoredKind::Commitment, &batch.commitments, "Mongo Saved Image Events"),
            (StoredKind::Pow, &batch.pow, "Mongo Saved PoW Events"),
            (StoredKind::Puzzle, &batch.puzzle, "Mongo Saved Puzzle Events"),
            (StoredKind::Audio, &batch.audio, "Mongo Saved Audio Events"),
            (StoredKind::IconOrder, &batch.icon_order, "Mongo Saved Icon Order Events"),
        ];
        for (kind, records, msg) in kinds {
            self.upsert_batch(&executor, kind, records, msg).await?;
        }
        self.close().await;
        Ok(())
    }

    /// `getCaptchas`: up to `limit` records of each kind but sessions that match `filter`.
    pub async fn get_captchas(&self, filter: &Document, limit: Option<f64>) -> Result<CaptchaRecords, ProsopoError> {
        let limit: f64 = limit.unwrap_or(100.0);
        self.connect().await?;
        let result: Result<CaptchaRecords, String> = self.read_captchas(filter, limit).await;
        self.close().await;
        result.map_err(|error| {
            db_error(
                "DATABASE.QUERY_ERROR",
                ErrorContext::new()
                    .with("error", error)
                    .with("filter", filter.to_string())
                    .with("limit", limit)
                    .with("failedFuncName", "getCaptchas"),
                Some(&self.logger),
            )
        })
    }

    async fn read_captchas(&self, filter: &Document, limit: f64) -> Result<CaptchaRecords, String> {
        let executor: Arc<dyn Executor> = self.executor().await.map_err(|error| error.to_string())?;
        let mut read = Vec::new();
        for kind in [StoredKind::Commitment, StoredKind::Pow, StoredKind::Puzzle, StoredKind::Audio, StoredKind::IconOrder] {
            let cast: Document = cast_filter(kind.schema(), filter, false, &mut SourceIds(self.source.as_ref())).map_err(|error| error.to_string())?;
            let reply: Reply = executor
                .run(Operation::find(kind.collection(), cast).with_limit(limit as i64))
                .await
                .map_err(|error| error.to_string())?;
            read.push(reply.documents());
        }
        let mut read = read.into_iter();
        let mut next = || read.next().unwrap_or_default();
        Ok(CaptchaRecords {
            user_commitment_records: next(),
            pow_captcha_records: next(),
            puzzle_captcha_records: next(),
            audio_captcha_records: next(),
            icon_order_captcha_records: next(),
        })
    }
}
