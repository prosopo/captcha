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

//! What a request is matched on beyond the Redis query: the matched-rule snapshot
//! (src/matchedRule.ts), header conditions (src/headerMatch.ts) and the User-Agent
//! classifiers (src/classifyOs.ts, src/classifyBrowser.ts).

use crate::rule::AccessRule;
use crate::transform::{make_access_rule_hash, transform_access_rule_into_record};
use prosopo_types::{MatchedAccessRule, MatchedRuleCondition};
use prosopo_util_crypto::JsonValue;
use regex::Regex;
use std::collections::HashMap;
use std::sync::LazyLock;

/// A `coords` polygon serialises unbounded; the snapshot is copied onto every record the rule
/// acts on, so a condition value is capped.
const MAX_CONDITION_VALUE_LENGTH: usize = 256;

fn to_condition(field: &str, value: String) -> Option<MatchedRuleCondition> {
    let units: Vec<u16> = value.encode_utf16().collect();
    match units.len() {
        0 => None,
        length if length > MAX_CONDITION_VALUE_LENGTH => Some(MatchedRuleCondition {
            field: field.to_string(),
            value: format!(
                "{}…",
                String::from_utf16_lossy(&units[..MAX_CONDITION_VALUE_LENGTH])
            ),
            truncated: Some(true),
        }),
        _ => Some(MatchedRuleCondition {
            field: field.to_string(),
            value,
            truncated: None,
        }),
    }
}

/// `describeMatchedRule`: the rule, snapshotted for the record it acted on. A rule the record
/// transform refuses still describes itself, without conditions.
pub fn describe_matched_rule(rule: &AccessRule) -> MatchedAccessRule {
    let conditions: Vec<MatchedRuleCondition> = transform_access_rule_into_record(rule)
        .map(|record| {
            record
                .user_scope_record()
                .into_iter()
                .filter_map(|(field, value)| to_condition(field, value))
                .collect()
        })
        .unwrap_or_default();
    MatchedAccessRule {
        rule_hash: make_access_rule_hash(rule),
        policy_type: rule.policy.kind,
        conditions,
        description: rule.policy.description.clone(),
        captcha_type: rule.policy.captcha_type,
        defer_to_verify: rule.policy.defer_to_verify,
        rule_group_id: rule.group_id.clone(),
        client_id: rule.client_id.clone(),
    }
}

prosopo_types::wire_enum! {
    /// `HeaderOperator`. `equals` / `contains` block on a match; the `not` forms block when
    /// the header does not match, or is absent, which is how an allow-list is written. The
    /// `Any` forms take a list of values (see [`encode_header_value_list`]).
    pub enum HeaderOperator {
        Equals: "equals" = "equals",
        Contains: "contains" = "contains",
        NotEquals: "notEquals" = "notEquals",
        NotContains: "notContains" = "notContains",
        NotEqualsAny: "notEqualsAny" = "notEqualsAny",
        NotContainsAny: "notContainsAny" = "notContainsAny",
    }
}

/// Carried by every request's user scope and every header rule, so header rules stay
/// candidates; their condition is then checked by [`access_rule_header_matches`].
pub const HEADER_RULE_MARKER: &str = "1";

/// `String.prototype.trimStart`.
fn js_trim_start(value: &str) -> &str {
    value.trim_start_matches(|c: char| {
        matches!(
            c,
            '\u{0009}'..='\u{000D}'
                | '\u{0020}'
                | '\u{00A0}'
                | '\u{1680}'
                | '\u{2000}'..='\u{200A}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202F}'
                | '\u{205F}'
                | '\u{3000}'
                | '\u{FEFF}'
        )
    })
}

/// `encodeHeaderValueList`: JSON, since any separator could occur inside a header value.
pub fn encode_header_value_list(values: &[String]) -> String {
    serde_json::to_string(values).expect("strings serialise")
}

/// `decodeHeaderValueList`: a value not starting with `[` is a list of itself. A value that
/// looks list-encoded but is not a non-empty list of strings is `None`: a malformed rule that
/// must not fire.
pub fn decode_header_value_list(value: &str) -> Option<Vec<String>> {
    if !js_trim_start(value).starts_with('[') {
        return Some(vec![value.to_string()]);
    }
    match prosopo_util_crypto::json_parse(value).ok()? {
        JsonValue::Array(items) if !items.is_empty() => items
            .into_iter()
            .map(|item: JsonValue| match item {
                JsonValue::String(text) => Some(text),
                _ => None,
            })
            .collect(),
        _ => None,
    }
}

