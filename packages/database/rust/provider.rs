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

//! `ProviderDatabase` (src/databases/provider.ts): the provider's own records. Each method sends
//! the commands mongoose sends for it and reads the replies as the TS reads them.

use crate::captcha::StoredKind;
use crate::operation::{Executor, Operation, Reply, UpdateStatement};
use crate::source::{Source, SourceIds};
use crate::streamer::{CentralDbStreamer, FetchRecord, MarkStored};
use bson::{doc, Bson, DateTime, Document};
use prosopo_redis_client::{connect_to_redis, setup_redis_index, RedisConnection, RedisOptions};
use prosopo_user_access_policy::redis::{access_rules_redis_index, RedisAccessRulesStorage};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_logger::{LogRecord, Logger};
use prosopo_types::datasets::{dataset_with_ids_and_tree_schema, CaptchaItem, CaptchaStates};
use prosopo_types_database::number::{js_number, json_to_bson};
use prosopo_types_database::provider::{CAPTCHA_RECORD, DATASET_RECORD, SOLUTION_RECORD};
use prosopo_types_database::schema::{Index, Schema};
use prosopo_types_database::update::{cast_filter, cast_update, UpdateMethod};
use prosopo_util_crypto::u8a::is_hex;
use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, RwLock};

/// The collections, as mongoose names them after the models.
pub mod collections {
    pub const CAPTCHA: &str = "captchas";
    pub const POW_CAPTCHA: &str = "powcaptchas";
    pub const PUZZLE_CAPTCHA: &str = "puzzlecaptchas";
    pub const AUDIO_CAPTCHA: &str = "audiocaptchas";
    pub const ICON_ORDER_CAPTCHA: &str = "iconordercaptchas";
    pub const DATASET: &str = "datasets";
    pub const SOLUTION: &str = "solutions";
    pub const COMMITMENT: &str = "usercommitments";
    pub const USER_SOLUTION: &str = "usersolutions";
    pub const SCHEDULER: &str = "schedulers";
    pub const CLIENT: &str = "clients";
    pub const SESSION: &str = "sessions";
    pub const DECISION_MACHINE: &str = "decisionmachines";
    pub const SPAM_EMAIL_DOMAIN: &str = "spamemaildomains";
}

/// A stored solution (`SolutionRecord`), as the dataset reads return it.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredSolution {
    pub captcha_id: String,
    pub captcha_content_id: String,
    pub dataset_id: String,
    pub dataset_content_id: String,
    pub salt: String,
    pub solution: Vec<String>,
}

/// A stored captcha (`CaptchaRecordSchema`).
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredCaptcha {
    pub captcha_id: String,
    pub captcha_content_id: String,
    #[serde(rename = "assetURI", default)]
    pub asset_uri: Option<String>,
    pub dataset_id: String,
    pub dataset_content_id: String,
    pub solved: bool,
    pub target: String,
    pub salt: String,
    #[serde(default)]
    pub random_key: Option<f64>,
    pub items: Vec<CaptchaItem>,
}

/// What `getRandomCaptcha` projects: no salt, no solved flag.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SampledCaptcha {
    pub dataset_id: String,
    pub dataset_content_id: String,
    pub captcha_id: String,
    pub captcha_content_id: String,
    pub items: Vec<CaptchaItem>,
    pub target: String,
}

/// What `getCaptchaById` projects.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptchaItems {
    pub captcha_id: String,
    pub dataset_id: String,
    pub items: Vec<CaptchaItem>,
}

/// A stored dataset (`DatasetRecordSchema`), as `getDatasetDetails` returns it.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredDataset {
    pub dataset_id: String,
    pub dataset_content_id: String,
    pub format: String,
    pub content_tree: Vec<Vec<String>>,
    pub solution_tree: Vec<Vec<String>>,
}

/// One captcha of [`DatasetWithCaptchas`]: its solution only when it is solved.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCaptcha {
    pub captcha_id: String,
    pub captcha_content_id: String,
    pub solved: bool,
    pub salt: String,
    pub items: Vec<CaptchaItem>,
    pub target: String,
    pub solution: Vec<String>,
}

/// What `getDataset` assembles from the dataset, its captchas and their solutions.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatasetWithCaptchas {
    pub dataset_id: String,
    pub dataset_content_id: String,
    pub format: String,
    pub content_tree: Vec<Vec<String>>,
    pub solution_tree: Vec<Vec<String>>,
    pub captchas: Vec<DatasetCaptcha>,
}

