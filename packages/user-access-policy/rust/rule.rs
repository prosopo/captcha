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

//! The access rule model (src/rule.ts). The TS type is flat because Redis hashes are; the
//! Rust one groups the same fields, and serialises them flat, in the order the TS parses
//! them.

use num_bigint::BigInt;
use prosopo_types::{CaptchaType, JsNumber, ResultReason};
use serde::{Deserialize, Serialize};

pub use prosopo_types::AccessPolicyType;

/// Stamped on the Redis `clientId` field of a global rule, so the read path can probe
/// `@clientId:{global}` rather than `ismissing(@clientId)`. Read back as no client.
pub const GLOBAL_CLIENT_SCOPE_SENTINEL: &str = "global";

/// What a rule's `solvedImagesCount` sets. The TS keeps two quantities in that one field: an
/// image captcha's number of rounds, and for a puzzle a severity the provider maps onto a
/// puzzle difficulty. Which one it is follows from the rule's `captchaType`; a rule that
/// pins no type is read against whichever challenge is served. Stored and sent as the one
/// field, as before.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ChallengeLevel {
    ImageRounds(JsNumber),
    PuzzleSeverity(JsNumber),
    /// No `captchaType`, or one the field means nothing for (pow ranks on `powDifficulty`).
    Unpinned(JsNumber),
}

impl ChallengeLevel {
    fn new(captcha_type: Option<CaptchaType>, value: JsNumber) -> ChallengeLevel {
        match captcha_type {
            Some(CaptchaType::Image) => ChallengeLevel::ImageRounds(value),
            Some(CaptchaType::Puzzle) => ChallengeLevel::PuzzleSeverity(value),
            _ => ChallengeLevel::Unpinned(value),
        }
    }

    /// The number as stored in `solvedImagesCount`.
    pub fn stored_value(self) -> JsNumber {
        match self {
            ChallengeLevel::ImageRounds(value)
            | ChallengeLevel::PuzzleSeverity(value)
            | ChallengeLevel::Unpinned(value) => value,
        }
    }
}

/// `AccessPolicy`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(from = "AccessPolicyFields", into = "AccessPolicyFields")]
pub struct AccessPolicy {
    pub kind: AccessPolicyType,
    pub captcha_type: Option<CaptchaType>,
    pub description: Option<String>,
    pub challenge_level: Option<ChallengeLevel>,
    /// The share of image panels that must be solved per image captcha.
    pub image_threshold: Option<JsNumber>,
    pub pow_difficulty: Option<JsNumber>,
    /// How many unsolved image captchas to serve.
    pub unsolved_images_count: Option<JsNumber>,
    /// Added to the user's frictionless score.
    pub frictionless_score: Option<JsNumber>,
    /// A Block that fires at verify instead of at the request-time middleware.
    pub defer_to_verify: Option<bool>,
    /// Replaces "Forbidden" in the 403 body of a matched Block.
    pub message_key: Option<ResultReason>,
}

impl AccessPolicy {
    pub fn new(kind: AccessPolicyType) -> AccessPolicy {
        AccessPolicy {
            kind,
            captcha_type: None,
            description: None,
            challenge_level: None,
            image_threshold: None,
            pow_difficulty: None,
            unsolved_images_count: None,
            frictionless_score: None,
            defer_to_verify: None,
            message_key: None,
        }
    }

    /// `solvedImagesCount`, as stored.
    pub fn solved_images_count(&self) -> Option<JsNumber> {
        self.challenge_level.map(ChallengeLevel::stored_value)
    }
}

/// The stored and wire form of [`AccessPolicy`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AccessPolicyFields {
    #[serde(rename = "type")]
    kind: AccessPolicyType,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    captcha_type: Option<CaptchaType>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    solved_images_count: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    image_threshold: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pow_difficulty: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    unsolved_images_count: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    frictionless_score: Option<JsNumber>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    defer_to_verify: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    message_key: Option<ResultReason>,
}

impl From<AccessPolicyFields> for AccessPolicy {
    fn from(fields: AccessPolicyFields) -> AccessPolicy {
        AccessPolicy {
            kind: fields.kind,
            captcha_type: fields.captcha_type,
            description: fields.description,
            challenge_level: fields
                .solved_images_count
                .map(|value: JsNumber| ChallengeLevel::new(fields.captcha_type, value)),
            image_threshold: fields.image_threshold,
            pow_difficulty: fields.pow_difficulty,
            unsolved_images_count: fields.unsolved_images_count,
            frictionless_score: fields.frictionless_score,
            defer_to_verify: fields.defer_to_verify,
            message_key: fields.message_key,
        }
    }
}

impl From<AccessPolicy> for AccessPolicyFields {
    fn from(policy: AccessPolicy) -> AccessPolicyFields {
        AccessPolicyFields {
            solved_images_count: policy.solved_images_count(),
            kind: policy.kind,
            captcha_type: policy.captcha_type,
            description: policy.description,
            image_threshold: policy.image_threshold,
            pow_difficulty: policy.pow_difficulty,
            unsolved_images_count: policy.unsolved_images_count,
            frictionless_score: policy.frictionless_score,
            defer_to_verify: policy.defer_to_verify,
            message_key: policy.message_key,
        }
    }
}

