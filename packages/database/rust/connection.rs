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

//! A database opened and closed around its calls, as the TS `CaptchaDatabase` and
//! `ClientDatabase` do, indexed as mongoose's autoIndex does each time a connection is opened.

use crate::mongo::MongoDatabase;
use crate::operation::{DriverExecutor, Executor, Operation};
use crate::provider::create_index_command;
use prosopo_common::{ErrorClass, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_logger::{LogRecord, Logger};
use prosopo_types_database::schema::Schema;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

pub(crate) enum Target {
    Mongo(MongoDatabase),
    /// Already connected, as a test's executor is.
    Fixed(Arc<dyn Executor>),
}

pub(crate) struct ManagedConnection {
    target: Target,
    open: AtomicBool,
    /// Each collection and the schema whose indexes it gets.
    tables: Vec<(&'static str, &'static Schema)>,
}

/// A connection error as the TS lets it through: mongoose's own, unwrapped and unlogged.
pub(crate) fn raw_error(error: impl std::fmt::Display) -> ProsopoError {
    ProsopoError::new(
        ErrorClass::Db,
        ErrorSource::message(error.to_string()),
        ErrorOptions {
            silent: true,
            ..ErrorOptions::default()
        },
    )
}

impl ManagedConnection {
    pub(crate) fn new(target: Target, tables: Vec<(&'static str, &'static Schema)>) -> ManagedConnection {
        ManagedConnection {
            target,
            open: AtomicBool::new(false),
            tables,
        }
    }

    pub(crate) fn tables(&self) -> &[(&'static str, &'static Schema)] {
        &self.tables
    }

    pub(crate) fn connected(&self) -> bool {
        self.open.load(Ordering::SeqCst)
            && match &self.target {
                Target::Mongo(mongo) => mongo.connected(),
                Target::Fixed(_) => true,
            }
    }

    /// Opens the connection unless it is open, and indexes a new one.
    pub(crate) async fn connect(&self, logger: &Logger) -> Result<(), ProsopoError> {
        let fresh: bool = !self.connected();
        if let Target::Mongo(mongo) = &self.target {
            mongo.connect().await.map_err(raw_error)?;
        }
        self.open.store(true, Ordering::SeqCst);
        if fresh {
            self.auto_index(logger).await;
        }
        Ok(())
    }

    pub(crate) async fn close(&self) {
        if let Target::Mongo(mongo) = &self.target {
            mongo.close().await;
        }
        self.open.store(false, Ordering::SeqCst);
    }

    pub(crate) async fn executor(&self) -> Result<Arc<dyn Executor>, ProsopoError> {
        match &self.target {
            Target::Mongo(mongo) => Ok(Arc::new(DriverExecutor::new(mongo.database().await?))),
            Target::Fixed(executor) => Ok(executor.clone()),
        }
    }

    /// Every declared index created; a collection whose indexes fail is logged and the rest
    /// carry on.
    async fn auto_index(&self, logger: &Logger) {
        let Ok(executor) = self.executor().await else {
            return;
        };
        for (collection, schema) in &self.tables {
            for index in schema.indexes() {
                if let Err(error) = executor.run(Operation::Command(create_index_command(collection, &index))).await {
                    logger.warn(|| LogRecord::msg(format!("Error creating indexes for collection {collection}")).with_err(error.to_string()));
                    break;
                }
            }
        }
    }
}
