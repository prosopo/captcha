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

//! The rule admin API (src/api): eight endpoints, their routes and rate limits.

use crate::input::{
    access_policy_input, access_rules_filter_input, excluded_client_ids_input,
    get_access_rule_filters_from_input, policy_scope_input, user_scope_input,
    AccessRulesFilterInput,
};
use crate::rule::{AccessPolicy, AccessPolicyType, AccessRule, UserScope};
use crate::storage::{
    AccessRuleEntry, AccessRulesFilter, AccessRulesStorage, BoxFuture, FilterScopeMatch,
    PolicyScope, RuleIdBatchHandler,
};
use futures_util::future::join_all;
use prosopo_api_route::schema::{array, number, object, string, Schema};
use prosopo_api_route::{
    ApiEndpoint, ApiEndpointError, ApiEndpointResponse, ApiEndpointResponseStatus, ApiRouteLimit,
    ApiRouteLimits, ApiRoutes, ApiRoutesProvider, NoArgs, RouteKey, Validate, ValidationError,
};
use prosopo_logger::{LogLevel, LogRecord, Logger};
use prosopo_types::JsNumber;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::borrow::Cow;
use std::sync::{Arc, LazyLock};
use std::time::Duration;

pub type SharedStorage = Arc<dyn AccessRulesStorage>;

fn unique(ids: Vec<String>) -> Vec<String> {
    let mut seen: Vec<String> = Vec::with_capacity(ids.len());
    for id in ids {
        if !seen.contains(&id) {
            seen.push(id);
        }
    }
    seen
}

fn success(data: Value) -> ApiEndpointResponse {
    ApiEndpointResponse::new(ApiEndpointResponseStatus::Success).with_data(data)
}

macro_rules! validated_by {
    ($type:ty, $schema:expr) => {
        impl Validate for $type {
            fn validate(input: Option<&Value>) -> Result<Value, ValidationError> {
                static SCHEMA: LazyLock<Schema> = LazyLock::new(|| $schema);
                SCHEMA.validate(input)
            }
        }
    };
}

/// `InsertRulesGroup`: one policy applied to each user scope, for each policy scope.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertRulesGroup {
    pub access_policy: AccessPolicy,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub policy_scopes: Option<Vec<PolicyScope>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub excluded_client_ids: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group_id: Option<String>,
    pub user_scopes: Vec<UserScope>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_unix_timestamp: Option<JsNumber>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct InsertRulesArgs(pub Vec<InsertRulesGroup>);
validated_by!(
    InsertRulesArgs,
    array(object(vec![
        ("accessPolicy", access_policy_input()),
        ("policyScopes", array(policy_scope_input()).optional()),
        ("excludedClientIds", excluded_client_ids_input()),
        ("groupId", string().optional()),
        ("userScopes", array(user_scope_input())),
        ("expiresUnixTimestamp", number().optional()),
    ]))
);

/// `sanitizeAccessPolicy`: a Block carries no captcha type and no round count. Records
/// written before the input refinement may still have them.
pub fn sanitize_access_policy(policy: &AccessPolicy) -> AccessPolicy {
    if policy.kind != AccessPolicyType::Block {
        return policy.clone();
    }
    AccessPolicy {
        captcha_type: None,
        challenge_level: None,
        ..policy.clone()
    }
}

fn group_entries(group: &InsertRulesGroup) -> Vec<AccessRuleEntry> {
    let policy: AccessPolicy = sanitize_access_policy(&group.access_policy);
    let group_id: Option<String> = group.group_id.clone().filter(|id: &String| !id.is_empty());
    let scopes: Vec<PolicyScope> = group.policy_scopes.clone().unwrap_or_default();
    let mut entries: Vec<AccessRuleEntry> = Vec::new();
    for user_scope in &group.user_scopes {
        let base: AccessRule = AccessRule {
            policy: policy.clone(),
            client_id: None,
            excluded_client_ids: None,
            scope: user_scope.clone(),
            group_id: group_id.clone(),
        };
        let mut push = |rule: AccessRule| {
            entries.push(AccessRuleEntry {
                rule,
                expires_unix_timestamp: group.expires_unix_timestamp,
            })
        };
        if scopes.is_empty() {
            push(AccessRule {
                excluded_client_ids: group.excluded_client_ids.clone(),
                ..base
            });
        } else {
            for scope in &scopes {
                push(AccessRule {
                    client_id: scope.client_id.clone(),
                    ..base.clone()
                });
            }
        }
    }
    entries
}