/// What `getRandomSolvedCaptchasFromSingleDataset` projects.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SampledSolution {
    pub captcha_id: String,
    pub captcha_content_id: String,
    pub solution: Vec<String>,
}

pub struct ProviderDatabase {
    executor: Arc<dyn Executor>,
    source: Arc<dyn Source>,
    logger: Logger,
    indexes_ensured: AtomicBool,
    streamer: RwLock<Option<Arc<CentralDbStreamer>>>,
    redis: RwLock<Option<ProviderRedis>>,
}

/// `ProviderDatabaseOptions.redis`.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct RedisSettings {
    pub url: Option<String>,
    pub password: Option<String>,
    /// The access rules index's name, when not the default.
    pub index_name: Option<String>,
}

/// The provider's Redis: the connection, the same connection once the access rules index is
/// set up on it, and the access rules kept there.
#[derive(Clone)]
struct ProviderRedis {
    connection: RedisConnection,
    access_rules: RedisConnection,
    storage: RedisAccessRulesStorage,
}

/// `PROVIDER_TABLES`: each collection and the schema of its records, in the TS order.
pub fn provider_tables() -> [(&'static str, &'static Schema); 14] {
    use prosopo_types_database::provider::*;
    [
        (collections::CAPTCHA, &CAPTCHA_RECORD),
        (collections::POW_CAPTCHA, &POW_CAPTCHA_RECORD),
        (collections::PUZZLE_CAPTCHA, &PUZZLE_CAPTCHA_RECORD),
        (collections::AUDIO_CAPTCHA, &AUDIO_CAPTCHA_RECORD),
        (collections::ICON_ORDER_CAPTCHA, &ICON_ORDER_CAPTCHA_RECORD),
        (collections::DATASET, &DATASET_RECORD),
        (collections::SOLUTION, &SOLUTION_RECORD),
        (collections::COMMITMENT, &USER_COMMITMENT_RECORD),
        (collections::USER_SOLUTION, &USER_SOLUTION_RECORD),
        (collections::SCHEDULER, &SCHEDULED_TASK_RECORD),
        (collections::CLIENT, &CLIENT_RECORD),
        (collections::SESSION, &SESSION_RECORD),
        (collections::DECISION_MACHINE, &DECISION_MACHINE_ARTIFACT_RECORD),
        (collections::SPAM_EMAIL_DOMAIN, &SPAM_EMAIL_DOMAIN_RECORD),
    ]
}

/// The `createIndexes` command mongoose sends for one index: its options as declared (with the
/// name if one is given), then the driver's name if not, then the key.
pub fn create_index_command(collection: &str, index: &Index) -> Document {
    let mut spec: Document = index.options.to_document();
    if !spec.contains_key("name") {
        spec.insert("name", index.name());
    }
    spec.insert(
        "key",
        index.keys.iter().map(|(key, direction)| (key.clone(), Bson::Int32(*direction))).collect::<Document>(),
    );
    doc! { "createIndexes": collection, "indexes": [spec] }
}

pub(crate) fn db_error(key: &str, context: ErrorContext, logger: Option<&Logger>) -> ProsopoError {
    ProsopoError::new(
        ErrorClass::Db,
        ErrorSource::key(key),
        ErrorOptions {
            context: Some(context),
            logger,
            ..ErrorOptions::default()
        },
    )
}

pub(crate) fn decode<T: DeserializeOwned>(document: Document) -> Option<T> {
    bson::deserialize_from_document(document).ok()
}

fn without_id(mut document: Document) -> Document {
    document.remove("_id");
    document
}

impl ProviderDatabase {
    pub fn new(executor: Arc<dyn Executor>, source: Arc<dyn Source>, logger: Logger) -> ProviderDatabase {
        ProviderDatabase {
            executor,
            source,
            logger,
            indexes_ensured: AtomicBool::new(false),
            streamer: RwLock::new(None),
            redis: RwLock::new(None),
        }
    }

    /// Connects `mongo` and indexes it as mongoose's autoIndex does when the TS loads its tables.
    pub async fn connect(mongo: &crate::mongo::MongoDatabase, source: Arc<dyn Source>, logger: Logger) -> Result<ProviderDatabase, crate::mongo::MongoError> {
        mongo.connect().await?;
        let database = mongo.database().await.map_err(|error| crate::mongo::MongoError::Unavailable(error.to_string()))?;
        let provider: ProviderDatabase =
            ProviderDatabase::new(Arc::new(crate::operation::DriverExecutor::new(database)), source, logger);
        provider.auto_index().await;
        Ok(provider)
    }