/// Big integers serialise as their decimal text: the form the API sends them in
/// (`stringifyBigInts`) and Redis stores them in.
pub(crate) mod decimal {
    use num_bigint::BigInt;
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S: Serializer>(
        value: &Option<BigInt>,
        serializer: S,
    ) -> Result<S::Ok, S::Error> {
        match value {
            Some(value) => serializer.serialize_str(&value.to_string()),
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(
        deserializer: D,
    ) -> Result<Option<BigInt>, D::Error> {
        Option::<String>::deserialize(deserializer)?
            .map(|text: String| text.parse::<BigInt>().map_err(serde::de::Error::custom))
            .transpose()
    }
}

/// `UserIp` and `UserAttributes`: what a rule matches a request on, and what a request is
/// described by.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserScope {
    #[serde(default, skip_serializing_if = "Option::is_none", with = "decimal")]
    pub numeric_ip: Option<BigInt>,
    #[serde(default, skip_serializing_if = "Option::is_none", with = "decimal")]
    pub numeric_ip_mask_min: Option<BigInt>,
    #[serde(default, skip_serializing_if = "Option::is_none", with = "decimal")]
    pub numeric_ip_mask_max: Option<BigInt>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ja4_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub headers_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_agent_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub head_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub coords: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub country_code: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub asn: Option<JsNumber>,
    /// A `classifyOs` name, matched exactly.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub os: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub browser: Option<String>,
    /// Always [`crate::HEADER_RULE_MARKER`] on a header rule; the condition itself is
    /// `header_name`, `header_value` and `header_operator`, checked in code.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub header_match: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub header_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub header_value: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub header_operator: Option<String>,
    /// The canonical Web Bot Auth Signature-Agent URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub web_bot_auth_agent: Option<String>,
}

/// `AccessRule`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessRule {
    #[serde(flatten)]
    pub policy: AccessPolicy,
    /// The site key; none for a global rule.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,
    /// Clients a global rule does not apply to. Ignored on client rules.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub excluded_client_ids: Option<Vec<String>>,
    #[serde(flatten)]
    pub scope: UserScope,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group_id: Option<String>,
}

impl AccessRule {
    pub fn new(policy: AccessPolicy) -> AccessRule {
        AccessRule {
            policy,
            client_id: None,
            excluded_client_ids: None,
            scope: UserScope::default(),
            group_id: None,
        }
    }
}

/// One defined field of a rule, as JS sees its value.
#[derive(Debug, Clone, PartialEq)]
pub enum RuleValue<'a> {
    Text(&'a str),
    Number(f64),
    Boolean(bool),
    Big(&'a BigInt),
    List(&'a [String]),
}

impl AccessRule {
    /// `Object.entries(rule)` without the undefined ones, in the order the TS parses them.
    pub fn entries(&self) -> Vec<(&'static str, RuleValue<'_>)> {
        let policy: &AccessPolicy = &self.policy;
        let scope: &UserScope = &self.scope;
        fn text(value: &Option<String>) -> Option<RuleValue<'_>> {
            value.as_deref().map(RuleValue::Text)
        }
        fn number(value: Option<JsNumber>) -> Option<RuleValue<'static>> {
            value.map(|n: JsNumber| RuleValue::Number(n.get()))
        }
        fn big(value: &Option<BigInt>) -> Option<RuleValue<'_>> {
            value.as_ref().map(RuleValue::Big)
        }
        let candidates: [(&'static str, Option<RuleValue<'_>>); 30] = [
            ("type", Some(RuleValue::Text(policy.kind.as_str()))),
            (
                "captchaType",
                policy
                    .captcha_type
                    .map(|t: CaptchaType| RuleValue::Text(t.as_str())),
            ),
            ("description", text(&policy.description)),
            ("solvedImagesCount", number(policy.solved_images_count())),
            ("imageThreshold", number(policy.image_threshold)),
            ("powDifficulty", number(policy.pow_difficulty)),
            ("unsolvedImagesCount", number(policy.unsolved_images_count)),
            ("frictionlessScore", number(policy.frictionless_score)),
            (
                "deferToVerify",
                policy.defer_to_verify.map(RuleValue::Boolean),
            ),
            (
                "messageKey",
                policy
                    .message_key
                    .map(|r: ResultReason| RuleValue::Text(r.as_str())),
            ),
            ("clientId", text(&self.client_id)),
            (
                "excludedClientIds",
                self.excluded_client_ids.as_deref().map(RuleValue::List),
            ),
            ("numericIp", big(&scope.numeric_ip)),
            ("numericIpMaskMin", big(&scope.numeric_ip_mask_min)),
            ("numericIpMaskMax", big(&scope.numeric_ip_mask_max)),
            ("userId", text(&scope.user_id)),
            ("ja4Hash", text(&scope.ja4_hash)),
            ("headersHash", text(&scope.headers_hash)),
            ("userAgentHash", text(&scope.user_agent_hash)),
            ("headHash", text(&scope.head_hash)),
            ("coords", text(&scope.coords)),
            ("countryCode", text(&scope.country_code)),
            ("asn", number(scope.asn)),
            ("os", text(&scope.os)),
            ("browser", text(&scope.browser)),
            ("headerMatch", text(&scope.header_match)),
            ("headerName", text(&scope.header_name)),
            ("headerValue", text(&scope.header_value)),
            ("headerOperator", text(&scope.header_operator)),
            ("webBotAuthAgent", text(&scope.web_bot_auth_agent)),
        ];
        let mut entries: Vec<(&'static str, RuleValue<'_>)> = candidates
            .into_iter()
            .filter_map(|(key, value)| value.map(|value| (key, value)))
            .collect();
        if let Some(group_id) = self.group_id.as_deref() {
            entries.push(("groupId", RuleValue::Text(group_id)));
        }
        entries
    }
}
