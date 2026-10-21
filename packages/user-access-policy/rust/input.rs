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

//! The rule schemas (src/ruleInput): what Redis records and API bodies are parsed with.
//! Built on `prosopo_api_route::schema`, so they accept, reject and output what the zod ones
//! do. Where a TS transform throws (an IP the address library rejects), the Rust schema
//! reports an issue instead.

use crate::rule::{AccessPolicyType, AccessRule, UserScope, GLOBAL_CLIENT_SCOPE_SENTINEL};
use crate::storage::{AccessRulesFilter, FilterScopeMatch, PolicyScope};
use prosopo_api_route::schema::{
    array, boolean, coerce_bigint, coerce_number, coerce_string, native_enum, object, preprocess,
    string, Data, IssueData, RefinementContext, Schema,
};
use prosopo_api_route::{Validate, ValidationError, ValidationIssue};
use prosopo_types::{selectable_captcha_type_schema, ResultReason};
use prosopo_util::{get_ip_address, Address4, Address6};
use prosopo_web_bot_auth::normalise_signature_agent_url;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};
use std::sync::LazyLock;

fn custom_issue(path: &str, message: impl Into<String>) -> IssueData {
    IssueData::code("custom")
        .with("path", json!([path]))
        .with("message", message.into())
}

/// The object a transform was given, which its schema guarantees is one.
fn object_of(data: Data) -> Map<String, Value> {
    match data {
        Some(Value::Object(map)) => map,
        _ => Map::new(),
    }
}

/// `accessPolicyInputShape`, without the write-time refinement: records written before it
/// landed must still parse.
pub fn access_policy_input_shape() -> Vec<(&'static str, Schema)> {
    vec![
        ("type", AccessPolicyType::schema()),
        ("captchaType", selectable_captcha_type_schema().optional()),
        ("description", coerce_string().optional()),
        ("solvedImagesCount", coerce_number().optional()),
        ("imageThreshold", coerce_number().optional()),
        ("powDifficulty", coerce_number().optional()),
        ("unsolvedImagesCount", coerce_number().optional()),
        ("frictionlessScore", coerce_number().optional()),
        (
            "deferToVerify",
            preprocess(
                |data: Data, _: &mut RefinementContext<'_>| match data {
                    Some(Value::String(text)) => Some(Value::Bool(text == "true")),
                    other => other,
                },
                boolean(),
            )
            .optional(),
        ),
        ("messageKey", ResultReason::schema().optional()),
    ]
}

/// `accessPolicyInput`: rejects a Block that pins a captcha type or a round count, since
/// Block applies to every captcha type.
pub fn access_policy_input() -> Schema {
    object(access_policy_input_shape()).super_refine(|data: &Data, ctx: &mut RefinementContext<'_>| {
        let Some(Value::Object(policy)) = data else { return };
        if policy.get("type") != Some(&json!(AccessPolicyType::Block.as_str())) {
            return;
        }
        if policy.get("captchaType").is_some_and(|value: &Value| !value.is_null()) {
            ctx.add_issue(custom_issue(
                "captchaType",
                "Block policies cannot pin a captchaType — Block always applies to every captcha type. Use a Restrict policy if you want to narrow the effect to one captcha type.",
            ));
        }
        if policy.get("solvedImagesCount").is_some_and(|value: &Value| !value.is_null()) {
            ctx.add_issue(custom_issue(
                "solvedImagesCount",
                "Block policies cannot set solvedImagesCount — the field only applies to Restrict policies that adjust image-captcha rounds.",
            ));
        }
    })
}

/// `policyScopeInput`. The `global` sentinel stamped on global rules reads back as no client.
pub fn policy_scope_input() -> Schema {
    object(vec![(
        "clientId",
        preprocess(
            |data: Data, _: &mut RefinementContext<'_>| match data {
                Some(Value::String(text)) if text == GLOBAL_CLIENT_SCOPE_SENTINEL => None,
                other => other,
            },
            coerce_string().optional(),
        ),
    )])
}

/// `excludedClientIds`: a list, or the comma-joined text Redis stores; an empty list is none.
pub fn excluded_client_ids_input() -> Schema {
    preprocess(
        |data: Data, _: &mut RefinementContext<'_>| {
            let list: Data = match data {
                Some(Value::String(text)) => Some(Value::Array(
                    text.split(',')
                        .filter(|id: &&str| !id.is_empty())
                        .map(|id: &str| Value::String(id.to_string()))
                        .collect(),
                )),
                other => other,
            };
            match list {
                Some(Value::Array(items)) if items.is_empty() => None,
                other => other,
            }
        },
        array(string().min(1.0).regex_with_message(
            |id: &str| !id.is_empty() && !id.contains(','),
            "Client ids cannot contain a comma.",
        ))
        .optional(),
    )
}

