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

//! Ports of the unit tests in src/tests, one test per TS case. The integration tests, which
//! need Redis Stack, are in live.rs.

use crate::*;
use num_bigint::BigInt;
use prosopo_types::{CaptchaType, JsNumber};
use serde_json::{json, Value};
use std::collections::HashMap;

fn rule(kind: AccessPolicyType) -> AccessRule {
    AccessRule::new(AccessPolicy::new(kind))
}

fn block() -> AccessRule {
    rule(AccessPolicyType::Block)
}

fn restrict() -> AccessRule {
    rule(AccessPolicyType::Restrict)
}

fn s(text: &str) -> Option<String> {
    Some(text.to_string())
}

fn n(value: f64) -> Option<JsNumber> {
    Some(JsNumber(value))
}

fn big(value: &str) -> Option<BigInt> {
    Some(value.parse().expect("a bigint"))
}

fn ipv4(address: &str) -> BigInt {
    BigInt::from(
        prosopo_util::Address4::new(address)
            .expect("an address")
            .big_int(),
    )
}

fn ipv6(address: &str) -> BigInt {
    BigInt::from(
        prosopo_util::Address6::new(address)
            .expect("an address")
            .big_int(),
    )
}

// Ported from src/tests/transformRule.unit.test.ts
mod transform_rule {
    use super::*;

    #[test]
    fn should_make_md5_rule_hash() {
        assert_eq!(
            make_access_rule_hash(&restrict()),
            "755f7123e8f766b6692218b1014b85ca"
        );
    }

    #[test]
    fn should_handle_bigint_rule_properties() {
        let mut rule: AccessRule = restrict();
        rule.scope.numeric_ip = big("100");
        assert_eq!(
            make_access_rule_hash(&rule),
            "ab3fea02b8ef3309fb3fa6f6f703c55a"
        );
    }

    /// The Rust struct has one field order, so the two TS key orders build the same rule.
    #[test]
    fn should_make_same_hash_for_same_values_regardless_of_properties_order() {
        let mut first: AccessRule = restrict();
        first.policy.description = s("description");
        let second: AccessRule =
            serde_json::from_value(json!({ "description": "description", "type": "restrict" }))
                .expect("a rule");
        assert_eq!(
            make_access_rule_hash(&first),
            "5ed2f7de7ba1c6acc617f9246f19d35b"
        );
        assert_eq!(
            make_access_rule_hash(&first),
            make_access_rule_hash(&second)
        );
    }

    #[test]
    fn should_include_asn_in_the_rule_hash() {
        let mut with_asn: AccessRule = block();
        with_asn.scope.asn = n(205016.0);
        assert_ne!(
            make_access_rule_hash(&block()),
            make_access_rule_hash(&with_asn)
        );
    }

    #[test]
    fn should_make_same_hash_for_undefined_and_missing_properties() {
        let with_undefined: AccessRule =
            serde_json::from_value(json!({ "type": "restrict", "description": null }))
                .expect("a rule");
        assert_eq!(
            make_access_rule_hash(&with_undefined),
            "755f7123e8f766b6692218b1014b85ca"
        );
        assert_eq!(
            make_access_rule_hash(&with_undefined),
            make_access_rule_hash(&restrict())
        );
    }

    #[test]
    fn should_leave_excluded_client_ids_out_of_the_hash_so_the_key_survives_a_list_change() {
        let mut unexcluded: AccessRule = block();
        unexcluded.scope.numeric_ip = big("100");
        let excluded: AccessRule = AccessRule {
            excluded_client_ids: Some(vec!["client-a".to_string(), "client-b".to_string()]),
            ..unexcluded.clone()
        };
        assert_eq!(
            make_access_rule_hash(&excluded),
            make_access_rule_hash(&unexcluded)
        );
    }

    fn common_properties() -> Value {
        json!({
            "type": "restrict",
            "captchaType": "frictionless",
            "description": "test",
            "solvedImagesCount": 1,
            "imageThreshold": 1,
            "powDifficulty": 1,
            "unsolvedImagesCount": 1,
            "frictionlessScore": 1,
            "deferToVerify": false,
            "messageKey": "API.TOO_MANY_LOCALHOST",
            "headersHash": "headersHash",
            "ja4Hash": "js4Hash",
            "clientId": "client",
            "userId": "user",
            "headHash": "headHash",
            "coords": "[[1,2]]",
            "countryCode": "US",
            "asn": 205016,
            "os": "macos",
            "browser": "firefox",
            "headerMatch": "1",
            "headerName": "x-test",
            "headerValue": "test",
            "headerOperator": "equals",
            "webBotAuthAgent": "https://signatures.openai.com",
            "excludedClientIds": ["other-client"],
        })
    }

    fn merged(extra: Value) -> Value {
        let mut value: Value = common_properties();
        let object = value.as_object_mut().expect("an object");
        for (key, item) in extra.as_object().expect("an object") {
            object.insert(key.clone(), item.clone());
        }
        value
    }

    const USER_AGENT_HASH: &str =
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

    #[test]
    fn should_transform_access_rule_record_into_rule() {
        let record: Value = merged(json!({
            "ruleGroupId": "ruleGroupId",
            "ipMask": "127.0.0.0/20",
            "ip": "127.0.0.0",
            "userAgent": "test",
            "unwantedProperty": "bloatware",
        }));
        let rule: AccessRule = parse_access_rule(&record).expect("parses");
        let expected: AccessRule = serde_json::from_value(merged(json!({
            "groupId": "ruleGroupId",
            "numericIp": "2130706432",
            "numericIpMaskMax": "2130710527",
            "numericIpMaskMin": "2130706432",
            "userAgentHash": USER_AGENT_HASH,
        })))
        .expect("a rule");
        assert_eq!(rule, expected);
    }

    #[test]
    fn should_transform_access_rule_into_record() {
        let rule: AccessRule = serde_json::from_value(merged(json!({
            "groupId": "ruleGroupId",
            "numericIp": "2130706432",
            "numericIpMaskMax": "2130710527",
            "numericIpMaskMin": "2130706432",
            "userAgentHash": USER_AGENT_HASH,
        })))
        .expect("a rule");
        let record: AccessRuleRecord = transform_access_rule_into_record(&rule).expect("a record");
        let expected: AccessRuleRecord = serde_json::from_value(merged(json!({
            "ruleGroupId": "ruleGroupId",
            "ipMask": "127.0.0.0/20",
            "ip": "127.0.0.0",
            "userAgent": USER_AGENT_HASH,
        })))
        .expect("a record");
        assert_eq!(record, expected);
    }

    #[test]
    fn should_throw_error_if_cannot_transform_access_rule_record_into_rule() {
        assert!(parse_access_rule(&json!({ "ip": "127.0.0.1", "userAgent": "test" })).is_err());
    }

    /// A rule without a `type` cannot be built in Rust; the closest the TS case can get is a
    /// record missing it, which is refused before any transform.
    #[test]
    fn should_throw_error_if_cannot_transform_access_rule_into_record() {
        assert!(serde_json::from_value::<AccessRule>(
            json!({ "ip": "127.0.0.1", "userAgent": "test" })
        )
        .is_err());
    }

    #[test]
    fn should_round_trip_an_ipv6_address_and_cidr_mask() {
        let record: Value =
            json!({ "type": "restrict", "ip": "2001:db8::1", "ipMask": "2001:db8::/32" });
        let rule: AccessRule = parse_access_rule(&record).expect("parses");
        let mask = prosopo_util::Address6::new("2001:db8::/32").expect("a mask");
        assert_eq!(rule.scope.numeric_ip, Some(ipv6("2001:db8::1")));
        assert_eq!(
            rule.scope.numeric_ip_mask_min,
            Some(BigInt::from(mask.start_address_big_int()))
        );
        assert_eq!(
            rule.scope.numeric_ip_mask_max,
            Some(BigInt::from(mask.end_address_big_int()))
        );
        let back: AccessRuleRecord = transform_access_rule_into_record(&rule).expect("a record");
        assert_eq!(
            back.ip.as_deref(),
            Some(
                prosopo_util::Address6::new("2001:db8::1")
                    .expect("an address")
                    .correct_form()
                    .as_str()
            )
        );
        assert_eq!(back.ip_mask.as_deref(), Some("2001:db8::/32"));
    }

    macro_rules! cidr_cases {
        ($parse:ident, $($name:ident: $cidr:literal, $start:literal, $end:literal;)+) => {
            $(
                #[test]
                fn $name() {
                    let cidr = cidr_from_numeric_ip_range(&$parse($start), &$parse($end)).expect("a range");
                    assert_eq!(cidr.as_deref(), Some($cidr));
                }
            )+
        };
    }