    /// mongoose's autoIndex: every declared index created (an existing one is left as it is). A
    /// collection whose indexes fail is logged and the rest carry on.
    pub async fn auto_index(&self) {
        for (collection, schema) in provider_tables() {
            for index in schema.indexes() {
                if let Err(error) = self.executor.run(Operation::Command(create_index_command(collection, &index))).await {
                    self.logger.error(|| LogRecord::msg(format!("Error creating index on {collection}")).with_err(error.to_string()));
                    break;
                }
            }
        }
    }

    /// `ensureIndexes`, once: every collection's indexes dropped and created again from its
    /// schema, so an index changed in the schema changes in the database. A collection that fails
    /// is logged and the rest carry on. The TS does the collections concurrently, these go one at
    /// a time.
    pub async fn ensure_indexes(&self) {
        if self.indexes_ensured.load(Ordering::SeqCst) {
            return;
        }
        for (collection, schema) in provider_tables() {
            let mut commands: Vec<Document> = vec![doc! { "dropIndexes": collection, "index": "*" }];
            commands.extend(schema.indexes().iter().map(|index| create_index_command(collection, index)));
            for command in commands {
                if let Err(error) = self.executor.run(Operation::Command(command)).await {
                    self.logger.warn(|| {
                        LogRecord::msg(format!("Error creating indexes for collection {collection}")).with_err(error.to_string())
                    });
                    break;
                }
            }
        }
        self.indexes_ensured.store(true, Ordering::SeqCst);
    }

    /// `setupRedis`, which the TS runs as the last step of `connect`: connects in the
    /// background, sets up the access rules index once connected, and keeps the access rules
    /// there. Must be called within a tokio runtime.
    pub fn setup_redis(&self, settings: &RedisSettings) -> Result<(), ProsopoError> {
        let connection: RedisConnection = connect_to_redis(RedisOptions {
            url: settings.url.clone(),
            password: settings.password.clone(),
            logger: self.logger.clone(),
        })
        .map_err(|error| ProsopoError::new(ErrorClass::Db, ErrorSource::message(error.to_string()), ErrorOptions::default()))?;
        let mut index = access_rules_redis_index();
        if let Some(name) = settings.index_name.as_ref().filter(|name| !name.is_empty()) {
            index.name = name.clone();
        }
        let access_rules: RedisConnection = setup_redis_index(&connection, index, &self.logger);
        let storage: RedisAccessRulesStorage = RedisAccessRulesStorage::new(access_rules.clone(), self.logger.clone());
        *self.redis.write().expect("lock") = Some(ProviderRedis { connection, access_rules, storage });
        Ok(())
    }

    fn redis_part<T>(&self, part: impl FnOnce(&ProviderRedis) -> T, key: &str) -> Result<T, ProsopoError> {
        self.redis
            .read()
            .expect("lock")
            .as_ref()
            .map(part)
            .ok_or_else(|| ProsopoError::new(ErrorClass::Db, ErrorSource::key(key), ErrorOptions::default()))
    }

    /// `getRedisConnection`.
    pub fn get_redis_connection(&self) -> Result<RedisConnection, ProsopoError> {
        self.redis_part(|redis| redis.connection.clone(), "DATABASE.REDIS_ACCESS_RULES_CONNECTION_UNDEFINED")
    }

    /// `getRedisAccessRulesConnection`.
    pub fn get_redis_access_rules_connection(&self) -> Result<RedisConnection, ProsopoError> {
        self.redis_part(|redis| redis.access_rules.clone(), "DATABASE.REDIS_ACCESS_RULES_CONNECTION_UNDEFINED")
    }

    /// `getUserAccessRulesStorage`.
    pub fn get_user_access_rules_storage(&self) -> Result<RedisAccessRulesStorage, ProsopoError> {
        self.redis_part(|redis| redis.storage.clone(), "DATABASE.USER_ACCESS_RULES_STORAGE_UNDEFINED")
    }

    /// `setCentralDbStreamer`: from now on, each record written is also sent to the central
    /// database.
    pub fn set_central_db_streamer(&self, streamer: Arc<CentralDbStreamer>) {
        *self.streamer.write().expect("lock") = Some(streamer);
    }

