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

//! `ProviderEnvironment` (provider.ts).

use crate::env::{is_maintenance_mode, Environment};
use prosopo_database::provider::ProviderDatabase;
use prosopo_database::redis_cache::RedisWriteQueue;
use prosopo_logger::{LogObject, LogRecord, Logger};
use prosopo_types::client::ScheduledTaskStatus;
use serde_json::json;
use std::ops::{Deref, DerefMut};
use std::sync::Arc;
use tokio::task::JoinHandle;

pub struct ProviderEnvironment(pub Environment);

impl Deref for ProviderEnvironment {
    type Target = Environment;

    fn deref(&self) -> &Environment {
        &self.0
    }
}

impl DerefMut for ProviderEnvironment {
    fn deref_mut(&mut self) -> &mut Environment {
        &mut self.0
    }
}

impl ProviderEnvironment {
    /// `cleanup`, at start-up: scheduled tasks a previous run left running are reset, and the
    /// Redis session keys it left are cleared, each in the background with any failure logged.
    /// Nothing is done without a connected database, or in maintenance mode. The tasks
    /// started are returned for a caller that wants to wait for them.
    pub fn cleanup(&self) -> Vec<JoinHandle<()>> {
        let db: Option<Arc<ProviderDatabase>> = self.db.clone().filter(|db| db.connected());
        let Some(db) = db.filter(|_| !is_maintenance_mode()) else {
            self.logger.warn(|| LogRecord::msg("Skipping startup cleanup — DB not connected (maintenance mode or boot-time DB failure)"));
            return Vec::new();
        };
        let mut bindings: LogObject = LogObject::new();
        bindings.insert("failedFuncName".to_string(), json!("cleanup"));
        let error_log: Logger = self.logger.with(&bindings, None);
        let mut tasks: Vec<JoinHandle<()>> = Vec::new();
        let tasks_db: Arc<ProviderDatabase> = db.clone();
        tasks.push(tokio::spawn(async move {
            if let Err(error) = tasks_db.cleanup_scheduled_task_status(ScheduledTaskStatus::Running).await {
                error_log.error(|| LogRecord::msg("Failed to cleanup running scheduled tasks").with_err(error.to_string()));
            }
        }));
        match db.get_redis_connection() {
            Ok(connection) => {
                let queue: RedisWriteQueue = RedisWriteQueue::new(connection, self.logger.clone(), self.source.clone());
                tasks.push(tokio::spawn(async move { queue.clear_all_session_records(None).await }));
            }
            Err(error) => self.logger.warn(|| LogRecord::msg("Skipped Redis session cleanup — no Redis connection").with_err(error.to_string())),
        }
        tasks
    }
}