    cidr_cases! { ipv4,
        should_convert_slash_20: "127.0.0.0/20", "127.0.0.0", "127.0.15.255";
        should_convert_slash_24: "192.168.1.0/24", "192.168.1.0", "192.168.1.255";
        should_convert_slash_8: "10.0.0.0/8", "10.0.0.0", "10.255.255.255";
        should_convert_slash_12: "172.16.0.0/12", "172.16.0.0", "172.31.255.255";
        should_convert_slash_16: "192.168.0.0/16", "192.168.0.0", "192.168.255.255";
        should_convert_slash_25: "192.168.1.128/25", "192.168.1.128", "192.168.1.255";
        should_convert_slash_28: "10.20.30.0/28", "10.20.30.0", "10.20.30.15";
        should_convert_slash_32: "8.8.8.8/32", "8.8.8.8", "8.8.8.8";
        should_convert_slash_30: "203.0.113.0/30", "203.0.113.0", "203.0.113.3";
        should_convert_slash_26: "198.51.100.64/26", "198.51.100.64", "198.51.100.127";
    }

    cidr_cases! { ipv6,
        should_convert_ipv6_slash_32: "2001:db8::/32", "2001:db8::", "2001:db8:ffff:ffff:ffff:ffff:ffff:ffff";
        should_convert_ipv6_slash_64: "2001:db8::/64", "2001:db8::", "2001:db8::ffff:ffff:ffff:ffff";
        should_convert_ipv6_slash_10: "fe80::/10", "fe80::", "febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff";
    }
}

// Ported from src/tests/classifyOs.unit.test.ts and classifyBrowser.unit.test.ts
mod classify {
    use super::*;

    macro_rules! ua_cases {
        ($classify:ident, $($name:ident: $ua:literal => $expected:literal;)+) => {
            $(
                #[test]
                fn $name() {
                    assert_eq!($classify(Some($ua)).as_str(), $expected);
                }
            )+
        };
    }

    ua_cases! { classify_os,
        classifies_windows_10_chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" => "windows";
        classifies_macos_safari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15" => "macos";
        classifies_iphone_safari: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" => "ios";
        classifies_ipad_safari: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" => "ios";
        classifies_android_chrome: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36" => "android";
        classifies_linux_desktop_firefox: "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0" => "linux";
        os_prefers_ios_over_macos_when_the_ua_carries_both_signatures: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile" => "ios";
        os_prefers_android_over_linux_when_the_ua_carries_both_signatures: "Mozilla/5.0 (Linux; Android 14) Mobile" => "android";
        os_is_case_insensitive: "WINDOWS NT 10.0" => "windows";
        os_returns_unknown_for_an_unrecognised_user_agent: "curl/8.4.0" => "unknown";
        os_returns_unknown_for_an_empty_user_agent: "" => "unknown";
    }

    #[test]
    fn os_returns_unknown_for_an_undefined_user_agent() {
        assert_eq!(classify_os(None), OsName::Unknown);
    }

    #[test]
    fn os_only_ever_returns_a_value_from_os_names() {
        for ua in ["", "curl/8.4.0", "garbage", "Windows", "iPhone"] {
            assert!(OsName::ALL.contains(&classify_os(Some(ua))));
        }
    }

    ua_cases! { classify_browser,
        classifies_chrome_on_windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" => "chrome";
        classifies_chrome_on_ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1" => "chrome";
        classifies_safari_on_macos: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15" => "safari";
        classifies_firefox_on_linux: "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0" => "firefox";
        classifies_firefox_on_ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15" => "firefox";
        classifies_edge_on_windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0" => "edge";
        classifies_opera: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0" => "opera";
        classifies_samsung_internet: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36" => "samsung_internet";
        classifies_wechat_in_app_browser: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.42" => "wechat";
        classifies_facebook_in_app_browser: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/442.0.0]" => "facebook";
        classifies_instagram_in_app_browser: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.0 Android" => "instagram";
        classifies_internet_explorer_11: "Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko" => "ie";
        browser_returns_unknown_for_an_empty_user_agent: "" => "unknown";
        browser_returns_unknown_for_an_unrecognised_user_agent: "curl/8.4.0" => "unknown";
        does_not_classify_a_chrome_ua_as_safari: "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" => "chrome";
        does_not_classify_an_edge_ua_as_chrome: "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0" => "edge";
        does_not_classify_a_samsung_internet_ua_as_chrome: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36" => "samsung_internet";
        browser_is_case_insensitive: "MOZILLA/5.0 FIREFOX/120.0" => "firefox";
    }

    #[test]
    fn browser_returns_unknown_for_an_undefined_user_agent() {
        assert_eq!(classify_browser(None), BrowserName::Unknown);
    }

    #[test]
    fn browser_only_ever_returns_a_value_from_browser_names() {
        for ua in ["", "curl/8.4.0", "garbage", "Firefox/1", "Chrome/1"] {
            assert!(BrowserName::ALL.contains(&classify_browser(Some(ua))));
        }
    }
}

// Ported from src/tests/headerMatch.unit.test.ts
mod header_match {
    use super::*;

