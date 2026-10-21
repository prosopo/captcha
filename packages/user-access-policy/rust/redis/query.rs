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

//! RediSearch queries over the rules index (src/redis/reader/redisRulesQuery.ts and
//! redisRulesSplitQuery.ts). Clauses follow the user scope's fields in their schema order
//! where the TS follows the caller's key order; RediSearch's AND and OR do not depend on it.

use crate::input::USER_SCOPE_FIELDS;
use crate::rule::{AccessPolicyType, UserScope, GLOBAL_CLIENT_SCOPE_SENTINEL};
use crate::storage::{AccessRulesFilter, FilterScopeMatch, PolicyScope};
use num_bigint::BigInt;
use prosopo_types::JsNumber;
use prosopo_util_crypto::js::js_number_to_string;
use serde::Serialize;

/// `ismissing()` needs dialect 2.
pub const REDIS_QUERY_DIALECT: u32 = 2;

/// One user-scope field's value, as the query writes it.
#[derive(Debug, Clone, PartialEq)]
enum ScopeValue<'a> {
    Big(&'a BigInt),
    Number(JsNumber),
    Text(&'a str),
}

impl ScopeValue<'_> {
    fn text(&self) -> String {
        match self {
            ScopeValue::Big(value) => value.to_string(),
            ScopeValue::Number(value) => js_number_to_string(value.get()),
            ScopeValue::Text(value) => value.to_string(),
        }
    }
}

fn scope_value<'a>(scope: &'a UserScope, field: &str) -> Option<ScopeValue<'a>> {
    let text = |value: &'a Option<String>| value.as_deref().map(ScopeValue::Text);
    match field {
        "numericIp" => scope.numeric_ip.as_ref().map(ScopeValue::Big),
        "numericIpMaskMin" => scope.numeric_ip_mask_min.as_ref().map(ScopeValue::Big),
        "numericIpMaskMax" => scope.numeric_ip_mask_max.as_ref().map(ScopeValue::Big),
        "userId" => text(&scope.user_id),
        "ja4Hash" => text(&scope.ja4_hash),
        "headersHash" => text(&scope.headers_hash),
        "userAgentHash" => text(&scope.user_agent_hash),
        "headHash" => text(&scope.head_hash),
        "coords" => text(&scope.coords),
        "countryCode" => text(&scope.country_code),
        "asn" => scope.asn.map(ScopeValue::Number),
        "os" => text(&scope.os),
        "browser" => text(&scope.browser),
        "headerMatch" => text(&scope.header_match),
        "headerName" => text(&scope.header_name),
        "headerValue" => text(&scope.header_value),
        "headerOperator" => text(&scope.header_operator),
        "webBotAuthAgent" => text(&scope.web_bot_auth_agent),
        _ => None,
    }
}

/// Backslash-escapes the characters a RediSearch TAG query treats as syntax.
fn escape_tag_value(value: &str) -> String {
    const SPECIAL: &str = ",.<>{}[]\"':;!@#$%^&*()-+=~|/\\";
    let mut escaped: String = String::with_capacity(value.len());
    for c in value.chars() {
        if SPECIAL.contains(c) {
            escaped.push('\\');
        }
        escaped.push(c);
    }
    escaped
}

/// Only `coords` (JSON text) is escaped; NUMERIC fields take range syntax.
fn field_clause(field: &str, value: &ScopeValue<'_>) -> String {
    let text: String = value.text();
    match field {
        "asn" => format!("@{field}:[{text} {text}]"),
        "coords" => format!("@{field}:{{{}}}", escape_tag_value(&text)),
        _ => format!("@{field}:{{{text}}}"),
    }
}

