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

//! provider/matchedAccessRule.ts, and the access policy type it records. The TS keeps
//! `AccessPolicyType` in user-access-policy; it is here so this crate can name it without
//! depending on that one.

use crate::captcha_type::CaptchaType;
use serde::{Deserialize, Serialize};

crate::wire_enum! {
    /// `AccessPolicyType`.
    pub enum AccessPolicyType {
        Block: "Block" = "block",
        Restrict: "Restrict" = "restrict",
        /// A matching request skips the challenge and gets an authenticated session.
        Allow: "Allow" = "allow",
    }
}

/// `MatchedRuleCondition`: one populated scope field of the rule, in record form.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MatchedRuleCondition {
    pub field: String,
    pub value: String,
    /// Set when `value` was clipped.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub truncated: Option<bool>,
}

/// `MatchedAccessRule`: the rule that fired, stored on the record it acted on.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchedAccessRule {
    pub rule_hash: String,
    pub policy_type: AccessPolicyType,
    pub conditions: Vec<MatchedRuleCondition>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub captcha_type: Option<CaptchaType>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub defer_to_verify: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rule_group_id: Option<String>,
    /// Absent for global rules.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,
}