    pub fn has_central_db_streamer(&self) -> bool {
        self.streamer.read().expect("lock").is_some()
    }

    pub fn central_db_streamer(&self) -> Option<Arc<CentralDbStreamer>> {
        self.streamer.read().expect("lock").clone()
    }

    /// Sends a record just written, then marks it stored.
    pub(crate) fn stream_record(&self, kind: StoredKind, record: Document, mark_stored: MarkStored) {
        if let Some(streamer) = self.central_db_streamer() {
            streamer.stream_record(kind, record, Some(mark_stored));
        }
    }

    /// Reads a record just changed with `read`, sends it, then marks it stored.
    pub(crate) fn stream_update(&self, kind: StoredKind, read: Operation, mark_stored: MarkStored) {
        if let Some(streamer) = self.central_db_streamer() {
            let executor: Arc<dyn Executor> = self.executor.clone();
            let logger: Logger = self.logger.clone();
            let fetch: FetchRecord = Box::pin(async move {
                let reply: Reply = executor
                    .run(read)
                    .await
                    .map_err(|error| db_error("DATABASE.QUERY_ERROR", ErrorContext::new().with("error", error.to_string()), Some(&logger)))?;
                Ok(reply.documents().into_iter().next())
            });
            streamer.stream_update(kind, fetch, Some(mark_stored));
        }
    }

    /// The callback that marks the record `filter` names stored once the central write lands.
    /// `guarded` leaves a record changed since the copy that was sent for the next sweep;
    /// `clear_pending` takes it off the sweep.
    pub(crate) fn mark_stored_callback(
        &self,
        collection: &'static str,
        schema: &'static Schema,
        filter: Document,
        guarded: bool,
        clear_pending: bool,
    ) -> MarkStored {
        let executor: Arc<dyn Executor> = self.executor.clone();
        let source: Arc<dyn Source> = self.source.clone();
        Box::new(move |stored_at: DateTime| {
            Box::pin(async move {
                let mut filter: Document = filter;
                if guarded {
                    filter.insert("lastUpdatedTimestamp", doc! { "$lte": stored_at });
                }
                let mut update: Document = doc! { "$set": { "storedAtTimestamp": stored_at } };
                if clear_pending {
                    update.insert("$unset", doc! { "pendingStage": 1 });
                }
                let mut ids: SourceIds = SourceIds(source.as_ref());
                let q: Document = cast_filter(schema, &filter, false, &mut ids).map_err(|error| error.to_string())?;
                let u: Document = cast_update(schema, UpdateMethod::UpdateOne, &update, &q, false, &mut ids).map_err(|error| error.to_string())?;
                executor.run(Operation::update(collection, vec![UpdateStatement::one(q, u)])).await.map_err(|error| error.to_string())?;
                Ok(())
            })
        })
    }

    pub(crate) fn source(&self) -> &dyn Source {
        self.source.as_ref()
    }

    pub(crate) fn logger(&self) -> &Logger {
        &self.logger
    }

    pub(crate) async fn run(&self, operation: Operation) -> Result<Reply, ProsopoError> {
        if let Some(nothing) = Self::not_sent(&operation) {
            return Ok(nothing);
        }
        self.executor.run(operation).await.map_err(|error| {
            db_error(
                "DATABASE.QUERY_ERROR",
                ErrorContext::new().with("error", error.to_string()),
                Some(&self.logger),
            )
        })
    }

    /// An update cast to nothing, which mongoose does not send: an `updateOne` or `updateMany`
    /// statement left empty, or a `findOneAndUpdate` left empty, which finds nothing either.
    fn not_sent(operation: &Operation) -> Option<Reply> {
        match operation {
            Operation::Update { statements, .. }
                if statements.len() == 1 && matches!(&statements[0].u, Bson::Document(update) if update.is_empty()) =>
            {
                Some(Reply::Update {
                    matched: 0,
                    modified: 0,
                    upserted: 0,
                })
            }
            Operation::FindAndModify { update, .. } if update.is_empty() => Some(Reply::Value(None)),
            _ => None,
        }
    }

    pub(crate) async fn find(&self, operation: Operation) -> Result<Vec<Document>, ProsopoError> {
        Ok(self.run(operation).await?.documents())
    }