/// `InsertRulesEndpoint`. Answers `PROCESSING` if the write takes over five seconds, and
/// carries on writing.
pub struct InsertRulesEndpoint {
    storage: SharedStorage,
    logger: Logger,
}

impl InsertRulesEndpoint {
    pub fn new(storage: SharedStorage, logger: Logger) -> InsertRulesEndpoint {
        InsertRulesEndpoint { storage, logger }
    }
}

const INSERT_TIMEOUT: Duration = Duration::from_millis(5000);

impl ApiEndpoint for InsertRulesEndpoint {
    type Args = InsertRulesArgs;

    async fn process_request(
        &self,
        args: InsertRulesArgs,
        logger: Option<&Logger>,
    ) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: Logger = logger.unwrap_or(&self.logger).clone();
        let storage: SharedStorage = self.storage.clone();
        let user_scopes_count: usize = args.0.iter().map(|group| group.user_scopes.len()).sum();
        let write = tokio::spawn(async move {
            let entry_lists: Vec<Vec<AccessRuleEntry>> = args.0.iter().map(group_entries).collect();
            let results = join_all(
                entry_lists
                    .iter()
                    .map(|entries| storage.insert_rules(entries)),
            )
            .await;
            let outcome: Result<Vec<String>, crate::storage::RulesStorageError> = results
                .into_iter()
                .collect::<Result<Vec<Vec<String>>, _>>()
                .map(|ids| ids.concat());
            match outcome {
                Ok(inserted) => {
                    log.info(|| {
                        LogRecord::msg("Endpoint inserted access rules").with_data(json!({
                            "userScopesCount": user_scopes_count,
                            "insertedCount": inserted.len(),
                            "uniqueIdsCount": unique(inserted.clone()).len(),
                        }))
                    });
                    ApiEndpointResponse::new(ApiEndpointResponseStatus::Success)
                }
                Err(error) => {
                    if log.get_log_level() == LogLevel::Debug {
                        log.error(|| {
                            LogRecord::msg("Failed to insert access rules")
                                .with_err(prosopo_logger::ErrorObject::from_std_error(&error))
                        });
                    }
                    ApiEndpointResponse::new(ApiEndpointResponseStatus::Fail)
                }
            }
        });
        match tokio::time::timeout(INSERT_TIMEOUT, write).await {
            Ok(Ok(response)) => Ok(response),
            Ok(Err(join_error)) => Err(Box::new(join_error)),
            Err(_) => Ok(ApiEndpointResponse::new(
                ApiEndpointResponseStatus::Processing,
            )),
        }
    }
}

/// `FetchRulesOptions`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FetchRulesOptions {
    pub ids: Vec<String>,
}
validated_by!(FetchRulesOptions, object(vec![("ids", string().array())]));

pub struct FetchRulesEndpoint {
    storage: SharedStorage,
    logger: Logger,
}

impl FetchRulesEndpoint {
    pub fn new(storage: SharedStorage, logger: Logger) -> FetchRulesEndpoint {
        FetchRulesEndpoint { storage, logger }
    }
}

impl ApiEndpoint for FetchRulesEndpoint {
    type Args = FetchRulesOptions;