/// `evaluateHeaderCondition`: whether a Block carrying this condition fires. `headers` is
/// keyed by lower-cased name.
pub fn evaluate_header_condition(
    header_name: &str,
    operator: HeaderOperator,
    value: &str,
    headers: &HashMap<String, String>,
) -> bool {
    let actual: Option<&str> = headers.get(&header_name.to_lowercase()).map(String::as_str);
    match operator {
        HeaderOperator::Equals => actual == Some(value),
        HeaderOperator::Contains => actual.is_some_and(|actual: &str| actual.contains(value)),
        HeaderOperator::NotEquals => actual != Some(value),
        HeaderOperator::NotContains => !actual.is_some_and(|actual: &str| actual.contains(value)),
        HeaderOperator::NotEqualsAny => match decode_header_value_list(value) {
            None => false,
            Some(values) => !actual.is_some_and(|actual: &str| values.iter().any(|v| v == actual)),
        },
        HeaderOperator::NotContainsAny => match decode_header_value_list(value) {
            None => false,
            Some(values) => !actual
                .is_some_and(|actual: &str| values.iter().any(|v| actual.contains(v.as_str()))),
        },
    }
}

/// `accessRuleHeaderMatches`: a rule without `headerName` has no header condition; one with
/// an unknown operator is malformed and never matches.
pub fn access_rule_header_matches(rule: &AccessRule, headers: &HashMap<String, String>) -> bool {
    let scope = &rule.scope;
    let Some(header_name) = &scope.header_name else {
        return true;
    };
    match scope
        .header_operator
        .as_deref()
        .and_then(|op| op.parse::<HeaderOperator>().ok())
    {
        Some(operator) => evaluate_header_condition(
            header_name,
            operator,
            scope.header_value.as_deref().unwrap_or(""),
            headers,
        ),
        None => false,
    }
}

prosopo_types::wire_enum! {
    /// `OsName`; `unknown` when nothing matches, so an allow-list can block it.
    pub enum OsName {
        Windows: "windows" = "windows",
        Macos: "macos" = "macos",
        Ios: "ios" = "ios",
        Android: "android" = "android",
        Linux: "linux" = "linux",
        Unknown: "unknown" = "unknown",
    }
}

prosopo_types::wire_enum! {
    /// `BrowserName`.
    pub enum BrowserName {
        Chrome: "chrome" = "chrome",
        Safari: "safari" = "safari",
        Firefox: "firefox" = "firefox",
        Edge: "edge" = "edge",
        Opera: "opera" = "opera",
        SamsungInternet: "samsung_internet" = "samsung_internet",
        Wechat: "wechat" = "wechat",
        Facebook: "facebook" = "facebook",
        Instagram: "instagram" = "instagram",
        Ie: "ie" = "ie",
        Unknown: "unknown" = "unknown",
    }
}

fn pattern(source: &str) -> Regex {
    Regex::new(source).expect("a valid pattern")
}

/// The classifiers' signatures, first match wins. JS `\b` is an ASCII word boundary, hence
/// `(?-u:\b)`.
static OS_SIGNATURES: LazyLock<[(Regex, OsName); 5]> = LazyLock::new(|| {
    [
        (pattern("iphone|ipad|ipod"), OsName::Ios),
        (pattern("android"), OsName::Android),
        (pattern("windows"), OsName::Windows),
        (pattern("macintosh|mac os"), OsName::Macos),
        (pattern("linux"), OsName::Linux),
    ]
});

static BROWSER_SIGNATURES: LazyLock<[(Regex, BrowserName); 10]> = LazyLock::new(|| {
    [
        (pattern(r"(?-u:\b)edg(?:e|a|ios)?/"), BrowserName::Edge),
        (pattern("samsungbrowser"), BrowserName::SamsungInternet),
        (pattern(r"(?-u:\b)opr/|opera"), BrowserName::Opera),
        (pattern("micromessenger"), BrowserName::Wechat),
        (pattern("fban|fbav|fbios"), BrowserName::Facebook),
        (pattern("instagram"), BrowserName::Instagram),
        (pattern("firefox|fxios"), BrowserName::Firefox),
        (pattern("msie|trident"), BrowserName::Ie),
        (
            pattern(r"(?-u:\b)chrome/|(?-u:\b)crios/"),
            BrowserName::Chrome,
        ),
        (pattern("safari/"), BrowserName::Safari),
    ]
});

/// `classifyOs`: from the User-Agent, which a client cannot drop as easily as client hints.
pub fn classify_os(user_agent: Option<&str>) -> OsName {
    let ua: String = user_agent.unwrap_or("").to_lowercase();
    OS_SIGNATURES
        .iter()
        .find(|(signature, _)| signature.is_match(&ua))
        .map_or(OsName::Unknown, |(_, name)| *name)
}

/// `classifyBrowser`. Order matters: every browser below Chrome also carries `chrome/`.
pub fn classify_browser(user_agent: Option<&str>) -> BrowserName {
    let ua: String = user_agent.unwrap_or("").to_lowercase();
    BROWSER_SIGNATURES
        .iter()
        .find(|(signature, _)| signature.is_match(&ua))
        .map_or(BrowserName::Unknown, |(_, name)| *name)
}
