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

// Ported from src/tests/languagePreference.unit.test.ts

use crate::language_preference::{
    language_headers, match_language, match_language_tag, negotiate_language, parse_language_list,
    request_language, resolve_language_list, LanguageRequest, LANGUAGE_HEADER,
};
use crate::languages::Language;

fn request(
    query: Option<&str>,
    prosopo_lang: Option<&str>,
    accept_language: Option<&str>,
) -> LanguageRequest {
    LanguageRequest {
        query_lng: query.map(str::to_owned),
        prosopo_lang: prosopo_lang.map(str::to_owned),
        accept_language: accept_language.map(str::to_owned),
    }
}

#[test]
fn parse_returns_nothing_for_an_empty_or_missing_value() {
    assert!(parse_language_list(None).is_empty());
    assert!(parse_language_list(Some("")).is_empty());
    assert!(parse_language_list(Some(" , ")).is_empty());
}

#[test]
fn parse_keeps_the_written_order_when_no_weights_are_given() {
    assert_eq!(parse_language_list(Some("xx, tr ,en")), ["xx", "tr", "en"]);
}

#[test]
fn parse_sorts_by_weight_keeping_order_between_equal_weights() {
    assert_eq!(
        parse_language_list(Some("en;q=0.5, tr-TR, de;q=0.8, tr;q=0.8, fr;q=0.5")),
        ["tr-TR", "de", "tr", "en", "fr"]
    );
}

#[test]
fn parse_drops_q0_wildcards_bad_weights_and_malformed_tags() {
    assert_eq!(
        parse_language_list(Some(
            "tr;q=0, *, de;q=abc, fr;q=2, ../x, en-, es;Q=0.3, it;level=1"
        )),
        ["it", "es"]
    );
}

#[test]
fn parse_caps_the_list_at_ten_entries() {
    let many: String = (0..15u8)
        .map(|index| format!("x{}", char::from(97 + index)))
        .collect::<Vec<String>>()
        .join(",");
    assert_eq!(parse_language_list(Some(&many)).len(), 10);
}

#[test]
fn match_language_tag_cases() {
    let cases: [(&str, Option<Language>); 36] = [
        ("tr", Some(Language::Turkish)),
        ("tr-TR", Some(Language::Turkish)),
        ("TR-tr", Some(Language::Turkish)),
        ("pt-BR", Some(Language::PortugeseBrazil)),
        ("pt-br", Some(Language::PortugeseBrazil)),
        ("pt-PT", Some(Language::Portuguese)),
        ("zh-CN", Some(Language::ChineseChina)),
        ("zh-Hans-CN", Some(Language::Chinese)),
        ("zh-Hans-TW", Some(Language::Chinese)),
        ("zh-SG", Some(Language::Chinese)),
        ("zh-TW", Some(Language::ChineseTaiwan)),
        ("zh-tw", Some(Language::ChineseTaiwan)),
        ("zh-HK", Some(Language::ChineseHongKong)),
        ("zh-MO", Some(Language::ChineseHongKong)),
        ("zh-Hant", Some(Language::ChineseTaiwan)),
        ("zh-Hant-TW", Some(Language::ChineseTaiwan)),
        ("zh-Hant-HK", Some(Language::ChineseHongKong)),
        ("zh-Hant-MO", Some(Language::ChineseHongKong)),
        ("nb", Some(Language::Norwegian)),
        ("nn-NO", Some(Language::NorwegianNynorsk)),
        ("no", Some(Language::Norwegian)),
        ("in", Some(Language::Indonesian)),
        ("jw", Some(Language::Javanese)),
        ("iw", Some(Language::Hebrew)),
        ("iw-IL", Some(Language::Hebrew)),
        ("tl", Some(Language::Filipino)),
        ("fy-NL", Some(Language::Frisian)),
        ("ga-IE", Some(Language::Irish)),
        ("ca-valencia", Some(Language::Catalan)),
        ("es-419", Some(Language::Spanish)),
        ("sr-Latn", Some(Language::Serbian)),
        ("en-GB", Some(Language::English)),
        ("xx", None),
        ("xx-TR", None),
        ("", None),
        ("../tr", None),
    ];
    for (tag, expected) in cases {
        assert_eq!(match_language_tag(tag), expected, "{tag} -> {expected:?}");
    }
}

#[test]
fn match_takes_the_first_preference_with_a_catalogue() {
    assert_eq!(
        match_language(&["xx", "tr-TR", "de"]),
        Some(Language::Turkish)
    );
}