    /// The filter as mongoose casts it for `schema`.
    pub(crate) fn filter(&self, schema: &Schema, filter: Document) -> Document {
        cast_filter(schema, &filter, false, &mut SourceIds(self.source.as_ref())).unwrap_or(filter)
    }

    /// One statement of an update, cast as mongoose casts it for `method`.
    pub(crate) fn statement(
        &self,
        schema: &Schema,
        method: UpdateMethod,
        filter: Document,
        update: Document,
        upsert: bool,
    ) -> Result<UpdateStatement, String> {
        let mut ids: SourceIds = SourceIds(self.source.as_ref());
        let q: Document = cast_filter(schema, &filter, upsert, &mut ids).map_err(|error| error.to_string())?;
        let u: Document = cast_update(schema, method, &update, &q, upsert, &mut ids).map_err(|error| error.to_string())?;
        let statement: UpdateStatement = UpdateStatement::one(q, u).upsert(upsert);
        Ok(if method == UpdateMethod::UpdateMany { statement.many() } else { statement })
    }

    /// `storeDataset`: the dataset, its captchas (each given a `randomKey` on first insert) and
    /// the solutions of the solved ones, each upserted.
    pub async fn store_dataset(&self, dataset: &Value) -> Result<(), ProsopoError> {
        let failed = |error: String| {
            db_error(
                "DATABASE.DATASET_LOAD_FAILED",
                ErrorContext::new().with("failedFuncName", "storeDataset").with("error", error),
                Some(&self.logger),
            )
        };
        let parsed: Value = dataset_with_ids_and_tree_schema()
            .validate(Some(dataset))
            .map_err(|error| failed(error.to_string()))?;
        let dataset_id: Value = parsed["datasetId"].clone();
        let dataset_content_id: Value = parsed.get("datasetContentId").cloned().unwrap_or(Value::Null);
        let field = |value: &Value| -> Bson {
            if value.is_null() {
                Bson::Undefined
            } else {
                json_to_bson(value)
            }
        };
        let dataset_doc: Document = doc! {
            "datasetId": field(&dataset_id),
            "datasetContentId": field(&dataset_content_id),
            "format": field(&parsed["format"]),
            "contentTree": field(&parsed["contentTree"]),
            "solutionTree": field(&parsed["solutionTree"]),
        };
        let statement: UpdateStatement = self
            .statement(
                &DATASET_RECORD,
                UpdateMethod::UpdateOne,
                doc! { "datasetId": field(&dataset_id) },
                doc! { "$set": dataset_doc },
                true,
            )
            .map_err(failed)?;
        let load_failed = |error: ProsopoError| failed(error.to_string());
        self.run(Operation::update(collections::DATASET, vec![statement])).await.map_err(load_failed)?;

        let captchas: Vec<Value> = parsed["captchas"].as_array().cloned().unwrap_or_default();
        let mut captcha_statements: Vec<UpdateStatement> = Vec::new();
        for (index, captcha) in captchas.iter().enumerate() {
            let mut captcha_doc: Document = Document::new();
            for (key, value) in captcha.as_object().into_iter().flatten() {
                if key != "solution" {
                    captcha_doc.insert(key, json_to_bson(value));
                }
            }
            captcha_doc.insert("datasetId", field(&dataset_id));
            captcha_doc.insert("datasetContentId", field(&dataset_content_id));
            captcha_doc.insert("index", Bson::Int32(index as i32));
            let solved: bool = captcha["solution"].as_array().is_some_and(|solution| !solution.is_empty());
            captcha_doc.insert("solved", solved);
            let random_key: f64 = self.source.random();
            captcha_statements.push(
                self.statement(
                    &CAPTCHA_RECORD,
                    UpdateMethod::BulkWriteUpdateOne,
                    doc! { "captchaId": field(&captcha["captchaId"]) },
                    doc! { "$set": captcha_doc, "$setOnInsert": { "randomKey": random_key } },
                    true,
                )
                .map_err(failed)?,
            );
        }
        if !captcha_statements.is_empty() {
            self.run(Operation::update(collections::CAPTCHA, captcha_statements)).await.map_err(load_failed)?;
        }

        let mut solution_statements: Vec<UpdateStatement> = Vec::new();
        for captcha in captchas.iter().filter(|captcha| captcha["solution"].as_array().is_some_and(|s| !s.is_empty())) {
            let solution_doc: Document = doc! {
                "captchaId": field(&captcha["captchaId"]),
                "captchaContentId": field(&captcha["captchaContentId"]),
                "solution": field(&captcha["solution"]),
                "salt": field(&captcha["salt"]),
                "datasetId": field(&dataset_id),
                "datasetContentId": field(&dataset_content_id),
            };
            solution_statements.push(
                self.statement(
                    &SOLUTION_RECORD,
                    UpdateMethod::BulkWriteUpdateOne,
                    doc! { "captchaId": field(&captcha["captchaId"]) },
                    doc! { "$set": solution_doc },
                    true,
                )
                .map_err(failed)?,
            );
        }
        if !solution_statements.is_empty() {
            self.run(Operation::update(collections::SOLUTION, solution_statements)).await.map_err(load_failed)?;
        }
        Ok(())
    }