    async fn process_request(
        &self,
        args: FetchRulesOptions,
        logger: Option<&Logger>,
    ) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: &Logger = logger.unwrap_or(&self.logger);
        let entries: Vec<AccessRuleEntry> = self.storage.fetch_rules(&args.ids).await?;
        log.info(|| {
            LogRecord::msg("Endpoint fetched rules").with_data(json!({
                "requestedCount": args.ids.len(),
                "foundCount": entries.len(),
            }))
        });
        Ok(success(json!({ "ruleEntries": entries })))
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct RuleFilters(pub Vec<AccessRulesFilterInput>);
validated_by!(RuleFilters, array(access_rules_filter_input()));

pub struct FindRuleIdsEndpoint {
    storage: SharedStorage,
    logger: Logger,
}

impl FindRuleIdsEndpoint {
    pub fn new(storage: SharedStorage, logger: Logger) -> FindRuleIdsEndpoint {
        FindRuleIdsEndpoint { storage, logger }
    }
}

impl ApiEndpoint for FindRuleIdsEndpoint {
    type Args = RuleFilters;

    async fn process_request(
        &self,
        args: RuleFilters,
        logger: Option<&Logger>,
    ) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: &Logger = logger.unwrap_or(&self.logger);
        let mut ids: Vec<String> = Vec::new();
        for input in &args.0 {
            for filter in get_access_rule_filters_from_input(input) {
                ids.extend(self.storage.find_rule_ids(&filter, false).await);
            }
        }
        let unique_ids: Vec<String> = unique(ids.clone());
        log.info(|| {
            LogRecord::msg("Endpoint found rules").with_data(json!({
                "totalFoundCount": ids.len(),
                "uniqueFoundCount": unique_ids.len(),
                "searchFilters": args.0,
                "foundIds": unique_ids,
            }))
        });
        Ok(success(json!({ "ruleIds": unique_ids })))
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct MissingIds(pub Vec<String>);
validated_by!(MissingIds, string().array());

pub struct GetMissingIdsEndpoint {
    storage: SharedStorage,
    logger: Logger,
}

impl GetMissingIdsEndpoint {
    pub fn new(storage: SharedStorage, logger: Logger) -> GetMissingIdsEndpoint {
        GetMissingIdsEndpoint { storage, logger }
    }
}

impl ApiEndpoint for GetMissingIdsEndpoint {
    type Args = MissingIds;

    async fn process_request(
        &self,
        args: MissingIds,
        logger: Option<&Logger>,
    ) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: &Logger = logger.unwrap_or(&self.logger);
        let missing: Vec<String> = self.storage.get_missing_rule_ids(&args.0).await?;
        log.info(|| {
            LogRecord::msg("Endpoint checked missing ids").with_data(json!({
                "idsToCheck": args.0.len(),
                "missingIds": missing.len(),
            }))
        });
        Ok(success(json!({ "ids": missing })))
    }
}

pub struct DeleteRulesEndpoint {
    storage: SharedStorage,
    logger: Logger,
}

impl DeleteRulesEndpoint {
    pub fn new(storage: SharedStorage, logger: Logger) -> DeleteRulesEndpoint {
        DeleteRulesEndpoint { storage, logger }
    }
}

impl ApiEndpoint for DeleteRulesEndpoint {
    type Args = RuleFilters;

    async fn process_request(
        &self,
        args: RuleFilters,
        logger: Option<&Logger>,
    ) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: &Logger = logger.unwrap_or(&self.logger);
        let mut deleted: usize = 0;
        for input in &args.0 {
            for filter in get_access_rule_filters_from_input(input) {
                let ids: Vec<String> = unique(self.storage.find_rule_ids(&filter, false).await);
                if !ids.is_empty() {
                    self.storage.delete_rules(&ids).await?;
                    deleted += ids.len();
                    log.info(|| {
                        LogRecord::msg("Endpoint deleted rules")
                            .with_data(json!({ "rulesFilterInput": input, "uniqueRuleIds": ids }))
                    });
                }
            }
        }
        Ok(success(json!({ "deleted_count": deleted })))
    }
}

/// `DeleteSiteGroup`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteSiteGroup {
    pub client_ids: Vec<String>,
    pub group_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct DeleteSiteGroups(pub Vec<DeleteSiteGroup>);
