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

//! The rule hash and the rule ↔ record transforms (src/transformRule.ts).

use crate::record::AccessRuleRecord;
use crate::rule::{AccessRule, RuleValue, GLOBAL_CLIENT_SCOPE_SENTINEL};
use md5::{Digest, Md5};
use num_bigint::BigInt;
use num_traits::ToPrimitive;
use prosopo_types::{CaptchaType, JsNumber};
use prosopo_util::{Address4, Address6};
use prosopo_util_crypto::code_unit_cmp;
use prosopo_util_crypto::js::{js_number_to_string, json_stringify_number, json_stringify_string};
use prosopo_web_bot_auth::normalise_signature_agent_url;
use std::fmt;

/// `String(value)`.
pub(crate) fn js_string(value: &RuleValue<'_>) -> String {
    match value {
        RuleValue::Text(text) => text.to_string(),
        RuleValue::Number(n) => js_number_to_string(*n),
        RuleValue::Boolean(flag) => flag.to_string(),
        RuleValue::Big(big) => big.to_string(),
        RuleValue::List(items) => items.join(","),
    }
}

/// `JSON.stringify(value)` with bigints written as strings.
fn json_value(value: &RuleValue<'_>) -> String {
    match value {
        RuleValue::Text(text) => json_stringify_string(text),
        RuleValue::Number(n) => json_stringify_number(*n),
        RuleValue::Boolean(flag) => flag.to_string(),
        RuleValue::Big(big) => json_stringify_string(&big.to_string()),
        RuleValue::List(items) => format!(
            "[{}]",
            items
                .iter()
                .map(|item: &String| json_stringify_string(item))
                .collect::<Vec<String>>()
                .join(",")
        ),
    }
}

/// `makeAccessRuleHash`: the rule's Redis key. md5 of `JSON.stringify` over its defined
/// fields, sorted the way `.sort()` sorts `[key, value]` pairs (by their `"key,value"` text).
/// Exclusions are left out, so changing who a global rule spares rewrites the same key.
pub fn make_access_rule_hash(rule: &AccessRule) -> String {
    let mut entries: Vec<(&'static str, RuleValue<'_>)> = rule
        .entries()
        .into_iter()
        .filter(|(key, _)| *key != "excludedClientIds")
        .collect();
    entries.sort_by(|(a_key, a_value), (b_key, b_value)| {
        code_unit_cmp(
            &format!("{a_key},{}", js_string(a_value)),
            &format!("{b_key},{}", js_string(b_value)),
        )
    });
    let body: Vec<String> = entries
        .iter()
        .map(|(key, value)| format!("{}:{}", json_stringify_string(key), json_value(value)))
        .collect();
    hex::encode(Md5::digest(format!("{{{}}}", body.join(",")).as_bytes()))
}

/// Why `transformAccessRuleIntoRecord` refused a rule.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RecordError {
    /// A field its schema rejects (the TS throws a `ZodError`).
    Invalid(&'static str),
    /// An IP the address libraries cannot represent (an `AddressError` or cidr-calc `Error`).
    Address(String),
}

impl fmt::Display for RecordError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RecordError::Invalid(field) => write!(f, "invalid {field}"),
            RecordError::Address(message) => f.write_str(message),
        }
    }
}

impl std::error::Error for RecordError {}

/// `toClientIdList` then `array(string().min(1).regex(/^[^,]+$/)).optional()`.
fn record_exclusions(ids: &Option<Vec<String>>) -> Result<Option<Vec<String>>, RecordError> {
    match ids {
        Some(ids) if ids.is_empty() => Ok(None),
        Some(ids)
            if ids
                .iter()
                .any(|id: &String| id.is_empty() || id.contains(',')) =>
        {
            Err(RecordError::Invalid("excludedClientIds"))
        }
        other => Ok(other.clone()),
    }
}

fn record_number(
    value: Option<JsNumber>,
    field: &'static str,
) -> Result<Option<JsNumber>, RecordError> {
    match value {
        Some(n) if n.get().is_nan() => Err(RecordError::Invalid(field)),
        other => Ok(other),
    }
}

