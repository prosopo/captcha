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

//! User access policy: access rules kept in Redis, matched against requests, and managed
//! through an admin API.

pub mod api;
mod input;
mod matching;
mod record;
pub mod redis;
mod rule;
mod storage;
mod transform;

pub use input::{
    access_policy_input, access_policy_input_shape, access_rule_input, access_rules_filter_input,
    excluded_client_ids_input, get_access_rule_filters_from_input, parse_access_rule,
    policy_scope_exclusions_input, policy_scope_input, rule_entry_input, user_scope_input,
    AccessRulesFilterInput, USER_SCOPE_FIELDS,
};
pub use matching::{
    access_rule_header_matches, classify_browser, classify_os, decode_header_value_list,
    describe_matched_rule, encode_header_value_list, evaluate_header_condition, BrowserName,
    HeaderOperator, OsName, HEADER_RULE_MARKER,
};
pub use record::{AccessRuleRecord, USER_SCOPE_RECORD_FIELDS};
pub use rule::{
    AccessPolicy, AccessPolicyType, AccessRule, ChallengeLevel, RuleValue, UserScope,
    GLOBAL_CLIENT_SCOPE_SENTINEL,
};
pub use storage::{
    AccessRuleEntry, AccessRulesFilter, AccessRulesReader, AccessRulesStorage, AccessRulesWriter,
    BoxFuture, FilterScopeMatch, PolicyScope, RuleIdBatchHandler, RulesStorageError,
};
pub use transform::{
    cidr_from_numeric_ip_range, make_access_rule_hash, transform_access_rule_into_record,
    RecordError,
};

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod live;
#[cfg(test)]
mod tests;
