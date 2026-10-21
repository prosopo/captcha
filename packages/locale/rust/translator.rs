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

//! i18next's `Translator` (`t` and `exists`) as the server configures it:
//! default namespace `translation`, falling back to `widget` then `target`;
//! `fallbackLng` `en`; `.` between key parts and `:` before a namespace.

use std::path::Path;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::{Map, Number, Value};

use crate::catalogue::Catalogues;
use crate::detector::detect_language;
use crate::interpolator::{interpolate, NestingCursor};
use crate::js::{is_truthy, js_trim, make_string, number_to_string};
use crate::language_preference::LanguageRequest;
use crate::language_utils::{best_match_from_codes, to_resolve_hierarchy, CIMODE};
use crate::languages::Language;
use crate::translation_key::Namespace;

/// i18next's `defaultNS`.
pub const DEFAULT_NAMESPACE: Namespace = Namespace::Server;
/// i18next's `fallbackNS`, searched after the key's own namespace.
pub const FALLBACK_NAMESPACES: [Namespace; 2] = [Namespace::Widget, Namespace::Target];
const NS_SEPARATOR: char = ':';
const KEY_SEPARATOR: &str = ".";
// A pathological catalogue can nest keys in a cycle i18next only breaks
// when it is two keys long; JS then overflows its stack.
const MAX_NESTING_DEPTH: usize = 64;

static NATURAL_LANGUAGE_CHAR: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"( |,|\?|!|;)").expect("valid regex"));
static BRACED: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?s)\{.*\}").expect("valid regex"));
static OPTIONS_START: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r",[ ]*\{").expect("valid regex"));

/// An interpolation value.
#[derive(Debug, Clone, PartialEq)]
pub enum InterpolationValue {
    String(String),
    Number(f64),
    Bool(bool),
    Null,
}

impl From<&str> for InterpolationValue {
    fn from(value: &str) -> Self {
        InterpolationValue::String(value.to_owned())
    }
}

impl From<String> for InterpolationValue {
    fn from(value: String) -> Self {
        InterpolationValue::String(value)
    }
}

impl From<f64> for InterpolationValue {
    fn from(value: f64) -> Self {
        InterpolationValue::Number(value)
    }
}

impl From<i64> for InterpolationValue {
    fn from(value: i64) -> Self {
        InterpolationValue::Number(value as f64)
    }
}

impl From<bool> for InterpolationValue {
    fn from(value: bool) -> Self {
        InterpolationValue::Bool(value)
    }
}

impl InterpolationValue {
    fn to_json(&self) -> Value {
        match self {
            InterpolationValue::String(text) => Value::String(text.clone()),
            InterpolationValue::Number(number) => Number::from_f64(*number)
                .map(Value::Number)
                .unwrap_or_else(|| Value::String(number_to_string(*number))),
            InterpolationValue::Bool(flag) => Value::Bool(*flag),
            InterpolationValue::Null => Value::Null,
        }
    }
}

/// `TranslateOptions`: a `defaultValue`, a language to translate into other
/// than the translator's own (`lng`), and `{{name}}` values. i18next reads
/// options and values from one object, so a value must not be named after an
/// i18next option (`ns`, `count`, `context`, `replace`, ...).
#[derive(Debug, Clone, Default, PartialEq)]
pub struct TranslateOptions {
    pub default_value: Option<String>,
    pub lng: Option<String>,
    pub values: Vec<(String, InterpolationValue)>,
}

impl TranslateOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn default_value(mut self, value: impl Into<String>) -> Self {
        self.default_value = Some(value.into());
        self
    }

    pub fn lng(mut self, language: impl Into<String>) -> Self {
        self.lng = Some(language.into());
        self
    }

    pub fn value(mut self, name: impl Into<String>, value: impl Into<InterpolationValue>) -> Self {
        self.values.push((name.into(), value.into()));
        self
    }

    fn to_map(&self) -> Map<String, Value> {
        let mut map: Map<String, Value> = Map::new();
        for (name, value) in &self.values {
            map.insert(name.clone(), value.to_json());
        }
        if let Some(language) = &self.lng {
            map.insert("lng".to_owned(), Value::String(language.clone()));
        }
        if let Some(default_value) = &self.default_value {
            map.insert(
                "defaultValue".to_owned(),
                Value::String(default_value.clone()),
            );
        }
        map
    }
}

