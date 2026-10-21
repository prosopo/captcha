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

//! One language negotiation shared by the widget and the provider
//! (languagePreference.ts).

use std::sync::LazyLock;

use regex::Regex;

use crate::js::js_trim;
use crate::languages::{Language, FALLBACK_LANGUAGE, LANGUAGES};

/// Our own header for the widget's language list, beside Accept-Language.
pub const LANGUAGE_HEADER: &str = "Prosopo-Lang";
/// Query parameter for clients that cannot set headers. Wins over both.
pub const LANGUAGE_QUERY_PARAM: &str = "lng";

const MAX_PREFERENCES: usize = 10;

static LANGUAGE_TAG: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[A-Za-z]{1,8}(?:-[A-Za-z0-9]{1,8})*$").expect("valid regex"));
static WEIGHT_PARAM: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^q=").expect("valid regex"));
static WEIGHT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^q=[0-9]+(?:\.[0-9]*)?$").expect("valid regex"));

pub fn is_language_tag(tag: &str) -> bool {
    LANGUAGE_TAG.is_match(tag)
}

fn alias(primary: &str) -> Option<Language> {
    match primary {
        "nb" => Some(Language::Norwegian),
        "in" => Some(Language::Indonesian),
        "iw" => Some(Language::Hebrew),
        "jw" => Some(Language::Javanese),
        "tl" => Some(Language::Filipino),
        _ => None,
    }
}

fn by_lower_case(code: &str) -> Option<Language> {
    LANGUAGES
        .iter()
        .copied()
        .find(|language| language.code().to_ascii_lowercase() == code)
}

/// `parseLanguageList`: an Accept-Language style list as tags, most preferred
/// first. Equal weights keep their order, `q=0` and `*` are dropped, and
/// anything malformed is skipped.
pub fn parse_language_list(value: Option<&str>) -> Vec<String> {
    let value: &str = match value {
        Some(value) if !value.is_empty() => value,
        _ => return Vec::new(),
    };
    let mut entries: Vec<(String, f64, usize)> = value
        .split(',')
        .enumerate()
        .map(|(index, entry)| {
            let mut parts = entry.split(';').map(js_trim);
            let tag: &str = parts.next().unwrap_or("");
            let weight: Option<&str> = parts.find(|param| WEIGHT_PARAM.is_match(param));
            let q: f64 = match weight {
                None => 1.0,
                Some(weight) if WEIGHT.is_match(weight) => {
                    weight[2..].parse::<f64>().unwrap_or(f64::NAN)
                }
                Some(_) => f64::NAN,
            };
            (tag.to_owned(), q, index)
        })
        .filter(|(tag, q, _)| is_language_tag(tag) && q.is_finite() && *q > 0.0 && *q <= 1.0)
        .collect();
    entries.sort_by(|a, b| b.1.total_cmp(&a.1).then(a.2.cmp(&b.2)));
    entries
        .into_iter()
        .map(|(tag, _, _)| tag)
        .take(MAX_PREFERENCES)
        .collect()
}

const TRADITIONAL_CHINESE_SUBTAGS: &[&str] = &["hant", "tw", "hk", "mo"];
const HONG_KONG_CHINESE_SUBTAGS: &[&str] = &["hk", "mo"];

fn is_traditional_chinese(subtags: &[&str]) -> bool {
    subtags.first() == Some(&"zh")
        && !subtags.contains(&"hans")
        && subtags
            .iter()
            .any(|subtag| TRADITIONAL_CHINESE_SUBTAGS.contains(subtag))
}

fn traditional_chinese(subtags: &[&str]) -> Language {
    if subtags
        .iter()
        .any(|subtag| HONG_KONG_CHINESE_SUBTAGS.contains(subtag))
    {
        Language::ChineseHongKong
    } else {
        Language::ChineseTaiwan
    }
}

