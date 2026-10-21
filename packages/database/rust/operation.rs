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

//! The database commands the methods send, as the commands themselves: each operation is the
//! command document mongoose sends for the same call, run with `runCommand`, so the Rust and the
//! TS put the same command on the wire. An [`Executor`] runs them; [`DriverExecutor`] against a
//! database, a test one against recorded replies.

use crate::mongo::MongoError;
use bson::{doc, Bson, Document};
use mongodb::Database;
use std::future::Future;
use std::pin::Pin;
use std::time::Duration;

/// One statement of an `update` command.
#[derive(Debug, Clone, PartialEq)]
pub struct UpdateStatement {
    pub q: Document,
    /// An update document, or a pipeline (`[{ $set: ... }]`).
    pub u: Bson,
    pub upsert: bool,
    pub multi: bool,
}

impl UpdateStatement {
    pub fn one(q: Document, u: Document) -> UpdateStatement {
        UpdateStatement {
            q,
            u: Bson::Document(u),
            upsert: false,
            multi: false,
        }
    }

    pub fn pipeline(q: Document, stages: Vec<Document>) -> UpdateStatement {
        UpdateStatement {
            q,
            u: Bson::Array(stages.into_iter().map(Bson::Document).collect()),
            upsert: false,
            multi: false,
        }
    }

    pub fn upsert(mut self, upsert: bool) -> UpdateStatement {
        self.upsert = upsert;
        self
    }

    pub fn many(mut self) -> UpdateStatement {
        self.multi = true;
        self
    }