    fn headers(entries: &[(&str, &str)]) -> HashMap<String, String> {
        entries
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    fn list(values: &[&str]) -> String {
        encode_header_value_list(
            &values
                .iter()
                .map(|v| v.to_string())
                .collect::<Vec<String>>(),
        )
    }

    #[test]
    fn accepts_the_six_known_operators() {
        for op in [
            "equals",
            "contains",
            "notEquals",
            "notContains",
            "notEqualsAny",
            "notContainsAny",
        ] {
            assert!(op.parse::<HeaderOperator>().is_ok(), "{op}");
        }
    }

    #[test]
    fn rejects_unknown_values() {
        assert!("startsWith".parse::<HeaderOperator>().is_err());
        assert!("".parse::<HeaderOperator>().is_err());
    }

    fn base_headers() -> HashMap<String, String> {
        headers(&[
            ("x-app-version", "1.2.3-beta"),
            ("cf-worker", "example.com"),
        ])
    }

    macro_rules! condition_cases {
        ($($name:ident: $op:ident, $value:literal, $header:literal => $expected:literal;)+) => {
            $(
                #[test]
                fn $name() {
                    assert_eq!(
                        evaluate_header_condition($header, HeaderOperator::$op, $value, &base_headers()),
                        $expected
                    );
                }
            )+
        };
    }

    condition_cases! {
        equals_hit: Equals, "example.com", "cf-worker" => true;
        equals_miss_different_value: Equals, "evil.com", "cf-worker" => false;
        equals_miss_header_absent: Equals, "anything", "x-missing" => false;
        contains_hit: Contains, "beta", "x-app-version" => true;
        contains_miss_no_substring: Contains, "alpha", "x-app-version" => false;
        contains_miss_header_absent: Contains, "beta", "x-missing" => false;
        not_equals_blocks_a_different_value: NotEquals, "example.com", "cf-worker" => false;
        not_equals_lets_an_exact_match_through: NotEquals, "evil.com", "cf-worker" => true;
        not_equals_blocks_an_absent_header: NotEquals, "secret", "x-secret" => true;
        not_contains_blocks_when_substring_present: NotContains, "beta", "x-app-version" => false;
        not_contains_lets_a_substring_hit_through: NotContains, "alpha", "x-app-version" => true;
        not_contains_blocks_an_absent_header: NotContains, "beta", "x-missing" => true;
    }

    #[test]
    fn matches_header_names_case_insensitively() {
        assert!(evaluate_header_condition(
            "CF-Worker",
            HeaderOperator::Equals,
            "example.com",
            &base_headers()
        ));
    }

    fn header_rule(name: Option<&str>, operator: Option<&str>, value: Option<&str>) -> AccessRule {
        let mut rule: AccessRule = block();
        rule.scope.header_name = name.map(str::to_string);
        rule.scope.header_operator = operator.map(str::to_string);
        rule.scope.header_value = value.map(str::to_string);
        rule
    }

    #[test]
    fn passes_trivially_when_the_rule_has_no_header_condition() {
        assert!(access_rule_header_matches(
            &block(),
            &headers(&[("x-debug", "1")])
        ));
    }

    #[test]
    fn evaluates_a_well_formed_header_condition() {
        let headers = headers(&[("x-debug", "1")]);
        assert!(access_rule_header_matches(
            &header_rule(Some("x-debug"), Some("equals"), Some("1")),
            &headers
        ));
        assert!(!access_rule_header_matches(
            &header_rule(Some("x-debug"), Some("equals"), Some("0")),
            &headers
        ));
    }

    #[test]
    fn never_matches_a_rule_with_a_header_name_but_an_invalid_operator() {
        let rule: AccessRule = header_rule(Some("x-debug"), Some("wat"), Some("1"));
        assert!(!access_rule_header_matches(
            &rule,
            &headers(&[("x-debug", "1")])
        ));
    }

    #[test]
    fn treats_a_missing_header_value_as_an_empty_string() {
        let rule: AccessRule = header_rule(Some("x-debug"), Some("contains"), None);
        assert!(access_rule_header_matches(
            &rule,
            &headers(&[("x-debug", "1")])
        ));
    }

    #[test]
    fn round_trips_a_list_of_values() {
        assert_eq!(
            decode_header_value_list(&list(&["ios", "android", "web"])),
            Some(vec!["ios".into(), "android".into(), "web".into()])
        );
    }

    #[test]
    fn round_trips_values_containing_the_characters_a_delimiter_would_break_on() {
        let values: [&str; 4] = ["en-GB,en;q=0.9", "a\"b", "c\\d", "[bracketed]"];
        assert_eq!(
            decode_header_value_list(&list(&values)),
            Some(values.iter().map(|v| v.to_string()).collect())
        );
    }

    #[test]
    fn treats_a_plain_value_as_a_one_value_list() {
        assert_eq!(
            decode_header_value_list("ios"),
            Some(vec!["ios".to_string()])
        );
        assert_eq!(decode_header_value_list(""), Some(vec![String::new()]));
    }

    #[test]
    fn rejects_a_list_shaped_value_that_is_not_a_usable_list() {
        for value in ["[", "[not json]", "[]", "[1,2]", "[\"ok\", null]"] {
            assert_eq!(decode_header_value_list(value), None, "{value}");
        }
    }

    fn multi_headers() -> HashMap<String, String> {
        headers(&[
            ("x-app", "android"),
            ("user-agent", "Mozilla/5.0 (Linux; Android 14) Chrome/120"),
        ])
    }

    #[test]
    fn does_not_block_a_request_whose_header_is_one_of_the_allowed_values() {
        assert!(!evaluate_header_condition(
            "x-app",
            HeaderOperator::NotEqualsAny,
            &list(&["ios", "android"]),
            &multi_headers()
        ));
        assert!(!evaluate_header_condition(
            "x-app",
            HeaderOperator::NotEqualsAny,
            &list(&["android"]),
            &multi_headers()
        ));
    }

    #[test]
    fn blocks_a_request_whose_header_matches_none_of_the_allowed_values() {
        assert!(evaluate_header_condition(
            "x-app",
            HeaderOperator::NotEqualsAny,
            &list(&["ios", "web"]),
            &multi_headers()
        ));
    }

    #[test]
    fn blocks_a_request_that_omits_the_header_entirely() {
        let allowed: String = list(&["ios", "android"]);
        assert!(evaluate_header_condition(
            "x-missing",
            HeaderOperator::NotEqualsAny,
            &allowed,
            &multi_headers()
        ));
        assert!(evaluate_header_condition(
            "x-missing",
            HeaderOperator::NotContainsAny,
            &allowed,
            &multi_headers()
        ));
    }

    #[test]
    fn matches_a_substring_of_the_header_for_not_contains_any() {
        assert!(!evaluate_header_condition(
            "user-agent",
            HeaderOperator::NotContainsAny,
            &list(&["Android", "iPhone"]),
            &multi_headers()
        ));
        assert!(evaluate_header_condition(
            "user-agent",
            HeaderOperator::NotContainsAny,
            &list(&["iPhone", "Windows"]),
            &multi_headers()
        ));
    }

    #[test]
    fn is_exact_for_not_equals_any() {
        assert!(evaluate_header_condition(
            "x-app",
            HeaderOperator::NotEqualsAny,
            &list(&["droid"]),
            &multi_headers()
        ));
    }

    #[test]
    fn never_fires_on_a_malformed_value_list() {
        for operator in [HeaderOperator::NotEqualsAny, HeaderOperator::NotContainsAny] {
            assert!(!evaluate_header_condition(
                "x-app",
                operator,
                "[]",
                &multi_headers()
            ));
            assert!(!evaluate_header_condition(
                "x-missing",
                operator,
                "[bad",
                &multi_headers()
            ));
        }
    }

    #[test]
    fn is_reachable_through_access_rule_header_matches() {
        let allowed: String = list(&["ios", "android"]);
        assert!(!access_rule_header_matches(
            &header_rule(Some("X-App"), Some("notEqualsAny"), Some(&allowed)),
            &multi_headers()
        ));
        let ios: String = list(&["ios"]);
        assert!(access_rule_header_matches(
            &header_rule(Some("X-App"), Some("notEqualsAny"), Some(&ios)),
            &multi_headers()
        ));
    }
}

// Ported from src/tests/matchedRule.unit.test.ts
mod matched_rule {
    use super::*;
    use prosopo_types::MatchedAccessRule;

    fn condition(field: &str, value: &str) -> Value {
        json!({ "field": field, "value": value })
    }

    #[test]
    fn carries_the_policy_half_of_the_rule() {
        let mut rule: AccessRule = restrict();
        rule.policy.captcha_type = Some(CaptchaType::Image);
        rule.policy.description = s("6 rounds for this ASN");
        rule.policy.defer_to_verify = Some(true);
        rule.client_id = s("site-key");
        rule.group_id = s("group-1");
        rule.scope.ja4_hash = s("t13d1516h2_8daaf6152771_b186095e22b6");
        assert_eq!(
            serde_json::to_value(describe_matched_rule(&rule)).expect("serialises"),
            json!({
                "ruleHash": make_access_rule_hash(&rule),
                "policyType": "restrict",
                "conditions": [condition("ja4Hash", "t13d1516h2_8daaf6152771_b186095e22b6")],
                "description": "6 rounds for this ASN",
                "captchaType": "image",
                "deferToVerify": true,
                "ruleGroupId": "group-1",
                "clientId": "site-key",
            })
        );
    }

    #[test]
    fn omits_policy_fields_the_rule_did_not_set() {
        let described: Value =
            serde_json::to_value(describe_matched_rule(&block())).expect("serialises");
        assert_eq!(
            described,
            json!({ "ruleHash": make_access_rule_hash(&block()), "policyType": "block", "conditions": [] })
        );
    }

    #[test]
    fn reports_a_single_ip_in_the_form_the_operator_typed() {
        let mut rule: AccessRule = block();
        rule.scope.numeric_ip = Some(ipv4("192.0.2.44"));
        assert_eq!(
            serde_json::to_value(describe_matched_rule(&rule).conditions).expect("serialises"),
            json!([condition("ip", "192.0.2.44")])
        );
    }

    #[test]
    fn collapses_an_ip_range_back_to_its_cidr() {
        let mut rule: AccessRule = block();
        rule.scope.numeric_ip_mask_min = Some(ipv4("198.51.100.64"));
        rule.scope.numeric_ip_mask_max = Some(ipv4("198.51.100.127"));
        assert_eq!(
            serde_json::to_value(describe_matched_rule(&rule).conditions).expect("serialises"),
            json!([condition("ipMask", "198.51.100.64/26")])
        );
    }

    #[test]
    fn stringifies_a_numeric_asn() {
        let mut rule: AccessRule = block();
        rule.scope.asn = n(205016.0);
        assert_eq!(
            serde_json::to_value(describe_matched_rule(&rule).conditions).expect("serialises"),
            json!([condition("asn", "205016")])
        );
    }

    #[test]
    fn reports_every_populated_scope_field_in_record_vocabulary() {
        let mut rule: AccessRule = block();
        let scope = &mut rule.scope;
        scope.user_id = s("user");
        scope.ja4_hash = s("ja4");
        scope.headers_hash = s("headers");
        scope.user_agent_hash = s("ua");
        scope.head_hash = s("head");
        scope.coords = s("[[1,2]]");
        scope.country_code = s("GB");
        scope.asn = n(1.0);
        scope.os = s("macos");
        scope.numeric_ip = Some(ipv4("203.0.113.5"));
        let fields: Vec<String> = describe_matched_rule(&rule)
            .conditions
            .into_iter()
            .map(|c| c.field)
            .collect();
        assert_eq!(
            fields,
            [
                "userId",
                "ja4Hash",
                "headersHash",
                "userAgent",
                "headHash",
                "coords",
                "countryCode",
                "asn",
                "os",
                "ip"
            ]
        );
        for field in &fields {
            assert!(USER_SCOPE_RECORD_FIELDS.contains(&field.as_str()));
        }
    }

    #[test]
    fn truncates_an_oversized_coords_polygon_and_flags_it() {
        let coords: String = serde_json::to_string(&vec![vec![[1, 2]; 200]]).expect("serialises");
        let mut rule: AccessRule = block();
        rule.scope.coords = Some(coords.clone());
        let condition = describe_matched_rule(&rule).conditions.remove(0);
        assert_eq!(condition.truncated, Some(true));
        assert_eq!(condition.value.encode_utf16().count(), 257);
        assert!(coords.starts_with(condition.value.trim_end_matches('…')));
    }