validated_by!(
    DeleteSiteGroups,
    array(object(vec![
        ("clientIds", string().array()),
        ("groupId", string())
    ]))
);

pub struct DeleteRuleGroupsEndpoint {
    storage: SharedStorage,
    logger: Logger,
}

impl DeleteRuleGroupsEndpoint {
    pub fn new(storage: SharedStorage, logger: Logger) -> DeleteRuleGroupsEndpoint {
        DeleteRuleGroupsEndpoint { storage, logger }
    }
}

impl ApiEndpoint for DeleteRuleGroupsEndpoint {
    type Args = DeleteSiteGroups;

    async fn process_request(
        &self,
        args: DeleteSiteGroups,
        logger: Option<&Logger>,
    ) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let log: &Logger = logger.unwrap_or(&self.logger);
        let filters: Vec<AccessRulesFilter> = args
            .0
            .iter()
            .flat_map(|group: &DeleteSiteGroup| {
                group
                    .client_ids
                    .iter()
                    .map(|client_id: &String| AccessRulesFilter {
                        policy_scope: Some(PolicyScope {
                            client_id: Some(client_id.clone()),
                        }),
                        policy_scope_match: Some(FilterScopeMatch::Exact),
                        group_id: Some(group.group_id.clone()),
                        ..AccessRulesFilter::default()
                    })
            })
            .collect();
        let found: Vec<Vec<String>> = join_all(
            filters
                .iter()
                .map(|filter| self.storage.find_rule_ids(filter, false)),
        )
        .await;
        let ids: Vec<String> = unique(found.concat());
        if !ids.is_empty() {
            self.storage.delete_rules(&ids).await?;
        }
        log.info(|| {
            LogRecord::msg("Endpoint deleted rule groups")
                .with_data(json!({ "args": args.0, "uniqueRuleIds": ids }))
        });
        Ok(success(json!({ "deleted_count": ids.len() })))
    }
}

pub struct DeleteAllRulesEndpoint {
    storage: SharedStorage,
    logger: Logger,
}

impl DeleteAllRulesEndpoint {
    pub fn new(storage: SharedStorage, logger: Logger) -> DeleteAllRulesEndpoint {
        DeleteAllRulesEndpoint { storage, logger }
    }
}

impl ApiEndpoint for DeleteAllRulesEndpoint {
    type Args = NoArgs;

    /// The TS endpoint takes its logger in the place of the arguments, so it always logs
    /// through its own; so does this one.
    async fn process_request(
        &self,
        _args: NoArgs,
        _logger: Option<&Logger>,
    ) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let deleted: usize = self.storage.delete_all_rules().await?;
        self.logger.info(|| {
            LogRecord::msg("Endpoint deleted all access rules")
                .with_data(json!({ "deletedCount": deleted }))
        });
        Ok(success(json!({ "deleted_count": deleted })))
    }
}

/// Re-inserts each batch of rules, so every key is recomputed by the current hash.
struct RehashBatch<'a> {
    storage: &'a SharedStorage,
    logger: &'a Logger,
}

impl RuleIdBatchHandler for RehashBatch<'_> {
    fn handle(&mut self, rule_ids: Vec<String>) -> BoxFuture<'_, crate::storage::Result<()>> {
        Box::pin(async move {
            let log: &Logger = self.logger;
            log.info(|| {
                LogRecord::msg("Fetched rule ids batch")
                    .with_data(json!({ "count": rule_ids.len(), "ruleIds": rule_ids }))
            });
            let entries: Vec<AccessRuleEntry> = self.storage.fetch_rules(&rule_ids).await?;
            log.info(|| {
                LogRecord::msg("Fetched rules").with_data(json!({ "count": entries.len() }))
            });
            if entries.len() != rule_ids.len() {
                log.warn(|| {
                    LogRecord::msg("Fetched rules count is not equal to the requested count")
                        .with_data(json!({
                            "fetchedCount": entries.len(),
                            "requestedCount": rule_ids.len(),
                        }))
                });
            }
            self.storage.delete_rules(&rule_ids).await?;
            log.info(|| {
                LogRecord::msg("Deleted rules").with_data(json!({ "count": rule_ids.len() }))
            });
            self.storage.insert_rules(&entries).await?;
            log.info(|| {
                LogRecord::msg("Inserted rules").with_data(json!({ "count": entries.len() }))
            });
            Ok(())
        })
    }
}

