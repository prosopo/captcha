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

//! i18next's `Interpolator` with the defaults the provider runs on:
//! `{{var}}` (escaped unless `escapeValue` is off), `{{- var}}` (never
//! escaped), `skipOnVariables` on, at most 1000 replacements per pattern.

use std::cell::Cell;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::{Map, Value};

use crate::catalogue::{deep_find, get_path};
use crate::js::{byte_offset, is_truthy, js_trim, make_string, utf16_len, utf16_offset};

const MAX_REPLACES: usize = 1000;

// JS `.` stops at every ECMAScript line terminator, Rust's only at \n.
static VARIABLE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\{\{([^\n\r\u{2028}\u{2029}]+?)\}\}").expect("valid regex"));
static UNESCAPED_VARIABLE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\{\{-([^\n\r\u{2028}\u{2029}]+?)\}\}").expect("valid regex"));
pub(crate) static NESTING: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"\$t\(((?:[^()"']+|"[^"]*"|'[^']*'|\((?:[^()]|"[^"]*"|'[^']*')*\))*?)\)"#)
        .expect("valid regex")
});

/// i18next's default `escape`.
pub fn escape(value: &str) -> String {
    let mut escaped: String = String::with_capacity(value.len());
    for c in value.chars() {
        match c {
            '&' => escaped.push_str("&amp;"),
            '<' => escaped.push_str("&lt;"),
            '>' => escaped.push_str("&gt;"),
            '"' => escaped.push_str("&quot;"),
            '\'' => escaped.push_str("&#39;"),
            '/' => escaped.push_str("&#x2F;"),
            other => escaped.push(other),
        }
    }
    escaped
}

/// The `lastIndex` of the interpolator's global nesting regex, which i18next
/// shares between a nesting loop and every translation nested inside it.
#[derive(Debug, Default)]
pub(crate) struct NestingCursor(Cell<usize>);

impl NestingCursor {
    pub(crate) fn get(&self) -> usize {
        self.0.get()
    }

    pub(crate) fn set(&self, index: usize) {
        self.0.set(index);
    }

    /// `String.prototype.match` with the global nesting regex: the number of
    /// matches, leaving `lastIndex` at 0.
    pub(crate) fn count_matches(&self, text: &str) -> usize {
        self.set(0);
        NESTING.find_iter(text).count()
    }

    /// `RegExp.prototype.exec` from the current `lastIndex`.
    pub(crate) fn exec<'t>(&self, text: &'t str) -> Option<regex::Captures<'t>> {
        let found =
            byte_offset(text, self.get()).and_then(|start| NESTING.captures_at(text, start));
        match &found {
            Some(captures) => {
                let end: usize = captures.get(0).map_or(0, |m| m.end());
                self.set(utf16_offset(text, end));
            }
            None => self.set(0),
        }
        found
    }
}

/// `deepFindWithDefaults(data, {}, key)`.
fn lookup<'a>(data: &'a Value, key: &str) -> Option<&'a Value> {
    let parts: Vec<&str> = key.split('.').collect();
    let found: Option<&Value> = get_path(data, &parts);
    if found.is_some_and(is_truthy) {
        return found;
    }
    deep_find(Some(data), key)
}

/// `handleFormat`. A `{{name, format}}` placeholder looks `name` up; the
/// value is passed through unformatted, which is what i18next does for every
/// format name it has no formatter for.
fn handle_format<'a>(data: &'a Value, key: &str) -> Option<&'a Value> {
    match key.split_once(',') {
        None => lookup(data, key),
        Some((name, _)) => lookup(data, js_trim(name)),
    }
}

/// `Interpolator.interpolate(str, data, lng, options)`. `options` is the
/// translate call's options object, absent when i18next interpolates a
/// nesting options string.
pub(crate) fn interpolate(
    text: &str,
    data: &Map<String, Value>,
    options: Option<&Map<String, Value>>,
    escape_value: bool,
    cursor: &NestingCursor,
) -> String {
    cursor.set(0);
    let data: Value = Value::Object(data.clone());
    let mut text: String = text.to_owned();
    for (pattern, escaped) in [(&*UNESCAPED_VARIABLE, false), (&*VARIABLE, escape_value)] {
        let mut last_index: usize = 0;
        let mut replaces: usize = 0;
        loop {
            let Some(start) = byte_offset(&text, last_index) else {
                break;
            };
            let Some(captures) = pattern.captures_at(&text, start) else {
                break;
            };
            let whole: String = captures[0].to_owned();
            let matched_var: String = js_trim(&captures[1]).to_owned();
            last_index = utf16_offset(&text, captures.get(0).map_or(0, |m| m.end()));
            let value: String = match handle_format(&data, &matched_var) {
                Some(value) => make_string(value),
                None if options.is_some_and(|options| options.contains_key(&matched_var)) => {
                    String::new()
                }
                None => continue,
            };
            let safe: String = if escaped { escape(&value) } else { value };
            text = text.replacen(&whole, &safe, 1);
            last_index = last_index + utf16_len(&safe) - utf16_len(&whole);
            replaces += 1;
            if replaces >= MAX_REPLACES {
                break;
            }
        }
    }
    text
}