    #[test]
    fn leaves_a_value_at_the_cap_untruncated() {
        let coords: String = "x".repeat(256);
        let mut rule: AccessRule = block();
        rule.scope.coords = Some(coords.clone());
        assert_eq!(
            serde_json::to_value(describe_matched_rule(&rule).conditions).expect("serialises"),
            json!([condition("coords", &coords)])
        );
    }

    #[test]
    fn still_describes_a_rule_whose_scope_cannot_be_transformed() {
        let mut rule: AccessRule = block();
        rule.policy.description = s("unrepresentable range");
        rule.scope.numeric_ip_mask_min = Some(ipv4("198.51.100.200"));
        rule.scope.numeric_ip_mask_max = Some(ipv4("198.51.100.1"));
        assert_eq!(
            serde_json::to_value(describe_matched_rule(&rule)).expect("serialises"),
            json!({
                "ruleHash": make_access_rule_hash(&rule),
                "policyType": "block",
                "conditions": [],
                "description": "unrepresentable range",
            })
        );
    }

    /// The Rust `MatchedAccessRule` is the persisted schema: what it serialises reads back.
    #[test]
    fn produces_a_value_the_persisted_schema_accepts() {
        let mut rule: AccessRule = restrict();
        rule.policy.captcha_type = Some(CaptchaType::Pow);
        rule.scope.country_code = s("CN");
        let described: MatchedAccessRule = describe_matched_rule(&rule);
        let json: Value = serde_json::to_value(&described).expect("serialises");
        assert_eq!(
            serde_json::from_value::<MatchedAccessRule>(json).expect("reads back"),
            described
        );
    }
}

fn parse(
    schema: &prosopo_api_route::schema::Schema,
    input: Value,
) -> Result<Value, Vec<serde_json::Map<String, Value>>> {
    schema
        .safe_parse(Some(&input))
        .map(|output| output.unwrap_or(Value::Null))
}

fn issue_paths(issues: &[serde_json::Map<String, Value>]) -> Vec<Value> {
    let mut paths: Vec<Value> = issues
        .iter()
        .map(|issue| {
            issue["path"]
                .as_array()
                .and_then(|p| p.last())
                .cloned()
                .unwrap_or(Value::Null)
        })
        .collect();
    paths.sort_by_key(|path| path.to_string());
    paths
}

// Ported from src/tests/policyInput.unit.test.ts
mod policy_input {
    use super::*;
    use crate::api::sanitize_access_policy;

    fn policy(value: Value) -> AccessPolicy {
        serde_json::from_value(value).expect("a policy")
    }

    fn sanitized(value: Value) -> Value {
        serde_json::to_value(sanitize_access_policy(&policy(value))).expect("serialises")
    }

    #[test]
    fn should_remove_captcha_type_from_block_policies() {
        assert_eq!(
            sanitized(
                json!({ "type": "block", "captchaType": "image", "description": "test block policy" })
            ),
            json!({ "type": "block", "description": "test block policy" })
        );
    }

    #[test]
    fn should_remove_solved_images_count_from_block_policies() {
        assert_eq!(
            sanitized(
                json!({ "type": "block", "solvedImagesCount": 5, "description": "test block policy" })
            ),
            json!({ "type": "block", "description": "test block policy" })
        );
    }

    #[test]
    fn should_remove_both_captcha_type_and_solved_images_count_from_block_policies() {
        assert_eq!(
            sanitized(
                json!({ "type": "block", "captchaType": "image", "solvedImagesCount": 5, "description": "test block policy" })
            ),
            json!({ "type": "block", "description": "test block policy" })
        );
    }

    #[test]
    fn should_keep_other_fields_in_block_policies() {
        assert_eq!(
            sanitized(json!({
                "type": "block", "captchaType": "image", "solvedImagesCount": 5, "description": "test block policy",
                "imageThreshold": 0.5, "powDifficulty": 10, "unsolvedImagesCount": 3, "frictionlessScore": 100,
            })),
            json!({
                "type": "block", "description": "test block policy",
                "imageThreshold": 0.5, "powDifficulty": 10, "unsolvedImagesCount": 3, "frictionlessScore": 100,
            })
        );
    }

    #[test]
    fn should_keep_captcha_type_in_restrict_policies() {
        let input: Value = json!({ "type": "restrict", "captchaType": "image", "description": "test restrict policy" });
        assert_eq!(sanitized(input.clone()), input);
    }

    #[test]
    fn should_keep_solved_images_count_in_restrict_policies() {
        let input: Value = json!({ "type": "restrict", "description": "test restrict policy", "solvedImagesCount": 5 });
        assert_eq!(sanitized(input.clone()), input);
    }

    #[test]
    fn should_keep_both_captcha_type_and_solved_images_count_in_restrict_policies() {
        let input: Value = json!({ "type": "restrict", "captchaType": "image", "description": "test restrict policy", "solvedImagesCount": 5 });
        assert_eq!(sanitized(input.clone()), input);
    }

    #[test]
    fn rejects_block_plus_captcha_type_with_a_clear_message_pointing_at_restrict() {
        let issues = parse(
            &access_policy_input(),
            json!({ "type": "block", "captchaType": "image" }),
        )
        .expect_err("rejected");
        let issue = issues
            .iter()
            .find(|i| i["path"] == json!(["captchaType"]))
            .expect("an issue");
        let message: &str = issue["message"].as_str().expect("a message");
        assert!(message.contains("Block policies cannot pin a captchaType"));
        assert!(message.contains("Restrict policy"));
    }

    #[test]
    fn rejects_block_plus_solved_images_count() {
        let issues = parse(
            &access_policy_input(),
            json!({ "type": "block", "solvedImagesCount": 3 }),
        )
        .expect_err("rejected");
        let issue = issues
            .iter()
            .find(|i| i["path"] == json!(["solvedImagesCount"]))
            .expect("an issue");
        assert!(issue["message"]
            .as_str()
            .expect("a message")
            .contains("Block policies cannot set solvedImagesCount"));
    }

    #[test]
    fn accepts_block_without_the_disallowed_fields() {
        assert!(parse(
            &access_policy_input(),
            json!({ "type": "block", "description": "clean block" })
        )
        .is_ok());
    }

    #[test]
    fn accepts_block_plus_defer_to_verify() {
        assert!(parse(
            &access_policy_input(),
            json!({ "type": "block", "deferToVerify": true })
        )
        .is_ok());
    }

    #[test]
    fn accepts_restrict_plus_captcha_type_plus_solved_images_count() {
        assert!(parse(
            &access_policy_input(),
            json!({ "type": "restrict", "captchaType": "image", "solvedImagesCount": 5 })
        )
        .is_ok());
    }

    #[test]
    fn splits_the_comma_joined_form_redis_stores() {
        let output = parse(
            &policy_scope_exclusions_input(),
            json!({ "excludedClientIds": "client-a,client-b" }),
        )
        .expect("parses");
        assert_eq!(output["excludedClientIds"], json!(["client-a", "client-b"]));
    }

    #[test]
    fn accepts_the_array_form_the_api_sends() {
        let output = parse(
            &policy_scope_exclusions_input(),
            json!({ "excludedClientIds": ["client-a"] }),
        )
        .expect("parses");
        assert_eq!(output["excludedClientIds"], json!(["client-a"]));
    }

    fn reads_as_no_exclusions(input: Value) {
        let output = parse(&policy_scope_exclusions_input(), input).expect("parses");
        assert_eq!(output.get("excludedClientIds"), None);
    }

    #[test]
    fn reads_an_empty_array_as_no_exclusions() {
        reads_as_no_exclusions(json!({ "excludedClientIds": [] }));
    }

    #[test]
    fn reads_an_empty_string_as_no_exclusions() {
        reads_as_no_exclusions(json!({ "excludedClientIds": "" }));
    }

    #[test]
    fn reads_a_missing_field_as_no_exclusions() {
        reads_as_no_exclusions(json!({}));
    }

    #[test]
    fn rejects_a_client_id_containing_the_redis_separator() {
        let issues = parse(
            &policy_scope_exclusions_input(),
            json!({ "excludedClientIds": ["a,b"] }),
        )
        .expect_err("rejected");
        assert!(issues
            .iter()
            .any(|i| i["message"].as_str().is_some_and(|m| m.contains("comma"))));
    }
}

// Ported from src/tests/blockingRuleShapes.unit.test.ts
mod blocking_rule_shapes {
    use super::*;
    use crate::api::{sanitize_access_policy, InsertRulesArgs};
    use prosopo_api_route::Validate;

    fn policy(value: Value) -> AccessPolicy {
        serde_json::from_value(value).expect("a policy")
    }

    #[test]
    fn accepts_a_bare_block() {
        assert!(parse(
            &access_policy_input(),
            json!({ "type": "block", "description": "bare block" })
        )
        .is_ok());
    }