pub struct RehashRulesEndpoint {
    storage: SharedStorage,
    logger: Logger,
}

impl RehashRulesEndpoint {
    pub fn new(storage: SharedStorage, logger: Logger) -> RehashRulesEndpoint {
        RehashRulesEndpoint { storage, logger }
    }
}

impl ApiEndpoint for RehashRulesEndpoint {
    type Args = NoArgs;

    /// Logs through its own logger, as the TS endpoint does (see [`DeleteAllRulesEndpoint`]).
    async fn process_request(
        &self,
        _args: NoArgs,
        _logger: Option<&Logger>,
    ) -> Result<ApiEndpointResponse, ApiEndpointError> {
        let mut handler: RehashBatch<'_> = RehashBatch {
            storage: &self.storage,
            logger: &self.logger,
        };
        self.storage.fetch_all_rule_ids(&mut handler).await?;
        Ok(success(json!({})))
    }
}

/// `accessRuleApiPaths`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum AccessRuleApiPath {
    DeleteAll,
    DeleteGroups,
    DeleteMany,
    FetchMany,
    FindIds,
    GetMissingIds,
    InsertMany,
    RehashAll,
}

impl AccessRuleApiPath {
    pub const fn path(self) -> &'static str {
        match self {
            AccessRuleApiPath::DeleteAll => "/v1/prosopo/user-access-policy/rules/delete-all",
            AccessRuleApiPath::DeleteGroups => "/v1/prosopo/user-access-policy/rules/delete-groups",
            AccessRuleApiPath::DeleteMany => "/v1/prosopo/user-access-policy/rules/delete-many",
            AccessRuleApiPath::FetchMany => "/v1/prosopo/user-access-policy/rules/fetch-many",
            AccessRuleApiPath::FindIds => "/v1/prosopo/user-access-policy/rules/find-ids",
            AccessRuleApiPath::GetMissingIds => {
                "/v1/prosopo/user-access-policy/rules/get-missing-ids"
            }
            AccessRuleApiPath::InsertMany => "/v1/prosopo/user-access-policy/rules/insert-many",
            AccessRuleApiPath::RehashAll => "/v1/prosopo/user-access-policy/rules/rehash-all",
        }
    }

    /// The TS member name, which the rate-limit variables are named after.
    pub const fn name(self) -> &'static str {
        match self {
            AccessRuleApiPath::DeleteAll => "DELETE_ALL",
            AccessRuleApiPath::DeleteGroups => "DELETE_GROUPS",
            AccessRuleApiPath::DeleteMany => "DELETE_MANY",
            AccessRuleApiPath::FetchMany => "FETCH_MANY",
            AccessRuleApiPath::FindIds => "FIND_IDS",
            AccessRuleApiPath::GetMissingIds => "GET_MISSING_IDS",
            AccessRuleApiPath::InsertMany => "INSERT_MANY",
            AccessRuleApiPath::RehashAll => "REHASH_ALL",
        }
    }
}

impl RouteKey for AccessRuleApiPath {
    const ALL: &'static [AccessRuleApiPath] = &[
        AccessRuleApiPath::DeleteAll,
        AccessRuleApiPath::DeleteGroups,
        AccessRuleApiPath::DeleteMany,
        AccessRuleApiPath::FetchMany,
        AccessRuleApiPath::FindIds,
        AccessRuleApiPath::GetMissingIds,
        AccessRuleApiPath::InsertMany,
        AccessRuleApiPath::RehashAll,
    ];

    fn route_key(self) -> Cow<'static, str> {
        Cow::Borrowed(self.path())
    }
}