/// `transformAccessRuleIntoRecord`: what the rule's schema accepts, with the IP triple
/// written back as `ip` / `ipMask` and the user agent hash as `userAgent`.
pub fn transform_access_rule_into_record(
    rule: &AccessRule,
) -> Result<AccessRuleRecord, RecordError> {
    let policy = &rule.policy;
    if policy
        .captcha_type
        .is_some_and(|t: CaptchaType| !t.is_selectable())
    {
        return Err(RecordError::Invalid("captchaType"));
    }
    let numbers: [(Option<JsNumber>, &'static str); 5] = [
        (policy.solved_images_count(), "solvedImagesCount"),
        (policy.image_threshold, "imageThreshold"),
        (policy.pow_difficulty, "powDifficulty"),
        (policy.unsolved_images_count, "unsolvedImagesCount"),
        (policy.frictionless_score, "frictionlessScore"),
    ];
    for (value, field) in numbers {
        record_number(value, field)?;
    }
    let scope = &rule.scope;
    if let Some(asn) = scope.asn {
        let asn: f64 = asn.get();
        if asn.is_nan() || asn.fract() != 0.0 || !asn.is_finite() || asn < 0.0 {
            return Err(RecordError::Invalid("asn"));
        }
    }
    let web_bot_auth_agent: Option<String> = match &scope.web_bot_auth_agent {
        Some(raw) => Some(
            normalise_signature_agent_url(raw)
                .map_err(|_| RecordError::Invalid("webBotAuthAgent"))?,
        ),
        None => None,
    };
    let excluded_client_ids: Option<Vec<String>> = record_exclusions(&rule.excluded_client_ids)?;
    let ip: Option<String> = scope.numeric_ip.as_ref().map(ip_from_numeric).transpose()?;
    let ip_mask: Option<String> = match (&scope.numeric_ip_mask_min, &scope.numeric_ip_mask_max) {
        (Some(min), Some(max)) => cidr_from_numeric_ip_range(min, max)?,
        _ => None,
    };
    Ok(AccessRuleRecord {
        policy: policy.clone(),
        client_id: rule
            .client_id
            .clone()
            .filter(|id: &String| id != GLOBAL_CLIENT_SCOPE_SENTINEL),
        excluded_client_ids,
        user_id: scope.user_id.clone(),
        ja4_hash: scope.ja4_hash.clone(),
        headers_hash: scope.headers_hash.clone(),
        head_hash: scope.head_hash.clone(),
        coords: scope.coords.clone(),
        country_code: scope.country_code.clone(),
        asn: scope.asn,
        os: scope.os.clone(),
        browser: scope.browser.clone(),
        header_match: scope.header_match.clone(),
        header_name: scope.header_name.clone(),
        header_value: scope.header_value.clone(),
        header_operator: scope.header_operator.clone(),
        web_bot_auth_agent,
        rule_group_id: rule.group_id.clone(),
        user_agent: scope.user_agent_hash.clone(),
        ip,
        ip_mask,
    })
}

const MAX_IPV4_NUMERIC: u128 = u32::MAX as u128;

/// `getStringIpFromNumeric`: dotted for anything up to 2^32 - 1, IPv6 above.
fn ip_from_numeric(value: &BigInt) -> Result<String, RecordError> {
    match value.to_u128() {
        Some(n) if n > MAX_IPV4_NUMERIC => Ok(Address6::from_big_int(n).correct_form()),
        Some(n) => Address4::from_big_int(n)
            .map(|address: Address4| address.address().to_string())
            .map_err(|error| RecordError::Address(error.message().to_string())),
        None if value > &BigInt::from(MAX_IPV4_NUMERIC) => Err(RecordError::Address(
            "IPv6 BigInt must be in the range 0 to 2**128 - 1".to_string(),
        )),
        None => Err(RecordError::Address(
            "IPv4 integer must be in the range 0 to 2**32 - 1".to_string(),
        )),
    }
}

/// An address as cidr-calc parses it back from `ip_from_numeric`'s text.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CidrAddress {
    V4(u32),
    V6(u128),
}

