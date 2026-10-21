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

//! Scheduled task records (provider.ts).

use crate::operation::{Operation, UpdateStatement};
use crate::provider::{collections, db_error, decode, ProviderDatabase};
use crate::source::SourceIds;
use bson::oid::ObjectId;
use bson::{doc, Bson, DateTime, Document};
use prosopo_common::{ErrorContext, ProsopoError};
use prosopo_types::client::{ScheduledTaskNames, ScheduledTaskStatus};
use prosopo_types_database::document::create;
use prosopo_types_database::provider::SCHEDULED_TASK_RECORD;
use prosopo_types_database::scheduled_task::ScheduledTaskResult;
use prosopo_types_database::update::UpdateMethod;
use serde::Deserialize;

/// A stored `ScheduledTask`, with the id the status of the same run is found by.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledTaskRecord {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub process_name: ScheduledTaskNames,
    pub datetime: DateTime,
    #[serde(default)]
    pub updated: Option<DateTime>,
    pub status: ScheduledTaskStatus,
    #[serde(default)]
    pub result: Option<ScheduledTaskResult>,
}

impl ProviderDatabase {
    async fn find_task(&self, operation: Operation) -> Result<Option<ScheduledTaskRecord>, ProsopoError> {
        Ok(self.find(operation.with_limit(1)).await?.into_iter().next().and_then(decode))
    }

    /// `getScheduledTaskStatus`.
    pub async fn get_scheduled_task_status(&self, task_id: ObjectId, status: ScheduledTaskStatus) -> Result<Option<ScheduledTaskRecord>, ProsopoError> {
        let filter: Document = self.filter(&SCHEDULED_TASK_RECORD, doc! { "_id": task_id, "status": status.as_str() });
        self.find_task(Operation::find(collections::SCHEDULER, filter)).await
    }

    /// `getLastScheduledTaskStatus`: the latest run of the task, in that status if one is given.
    pub async fn get_last_scheduled_task_status(&self, task: ScheduledTaskNames, status: Option<ScheduledTaskStatus>) -> Result<Option<ScheduledTaskRecord>, ProsopoError> {
        let mut filter: Document = doc! { "processName": task.as_str() };
        if let Some(status) = status {
            filter.insert("status", status.as_str());
        }
        let filter: Document = self.filter(&SCHEDULED_TASK_RECORD, filter);
        self.find_task(Operation::find(collections::SCHEDULER, filter).with_sort(doc! { "datetime": -1 })).await
    }

    /// `createScheduledTaskStatus`: the new run's id.
    pub async fn create_scheduled_task_status(&self, task: ScheduledTaskNames, status: ScheduledTaskStatus) -> Result<ObjectId, ProsopoError> {
        let input: Document = doc! { "processName": task.as_str(), "datetime": self.source().now(), "status": status.as_str() };
        let document: Document = create(&SCHEDULED_TASK_RECORD, &input, &mut SourceIds(self.source()))
            .map_err(|error| db_error("DATABASE.QUERY_ERROR", ErrorContext::new().with("error", error.to_string()), Some(self.logger())))?;
        let id: ObjectId = document.get_object_id("_id").expect("create gives a record an id");
        self.run(Operation::Insert {
            collection: collections::SCHEDULER.to_string(),
            documents: vec![document],
        })
        .await?;
        Ok(id)
    }

    /// `updateScheduledTaskStatus`.
    pub async fn update_scheduled_task_status(&self, task_id: ObjectId, status: ScheduledTaskStatus, result: Option<&ScheduledTaskResult>) -> Result<(), ProsopoError> {
        let mut update: Document = doc! { "status": status.as_str(), "updated": self.source().now() };
        if let Some(result) = result {
            let result: Bson = bson::serialize_to_bson(result)
                .map_err(|error| db_error("DATABASE.QUERY_ERROR", ErrorContext::new().with("error", error.to_string()), None))?;
            update.insert("result", result);
        }
        let statement: UpdateStatement = self
            .statement(&SCHEDULED_TASK_RECORD, UpdateMethod::UpdateOne, doc! { "_id": task_id }, doc! { "$set": update }, false)
            .map_err(|error| db_error("DATABASE.QUERY_ERROR", ErrorContext::new().with("error", error), None))?
            .no_upsert();
        self.run(Operation::update(collections::SCHEDULER, vec![statement])).await?;
        Ok(())
    }

    /// `cleanupScheduledTaskStatus`: every record in that status removed.
    pub async fn cleanup_scheduled_task_status(&self, status: ScheduledTaskStatus) -> Result<(), ProsopoError> {
        let filter: Document = self.filter(&SCHEDULED_TASK_RECORD, doc! { "status": status.as_str() });
        self.run(Operation::Delete {
            collection: collections::SCHEDULER.to_string(),
            filter,
            many: true,
        })
        .await?;
        Ok(())
    }
}