    #[test]
    fn rejects_captcha_type_and_solved_images_count_together() {
        let issues = parse(
            &access_policy_input(),
            json!({ "type": "block", "captchaType": "image", "solvedImagesCount": 2 }),
        )
        .expect_err("rejected");
        assert_eq!(
            issue_paths(&issues),
            vec![json!("captchaType"), json!("solvedImagesCount")]
        );
    }

    #[test]
    fn plain_block_strips_both_fields_on_the_way_into_storage() {
        let sanitized = sanitize_access_policy(&policy(
            json!({ "type": "block", "captchaType": "image", "solvedImagesCount": 2, "description": "legacy block" }),
        ));
        assert_eq!(
            serde_json::to_value(sanitized).expect("serialises"),
            json!({ "type": "block", "description": "legacy block" })
        );
    }

    #[test]
    fn accepts_the_flag_on_its_own_and_preserves_it() {
        let output = parse(
            &access_policy_input(),
            json!({ "type": "block", "deferToVerify": true, "description": "deferred block" }),
        )
        .expect("parses");
        assert_eq!(output["deferToVerify"], json!(true));
    }

    #[test]
    fn rejects_captcha_type_and_solved_images_count_despite_the_flag() {
        let issues = parse(
            &access_policy_input(),
            json!({ "type": "block", "deferToVerify": true, "captchaType": "image", "solvedImagesCount": 2 }),
        )
        .expect_err("rejected");
        assert_eq!(
            issue_paths(&issues),
            vec![json!("captchaType"), json!("solvedImagesCount")]
        );
    }

    #[test]
    fn deferred_block_strips_both_fields_on_the_way_into_storage() {
        let sanitized = sanitize_access_policy(&policy(json!({
            "type": "block", "deferToVerify": true, "captchaType": "image", "solvedImagesCount": 2, "description": "deferred block",
        })));
        assert_eq!(
            serde_json::to_value(sanitized).expect("serialises"),
            json!({ "type": "block", "description": "deferred block", "deferToVerify": true })
        );
    }

    #[test]
    fn round_trips_the_flag_from_its_stored_string_form() {
        let output = parse(
            &access_policy_input(),
            json!({ "type": "block", "deferToVerify": "true" }),
        )
        .expect("parses");
        assert_eq!(output["deferToVerify"], json!(true));
    }

    #[test]
    fn accepts_captcha_type_and_solved_images_count_with_or_without_the_flag() {
        for input in [
            json!({ "type": "restrict", "captchaType": "image", "solvedImagesCount": 2 }),
            json!({ "type": "restrict", "captchaType": "image", "solvedImagesCount": 2, "deferToVerify": true }),
        ] {
            assert!(parse(&access_policy_input(), input).is_ok());
        }
    }

    #[test]
    fn restrict_survives_the_sanitiser_intact() {
        let input: Value = json!({ "type": "restrict", "captchaType": "image", "solvedImagesCount": 2, "deferToVerify": true });
        assert_eq!(
            serde_json::to_value(sanitize_access_policy(&policy(input.clone())))
                .expect("serialises"),
            input
        );
    }

    fn valid_group() -> Value {
        json!({
            "accessPolicy": { "type": "block", "deferToVerify": true, "description": "deferred block" },
            "userScopes": [{ "ip": "1.1.1.1" }],
        })
    }

    #[test]
    fn accepts_a_batch_of_well_formed_groups() {
        assert!(InsertRulesArgs::validate(Some(&json!([valid_group(), valid_group()]))).is_ok());
    }

    #[test]
    fn rejects_the_entire_batch_when_a_single_group_is_malformed() {
        let invalid: Value = json!({
            "accessPolicy": {
                "type": "block", "deferToVerify": true, "captchaType": "image", "solvedImagesCount": 2,
                "description": "deferred block with tuning fields",
            },
            "userScopes": [{ "ip": "2.2.2.2" }],
        });
        let mut batch: Vec<Value> = vec![valid_group(); 20];
        batch.push(invalid);
        batch.extend(vec![valid_group(); 20]);
        let error = InsertRulesArgs::validate(Some(&Value::Array(batch))).expect_err("rejected");
        let first: Vec<Value> = error
            .issues
            .iter()
            .map(|issue| serde_json::to_value(&issue.path[0]).expect("a segment"))
            .collect();
        assert_eq!(first, vec![json!(20), json!(20)]);
    }
}

// Ported from src/tests/redis/reader/redisRulesQuery.unit.test.ts. A TS user scope can carry a
// field that is present but `undefined`, which an exact query then requires to be missing, in
// the position of its key. A Rust field is set or not, so those cases are written with the
// field absent, and the expected query lists it where the Rust does: with the other missing
// fields when matching fields only, not at all otherwise. Every production caller builds its
// scope by parsing (the API) or by spreading defined values (the provider), so it never has
// such a field.
mod rules_query {
    use super::*;
    use crate::redis::get_rules_redis_query;

    fn filter(scope: Value, scope_match: &str) -> AccessRulesFilter {
        serde_json::from_value(json!({ "userScope": scope, "userScopeMatch": scope_match }))
            .expect("a filter")
    }

    const MISSING_AFTER_JA4: &str = "ismissing(@userId) ismissing(@headersHash) ismissing(@userAgentHash) ismissing(@headHash) ismissing(@coords) ismissing(@countryCode) ismissing(@asn) ismissing(@os) ismissing(@browser) ismissing(@headerMatch) ismissing(@headerName) ismissing(@headerValue) ismissing(@headerOperator) ismissing(@webBotAuthAgent)";

    #[test]
    fn exact_match_lists_only_the_fields_given() {
        let query: String = get_rules_redis_query(
            &filter(json!({ "numericIp": "100", "ja4Hash": "ja4Hash" }), "exact"),
            false,
        );
        assert_eq!(query, "( ( @numericIp:[100 100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) @ja4Hash:{ja4Hash} )");
    }

    #[test]
    fn exact_match_with_matching_fields_only_requires_every_other_field_missing() {
        let query: String = get_rules_redis_query(
            &filter(json!({ "numericIp": "100", "ja4Hash": "ja4Hash" }), "exact"),
            true,
        );
        assert_eq!(
            query,
            format!("( ( @numericIp:[100 100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) @ja4Hash:{{ja4Hash}} {MISSING_AFTER_JA4} )")
        );
    }

    #[test]
    fn exact_match_with_several_fields_lists_each_given_field() {
        let query: String = get_rules_redis_query(
            &filter(json!({ "numericIp": "100", "ja4Hash": "ja4Hash" }), "exact"),
            false,
        );
        assert!(
            query.contains("@ja4Hash:{ja4Hash}") && !query.contains("ismissing"),
            "{query}"
        );
    }

    #[test]
    fn does_not_put_ismissing_for_fields_not_given_when_user_scope_match_is_greedy() {
        let query: String = get_rules_redis_query(
            &filter(
                json!({ "numericIp": "100", "ja4Hash": "ja4Hash" }),
                "greedy",
            ),
            false,
        );
        assert_eq!(query, "( ( @numericIp:[100 100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) | @ja4Hash:{ja4Hash} )");
    }

    #[test]
    fn exact_match_without_any_ip_field_and_matching_fields_only_requires_every_ip_field_missing() {
        let query: String =
            get_rules_redis_query(&filter(json!({ "ja4Hash": "ja4Hash" }), "exact"), true);
        assert!(query.starts_with("( @ja4Hash:{ja4Hash} ismissing(@numericIp) ismissing(@numericIpMaskMin) ismissing(@numericIpMaskMax) "), "{query}");
    }

    #[test]
    fn does_not_put_ismissing_for_the_mask_fields_when_numeric_ip_is_passed_in() {
        let query: String = get_rules_redis_query(
            &filter(json!({ "numericIp": "100", "ja4Hash": "ja4Hash" }), "exact"),
            true,
        );
        assert!(!query.contains("ismissing(@numericIpMask"), "{query}");
    }

    #[test]
    fn does_not_put_ismissing_numeric_ip_when_the_mask_fields_are_passed_in() {
        let query: String = get_rules_redis_query(
            &filter(
                json!({ "numericIpMaskMin": "100", "numericIpMaskMax": "200", "ja4Hash": "ja4Hash" }),
                "exact",
            ),
            true,
        );
        assert_eq!(query, format!("( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[200 +inf] @ja4Hash:{{ja4Hash}} {MISSING_AFTER_JA4} )"));
    }

    #[test]
    fn emits_numeric_range_syntax_for_asn_not_tag_syntax() {
        let query: String =
            get_rules_redis_query(&filter(json!({ "asn": 205016 }), "greedy"), false);
        assert!(
            query.contains("@asn:[205016 205016]") && !query.contains("@asn:{"),
            "{query}"
        );
    }