impl CidrAddress {
    fn of(text: &str) -> CidrAddress {
        match text.parse::<std::net::Ipv4Addr>() {
            Ok(address) => CidrAddress::V4(u32::from(address)),
            Err(_) => CidrAddress::V6(u128::from(
                text.parse::<std::net::Ipv6Addr>()
                    .expect("ip_from_numeric writes a valid address"),
            )),
        }
    }
}

/// The prefix length of the largest CIDR block that starts at `start` and ends at or before
/// `end`, for `bits`-wide addresses (`findPrefixLengthOfMaxStartingCidr`).
fn max_starting_prefix(start: u128, end: u128, bits: u32) -> u32 {
    let trailing_zeros: u32 = if start == 0 {
        bits
    } else {
        start.trailing_zeros()
    };
    let differing: u128 = start ^ end;
    let leading_equal: u32 = if differing == 0 {
        bits
    } else {
        differing.leading_zeros() - (128 - bits)
    };
    let mut host_bits_allowed: u32 = bits - leading_equal;
    let trailing_ones: u32 = (!end).trailing_zeros().min(bits);
    if trailing_ones < host_bits_allowed {
        host_bits_allowed -= 1;
    }
    bits - trailing_zeros.min(host_bits_allowed)
}

/// cidr-calc's IPv6 short notation: the first longest run of two or more zero groups
/// becomes `::`.
fn short_v6(value: u128) -> String {
    let groups: Vec<u16> = (0..8).map(|i| (value >> (112 - 16 * i)) as u16).collect();
    let mut best: Option<(usize, usize)> = None;
    let mut index: usize = 0;
    while index < 8 {
        if groups[index] == 0 {
            let run_end: usize = (index..8).find(|i| groups[*i] != 0).unwrap_or(8);
            let length: usize = run_end - index;
            if length >= 2 && best.is_none_or(|(_, best_length)| length > best_length) {
                best = Some((index, length));
            }
            index = run_end;
        } else {
            index += 1;
        }
    }
    let hex = |range: &[u16]| {
        range
            .iter()
            .map(|g: &u16| format!("{g:x}"))
            .collect::<Vec<String>>()
            .join(":")
    };
    match best {
        None => hex(&groups),
        Some((start, length)) => format!(
            "{}::{}",
            hex(&groups[..start]),
            hex(&groups[start + length..])
        ),
    }
}

/// `getCidrFromNumericIpRange`: the first CIDR block of the range, as cidr-calc's
/// `IpRange(...).toCidrs()[0]` gives it.
pub fn cidr_from_numeric_ip_range(
    start: &BigInt,
    end: &BigInt,
) -> Result<Option<String>, RecordError> {
    let start: CidrAddress = CidrAddress::of(&ip_from_numeric(start)?);
    let end: CidrAddress = CidrAddress::of(&ip_from_numeric(end)?);
    match (start, end) {
        (CidrAddress::V4(start), CidrAddress::V4(end)) if start <= end => {
            let prefix: u32 = max_starting_prefix(u128::from(start), u128::from(end), 32);
            Ok(Some(format!(
                "{}/{prefix}",
                std::net::Ipv4Addr::from(start)
            )))
        }
        (CidrAddress::V6(start), CidrAddress::V6(end)) if start <= end => {
            let prefix: u32 = max_starting_prefix(start, end, 128);
            Ok(Some(format!("{}/{prefix}", short_v6(start))))
        }
        (CidrAddress::V4(_), CidrAddress::V4(_)) | (CidrAddress::V6(_), CidrAddress::V6(_)) => {
            Err(RecordError::Address(
                "Start IP address must not be greater than end IP address".to_string(),
            ))
        }
        _ => Err(RecordError::Address(
            "Start and end IP addresses must both be IPv4 or IPv6".to_string(),
        )),
    }
}