    fn to_document(&self) -> Document {
        let mut out: Document = doc! { "q": self.q.clone(), "u": self.u.clone() };
        if self.upsert {
            out.insert("upsert", true);
        }
        if self.multi {
            out.insert("multi", true);
        }
        out
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Operation {
    Find {
        collection: String,
        filter: Document,
        projection: Option<Document>,
        sort: Option<Document>,
        limit: Option<i64>,
        hint: Option<String>,
    },
    Aggregate {
        collection: String,
        pipeline: Vec<Document>,
    },
    Update {
        collection: String,
        statements: Vec<UpdateStatement>,
    },
    Delete {
        collection: String,
        filter: Document,
        many: bool,
    },
    FindAndModify {
        collection: String,
        query: Document,
        update: Document,
        upsert: bool,
    },
}

impl Operation {
    pub fn find(collection: &str, filter: Document) -> Operation {
        Operation::Find {
            collection: collection.to_string(),
            filter,
            projection: None,
            sort: None,
            limit: None,
            hint: None,
        }
    }

    pub fn with_projection(mut self, value: Document) -> Operation {
        if let Operation::Find { projection, .. } = &mut self {
            *projection = Some(value);
        }
        self
    }

    pub fn with_sort(mut self, value: Document) -> Operation {
        if let Operation::Find { sort, .. } = &mut self {
            *sort = Some(value);
        }
        self
    }

    pub fn with_limit(mut self, value: i64) -> Operation {
        if let Operation::Find { limit, .. } = &mut self {
            *limit = Some(value);
        }
        self
    }

    pub fn with_hint(mut self, value: &str) -> Operation {
        if let Operation::Find { hint, .. } = &mut self {
            *hint = Some(value.to_string());
        }
        self
    }

    pub fn aggregate(collection: &str, pipeline: Vec<Document>) -> Operation {
        Operation::Aggregate {
            collection: collection.to_string(),
            pipeline,
        }
    }

    pub fn update(collection: &str, statements: Vec<UpdateStatement>) -> Operation {
        Operation::Update {
            collection: collection.to_string(),
            statements,
        }
    }

    /// The command mongoose sends, as the fields that decide what it does.
    pub fn command(&self) -> Document {
        match self {
            Operation::Find {
                collection,
                filter,
                projection,
                sort,
                limit,
                hint,
            } => {
                let mut out: Document = doc! { "find": collection, "filter": filter.clone() };
                if let Some(projection) = projection {
                    out.insert("projection", projection.clone());
                }
                if let Some(sort) = sort {
                    out.insert("sort", sort.clone());
                }
                if let Some(limit) = limit {
                    out.insert("limit", Bson::Int32(*limit as i32));
                }
                if let Some(hint) = hint {
                    out.insert("hint", hint.clone());
                }
                out
            }
            Operation::Aggregate { collection, pipeline } => doc! { "aggregate": collection, "pipeline": pipeline.clone() },
            Operation::Update { collection, statements } => doc! {
                "update": collection,
                "updates": statements.iter().map(|statement| Bson::Document(statement.to_document())).collect::<Vec<Bson>>(),
            },
            Operation::Delete { collection, filter, many } => doc! {
                "delete": collection,
                "deletes": [{ "q": filter.clone(), "limit": if *many { 0 } else { 1 } }],
            },
            Operation::FindAndModify {
                collection,
                query,
                update,
                upsert,
            } => {
                let mut out: Document = doc! { "findAndModify": collection, "query": query.clone(), "update": update.clone() };
                if *upsert {
                    out.insert("upsert", true);
                }
                out
            }
        }
    }

    fn is_retryable_write(&self) -> bool {
        matches!(self, Operation::Update { .. } | Operation::Delete { .. })
    }
}

/// What a command returned that the methods read.
#[derive(Debug, Clone, PartialEq)]
pub enum Reply {
    Documents(Vec<Document>),
    Update { matched: u64, modified: u64, upserted: u64 },
    Delete { deleted: u64 },
    Value(Option<Document>),
}

impl Reply {
    pub fn documents(self) -> Vec<Document> {
        match self {
            Reply::Documents(documents) => documents,
            _ => Vec::new(),
        }
    }

    /// The reply of `operation`'s command, from the fields mongod returns.
    pub fn from_command_reply(operation: &Operation, reply: &Document) -> Reply {
        let count = |key: &str| -> u64 {
            match reply.get(key) {
                Some(Bson::Int32(n)) => *n as u64,
                Some(Bson::Int64(n)) => *n as u64,
                _ => 0,
            }
        };
        match operation {
            Operation::Find { .. } | Operation::Aggregate { .. } => {
                let batch: Vec<Document> = reply
                    .get_document("cursor")
                    .ok()
                    .and_then(|cursor| cursor.get_array("firstBatch").ok())
                    .map(|items| items.iter().filter_map(|item| item.as_document().cloned()).collect())
                    .unwrap_or_default();
                Reply::Documents(batch)
            }
            Operation::Update { .. } => {
                let upserted: u64 = reply.get_array("upserted").map(|items| items.len() as u64).unwrap_or(0);
                Reply::Update {
                    matched: count("n") - upserted,
                    modified: count("nModified"),
                    upserted,
                }
            }
            Operation::Delete { .. } => Reply::Delete { deleted: count("n") },
            Operation::FindAndModify { .. } => Reply::Value(reply.get_document("value").ok().cloned()),
        }
    }
}

pub type ReplyFuture<'a> = Pin<Box<dyn Future<Output = Result<Reply, MongoError>> + Send + 'a>>;

pub trait Executor: Send + Sync {
    fn run(&self, operation: Operation) -> ReplyFuture<'_>;
}

const SOCKET_TIMEOUT: Duration = Duration::from_millis(crate::options::SOCKET_TIMEOUT_MS);

/// Runs operations on a database, reading every batch of a cursor.
pub struct DriverExecutor {
    database: Database,
}

impl DriverExecutor {
    pub fn new(database: Database) -> DriverExecutor {
        DriverExecutor { database }
    }

    async fn run_command(&self, command: Document) -> Result<Document, MongoError> {
        match tokio::time::timeout(SOCKET_TIMEOUT, self.database.run_command(command)).await {
            Ok(result) => result.map_err(MongoError::Driver),
            Err(_) => Err(MongoError::Timeout),
        }
    }

    async fn run_once(&self, operation: &Operation) -> Result<Reply, MongoError> {
        let mut command: Document = operation.command();
        if matches!(operation, Operation::Aggregate { .. }) {
            command.insert("cursor", Document::new());
        }
        let reply: Document = self.run_command(command).await?;
        let mut parsed: Reply = Reply::from_command_reply(operation, &reply);
        if let Reply::Documents(documents) = &mut parsed {
            let mut cursor: Document = reply.get_document("cursor").cloned().unwrap_or_default();
            while let Some(id) = cursor.get_i64("id").ok().filter(|id| *id != 0) {
                let collection: String = cursor
                    .get_str("ns")
                    .ok()
                    .and_then(|ns| ns.split_once('.').map(|(_, name)| name.to_string()))
                    .unwrap_or_default();
                let more: Document = self.run_command(doc! { "getMore": id, "collection": collection }).await?;
                cursor = more.get_document("cursor").cloned().unwrap_or_default();
                if let Ok(batch) = cursor.get_array("nextBatch") {
                    documents.extend(batch.iter().filter_map(|item| item.as_document().cloned()));
                }
            }
        }
        Ok(parsed)
    }
}

impl Executor for DriverExecutor {
    /// An update or a delete is retried once on an error the server marks retryable, as the TS
    /// driver's retryable writes do; every write the methods make is idempotent.
    fn run(&self, operation: Operation) -> ReplyFuture<'_> {
        Box::pin(async move {
            match self.run_once(&operation).await {
                Err(MongoError::Driver(error))
                    if operation.is_retryable_write() && error.contains_label("RetryableWriteError") =>
                {
                    self.run_once(&operation).await
                }
                other => other,
            }
        })
    }
}