/// The slice of an i18n instance error handling uses (`I18nLookup`).
pub trait I18nLookup {
    fn t(&self, key: &str) -> String;
    fn t_with(&self, key: &str, options: &TranslateOptions) -> String;
    fn exists(&self, key: &str) -> bool;
}

/// `canTranslate`: whether the instance has text for a runtime string.
pub fn can_translate<L: I18nLookup + ?Sized>(i18n: &L, value: &str) -> bool {
    i18n.exists(value)
}

/// The server's i18next instance: the catalogues plus `escapeValue`.
#[derive(Debug, Clone)]
pub struct I18n {
    catalogues: Catalogues,
    escape_value: bool,
}

impl I18n {
    pub fn new(catalogues: Catalogues) -> I18n {
        I18n {
            catalogues,
            escape_value: true,
        }
    }

    /// Loads the catalogues from `directory`, see [`Catalogues::load`].
    pub fn load(directory: &Path) -> I18n {
        I18n::new(Catalogues::load(directory))
    }

    /// `interpolation.escapeValue`, on by default as in i18next.
    pub fn with_escape_value(mut self, escape_value: bool) -> I18n {
        self.escape_value = escape_value;
        self
    }

    pub fn catalogues(&self) -> &Catalogues {
        &self.catalogues
    }

    /// The language `changeLanguage(lng)` leaves an instance on.
    pub fn change_language(&self, language: &str) -> String {
        if self.catalogues.has_language_some_translations(language) {
            language.to_owned()
        } else {
            best_match_from_codes(&[language])
        }
    }

    /// An instance on `language`, as `changeLanguage` would leave it.
    pub fn fixed_t(&self, language: &str) -> FixedT<'_> {
        FixedT {
            i18n: self,
            language: self.change_language(language),
        }
    }

    /// What i18next-http-middleware hands a request as `req.t`.
    pub fn for_request(&self, request: &LanguageRequest) -> FixedT<'_> {
        let language: Language = detect_language(request);
        self.fixed_t(language.code())
    }

    /// `t(key, options)` on an instance whose language is `language`.
    pub fn t(&self, language: &str, key: &str, options: &TranslateOptions) -> String {
        let translator: Translator<'_> = Translator {
            i18n: self,
            language,
            cursor: NestingCursor::default(),
        };
        make_string(&translator.translate(key, options.to_map(), None, 0))
    }

    /// `exists(key)` on an instance whose language is `language`.
    pub fn exists(&self, language: &str, key: &str) -> bool {
        self.exists_with(language, key, &TranslateOptions::default())
    }

    pub fn exists_with(&self, language: &str, key: &str, options: &TranslateOptions) -> bool {
        let translator: Translator<'_> = Translator {
            i18n: self,
            language,
            cursor: NestingCursor::default(),
        };
        translator.resolve(key, &options.to_map()).found.is_some()
    }
}

/// An [`I18n`] fixed to one language, like a per-request i18next clone.
#[derive(Debug, Clone)]
pub struct FixedT<'a> {
    i18n: &'a I18n,
    language: String,
}

impl FixedT<'_> {
    pub fn language(&self) -> &str {
        &self.language
    }
}

impl I18nLookup for FixedT<'_> {
    fn t(&self, key: &str) -> String {
        self.i18n
            .t(&self.language, key, &TranslateOptions::default())
    }

    fn t_with(&self, key: &str, options: &TranslateOptions) -> String {
        self.i18n.t(&self.language, key, options)
    }

    fn exists(&self, key: &str) -> bool {
        self.i18n.exists(&self.language, key)
    }
}

struct Resolved {
    found: Option<Value>,
}

struct Translator<'a> {
    i18n: &'a I18n,
    language: &'a str,
    cursor: NestingCursor,
}

fn looks_like_object_path(key: &str) -> bool {
    if !NATURAL_LANGUAGE_CHAR.is_match(key) {
        return true;
    }
    matches!(key.find(KEY_SEPARATOR), Some(index) if index > 0 && !NATURAL_LANGUAGE_CHAR.is_match(&key[..index]))
}

