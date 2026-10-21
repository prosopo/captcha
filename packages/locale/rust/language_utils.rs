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

//! i18next's `LanguageUtil`, configured as i18nBackend.ts configures it:
//! `supportedLngs` is every catalogue code (plus the `cimode` i18next adds),
//! `nonExplicitSupportedLngs` is false, `load` is "all" and `fallbackLng` is
//! `["en"]`.

use crate::js::utf16_len;
use crate::languages::{FALLBACK_LANGUAGE, LANGUAGE_CODES};

pub const CIMODE: &str = "cimode";

pub fn is_supported_code(code: &str) -> bool {
    code == CIMODE || LANGUAGE_CODES.contains(&code)
}

fn cleaned(code: &str) -> String {
    code.replace('_', "-")
}

fn is_alpha(subtag: &str) -> bool {
    subtag.bytes().all(|byte| byte.is_ascii_alphabetic())
}

fn is_digit(subtag: &str) -> bool {
    subtag.bytes().all(|byte| byte.is_ascii_digit())
}

fn is_alphanumeric(subtag: &str) -> bool {
    subtag.bytes().all(|byte| byte.is_ascii_alphanumeric())
}

fn title_case(subtag: &str) -> String {
    let lower: String = subtag.to_ascii_lowercase();
    let mut chars = lower.chars();
    chars
        .next()
        .map(|first| first.to_ascii_uppercase().to_string() + chars.as_str())
        .unwrap_or_default()
}

/// `Intl.getCanonicalLocales(code)[0]` for a language[-script][-region]
/// [-variant...] tag: the case conventions only. CLDR alias replacement
/// (`iw-IL` to `he-IL`, `cmn-TW` to `zh-TW`) and extensions are not
/// reproduced; tags with them come back as `None`, as unparseable ones do.
fn canonical_locale(code: &str) -> Option<String> {
    let subtags: Vec<&str> = code.split('-').collect();
    let (language, rest) = subtags.split_first()?;
    if !(matches!(language.len(), 2 | 3 | 5..=8) && is_alpha(language)) {
        return None;
    }
    let mut canonical: Vec<String> = vec![language.to_ascii_lowercase()];
    let mut rest: &[&str] = rest;
    if let Some((script, tail)) = rest.split_first() {
        if script.len() == 4 && is_alpha(script) {
            canonical.push(title_case(script));
            rest = tail;
        }
    }
    if let Some((region, tail)) = rest.split_first() {
        if (region.len() == 2 && is_alpha(region)) || (region.len() == 3 && is_digit(region)) {
            canonical.push(region.to_ascii_uppercase());
            rest = tail;
        }
    }
    let mut variants: Vec<String> = Vec::new();
    for variant in rest {
        let valid: bool = is_alphanumeric(variant)
            && (matches!(variant.len(), 5..=8)
                || (variant.len() == 4 && variant.as_bytes()[0].is_ascii_digit()));
        let lower: String = variant.to_ascii_lowercase();
        if !valid || variants.contains(&lower) {
            return None;
        }
        variants.push(lower);
    }
    variants.sort();
    canonical.extend(variants);
    Some(canonical.join("-"))
}

/// `formatLanguageCode`, with `lowerCaseLng` and `cleanCode` off.
pub fn format_language_code(code: &str) -> String {
    if code.contains('-') {
        return canonical_locale(code).unwrap_or_else(|| code.to_owned());
    }
    code.to_owned()
}

/// `getScriptPartFromCode`.
pub fn script_part_from_code(code: &str) -> Option<String> {
    let code: String = cleaned(code);
    if code.is_empty() || !code.contains('-') {
        return None;
    }
    let mut parts: Vec<&str> = code.split('-').collect();
    if parts.len() == 2 {
        return None;
    }
    parts.pop();
    if parts.last()?.eq_ignore_ascii_case("x") {
        return None;
    }
    Some(format_language_code(&parts.join("-")))
}

/// `getLanguagePartFromCode`.
pub fn language_part_from_code(code: &str) -> String {
    let code: String = cleaned(code);
    if code.is_empty() || !code.contains('-') {
        return code;
    }
    format_language_code(code.split('-').next().unwrap_or(""))
}

/// `toResolveHierarchy(code)`: the codes `t` looks a key up in, in order.
pub fn to_resolve_hierarchy(code: &str) -> Vec<String> {
    let mut codes: Vec<String> = Vec::new();
    let add = |candidate: Option<String>, codes: &mut Vec<String>| {
        if let Some(candidate) = candidate.filter(|c| !c.is_empty()) {
            if is_supported_code(&candidate) {
                codes.push(candidate);
            }
        }
    };
    if code.contains('-') || code.contains('_') {
        add(Some(format_language_code(code)), &mut codes);
        add(script_part_from_code(code), &mut codes);
        add(Some(language_part_from_code(code)), &mut codes);
    } else {
        add(Some(format_language_code(code)), &mut codes);
    }
    let fallback: &str = FALLBACK_LANGUAGE.code();
    if !codes.iter().any(|c| c == fallback) {
        add(Some(format_language_code(fallback)), &mut codes);
    }
    codes
}

/// `getBestMatchFromCodes`.
pub fn best_match_from_codes<S: AsRef<str>>(codes: &[S]) -> String {
    if let Some(found) = codes
        .iter()
        .map(|code| format_language_code(code.as_ref()))
        .find(|cleaned| is_supported_code(cleaned))
    {
        return found;
    }
    for code in codes {
        let code: &str = code.as_ref();
        if let Some(script) = script_part_from_code(code).filter(|s| is_supported_code(s)) {
            return script;
        }
        let language: String = language_part_from_code(code);
        if is_supported_code(&language) {
            return language;
        }
        let found: Option<&str> = supported_codes().find(|supported| {
            if *supported == language {
                return true;
            }
            if !supported.contains('-') && !language.contains('-') {
                return false;
            }
            if supported.contains('-')
                && !language.contains('-')
                && supported.split('-').next() == Some(language.as_str())
            {
                return true;
            }
            supported.starts_with(language.as_str()) && utf16_len(&language) > 1
        });
        if let Some(found) = found {
            return found.to_owned();
        }
    }
    FALLBACK_LANGUAGE.code().to_owned()
}

fn supported_codes() -> impl Iterator<Item = &'static str> {
    LANGUAGE_CODES
        .iter()
        .copied()
        .chain(std::iter::once(CIMODE))
}