/// `matchLanguageTag`: the catalogue for one tag, by RFC 4647 lookup, with
/// Traditional Chinese sent to `zh-TW`/`zh-HK` and aliases for the primary
/// subtag. Case is ignored.
pub fn match_language_tag(tag: &str) -> Option<Language> {
    if !is_language_tag(tag) {
        return None;
    }
    let lower: String = tag.to_ascii_lowercase();
    let subtags: Vec<&str> = lower.split('-').collect();
    if is_traditional_chinese(&subtags) {
        return Some(traditional_chinese(&subtags));
    }
    for length in (1..=subtags.len()).rev() {
        if let Some(found) = by_lower_case(&subtags[..length].join("-")) {
            return Some(found);
        }
    }
    subtags.first().and_then(|primary| alias(primary))
}

/// `matchLanguage`: the first preference we have a catalogue for.
pub fn match_language<S: AsRef<str>>(preferences: &[S]) -> Option<Language> {
    preferences
        .iter()
        .find_map(|tag| match_language_tag(tag.as_ref()))
}

/// `resolveLanguageList`: a site-supplied list's first catalogue.
pub fn resolve_language_list(value: Option<&str>) -> Option<Language> {
    match_language(&parse_language_list(value))
}

/// `negotiateLanguage`: like [`match_language`], falling back to English.
pub fn negotiate_language<S: AsRef<str>>(preferences: &[S]) -> Language {
    match_language(preferences).unwrap_or(FALLBACK_LANGUAGE)
}

/// `languageHeaders`: the Prosopo-Lang header for a preference list, or
/// `None` when no tag in it is well formed.
pub fn language_headers<S: AsRef<str>>(preferences: &[S]) -> Option<(&'static str, String)> {
    let tags: Vec<&str> = preferences
        .iter()
        .map(AsRef::as_ref)
        .filter(|tag| is_language_tag(tag))
        .take(MAX_PREFERENCES)
        .collect();
    (!tags.is_empty()).then(|| (LANGUAGE_HEADER, tags.join(",")))
}

/// The parts of an HTTP request the provider negotiates from
/// (`LanguageRequest`). There is deliberately no cookie: the widget runs on
/// other people's sites and the detector never reads one.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct LanguageRequest {
    /// The first string value of the `lng` query parameter.
    pub query_lng: Option<String>,
    /// The Prosopo-Lang header.
    pub prosopo_lang: Option<String>,
    /// The Accept-Language header.
    pub accept_language: Option<String>,
}

impl LanguageRequest {
    /// From the first `lng` query value and the raw header list. Header names
    /// are matched case-insensitively and repeated headers are joined with
    /// ", ", which is what Node hands express for these two headers.
    pub fn from_parts<'a, H>(query_lng: Option<&str>, headers: H) -> LanguageRequest
    where
        H: IntoIterator<Item = (&'a str, &'a str)>,
    {
        let mut request = LanguageRequest {
            query_lng: query_lng.map(str::to_owned),
            ..LanguageRequest::default()
        };
        for (name, value) in headers {
            let slot: &mut Option<String> = if name.eq_ignore_ascii_case(LANGUAGE_HEADER) {
                &mut request.prosopo_lang
            } else if name.eq_ignore_ascii_case("accept-language") {
                &mut request.accept_language
            } else {
                continue;
            };
            match slot {
                Some(joined) => {
                    joined.push_str(", ");
                    joined.push_str(value);
                }
                None => *slot = Some(value.to_owned()),
            }
        }
        request
    }
}

/// `requestLanguage`: `?lng=` beats Prosopo-Lang, which beats
/// Accept-Language. A source naming only languages we do not have is
/// skipped, so the next one still counts. Falls back to English.
pub fn request_language(request: &LanguageRequest) -> Language {
    [
        request.query_lng.as_deref(),
        request.prosopo_lang.as_deref(),
        request.accept_language.as_deref(),
    ]
    .into_iter()
    .find_map(|source| match_language(&parse_language_list(source)))
    .unwrap_or(FALLBACK_LANGUAGE)
}