/// `userIpQueries`: an exact IP or a mask range containing it, and the `ismissing()` set when
/// no IP field is given at all.
fn ip_clause(field: &str, scope: &UserScope) -> String {
    let ip: Option<&BigInt> = scope.numeric_ip.as_ref();
    let min: Option<&BigInt> = scope.numeric_ip_mask_min.as_ref();
    let max: Option<&BigInt> = scope.numeric_ip_mask_max.as_ref();
    match field {
        "numericIp" => match ip {
            Some(ip) => format!(
                "( @numericIp:[{ip} {ip}] | ( @numericIpMaskMin:[-inf {ip}] @numericIpMaskMax:[{ip} +inf] ) )"
            ),
            None if min.is_none() && max.is_none() => {
                "ismissing(@numericIp) ismissing(@numericIpMaskMin) ismissing(@numericIpMaskMax)".to_string()
            }
            None => String::new(),
        },
        "numericIpMaskMin" => match (ip, min, max) {
            (Some(_), _, _) | (None, None, None) => String::new(),
            (None, Some(min), _) => format!("@numericIpMaskMin:[-inf {min}]"),
            (None, None, Some(_)) => "ismissing(@numericIpMaskMin)".to_string(),
        },
        _ => match (ip, min, max) {
            (Some(_), _, _) | (None, None, None) => String::new(),
            (None, _, Some(max)) => format!("@numericIpMaskMax:[{max} +inf]"),
            (None, Some(_), None) => "ismissing(@numericIpMaskMax)".to_string(),
        },
    }
}

fn is_ip_field(field: &str) -> bool {
    matches!(field, "numericIp" | "numericIpMaskMin" | "numericIpMaskMax")
}

/// `getUserScopeQuery`: a clause per given field (OR-ed when greedy). Strict matching also
/// requires every field not given to be missing, appended after the given ones.
fn user_scope_query(
    scope: &UserScope,
    scope_match: Option<FilterScopeMatch>,
    matching_fields_only: bool,
) -> String {
    let greedy: bool = scope_match == Some(FilterScopeMatch::Greedy);
    let (mut fields, missing): (Vec<&str>, Vec<&str>) = USER_SCOPE_FIELDS
        .into_iter()
        .partition(|field: &&str| scope_value(scope, field).is_some());
    if matching_fields_only {
        fields.extend(missing);
    }
    let clauses: Vec<String> = fields
        .into_iter()
        .map(|field: &str| {
            if is_ip_field(field) {
                return ip_clause(field, scope);
            }
            match scope_value(scope, field) {
                Some(value) => field_clause(field, &value),
                None => format!("ismissing(@{field})"),
            }
        })
        .filter(|clause: &String| !clause.is_empty())
        .collect();
    clauses.join(if greedy { " | " } else { " " })
}

const GLOBAL_MATCH_CLAUSE_INNER: &str = "@clientId:{global} | ismissing(@clientId)";

fn policy_scope_query(
    scope: Option<&PolicyScope>,
    scope_match: Option<FilterScopeMatch>,
) -> String {
    let exact: bool = scope_match == Some(FilterScopeMatch::Exact);
    match scope.and_then(|scope: &PolicyScope| scope.client_id.as_deref()) {
        Some(client_id) if exact => format!("@clientId:{{{client_id}}}"),
        Some(client_id) => format!("( @clientId:{{{client_id}}} | {GLOBAL_MATCH_CLAUSE_INNER} )"),
        None if exact => format!("( {GLOBAL_MATCH_CLAUSE_INNER} )"),
        None => String::new(),
    }
}

/// The query an empty filter resolves to, matching every global rule; `findRules` refuses it.
pub const EMPTY_FILTER_QUERY: &str = "( @clientId:{global} | ismissing(@clientId) )";

/// `getBlockPoolClause`: the candidate pool for the hard-block callers. The union is grouped,
/// since `|` binds looser than the implicit AND.
pub fn get_block_pool_clause(include_deferred: bool) -> String {
    let block: &str = AccessPolicyType::Block.as_str();
    if include_deferred {
        format!("(@type:{{{block}}} | @deferToVerify:{{true}})")
    } else {
        format!("@type:{{{block}}} -@deferToVerify:{{true}}")
    }
}