    /// `getSolutions`.
    pub async fn get_solutions(&self, dataset_id: &str) -> Result<Vec<StoredSolution>, ProsopoError> {
        let filter: Document = self.filter(&SOLUTION_RECORD, doc! { "datasetId": dataset_id });
        let documents: Vec<Document> = self.find(Operation::find(collections::SOLUTION, filter)).await?;
        Ok(documents.into_iter().filter_map(decode).collect())
    }

    /// `getSolutionByCaptchaId`.
    pub async fn get_solution_by_captcha_id(&self, captcha_id: &str) -> Result<Option<StoredSolution>, ProsopoError> {
        let filter: Document = self.filter(&SOLUTION_RECORD, doc! { "captchaId": captcha_id });
        let documents: Vec<Document> = self.find(Operation::find(collections::SOLUTION, filter).with_limit(1)).await?;
        Ok(documents.into_iter().next().and_then(decode))
    }

    /// `getDataset`: the dataset with every captcha, each with its solution if it is solved.
    pub async fn get_dataset(&self, dataset_id: &str) -> Result<DatasetWithCaptchas, ProsopoError> {
        let filter: Document = self.filter(&DATASET_RECORD, doc! { "datasetId": dataset_id });
        let found: Option<Document> = self
            .find(Operation::find(collections::DATASET, filter.clone()).with_limit(1))
            .await?
            .into_iter()
            .next();
        let Some(dataset) = found else {
            return Err(db_error(
                "DATABASE.DATASET_GET_FAILED",
                ErrorContext::new().with("failedFuncName", "getDataset").with("datasetId", dataset_id),
                None,
            ));
        };
        let captchas: Vec<Document> = self.find(Operation::find(collections::CAPTCHA, filter.clone())).await?;
        let solutions: Vec<Document> = self.find(Operation::find(collections::SOLUTION, filter)).await?;
        let mut solutions_by_captcha: Vec<(String, Vec<String>)> = Vec::new();
        for solution in solutions.into_iter().filter_map(decode::<StoredSolution>) {
            solutions_by_captcha.retain(|(id, _)| *id != solution.captcha_id);
            solutions_by_captcha.push((solution.captcha_id, solution.solution));
        }
        let tree = |key: &str| -> Vec<Vec<String>> {
            dataset
                .get_array(key)
                .ok()
                .map(|rows| {
                    rows.iter()
                        .filter_map(|row| row.as_array())
                        .map(|row| row.iter().filter_map(|item| item.as_str().map(str::to_string)).collect())
                        .collect()
                })
                .unwrap_or_default()
        };
        let captchas: Vec<DatasetCaptcha> = captchas
            .into_iter()
            .filter_map(decode::<StoredCaptcha>)
            .map(|captcha| {
                let solution: Vec<String> = if captcha.solved {
                    solutions_by_captcha
                        .iter()
                        .find(|(id, _)| *id == captcha.captcha_id)
                        .map(|(_, solution)| solution.clone())
                        .unwrap_or_default()
                } else {
                    Vec::new()
                };
                DatasetCaptcha {
                    captcha_id: captcha.captcha_id,
                    captcha_content_id: captcha.captcha_content_id,
                    solved: captcha.solved,
                    salt: captcha.salt,
                    items: captcha.items,
                    target: captcha.target,
                    solution,
                }
            })
            .collect();
        Ok(DatasetWithCaptchas {
            dataset_id: dataset_id.to_string(),
            dataset_content_id: dataset.get_str("datasetContentId").unwrap_or_default().to_string(),
            format: dataset.get_str("format").unwrap_or_default().to_string(),
            content_tree: tree("contentTree"),
            solution_tree: tree("solutionTree"),
            captchas,
        })
    }