fn namespaces_of(options: &Map<String, Value>) -> Vec<String> {
    match options.get("ns").filter(|ns| is_truthy(ns)) {
        Some(Value::String(ns)) => vec![ns.clone()],
        Some(Value::Array(list)) => list.iter().map(make_string).collect(),
        Some(other) => vec![make_string(other)],
        None => vec![DEFAULT_NAMESPACE.name().to_owned()],
    }
}

fn is_valid_lookup(value: Option<&Value>) -> bool {
    value.is_some_and(|value| !value.is_null())
}

fn handle_as_object(value: &Value) -> bool {
    matches!(value, Value::Object(_) | Value::Array(_))
}

impl Translator<'_> {
    fn language_for(&self, options: &Map<String, Value>) -> String {
        match options.get("lng") {
            Some(Value::String(language)) if !language.is_empty() => language.clone(),
            _ => self.language.to_owned(),
        }
    }

    /// `extractFromKey`: the key and the namespaces to look it up in.
    fn extract_from_key(&self, key: &str, options: &Map<String, Value>) -> (String, Vec<String>) {
        let namespaces: Vec<String> = namespaces_of(options);
        let would_check_for_ns: bool = key.contains(NS_SEPARATOR);
        if would_check_for_ns && looks_like_object_path(key) {
            if self.cursor.count_matches(key) > 0 {
                return (key.to_owned(), namespaces);
            }
            let mut parts = key.split(NS_SEPARATOR);
            let namespace: String = parts.next().unwrap_or("").to_owned();
            let rest: Vec<&str> = parts.collect();
            return (rest.join(KEY_SEPARATOR), vec![namespace]);
        }
        (key.to_owned(), namespaces)
    }

    fn resolve(&self, key: &str, options: &Map<String, Value>) -> Resolved {
        let (key, namespaces) = self.extract_from_key(key, options);
        let codes: Vec<String> = to_resolve_hierarchy(&self.language_for(options));
        let mut found: Option<&Value> = None;
        // i18next pops candidate keys `while (possibleKey = finalKeys.pop())`,
        // so an empty key is never looked up at all.
        if key.is_empty() {
            return Resolved { found: None };
        }
        let all_namespaces = namespaces
            .iter()
            .map(String::as_str)
            .chain(FALLBACK_NAMESPACES.iter().map(|ns| ns.name()));
        'search: for namespace in all_namespaces {
            for code in &codes {
                found = self.i18n.catalogues.get_resource(code, namespace, &key);
                if is_valid_lookup(found) {
                    break 'search;
                }
            }
        }
        Resolved {
            found: found.cloned(),
        }
    }

    fn translate(
        &self,
        key_in: &str,
        mut options: Map<String, Value>,
        last_key: Option<&str>,
        depth: usize,
    ) -> Value {
        let (key, _) = self.extract_from_key(key_in, &options);
        if self.language_for(&options).to_lowercase() == CIMODE {
            return Value::String(key);
        }
        let resolved: Resolved = self.resolve(key_in, &options);
        let mut result: Option<Value> = resolved.found.clone();
        let has_default_value: bool = options.keys().any(|name| name.starts_with("defaultValue"));
        let default_value: Option<Value> = options.get("defaultValue").cloned();
        let for_object_handling: Option<&Value> =
            if !result.as_ref().is_some_and(is_truthy) && has_default_value {
                default_value.as_ref()
            } else {
                result.as_ref()
            };
        if for_object_handling.is_some_and(handle_as_object) {
            return Value::String(format!(
                "key '{key} ({})' returned an object instead of string.",
                self.language
            ));
        }
        if !is_valid_lookup(result.as_ref()) && has_default_value {
            result = default_value;
        }
        let result: Value = match result {
            Some(value) if !value.is_null() => value,
            _ => Value::String(key),
        };
        let found_truthy: bool = resolved.found.as_ref().is_some_and(is_truthy);
        self.extend_translation(result, key_in, &mut options, found_truthy, last_key, depth)
    }

    fn extend_translation(
        &self,
        result: Value,
        key_in: &str,
        options: &mut Map<String, Value>,
        found_truthy: bool,
        last_key: Option<&str>,
        depth: usize,
    ) -> Value {
        if options.get("skipInterpolation").is_some_and(is_truthy) {
            return result;
        }
        let Value::String(text) = result else {
            self.cursor.set(0);
            return result;
        };
        let before: usize = self.cursor.count_matches(&text);
        let text: String = interpolate(
            &text,
            options,
            Some(options),
            self.i18n.escape_value,
            &self.cursor,
        );
        let after: usize = self.cursor.count_matches(&text);
        if before < after {
            options.insert("nest".to_owned(), Value::Bool(false));
        }
        if !options.get("lng").is_some_and(is_truthy) && found_truthy {
            options.insert("lng".to_owned(), Value::String(self.language.to_owned()));
        }
        if options.get("nest") == Some(&Value::Bool(false)) {
            return Value::String(text);
        }
        self.nest(text, options, key_in, last_key, depth)
    }

    /// `handleHasOptions`: splits `key, {"json": "options"}` and merges the
    /// options over the inherited ones.
    fn handle_has_options(&self, key: &str, options: &mut Map<String, Value>) -> String {
        if !key.contains(',') {
            return key.to_owned();
        }
        let parts: Vec<&str> = OPTIONS_START.split(key).collect();
        let key: &str = parts[0];
        let options_string: String = format!("{{{}", parts.get(1).copied().unwrap_or("undefined"));
        let mut options_string: String = interpolate(
            &options_string,
            options,
            None,
            self.i18n.escape_value,
            &self.cursor,
        );
        let single_quotes: usize = options_string.matches('\'').count();
        let double_quotes: usize = options_string.matches('"').count();
        if (single_quotes % 2 == 0 && double_quotes == 0) || double_quotes % 2 != 0 {
            options_string = options_string.replace('\'', "\"");
        }
        match serde_json::from_str::<Value>(&options_string) {
            Ok(Value::Object(parsed)) => {
                for (name, value) in parsed {
                    options.insert(name, value);
                }
            }
            Ok(_) | Err(_) => return format!("{key},{options_string}"),
        }
        let drop_default: bool = matches!(
            options.get("defaultValue"),
            Some(Value::String(default_value)) if default_value.contains(r"\{\{")
        );
        if drop_default {
            options.remove("defaultValue");
        }
        key.to_owned()
    }

    /// `Interpolator.nest`: replaces each `$t(key)` with that key's text.
    fn nest(
        &self,
        mut text: String,
        options: &Map<String, Value>,
        key_in: &str,
        last_key: Option<&str>,
        depth: usize,
    ) -> Value {
        loop {
            let (whole, inner) = match self.cursor.exec(&text) {
                Some(captures) => (captures[0].to_owned(), captures[1].to_owned()),
                None => break,
            };
            let mut cloned: Map<String, Value> = options.clone();
            cloned.insert("applyPostProcessor".to_owned(), Value::Bool(false));
            cloned.remove("defaultValue");
            let key_end: Option<usize> = if BRACED.is_match(&inner) {
                inner.rfind('}').map(|index| index + 1)
            } else {
                inner.find(',')
            };
            let (inner, formatters): (&str, Vec<&str>) = match key_end {
                Some(end) => (
                    &inner[..end],
                    inner[end..]
                        .split(',')
                        .map(js_trim)
                        .filter(|formatter| !formatter.is_empty())
                        .collect(),
                ),
                None => (inner.as_str(), Vec::new()),
            };
            let nested_key: String = self.handle_has_options(js_trim(inner), &mut cloned);
            let has_context: bool = options.get("context").is_some_and(is_truthy);
            let value: Value = if last_key == Some(nested_key.as_str()) && !has_context {
                Value::Null
            } else if depth >= MAX_NESTING_DEPTH {
                Value::Null
            } else {
                self.translate(&nested_key, cloned, Some(key_in), depth + 1)
            };
            if is_truthy(&value) && whole == text && !value.is_string() {
                return value;
            }
            let mut value: String = make_string(&value);
            if !formatters.is_empty() {
                value = js_trim(&value).to_owned();
            }
            text = text.replacen(&whole, &value, 1);
        }
        Value::String(text)
    }
}
