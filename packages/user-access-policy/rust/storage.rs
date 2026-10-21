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

//! What rule storage offers (src/rulesStorage.ts).

use crate::rule::{AccessRule, UserScope};
use serde::{Deserialize, Serialize};
use std::fmt;
use std::future::Future;
use std::pin::Pin;

pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

prosopo_types::wire_enum! {
    /// How a filter's scope selects rules. Exact: a client id selects that client's rules, no
    /// client id the global ones (the API). Greedy: a client id selects that client's rules
    /// and the global ones, no client id any rule (the request middleware).
    pub enum FilterScopeMatch {
        Exact: "Exact" = "exact",
        Greedy: "Greedy" = "greedy",
    }
}

/// `PolicyScope`.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyScope {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,
}

/// `AccessRulesFilter`.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessRulesFilter {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub policy_scope: Option<PolicyScope>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub policy_scope_match: Option<FilterScopeMatch>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_scope: Option<UserScope>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_scope_match: Option<FilterScopeMatch>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group_id: Option<String>,
    /// Block rules only: the hot-path callers set it so Restrict rules cannot crowd a block
    /// out of the candidate cap.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub block_only: Option<bool>,
    /// With `block_only`, also deferred rules of any type: the verify-time lookup sets it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub include_deferred: Option<bool>,
}

/// `AccessRuleEntry`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessRuleEntry {
    pub rule: AccessRule,
    /// Unix seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_unix_timestamp: Option<prosopo_types::JsNumber>,
}

#[derive(Debug)]
pub enum RulesStorageError {
    Redis(redis::RedisError),
    /// An expiry that looks like milliseconds (the TS throws an `Error`).
    InvalidExpiry(String),
    /// A batch handler of `fetch_all_rule_ids` failed.
    Handler(Box<dyn std::error::Error + Send + Sync>),
}

impl fmt::Display for RulesStorageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RulesStorageError::Redis(error) => fmt::Display::fmt(error, f),
            RulesStorageError::InvalidExpiry(message) => f.write_str(message),
            RulesStorageError::Handler(error) => fmt::Display::fmt(error, f),
        }
    }
}

impl std::error::Error for RulesStorageError {}

impl From<redis::RedisError> for RulesStorageError {
    fn from(error: redis::RedisError) -> RulesStorageError {
        RulesStorageError::Redis(error)
    }
}

pub type Result<T> = std::result::Result<T, RulesStorageError>;

/// Called with each batch of ids by [`AccessRulesReader::fetch_all_rule_ids`].
pub trait RuleIdBatchHandler: Send {
    fn handle(&mut self, rule_ids: Vec<String>) -> BoxFuture<'_, Result<()>>;
}

/// `AccessRulesReader`. The finders never fail: they log and return nothing, as the TS does.
pub trait AccessRulesReader: Send + Sync {
    fn fetch_rules<'a>(
        &'a self,
        rule_ids: &'a [String],
    ) -> BoxFuture<'a, Result<Vec<AccessRuleEntry>>>;

    fn get_missing_rule_ids<'a>(
        &'a self,
        rule_ids: &'a [String],
    ) -> BoxFuture<'a, Result<Vec<String>>>;

    fn find_rules<'a>(
        &'a self,
        filter: &'a AccessRulesFilter,
        matching_fields_only: bool,
        skip_empty_user_scopes: bool,
    ) -> BoxFuture<'a, Vec<AccessRule>>;

    fn find_rule_ids<'a>(
        &'a self,
        filter: &'a AccessRulesFilter,
        matching_fields_only: bool,
    ) -> BoxFuture<'a, Vec<String>>;

    fn fetch_all_rule_ids<'a>(
        &'a self,
        handler: &'a mut dyn RuleIdBatchHandler,
    ) -> BoxFuture<'a, Result<()>>;
}

/// `AccessRulesWriter`.
pub trait AccessRulesWriter: Send + Sync {
    /// The ids of the rules written.
    fn insert_rules<'a>(
        &'a self,
        entries: &'a [AccessRuleEntry],
    ) -> BoxFuture<'a, Result<Vec<String>>>;

    fn delete_rules<'a>(&'a self, rule_ids: &'a [String]) -> BoxFuture<'a, Result<()>>;

    /// How many rules were deleted.
    fn delete_all_rules(&self) -> BoxFuture<'_, Result<usize>>;
}

pub trait AccessRulesStorage: AccessRulesReader + AccessRulesWriter {}

impl<T: AccessRulesReader + AccessRulesWriter> AccessRulesStorage for T {}