    fn invalid_hash(&self, func: &str, key: &str, value: &str) -> ProsopoError {
        db_error(
            "DATABASE.INVALID_HASH",
            ErrorContext::new().with("failedFuncName", func).with(key, value),
            None,
        )
    }

    /// `getRandomCaptcha`: up to `size` captchas from a random point of the `randomKey` index,
    /// wrapping round to its start, or by `$sample` for captchas stored before `randomKey`.
    pub async fn get_random_captcha(
        &self,
        solved: bool,
        dataset_id: &str,
        size: Option<f64>,
    ) -> Result<Vec<SampledCaptcha>, ProsopoError> {
        if !is_hex(dataset_id) {
            return Err(self.invalid_hash("getRandomCaptcha", "datasetId", dataset_id));
        }
        let sample_size: i64 = match size {
            Some(size) if size != 0.0 && !size.is_nan() => size.trunc().abs() as i64,
            _ => 1,
        };
        let projection: Document = doc! {
            "_id": 0,
            "datasetId": 1,
            "datasetContentId": 1,
            "captchaId": 1,
            "captchaContentId": 1,
            "items": 1,
            "target": 1,
        };
        let pivot: f64 = self.source.random();
        let range = |op: &str| -> Operation {
            let filter: Document = self.filter(
                &CAPTCHA_RECORD,
                doc! { "datasetId": dataset_id, "solved": solved, "randomKey": { op: pivot } },
            );
            Operation::find(collections::CAPTCHA, filter)
                .with_projection(projection.clone())
                .with_sort(doc! { "randomKey": 1 })
        };
        let mut documents: Vec<Document> = self.find(range("$gte").with_limit(sample_size)).await?;
        if (documents.len() as i64) < sample_size {
            let rest: i64 = sample_size - documents.len() as i64;
            documents.extend(self.find(range("$lt").with_limit(rest)).await?);
        }
        if documents.is_empty() {
            let base: Document = self.filter(&CAPTCHA_RECORD, doc! { "datasetId": dataset_id, "solved": solved });
            let fallback: Vec<Document> = self
                .find(Operation::aggregate(
                    collections::CAPTCHA,
                    vec![
                        doc! { "$match": base },
                        doc! { "$sample": { "size": js_number(sample_size as f64) } },
                        doc! { "$project": projection.clone() },
                    ],
                ))
                .await?;
            if !fallback.is_empty() {
                return Ok(fallback.into_iter().map(without_id).filter_map(decode).collect());
            }
        }
        if !documents.is_empty() {
            return Ok(documents.into_iter().filter_map(decode).collect());
        }
        let mut context: ErrorContext = ErrorContext::new()
            .with("failedFuncName", "getRandomCaptcha")
            .with("solved", solved)
            .with("datasetId", dataset_id);
        if let Some(size) = size {
            context = context.with("size", size);
        }
        Err(db_error("DATABASE.CAPTCHA_GET_FAILED", context, None))
    }

    /// `getCaptchaById`.
    pub async fn get_captcha_by_id(&self, captcha_ids: &[String]) -> Result<Vec<CaptchaItems>, ProsopoError> {
        let filter: Document = self.filter(&CAPTCHA_RECORD, doc! { "captchaId": { "$in": captcha_ids } });
        let documents: Vec<Document> = self
            .find(
                Operation::find(collections::CAPTCHA, filter)
                    .with_projection(doc! { "_id": 0, "captchaId": 1, "datasetId": 1, "items": 1 }),
            )
            .await?;
        if documents.is_empty() {
            return Err(db_error(
                "DATABASE.CAPTCHA_GET_FAILED",
                ErrorContext::new().with("failedFuncName", "getCaptchaById").with("captchaId", json!(captcha_ids)),
                None,
            ));
        }
        Ok(documents.into_iter().map(without_id).filter_map(decode).collect())
    }

    /// `removeCaptchas`.
    pub async fn remove_captchas(&self, captcha_ids: &[String]) -> Result<(), ProsopoError> {
        let filter: Document = self.filter(&CAPTCHA_RECORD, doc! { "captchaId": { "$in": captcha_ids } });
        self.run(Operation::Delete {
            collection: collections::CAPTCHA.to_string(),
            filter,
            many: true,
        })
        .await?;
        Ok(())
    }