    #[test]
    fn does_not_duplicate_ismissing_for_the_mask_fields_when_all_ip_fields_are_undefined() {
        let query: String =
            get_rules_redis_query(&filter(json!({ "userId": "user123" }), "exact"), true);
        assert_eq!(query.matches("ismissing(@numericIpMaskMin)").count(), 1);
        assert_eq!(query.matches("ismissing(@numericIpMaskMax)").count(), 1);
        assert!(query.contains("ismissing(@numericIp)") && query.contains("@userId:{user123}"));
    }

    #[test]
    fn emits_ismissing_for_mask_min_when_only_mask_max_is_defined() {
        let query: String =
            get_rules_redis_query(&filter(json!({ "numericIpMaskMax": "200" }), "exact"), true);
        assert!(query.contains("ismissing(@numericIpMaskMin)"));
        assert!(query.contains("@numericIpMaskMax:[200 +inf]"));
        assert!(!query.contains("ismissing(@numericIpMaskMax)"));
    }

    #[test]
    fn emits_ismissing_for_mask_max_when_only_mask_min_is_defined() {
        let query: String =
            get_rules_redis_query(&filter(json!({ "numericIpMaskMin": "100" }), "exact"), true);
        assert!(query.contains("@numericIpMaskMin:[-inf 100]"));
        assert!(query.contains("ismissing(@numericIpMaskMax)"));
        assert!(!query.contains("ismissing(@numericIpMaskMin)"));
    }

    #[test]
    fn includes_head_hash_in_query_when_provided() {
        assert_eq!(
            get_rules_redis_query(
                &filter(json!({ "headHash": "abc123def456" }), "exact"),
                false
            ),
            "( @headHash:{abc123def456} )"
        );
    }

    #[test]
    fn includes_coords_in_query_when_provided_with_escaped_special_characters() {
        let query: String = get_rules_redis_query(
            &filter(json!({ "coords": "[[[100,200]]]" }), "exact"),
            false,
        );
        assert!(
            query.contains("@coords:{\\[\\[\\[100\\,200\\]\\]\\]}"),
            "{query}"
        );
    }

    #[test]
    fn escapes_the_signer_url_in_a_web_bot_auth_agent_query() {
        let query: String = get_rules_redis_query(
            &filter(json!({ "webBotAuthAgent": "https://chatgpt.com" }), "exact"),
            false,
        );
        assert_eq!(query, "( @webBotAuthAgent:{https\\:\\/\\/chatgpt\\.com} )");
    }

    #[test]
    fn includes_both_head_hash_and_coords_when_both_provided() {
        let query: String = get_rules_redis_query(
            &filter(
                json!({ "headHash": "abc123def456", "coords": "[[[100,200]]]" }),
                "exact",
            ),
            false,
        );
        assert!(
            query.contains("@headHash:{abc123def456}")
                && query.contains("@coords:{\\[\\[\\[100\\,200\\]\\]\\]}"),
            "{query}"
        );
    }

    #[test]
    fn puts_ismissing_head_hash_and_coords_when_not_provided_and_matching_fields_only_is_true() {
        let query: String =
            get_rules_redis_query(&filter(json!({ "ja4Hash": "ja4Hash" }), "exact"), true);
        assert!(
            query.contains("ismissing(@headHash)") && query.contains("ismissing(@coords)"),
            "{query}"
        );
    }

    #[test]
    fn combines_head_hash_with_other_fields_correctly_in_exact_match() {
        let query: String = get_rules_redis_query(
            &filter(
                json!({ "numericIp": "100", "ja4Hash": "ja4Hash", "headHash": "abc123def456" }),
                "exact",
            ),
            true,
        );
        for part in [
            "@numericIp:[100 100]",
            "@ja4Hash:{ja4Hash}",
            "@headHash:{abc123def456}",
            "ismissing(@userAgentHash)",
        ] {
            assert!(query.contains(part), "{part} in {query}");
        }
    }

    #[test]
    fn prepends_type_block_when_block_only_is_set_on_the_filter() {
        let mut query_filter: AccessRulesFilter = filter(json!({ "ja4Hash": "ja4Hash" }), "greedy");
        query_filter.block_only = Some(true);
        let query: String = get_rules_redis_query(&query_filter, false);
        let type_at: usize = query.find("@type:{block}").expect("the type clause");
        assert!(type_at < query.find("@ja4Hash").expect("the scope clause"));
    }

    #[test]
    fn omits_type_block_when_block_only_is_not_set() {
        assert!(
            !get_rules_redis_query(&filter(json!({ "ja4Hash": "ja4Hash" }), "greedy"), false)
                .contains("@type:")
        );
    }

    #[test]
    fn composes_block_only_with_client_id_policy_scope() {
        let query_filter: AccessRulesFilter = serde_json::from_value(json!({
            "policyScope": { "clientId": "site-A" },
            "policyScopeMatch": "greedy",
            "userScope": { "ja4Hash": "ja4Hash" },
            "userScopeMatch": "greedy",
            "blockOnly": true,
        }))
        .expect("a filter");
        let query: String = get_rules_redis_query(&query_filter, false);
        for part in ["@type:{block}", "@clientId:{site-A}", "@ja4Hash:{ja4Hash}"] {
            assert!(query.contains(part), "{part} in {query}");
        }
    }
}

// Ported from src/tests/redis/reader/redisRulesSplitQuery.unit.test.ts
mod split_query {
    use super::*;
    use crate::redis::{build_scoped_rules_sub_queries, SubQuery};

    fn scope(value: Value) -> UserScope {
        serde_json::from_value(value).expect("a scope")
    }

    /// `buildScopedBlockSubQueries`: the block-only probe set.
    fn block_subs(value: Value, client_id: Option<&str>) -> Vec<SubQuery> {
        build_scoped_rules_sub_queries(&scope(value), client_id, true, false)
    }

    fn kinds(subs: &[SubQuery]) -> Vec<String> {
        let mut kinds: Vec<String> = subs.iter().map(|sub| sub.kind.clone()).collect();
        kinds.sort();
        kinds
    }