pub fn policy_scope_exclusions_input() -> Schema {
    object(vec![("excludedClientIds", excluded_client_ids_input())])
}

fn user_attributes_shape() -> Vec<(&'static str, Schema)> {
    vec![
        ("userId", coerce_string().optional()),
        ("ja4Hash", coerce_string().optional()),
        ("headersHash", coerce_string().optional()),
        ("userAgentHash", coerce_string().optional()),
        ("headHash", coerce_string().optional()),
        ("coords", coerce_string().optional()),
        ("countryCode", coerce_string().optional()),
        ("asn", coerce_number().int().nonnegative().optional()),
        ("os", coerce_string().optional()),
        ("browser", coerce_string().optional()),
        ("headerMatch", coerce_string().optional()),
        ("headerName", coerce_string().optional()),
        ("headerValue", coerce_string().optional()),
        ("headerOperator", coerce_string().optional()),
        (
            "webBotAuthAgent",
            coerce_string()
                .url()
                .transform(|data: Data, ctx: &mut RefinementContext<'_>| {
                    let Some(Value::String(raw)) = &data else {
                        return data;
                    };
                    match normalise_signature_agent_url(raw) {
                        Ok(normalised) => Some(Value::String(normalised)),
                        Err(_) => {
                            ctx.add_issue(IssueData::code("custom").with("message", "Invalid url"));
                            data
                        }
                    }
                })
                .optional(),
        ),
    ]
}

fn user_ip_shape() -> Vec<(&'static str, Schema)> {
    vec![
        ("numericIp", coerce_bigint().optional()),
        ("numericIpMaskMin", coerce_bigint().optional()),
        ("numericIpMaskMax", coerce_bigint().optional()),
    ]
}

/// The fields of `userScopeSchema`, in its order: the ones a strict query accounts for.
pub const USER_SCOPE_FIELDS: [&str; 18] = [
    "numericIp",
    "numericIpMaskMin",
    "numericIpMaskMax",
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
    "headerMatch",
    "headerName",
    "headerValue",
    "headerOperator",
    "webBotAuthAgent",
];

fn hex_sha256(text: &str) -> String {
    hex::encode(Sha256::digest(text.as_bytes()))
}

fn user_attributes_input() -> Schema {
    let mut shape: Vec<(&'static str, Schema)> = user_attributes_shape();
    shape.push(("userAgent", coerce_string().optional()));
    object(shape).transform(|data: Data, _: &mut RefinementContext<'_>| {
        let mut scope: Map<String, Value> = object_of(data);
        if let Some(Value::String(user_agent)) = scope.shift_remove("userAgent") {
            scope.insert(
                "userAgentHash".to_string(),
                Value::String(hex_sha256(&user_agent)),
            );
        }
        Some(Value::Object(scope))
    })
}

/// `ipMask` as the range it covers: IPv4 CIDR if `Address4` accepts it, else IPv6.
fn ip_mask_range(mask: &str) -> Result<(u128, u128), String> {
    if Address4::is_valid(mask) {
        let address: Address4 = Address4::new(mask).map_err(|e| e.message().to_string())?;
        return Ok((
            address.start_address_big_int(),
            address.end_address_big_int(),
        ));
    }
    let address: Address6 = Address6::new(mask).map_err(|e| e.message().to_string())?;
    Ok((
        address.start_address_big_int(),
        address.end_address_big_int(),
    ))
}

fn user_ip_input() -> Schema {
    let mut shape: Vec<(&'static str, Schema)> = user_ip_shape();
    shape.push(("ip", string().optional()));
    shape.push(("ipMask", string().optional()));
    object(shape).transform(|data: Data, ctx: &mut RefinementContext<'_>| {
        let mut scope: Map<String, Value> = object_of(data);
        let ip: Option<Value> = scope.shift_remove("ip");
        let ip_mask: Option<Value> = scope.shift_remove("ipMask");
        if let Some(Value::String(ip)) = ip {
            match get_ip_address(&ip) {
                Ok(address) => {
                    scope.insert(
                        "numericIp".to_string(),
                        Value::String(address.big_int().to_string()),
                    );
                }
                Err(error) => ctx.add_issue(custom_issue("ip", error.message())),
            }
        }
        if let Some(Value::String(mask)) = ip_mask {
            match ip_mask_range(&mask) {
                Ok((min, max)) => {
                    scope.insert(
                        "numericIpMaskMin".to_string(),
                        Value::String(min.to_string()),
                    );
                    scope.insert(
                        "numericIpMaskMax".to_string(),
                        Value::String(max.to_string()),
                    );
                }
                Err(message) => ctx.add_issue(custom_issue("ipMask", message)),
            }
        }
        Some(Value::Object(scope))
    })
}