/// `AccessRuleApiRoutes`.
pub struct AccessRuleApiRoutes {
    storage: SharedStorage,
    logger: Logger,
}

impl AccessRuleApiRoutes {
    pub fn new(storage: SharedStorage, logger: Logger) -> AccessRuleApiRoutes {
        AccessRuleApiRoutes { storage, logger }
    }
}

impl ApiRoutesProvider for AccessRuleApiRoutes {
    fn get_routes(&self) -> ApiRoutes {
        let storage = || self.storage.clone();
        let logger = || self.logger.clone();
        let mut routes: ApiRoutes = ApiRoutes::new();
        routes.insert(
            AccessRuleApiPath::DeleteAll.path().to_string(),
            Arc::new(DeleteAllRulesEndpoint::new(storage(), logger())),
        );
        routes.insert(
            AccessRuleApiPath::DeleteGroups.path().to_string(),
            Arc::new(DeleteRuleGroupsEndpoint::new(storage(), logger())),
        );
        routes.insert(
            AccessRuleApiPath::DeleteMany.path().to_string(),
            Arc::new(DeleteRulesEndpoint::new(storage(), logger())),
        );
        routes.insert(
            AccessRuleApiPath::FetchMany.path().to_string(),
            Arc::new(FetchRulesEndpoint::new(storage(), logger())),
        );
        routes.insert(
            AccessRuleApiPath::FindIds.path().to_string(),
            Arc::new(FindRuleIdsEndpoint::new(storage(), logger())),
        );
        routes.insert(
            AccessRuleApiPath::GetMissingIds.path().to_string(),
            Arc::new(GetMissingIdsEndpoint::new(storage(), logger())),
        );
        routes.insert(
            AccessRuleApiPath::InsertMany.path().to_string(),
            Arc::new(InsertRulesEndpoint::new(storage(), logger())),
        );
        routes.insert(
            AccessRuleApiPath::RehashAll.path().to_string(),
            Arc::new(RehashRulesEndpoint::new(storage(), logger())),
        );
        routes
    }
}

const DEFAULT_LIMIT: u64 = 5;
const DEFAULT_WINDOW_MS: u64 = 10 * 1_000;

/// `parseInt` of the variable when it is an integer other than zero. A negative one, which
/// the TS would pass on to express-rate-limit, falls back to the default.
fn int_variable(env: &dyn Fn(&str) -> Option<String>, name: &str) -> Option<u64> {
    let value: String = env(name).filter(|value: &String| !value.is_empty())?;
    let parsed: f64 = prosopo_util::parse_int(&value, 0);
    (parsed.is_finite() && parsed >= 1.0).then_some(parsed as u64)
}

/// `getExpressApiRuleRateLimits`: `PROSOPO_USER_ACCESS_POLICY_RULE_<NAME>_WINDOW` and
/// `..._LIMIT` per route, read through `env`.
pub fn get_api_rule_rate_limits(
    env: &dyn Fn(&str) -> Option<String>,
) -> ApiRouteLimits<AccessRuleApiPath> {
    ApiRouteLimits::new(|route: AccessRuleApiPath| ApiRouteLimit {
        window_ms: int_variable(
            env,
            &format!("PROSOPO_USER_ACCESS_POLICY_RULE_{}_WINDOW", route.name()),
        )
        .unwrap_or(DEFAULT_WINDOW_MS),
        limit: int_variable(
            env,
            &format!("PROSOPO_USER_ACCESS_POLICY_RULE_{}_LIMIT", route.name()),
        )
        .unwrap_or(DEFAULT_LIMIT),
    })
}

/// [`get_api_rule_rate_limits`] from the process environment.
pub fn get_api_rule_rate_limits_from_env() -> ApiRouteLimits<AccessRuleApiPath> {
    get_api_rule_rate_limits(&|name: &str| std::env::var(name).ok())
}