    fn find<'a>(subs: &'a [SubQuery], kind: &str) -> &'a SubQuery {
        subs.iter()
            .find(|sub| sub.kind == kind)
            .unwrap_or_else(|| panic!("no {kind}"))
    }

    #[test]
    fn emits_one_sub_query_per_populated_user_scope_field() {
        let subs = block_subs(
            json!({ "ja4Hash": "abc", "userAgentHash": "def" }),
            Some("client-A"),
        );
        assert_eq!(
            kinds(&subs),
            ["field:ja4Hash", "field:userAgentHash", "no-user-scope"]
        );
    }

    #[test]
    fn emits_both_ip_exact_and_ip_mask_sub_queries_when_request_has_an_ip() {
        let subs = block_subs(json!({ "numericIp": "3232235777" }), Some("client-A"));
        assert!(find(&subs, "ip:exact")
            .query
            .contains("@numericIp:[3232235777 3232235777]"));
        let mask: &str = &find(&subs, "ip:mask").query;
        assert!(
            mask.contains("@numericIpMaskMin:[-inf 3232235777]")
                && mask.contains("@numericIpMaskMax:[3232235777 +inf]")
        );
    }

    #[test]
    fn scopes_every_sub_query_with_type_block_and_client_id_probe() {
        for sub in block_subs(json!({ "ja4Hash": "abc" }), Some("client-A")) {
            for part in [
                "@type:{block}",
                "@clientId:{client-A}",
                "@clientId:{global}",
                "ismissing(@clientId)",
            ] {
                assert!(sub.query.contains(part), "{part} in {}", sub.query);
            }
        }
    }

    #[test]
    fn leaves_client_exclusions_to_the_ranker_instead_of_negating_them_in_the_query() {
        for sub in block_subs(json!({ "ja4Hash": "abc" }), Some("client-A")) {
            assert!(!sub.query.contains("excludedClientIds"));
        }
    }

    #[test]
    fn skips_the_client_specific_probe_when_no_client_id_is_passed() {
        for sub in block_subs(json!({ "ja4Hash": "abc" }), None) {
            assert!(
                sub.query.contains("@clientId:{global}")
                    && sub.query.contains("ismissing(@clientId)")
            );
        }
    }

    #[test]
    fn emits_a_no_user_scope_fall_through_query_with_ismissing_over_every_user_scope_field() {
        let subs = block_subs(json!({ "ja4Hash": "abc" }), Some("client-A"));
        let fall_through: &str = &find(&subs, "no-user-scope").query;
        for field in [
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
            "numericIp",
            "numericIpMaskMin",
            "numericIpMaskMax",
        ] {
            assert!(
                fall_through.contains(&format!("ismissing(@{field})")),
                "{field}"
            );
        }
    }

    #[test]
    fn emits_field_probes_for_the_ua_derived_os_and_browser_scopes() {
        let subs = block_subs(
            json!({ "os": "windows", "browser": "firefox" }),
            Some("client-A"),
        );
        assert!(find(&subs, "field:os").query.contains("@os:{windows}"));
        assert!(find(&subs, "field:browser")
            .query
            .contains("@browser:{firefox}"));
    }

    #[test]
    fn uses_numeric_range_syntax_for_asn_not_tag_syntax() {
        let subs = block_subs(json!({ "asn": 205016 }), Some("client-A"));
        let asn: &str = &find(&subs, "field:asn").query;
        assert!(asn.contains("@asn:[205016 205016]") && !asn.contains("@asn:{"));
    }

    #[test]
    fn escapes_json_special_characters_in_coords_tag_queries() {
        let subs = block_subs(json!({ "coords": "[[[100,200]]]" }), Some("client-A"));
        assert!(find(&subs, "field:coords")
            .query
            .contains("@coords:{\\[\\[\\[100\\,200\\]\\]\\]}"));
    }

    #[test]
    fn omits_type_block_when_block_only_is_not_set() {
        for sub in build_scoped_rules_sub_queries(
            &scope(json!({ "numericIp": "1376899398" })),
            Some("client-A"),
            false,
            false,
        ) {
            assert!(!sub.query.contains("@type:{block}"));
        }
    }

    #[test]
    fn includes_type_block_when_block_only_is_true() {
        for sub in build_scoped_rules_sub_queries(
            &scope(json!({ "numericIp": "1376899398" })),
            Some("client-A"),
            true,
            false,
        ) {
            assert!(sub.query.contains("@type:{block}"));
        }
    }

    #[test]
    fn emits_a_separate_probe_set_for_deferred_rules_at_verify() {
        let subs = build_scoped_rules_sub_queries(
            &scope(json!({ "numericIp": "1376899398" })),
            Some("clientA"),
            true,
            true,
        );
        let block: Vec<&SubQuery> = subs
            .iter()
            .filter(|s| s.kind.starts_with("block:"))
            .collect();
        let deferred: Vec<&SubQuery> = subs
            .iter()
            .filter(|s| s.kind.starts_with("deferred:"))
            .collect();
        assert!(!block.is_empty());
        assert_eq!(deferred.len(), block.len());
        for sub in block {
            assert!(sub.query.contains("@type:{block} -@deferToVerify:{true}"));
        }
        for sub in deferred {
            assert!(
                sub.query.contains("@deferToVerify:{true}") && !sub.query.contains("@type:{block}")
            );
        }
    }

    #[test]
    fn never_merges_the_two_pools_into_one_probe() {
        for sub in build_scoped_rules_sub_queries(
            &scope(json!({ "numericIp": "1376899398" })),
            Some("clientA"),
            true,
            true,
        ) {
            assert!(!sub.query.contains("| @deferToVerify:{true}"));
        }
    }

    #[test]
    fn excludes_deferred_rules_from_the_request_time_pool() {
        for sub in build_scoped_rules_sub_queries(
            &scope(json!({ "numericIp": "1376899398" })),
            Some("clientA"),
            true,
            false,
        ) {
            assert!(sub.query.contains("-@deferToVerify:{true}"));
        }
    }

    #[test]
    fn ignores_include_deferred_when_block_only_is_not_set() {
        for sub in build_scoped_rules_sub_queries(
            &scope(json!({ "numericIp": "1376899398" })),
            Some("clientA"),
            false,
            true,
        ) {
            assert!(!sub.query.contains("@deferToVerify") && !sub.query.contains("@type:{block}"));
        }
    }

    #[test]
    fn emits_the_same_probe_kinds_regardless_of_block_only() {
        let request: UserScope = scope(json!({ "numericIp": "1376899398", "ja4Hash": "abc" }));
        let without: Vec<SubQuery> =
            build_scoped_rules_sub_queries(&request, Some("client-A"), false, false);
        let with: Vec<SubQuery> =
            build_scoped_rules_sub_queries(&request, Some("client-A"), true, false);
        assert_eq!(kinds(&without), kinds(&with));
    }

    #[test]
    fn produces_an_ip_exact_probe_that_hits_the_numeric_ip_posting_list() {
        let subs = build_scoped_rules_sub_queries(
            &scope(json!({ "numericIp": "1376899398" })),
            Some("5EZVvsHMrKCFKp5NYNoTyDjTjetoVo1Z4UNNbTwJf1GfN6Xm"),
            false,
            false,
        );
        let exact: &str = &find(&subs, "ip:exact").query;
        assert!(exact.contains("@numericIp:[1376899398 1376899398]"));
        assert!(exact.contains("@clientId:{5EZVvsHMrKCFKp5NYNoTyDjTjetoVo1Z4UNNbTwJf1GfN6Xm}"));
    }
}

// Ported from src/tests/redis/reader/redisAggregate.unit.test.ts. The TS fakes node-redis's
// decoded reply; these feed the reply parser the raw RESP3 map Redis Stack sends (the client
// negotiates RESP3) and the RESP2 array, and check the command the probe sends.
mod aggregate {
    use crate::redis::{search_keys, search_keys_command};
    use ::redis::Value as RedisValue;

    fn bulk(text: &str) -> RedisValue {
        RedisValue::BulkString(text.as_bytes().to_vec())
    }

    fn resp3(keys: &[&str]) -> RedisValue {
        RedisValue::Map(vec![
            (bulk("attributes"), RedisValue::Array(vec![])),
            (bulk("format"), bulk("STRING")),
            (
                bulk("results"),
                RedisValue::Array(
                    keys.iter()
                        .map(|key| {
                            RedisValue::Map(vec![
                                (bulk("id"), bulk(key)),
                                (bulk("values"), RedisValue::Array(vec![])),
                            ])
                        })
                        .collect(),
                ),
            ),
            (bulk("total_results"), RedisValue::Int(keys.len() as i64)),
            (bulk("warning"), RedisValue::Array(vec![])),
        ])
    }

    fn resp2(keys: &[&str]) -> RedisValue {
        let mut items: Vec<RedisValue> = vec![RedisValue::Int(keys.len() as i64)];
        items.extend(keys.iter().map(|key| bulk(key)));
        RedisValue::Array(items)
    }

    #[test]
    fn returns_the_flat_documents_list_from_ft_search_nocontent() {
        let keys: [&str; 3] = ["access_rule:a", "access_rule:b", "access_rule:c"];
        assert_eq!(search_keys(&resp3(&keys)), keys);
        assert_eq!(search_keys(&resp2(&keys)), keys);
    }

    #[test]
    fn passes_the_callers_cap_through_as_the_ft_search_limit_size() {
        let command = search_keys_command("@ja4Hash:{x}", 500);
        let args: Vec<String> = command
            .args_iter()
            .filter_map(|arg| match arg {
                ::redis::Arg::Simple(bytes) => Some(String::from_utf8_lossy(bytes).into_owned()),
                _ => None,
            })
            .collect();
        assert_eq!(
            args,
            [
                "FT.SEARCH",
                "index:user-access-rules",
                "@ja4Hash:{x}",
                "NOCONTENT",
                "LIMIT",
                "0",
                "500",
                "DIALECT",
                "2"
            ]
        );
    }

    #[test]
    fn returns_an_empty_list_when_the_search_matches_nothing() {
        assert!(search_keys(&resp3(&[])).is_empty());
        assert!(search_keys(&resp2(&[])).is_empty());
    }

    #[test]
    fn does_not_iterate_individual_document_tuples() {
        let mut reply: RedisValue = resp2(&["access_rule:one", "access_rule:two"]);
        if let RedisValue::Array(items) = &mut reply {
            items.push(RedisValue::Nil);
        }
        assert_eq!(search_keys(&reply), ["access_rule:one", "access_rule:two"]);
    }
}

// Ported from src/tests/insertRulesEndpoint.unit.test.ts
mod insert_rules_endpoint {
    use super::*;
    use crate::api::{InsertRulesArgs, InsertRulesEndpoint, SharedStorage};
    use prosopo_api_route::{ApiEndpoint, ApiEndpointResponseStatus, Validate};
    use prosopo_logger::{
        get_logger_with_runtime, ConsoleMethod, DirectiveStore, LogLevel, LogRuntime, Logger, Sink,
        SystemClock,
    };
    use std::sync::{Arc, Mutex};

    #[derive(Default)]
    struct Capture(Mutex<Vec<String>>);

    impl Sink for Capture {
        fn write(&self, _method: ConsoleMethod, line: &str) {
            self.0.lock().expect("not poisoned").push(line.to_string());
        }
    }

