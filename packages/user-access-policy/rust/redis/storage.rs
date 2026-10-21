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

//! `createRedisAccessRulesStorage` (src/redis/redisRulesStorage.ts): rule storage over a
//! connection that may not be ready yet. Until it is, every call logs and does nothing, as
//! the TS dummy reader and writer do.

use super::reader::RedisRulesReader;
use super::writer::RedisRulesWriter;
use crate::rule::AccessRule;
use crate::storage::{
    AccessRuleEntry, AccessRulesFilter, AccessRulesReader, AccessRulesWriter, BoxFuture, Result,
    RuleIdBatchHandler,
};
use prosopo_logger::{LogRecord, Logger};
use prosopo_redis_client::{RedisClient, RedisConnection};
use serde_json::json;

#[derive(Clone)]
pub struct RedisAccessRulesStorage {
    connection: RedisConnection,
    logger: Logger,
}

impl RedisAccessRulesStorage {
    /// Must be called within a tokio runtime: it logs once the connection is ready.
    pub fn new(connection: RedisConnection, logger: Logger) -> RedisAccessRulesStorage {
        let waiting: RedisConnection = connection.clone();
        let ready_logger: Logger = logger.clone();
        tokio::spawn(async move {
            if waiting.get_client().await.is_ok() {
                ready_logger
                    .info(|| LogRecord::msg("RedisAccessRules storage got a ready Redis client"));
            }
        });
        RedisAccessRulesStorage { connection, logger }
    }

    async fn client(&self) -> Option<RedisClient> {
        if !self.connection.is_ready() {
            return None;
        }
        self.connection.get_client().await.ok()
    }

    async fn reader(&self) -> Option<RedisRulesReader> {
        self.client()
            .await
            .map(|client| RedisRulesReader::new(client, self.logger.clone()))
    }

    async fn writer(&self) -> Option<RedisRulesWriter> {
        self.client().await.map(RedisRulesWriter::new)
    }

    fn not_ready(&self, call: &str, data: Option<serde_json::Value>) {
        self.logger.info(|| {
            let record: LogRecord =
                LogRecord::msg(format!("Dummy {call}() has no effect (redis is not ready)"));
            match data.clone() {
                Some(data) => record.with_data(data),
                None => record,
            }
        });
    }
}

impl AccessRulesReader for RedisAccessRulesStorage {
    fn fetch_rules<'a>(
        &'a self,
        rule_ids: &'a [String],
    ) -> BoxFuture<'a, Result<Vec<AccessRuleEntry>>> {
        Box::pin(async move {
            match self.reader().await {
                Some(reader) => reader.fetch_rules(rule_ids).await,
                None => {
                    self.not_ready("fetchRule", Some(json!({ "ruleIds": rule_ids })));
                    Ok(Vec::new())
                }
            }
        })
    }

    fn get_missing_rule_ids<'a>(
        &'a self,
        rule_ids: &'a [String],
    ) -> BoxFuture<'a, Result<Vec<String>>> {
        Box::pin(async move {
            match self.reader().await {
                Some(reader) => reader.get_missing_rule_ids(rule_ids).await,
                None => {
                    self.not_ready("getMissingRuleIds", Some(json!({ "ruleIds": rule_ids })));
                    Ok(Vec::new())
                }
            }
        })
    }

    fn find_rules<'a>(
        &'a self,
        filter: &'a AccessRulesFilter,
        matching_fields_only: bool,
        skip_empty_user_scopes: bool,
    ) -> BoxFuture<'a, Vec<AccessRule>> {
        Box::pin(async move {
            match self.reader().await {
                Some(reader) => {
                    reader
                        .find_rules(filter, matching_fields_only, skip_empty_user_scopes)
                        .await
                }
                None => {
                    self.not_ready("findRules", Some(json!({ "filter": filter })));
                    Vec::new()
                }
            }
        })
    }

    fn find_rule_ids<'a>(
        &'a self,
        filter: &'a AccessRulesFilter,
        matching_fields_only: bool,
    ) -> BoxFuture<'a, Vec<String>> {
        Box::pin(async move {
            match self.reader().await {
                Some(reader) => reader.find_rule_ids(filter, matching_fields_only).await,
                None => {
                    self.not_ready("findRuleIds", Some(json!({ "filter": filter })));
                    Vec::new()
                }
            }
        })
    }

    fn fetch_all_rule_ids<'a>(
        &'a self,
        handler: &'a mut dyn RuleIdBatchHandler,
    ) -> BoxFuture<'a, Result<()>> {
        Box::pin(async move {
            match self.reader().await {
                Some(reader) => reader.fetch_all_rule_ids(handler).await,
                None => {
                    self.not_ready("fetchAllRuleIds", None);
                    Ok(())
                }
            }
        })
    }
}

impl AccessRulesWriter for RedisAccessRulesStorage {
    fn insert_rules<'a>(
        &'a self,
        entries: &'a [AccessRuleEntry],
    ) -> BoxFuture<'a, Result<Vec<String>>> {
        Box::pin(async move {
            match self.writer().await {
                Some(writer) => writer.insert_rules(entries).await,
                None => {
                    self.not_ready("insertRules", Some(json!({ "ruleEntries": entries })));
                    Ok(Vec::new())
                }
            }
        })
    }

    fn delete_rules<'a>(&'a self, rule_ids: &'a [String]) -> BoxFuture<'a, Result<()>> {
        Box::pin(async move {
            match self.writer().await {
                Some(writer) => writer.delete_rules(rule_ids).await,
                None => {
                    self.not_ready("deleteRules", Some(json!({ "ruleIds": rule_ids })));
                    Ok(())
                }
            }
        })
    }

    fn delete_all_rules(&self) -> BoxFuture<'_, Result<usize>> {
        Box::pin(async move {
            match self.writer().await {
                Some(writer) => writer.delete_all_rules().await,
                None => {
                    self.not_ready("deleteAllRules", None);
                    Ok(0)
                }
            }
        })
    }
}