    /// `getMostRecentDatasetId`: the last dataset inserted, by `_id`.
    pub async fn get_most_recent_dataset_id(&self) -> Result<Option<String>, ProsopoError> {
        let documents: Vec<Document> = self
            .find(
                Operation::find(collections::DATASET, Document::new())
                    .with_sort(doc! { "_id": -1 })
                    .with_limit(1),
            )
            .await?;
        Ok(documents.first().and_then(|dataset| dataset.get_str("datasetId").ok()).map(str::to_string))
    }

    /// `getDatasetDetails`.
    pub async fn get_dataset_details(&self, dataset_id: &str) -> Result<StoredDataset, ProsopoError> {
        if !is_hex(dataset_id) {
            return Err(self.invalid_hash("getDatasetDetails", "datasetId", dataset_id));
        }
        let filter: Document = self.filter(&DATASET_RECORD, doc! { "datasetId": dataset_id });
        let found: Option<Document> =
            self.find(Operation::find(collections::DATASET, filter).with_limit(1)).await?.into_iter().next();
        found.and_then(decode).ok_or_else(|| {
            db_error(
                "DATABASE.DATASET_GET_FAILED",
                ErrorContext::new().with("failedFuncName", "getDatasetDetails").with("datasetId", dataset_id),
                None,
            )
        })
    }

    /// `getAllCaptchasByDatasetId`: the solved captchas, or for any other state the unsolved.
    pub async fn get_all_captchas_by_dataset_id(
        &self,
        dataset_id: &str,
        state: Option<CaptchaStates>,
    ) -> Result<Vec<StoredCaptcha>, ProsopoError> {
        let filter: Document = self.filter(
            &CAPTCHA_RECORD,
            doc! { "datasetId": dataset_id, "solved": state == Some(CaptchaStates::Solved) },
        );
        let documents: Vec<Document> = self.find(Operation::find(collections::CAPTCHA, filter)).await?;
        Ok(documents.into_iter().map(without_id).filter_map(decode).collect())
    }

    /// `getDatasetIdWithSolvedCaptchasOfSizeN`: a random dataset with at least that many solutions.
    pub async fn get_dataset_id_with_solved_captchas_of_size_n(&self, count: f64) -> Result<String, ProsopoError> {
        let documents: Vec<Document> = self
            .find(Operation::aggregate(
                collections::SOLUTION,
                vec![
                    doc! { "$match": {} },
                    doc! { "$group": { "_id": "$datasetId", "count": { "$sum": 1 } } },
                    doc! { "$match": { "count": { "$gte": js_number(count) } } },
                    doc! { "$sample": { "size": 1 } },
                ],
            ))
            .await?;
        documents
            .first()
            .and_then(|group| group.get_str("_id").ok())
            .map(str::to_string)
            .ok_or_else(|| db_error("DATABASE.DATASET_WITH_SOLUTIONS_GET_FAILED", ErrorContext::new(), None))
    }

    /// `getRandomSolvedCaptchasFromSingleDataset`.
    pub async fn get_random_solved_captchas_from_single_dataset(
        &self,
        dataset_id: &str,
        size: f64,
    ) -> Result<Vec<SampledSolution>, ProsopoError> {
        if !is_hex(dataset_id) {
            return Err(self.invalid_hash("getRandomSolvedCaptchasFromSingleDataset", "datasetId", dataset_id));
        }
        let sample_size: i64 = if size != 0.0 && !size.is_nan() { size.trunc().abs() as i64 } else { 1 };
        let documents: Vec<Document> = self
            .find(Operation::aggregate(
                collections::SOLUTION,
                vec![
                    doc! { "$match": { "datasetId": dataset_id } },
                    doc! { "$sample": { "size": js_number(sample_size as f64) } },
                    doc! { "$project": { "captchaId": 1, "captchaContentId": 1, "solution": 1 } },
                ],
            ))
            .await?;
        if documents.is_empty() {
            return Err(db_error(
                "DATABASE.SOLUTION_GET_FAILED",
                ErrorContext::new()
                    .with("failedFuncName", "getRandomSolvedCaptchasFromSingleDataset")
                    .with("datasetId", dataset_id)
                    .with("size", size),
                None,
            ));
        }
        Ok(documents.into_iter().filter_map(decode).collect())
    }
}