    impl Capture {
        fn messages(&self) -> Vec<String> {
            self.0
                .lock()
                .expect("not poisoned")
                .iter()
                .map(|line| {
                    serde_json::from_str::<Value>(line).expect("JSON")["msg"]
                        .as_str()
                        .unwrap_or("")
                        .to_string()
                })
                .collect()
        }
    }

    fn capturing_logger() -> (Logger, Arc<Capture>) {
        let sink: Arc<Capture> = Arc::new(Capture::default());
        let runtime: LogRuntime = LogRuntime {
            sink: sink.clone(),
            clock: Arc::new(SystemClock),
            directives: Arc::new(DirectiveStore::new("")),
        };
        (
            get_logger_with_runtime(LogLevel::Info, "uap-test", runtime),
            sink,
        )
    }

    /// A writer that records what it is asked to insert and answers with two ids.
    #[derive(Default)]
    struct RecordingStorage(Mutex<Vec<Vec<AccessRuleEntry>>>);

    impl AccessRulesReader for RecordingStorage {
        fn fetch_rules<'a>(
            &'a self,
            _ids: &'a [String],
        ) -> BoxFuture<'a, crate::storage::Result<Vec<AccessRuleEntry>>> {
            Box::pin(async { Ok(Vec::new()) })
        }
        fn get_missing_rule_ids<'a>(
            &'a self,
            _ids: &'a [String],
        ) -> BoxFuture<'a, crate::storage::Result<Vec<String>>> {
            Box::pin(async { Ok(Vec::new()) })
        }
        fn find_rules<'a>(
            &'a self,
            _filter: &'a AccessRulesFilter,
            _m: bool,
            _s: bool,
        ) -> BoxFuture<'a, Vec<AccessRule>> {
            Box::pin(async { Vec::new() })
        }
        fn find_rule_ids<'a>(
            &'a self,
            _filter: &'a AccessRulesFilter,
            _m: bool,
        ) -> BoxFuture<'a, Vec<String>> {
            Box::pin(async { Vec::new() })
        }
        fn fetch_all_rule_ids<'a>(
            &'a self,
            _handler: &'a mut dyn RuleIdBatchHandler,
        ) -> BoxFuture<'a, crate::storage::Result<()>> {
            Box::pin(async { Ok(()) })
        }
    }

    impl AccessRulesWriter for RecordingStorage {
        fn insert_rules<'a>(
            &'a self,
            entries: &'a [AccessRuleEntry],
        ) -> BoxFuture<'a, crate::storage::Result<Vec<String>>> {
            self.0.lock().expect("not poisoned").push(entries.to_vec());
            Box::pin(async { Ok(vec!["rule-1".to_string(), "rule-2".to_string()]) })
        }
        fn delete_rules<'a>(
            &'a self,
            _ids: &'a [String],
        ) -> BoxFuture<'a, crate::storage::Result<()>> {
            Box::pin(async { Ok(()) })
        }
        fn delete_all_rules(&self) -> BoxFuture<'_, crate::storage::Result<usize>> {
            Box::pin(async { Ok(0) })
        }
    }

    fn args(value: Value) -> InsertRulesArgs {
        let output: Value = InsertRulesArgs::validate(Some(&value)).expect("valid");
        serde_json::from_value(output).expect("args")
    }

    fn sample() -> InsertRulesArgs {
        args(
            json!([{ "accessPolicy": { "type": "block" }, "userScopes": [{ "userId": "user-1" }, { "userId": "user-2" }] }]),
        )
    }

    #[tokio::test]
    async fn uses_the_per_request_logger_when_one_is_provided_to_process_request() {
        let (constructor_logger, constructor_sink) = capturing_logger();
        let (request_logger, request_sink) = capturing_logger();
        let storage: SharedStorage = Arc::new(RecordingStorage::default());
        let endpoint: InsertRulesEndpoint = InsertRulesEndpoint::new(storage, constructor_logger);
        let response = endpoint
            .process_request(sample(), Some(&request_logger))
            .await
            .expect("processes");
        assert_eq!(response.status, ApiEndpointResponseStatus::Success);
        assert!(request_sink
            .messages()
            .contains(&"Endpoint inserted access rules".to_string()));
        assert!(constructor_sink.messages().is_empty());
    }

    #[tokio::test]
    async fn falls_back_to_the_constructor_logger_when_no_request_logger_is_provided() {
        let (constructor_logger, constructor_sink) = capturing_logger();
        let storage: SharedStorage = Arc::new(RecordingStorage::default());
        let endpoint: InsertRulesEndpoint = InsertRulesEndpoint::new(storage, constructor_logger);
        endpoint
            .process_request(sample(), None)
            .await
            .expect("processes");
        assert!(constructor_sink
            .messages()
            .contains(&"Endpoint inserted access rules".to_string()));
    }

    async fn insert_and_capture(group: Value) -> Vec<AccessRuleEntry> {
        let recording: Arc<RecordingStorage> = Arc::new(RecordingStorage::default());
        let storage: SharedStorage = recording.clone();
        let (logger, _sink) = capturing_logger();
        InsertRulesEndpoint::new(storage, logger)
            .process_request(args(json!([group])), None)
            .await
            .expect("processes");
        let calls = recording.0.lock().expect("not poisoned");
        calls[0].clone()
    }

    #[tokio::test]
    async fn stamps_the_exclusions_on_a_global_rule() {
        let entries = insert_and_capture(json!({
            "accessPolicy": { "type": "block" },
            "userScopes": [{ "ip": "88.98.183.93" }],
            "excludedClientIds": ["site-a", "site-b"],
        }))
        .await;
        let exclusions: Vec<Option<Vec<String>>> = entries
            .iter()
            .map(|entry| entry.rule.excluded_client_ids.clone())
            .collect();
        assert_eq!(
            exclusions,
            vec![Some(vec!["site-a".to_string(), "site-b".to_string()])]
        );
    }

    #[tokio::test]
    async fn leaves_the_exclusions_off_rules_scoped_to_a_client() {
        let entries = insert_and_capture(json!({
            "accessPolicy": { "type": "block" },
            "userScopes": [{ "ip": "88.98.183.93" }],
            "policyScopes": [{ "clientId": "site-c" }],
            "excludedClientIds": ["site-a"],
        }))
        .await;
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].rule.excluded_client_ids, None);
        assert_eq!(entries[0].rule.client_id.as_deref(), Some("site-c"));
    }

    /// The sanitiser and the rule shape on the way to the writer: what the TS test's
    /// `toEqual` on the captured entry relies on.
    #[tokio::test]
    async fn builds_one_rule_per_user_scope_and_policy_scope() {
        let entries = insert_and_capture(json!({
            "accessPolicy": { "type": "restrict", "captchaType": "pow", "powDifficulty": 5 },
            "userScopes": [{ "userAgent": "UA" }, { "ja4Hash": "j" }],
            "policyScopes": [{ "clientId": "a" }, { "clientId": "b" }],
            "groupId": "g",
            "expiresUnixTimestamp": 1900000000,
        }))
        .await;
        assert_eq!(entries.len(), 4);
        for entry in &entries {
            assert_eq!(entry.rule.group_id.as_deref(), Some("g"));
            assert_eq!(entry.expires_unix_timestamp, Some(JsNumber(1900000000.0)));
            assert_eq!(entry.rule.policy.pow_difficulty, Some(JsNumber(5.0)));
        }
        let clients: Vec<Option<&str>> = entries
            .iter()
            .map(|entry| entry.rule.client_id.as_deref())
            .collect();
        assert_eq!(clients, [Some("a"), Some("b"), Some("a"), Some("b")]);
    }
}

#[test]
fn a_rules_challenge_level_follows_its_captcha_type() {
    let read = |value: Value| -> AccessPolicy { serde_json::from_value(value).expect("a policy") };
    assert_eq!(
        read(json!({ "type": "restrict", "captchaType": "image", "solvedImagesCount": 4 }))
            .challenge_level,
        Some(ChallengeLevel::ImageRounds(JsNumber(4.0)))
    );
    assert_eq!(
        read(json!({ "type": "restrict", "captchaType": "puzzle", "solvedImagesCount": 4 }))
            .challenge_level,
        Some(ChallengeLevel::PuzzleSeverity(JsNumber(4.0)))
    );
    assert_eq!(
        read(json!({ "type": "restrict", "solvedImagesCount": 4 })).challenge_level,
        Some(ChallengeLevel::Unpinned(JsNumber(4.0)))
    );
    for value in [
        json!({ "type": "restrict", "captchaType": "image", "solvedImagesCount": 4 }),
        json!({ "type": "restrict", "captchaType": "puzzle", "solvedImagesCount": 2.5 }),
        json!({ "type": "restrict", "solvedImagesCount": 1 }),
    ] {
        assert_eq!(
            serde_json::to_value(read(value.clone())).expect("serialises"),
            value,
            "the one stored field"
        );
    }
}
