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

//! The record form of a rule (src/ruleRecord.ts): what an operator types, with the IP range
//! as `ip` / `ipMask` text and the raw user agent rather than its hash.

use crate::rule::AccessPolicy;
use prosopo_types::JsNumber;
use serde::{Deserialize, Serialize};

/// `userScopeRecordFields`, in their TS order.
pub const USER_SCOPE_RECORD_FIELDS: [&str; 17] = [
    "userId",
    "ja4Hash",
    "headersHash",
    "userAgent",
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
    "ip",
    "ipMask",
];

/// `AccessRuleRecord`, serialised in the order `transformAccessRuleIntoRecord` builds it.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessRuleRecord {
    #[serde(flatten)]
    pub policy: AccessPolicy,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub excluded_client_ids: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ja4_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub headers_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub head_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub coords: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub country_code: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub asn: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub os: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub browser: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub header_match: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub header_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub header_value: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub header_operator: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub web_bot_auth_agent: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rule_group_id: Option<String>,
    /// The rule's `userAgentHash`, stored under the name the operator typed it as.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_agent: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,
    /// CIDR notation, e.g. `127.0.0.1/24`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ip_mask: Option<String>,
}

impl AccessRuleRecord {
    /// A scope field by its `USER_SCOPE_RECORD_FIELDS` name, as `String(value)`.
    pub fn scope_field(&self, field: &str) -> Option<String> {
        let text = |value: &Option<String>| value.clone();
        match field {
            "userId" => text(&self.user_id),
            "ja4Hash" => text(&self.ja4_hash),
            "headersHash" => text(&self.headers_hash),
            "userAgent" => text(&self.user_agent),
            "headHash" => text(&self.head_hash),
            "coords" => text(&self.coords),
            "countryCode" => text(&self.country_code),
            "asn" => self
                .asn
                .map(|asn: JsNumber| prosopo_util_crypto::js::js_number_to_string(asn.get())),
            "os" => text(&self.os),
            "browser" => text(&self.browser),
            "headerMatch" => text(&self.header_match),
            "headerName" => text(&self.header_name),
            "headerValue" => text(&self.header_value),
            "headerOperator" => text(&self.header_operator),
            "webBotAuthAgent" => text(&self.web_bot_auth_agent),
            "ip" => text(&self.ip),
            "ipMask" => text(&self.ip_mask),
            _ => None,
        }
    }

    /// `getUserScopeRecordFromAccessRuleRecord`: the defined scope fields, in
    /// `USER_SCOPE_RECORD_FIELDS` order, as strings.
    pub fn user_scope_record(&self) -> Vec<(&'static str, String)> {
        USER_SCOPE_RECORD_FIELDS
            .iter()
            .filter_map(|field: &&'static str| self.scope_field(field).map(|value| (*field, value)))
            .collect()
    }
}