/// `getRulesRedisQuery`.
pub fn get_rules_redis_query(filter: &AccessRulesFilter, matching_fields_only: bool) -> String {
    let mut parts: Vec<String> = Vec::new();
    if let Some(group_id) = filter
        .group_id
        .as_deref()
        .filter(|id: &&str| !id.is_empty())
    {
        parts.push(format!("@groupId:{{{group_id}}}"));
    }
    if filter.block_only == Some(true) {
        parts.push(get_block_pool_clause(filter.include_deferred == Some(true)));
    }
    let policy: String =
        policy_scope_query(filter.policy_scope.as_ref(), filter.policy_scope_match);
    if !policy.is_empty() {
        parts.push(policy);
    }
    if let Some(scope) = &filter.user_scope {
        if USER_SCOPE_FIELDS
            .iter()
            .any(|field: &&str| scope_value(scope, field).is_some())
        {
            let query: String =
                user_scope_query(scope, filter.user_scope_match, matching_fields_only);
            parts.push(format!("( {query} )"));
        }
    }
    if parts.is_empty() {
        "*".to_string()
    } else {
        parts.join(" ")
    }
}

/// One probe of the split query; `kind` labels it in logs.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct SubQuery {
    pub kind: String,
    pub query: String,
}

/// The scalar user-scope fields, each probed on its own index.
const SCALAR_USER_SCOPE_FIELDS: [&str; 10] = [
    "userId",
    "ja4Hash",
    "headersHash",
    "userAgentHash",
    "headHash",
    "coords",
    "countryCode",
    "asn",
    "os",
    "browser",
];

fn probes(scope: &UserScope, prefix: &str, label: &str) -> Vec<SubQuery> {
    let mut queries: Vec<SubQuery> = SCALAR_USER_SCOPE_FIELDS
        .iter()
        .filter_map(|field: &&str| {
            scope_value(scope, field).map(|value| SubQuery {
                kind: format!("{label}field:{field}"),
                query: format!("{prefix} {}", field_clause(field, &value)),
            })
        })
        .collect();
    if let Some(ip) = &scope.numeric_ip {
        queries.push(SubQuery {
            kind: format!("{label}ip:exact"),
            query: format!("{prefix} @numericIp:[{ip} {ip}]"),
        });
        queries.push(SubQuery {
            kind: format!("{label}ip:mask"),
            query: format!("{prefix} @numericIpMaskMin:[-inf {ip}] @numericIpMaskMax:[{ip} +inf]"),
        });
    }
    let none: Vec<String> = SCALAR_USER_SCOPE_FIELDS
        .iter()
        .chain(&["numericIp", "numericIpMaskMin", "numericIpMaskMax"])
        .map(|field: &&str| format!("ismissing(@{field})"))
        .collect();
    queries.push(SubQuery {
        kind: format!("{label}no-user-scope"),
        query: format!("{prefix} {}", none.join(" ")),
    });
    queries
}

/// `buildScopedRulesSubQueries`: one probe per populated field, the exact-IP and mask-range
/// probes, and a fall-through for rules that constrain no user field. With `include_deferred`
/// the probes run twice, for plain blocks and for deferred rules, so the two populations do
/// not share one candidate cap.
pub fn build_scoped_rules_sub_queries(
    scope: &UserScope,
    client_id: Option<&str>,
    block_only: bool,
    include_deferred: bool,
) -> Vec<SubQuery> {
    let scope_clause: String = match client_id {
        None => format!("( @clientId:{{{GLOBAL_CLIENT_SCOPE_SENTINEL}}} | ismissing(@clientId) )"),
        Some(client_id) => format!(
            "( @clientId:{{{client_id}}} | @clientId:{{{GLOBAL_CLIENT_SCOPE_SENTINEL}}} | ismissing(@clientId) )"
        ),
    };
    let pools: Vec<(&str, String)> = match (block_only, include_deferred) {
        (true, true) => vec![
            ("block:", format!("{} ", get_block_pool_clause(false))),
            ("deferred:", "@deferToVerify:{true} ".to_string()),
        ],
        (true, false) => vec![("", format!("{} ", get_block_pool_clause(false)))],
        (false, _) => vec![("", String::new())],
    };
    pools
        .iter()
        .flat_map(|(label, clause)| probes(scope, &format!("{clause}{scope_clause}"), label))
        .collect()
}