#[test]
fn match_serves_traditional_chinese_its_own_catalogue() {
    assert_eq!(
        match_language(&["zh-TW", "en"]),
        Some(Language::ChineseTaiwan)
    );
    assert_eq!(
        match_language(&["zh-Hant-MO", "en"]),
        Some(Language::ChineseHongKong)
    );
}

#[test]
fn match_matches_a_whole_tag_before_moving_to_the_next_preference() {
    assert_eq!(match_language(&["de-AT", "tr"]), Some(Language::German));
}

#[test]
fn match_returns_none_when_nothing_matches_and_negotiate_falls_back_to_en() {
    assert_eq!(match_language(&["xx", "yy"]), None);
    assert_eq!(match_language::<&str>(&[]), None);
    assert_eq!(negotiate_language(&["xx"]), Language::English);
    assert_eq!(negotiate_language(&["nb-NO"]), Language::Norwegian);
}

#[test]
fn language_headers_sends_the_list_in_prosopo_lang() {
    assert_eq!(
        language_headers(&["tr-TR", "en"]),
        Some((LANGUAGE_HEADER, "tr-TR,en".to_owned()))
    );
}

#[test]
fn language_headers_leaves_accept_language_to_the_browser() {
    assert_eq!(
        language_headers(&["tr", "en"]).map(|(name, _)| name),
        Some(LANGUAGE_HEADER)
    );
}

#[test]
fn language_headers_drops_malformed_tags_and_keeps_at_most_ten() {
    let tags: [&str; 11] = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"];
    assert_eq!(
        language_headers(&tags).map(|(_, value)| value).as_deref(),
        Some("a,b,c,d,e,f,g,h,i,j")
    );
    assert_eq!(
        language_headers(&["tr", "bad tag", "en"]),
        Some((LANGUAGE_HEADER, "tr,en".to_owned()))
    );
}

#[test]
fn language_headers_round_trips_through_parse_language_list() {
    let preferences: [&str; 3] = ["zh-TW", "tr", "en-GB"];
    let header: Option<String> = language_headers(&preferences).map(|(_, value)| value);
    assert_eq!(parse_language_list(header.as_deref()), preferences);
}

#[test]
fn language_headers_sends_nothing_for_an_empty_list() {
    assert_eq!(language_headers::<&str>(&[]), None);
    assert_eq!(language_headers(&["not a tag"]), None);
}

#[test]
fn request_prefers_the_query_parameter_then_prosopo_lang_then_accept_language() {
    assert_eq!(
        request_language(&request(Some("tr"), Some("de"), Some("fr"))),
        Language::Turkish
    );
    assert_eq!(
        request_language(&request(None, Some("de"), Some("fr"))),
        Language::German
    );
    assert_eq!(
        request_language(&request(None, None, Some("fr"))),
        Language::French
    );
}

#[test]
fn request_skips_a_source_that_names_no_supported_language() {
    assert_eq!(
        request_language(&request(Some("xx"), Some("yy"), Some("tr-TR,en;q=0.5"))),
        Language::Turkish
    );
}

// Express hands repeated values over as arrays; the caller passes the first.
#[test]
fn request_reads_the_first_value_of_a_repeated_parameter_or_header() {
    assert_eq!(
        request_language(&request(Some("tr"), Some("fr"), None)),
        Language::Turkish
    );
    assert_eq!(
        request_language(&request(None, Some("fr"), None)),
        Language::French
    );
}

// A non-string query value (`?lng[nested]=tr`) has no first string, so the
// caller passes none.
#[test]
fn request_ignores_non_string_query_values() {
    assert_eq!(
        request_language(&request(None, None, Some("de"))),
        Language::German
    );
}

#[test]
fn request_falls_back_to_english() {
    assert_eq!(
        request_language(&LanguageRequest::default()),
        Language::English
    );
    assert_eq!(
        request_language(&request(None, None, Some("xx"))),
        Language::English
    );
}

#[test]
fn resolve_language_list_resolves_a_site_supplied_list_to_its_first_catalogue() {
    assert_eq!(
        resolve_language_list(Some("xx, tr-TR, de")),
        Some(Language::Turkish)
    );
    assert_eq!(
        resolve_language_list(Some("xx-YY, de")),
        Some(Language::German)
    );
}

#[test]
fn resolve_language_list_has_nothing_for_an_empty_or_unsupported_choice() {
    assert_eq!(resolve_language_list(None), None);
    assert_eq!(resolve_language_list(Some("xx")), None);
}