/// `userScopeInput`: a scope in record form (`ip`, `ipMask`, raw `userAgent`) or rule form.
pub fn user_scope_input() -> Schema {
    object(vec![])
        .and(user_ip_input())
        .and(user_attributes_input())
}

fn rule_group_input() -> Schema {
    object(vec![
        ("groupId", coerce_string().optional()),
        ("ruleGroupId", coerce_string().optional()),
    ])
    .transform(|data: Data, _: &mut RefinementContext<'_>| {
        let mut group: Map<String, Value> = object_of(data);
        if let Some(Value::String(id)) = group.shift_remove("ruleGroupId") {
            group.insert("groupId".to_string(), Value::String(id));
        }
        Some(Value::Object(group))
    })
}

/// `accessRuleInput`: a rule from a Redis record or a record-form rule.
pub fn access_rule_input() -> Schema {
    let mut shape: Vec<(&'static str, Schema)> = access_policy_input_shape();
    shape.extend(vec![
        ("clientId", policy_scope_input().shape().remove(0).1),
        ("excludedClientIds", excluded_client_ids_input()),
    ]);
    object(shape)
        .and(user_scope_input())
        .and(rule_group_input())
}

/// `ruleEntryInput`.
pub fn rule_entry_input() -> Schema {
    object(vec![
        ("rule", access_rule_input()),
        ("expiresUnixTimestamp", coerce_number().optional()),
    ])
}

fn filter_scope_match() -> Schema {
    native_enum(&FilterScopeMatch::ALL.map(FilterScopeMatch::as_str))
}

/// `accessRulesFilterInput`.
pub fn access_rules_filter_input() -> Schema {
    object(vec![
        ("policyScope", policy_scope_input().optional()),
        ("policyScopes", array(policy_scope_input()).optional()),
        (
            "policyScopeMatch",
            filter_scope_match().default(FilterScopeMatch::Exact.as_str()),
        ),
        ("userScope", user_scope_input().optional()),
        (
            "userScopeMatch",
            filter_scope_match().default(FilterScopeMatch::Exact.as_str()),
        ),
        ("groupId", string().optional()),
        ("blockOnly", boolean().optional()),
        ("includeDeferred", boolean().optional()),
    ])
}

fn parse_with<T: serde::de::DeserializeOwned>(
    schema: &Schema,
    input: Option<&Value>,
) -> Result<T, ValidationError> {
    let output: Value = schema.validate(input)?;
    serde_json::from_value(output)
        .map_err(|error| ValidationIssue::custom(Vec::new(), error.to_string()).into())
}

static ACCESS_RULE_INPUT: LazyLock<Schema> = LazyLock::new(access_rule_input);

/// `transformAccessRuleRecordIntoRule` and the reader's record parse: a Redis hash, or a
/// record-form rule, as a rule.
pub fn parse_access_rule(input: &Value) -> Result<AccessRule, ValidationError> {
    parse_with(&ACCESS_RULE_INPUT, Some(input))
}

/// `AccessRulesFilterInput`: a filter with any number of policy scopes.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessRulesFilterInput {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub policy_scope: Option<PolicyScope>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub policy_scopes: Option<Vec<PolicyScope>>,
    pub policy_scope_match: FilterScopeMatch,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_scope: Option<UserScope>,
    pub user_scope_match: FilterScopeMatch,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub block_only: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub include_deferred: Option<bool>,
}

impl Validate for AccessRulesFilterInput {
    fn validate(input: Option<&Value>) -> Result<Value, ValidationError> {
        static SCHEMA: LazyLock<Schema> = LazyLock::new(access_rules_filter_input);
        SCHEMA.validate(input)
    }
}

/// `getAccessRuleFiltersFromInput`: one filter per policy scope (`policyScope` last), or the
/// filter as it is when there are none.
pub fn get_access_rule_filters_from_input(
    input: &AccessRulesFilterInput,
) -> Vec<AccessRulesFilter> {
    let base = AccessRulesFilter {
        policy_scope: None,
        policy_scope_match: Some(input.policy_scope_match),
        user_scope: input.user_scope.clone(),
        user_scope_match: Some(input.user_scope_match),
        group_id: input.group_id.clone(),
        block_only: input.block_only,
        include_deferred: input.include_deferred,
    };
    let mut scopes: Vec<PolicyScope> = input.policy_scopes.clone().unwrap_or_default();
    if let Some(scope) = &input.policy_scope {
        scopes.push(scope.clone());
    }
    if scopes.is_empty() {
        return vec![base];
    }
    scopes
        .into_iter()
        .map(|scope: PolicyScope| AccessRulesFilter {
            policy_scope: Some(scope),
            ..base.clone()
        })
        .collect()
}
