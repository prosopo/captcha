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

//! `INPUT_LIMITS` and the sanitising schema builders of api/sanitise.ts.

use prosopo_api_route::schema::{array, custom_with_message, string, Data, Schema};
use serde_json::Value;

/// Per-field input length limits, in UTF-16 code units as JS counts them.
pub struct InputLimits;

impl InputLimits {
    /// Identifiers, keys, slugs (accounts, site keys, dataset ids, …).
    pub const ID: usize = 256;
    /// Names, labels, titles.
    pub const NAME: usize = 256;
    /// Email addresses (treated as opaque strings — no format validation).
    pub const EMAIL: usize = 320;
    /// URLs.
    pub const URL: usize = 2048;
    /// General short freetext. Default for `bounded_string` / `safe_text`.
    pub const TEXT: usize = 16384;
    /// Longer freetext: messages, descriptions, decision-machine source.
    pub const LONG_TEXT: usize = 65536;
    /// Tokens, signatures, base64 payloads, behavioural/simd readings.
    pub const TOKEN: usize = 131072;

    /// The doc comment of each entry, for the generated TypeScript.
    pub const DOCS: [&'static str; 7] = [
        "Identifiers, keys, slugs (accounts, site keys, dataset ids, …).",
        "Names, labels, titles.",
        "Email addresses (treated as opaque strings — no format validation).",
        "URLs.",
        "General short freetext. Default for `boundedString` / `safeText`.",
        "Longer freetext: messages, descriptions, decision-machine source.",
        "Tokens, signatures, base64 payloads, behavioural/simd readings.",
    ];

    pub const ENTRIES: [(&'static str, usize); 7] = [
        ("ID", InputLimits::ID),
        ("NAME", InputLimits::NAME),
        ("EMAIL", InputLimits::EMAIL),
        ("URL", InputLimits::URL),
        ("TEXT", InputLimits::TEXT),
        ("LONG_TEXT", InputLimits::LONG_TEXT),
        ("TOKEN", InputLimits::TOKEN),
    ];
}

/// `/^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/`: tab, line feed and carriage
/// return are allowed.
fn has_no_control_characters(value: &str) -> bool {
    !value
        .chars()
        .any(|c| matches!(c, '\u{0}'..='\u{8}' | '\u{b}' | '\u{c}' | '\u{e}'..='\u{1f}' | '\u{7f}'))
}

/// `/^[^\u0000-\u001f\u007f]*$/`.
fn has_no_control_characters_or_line_breaks(value: &str) -> bool {
    !value
        .chars()
        .any(|c| matches!(c, '\u{0}'..='\u{1f}' | '\u{7f}'))
}

/// `boundedString(max)`: for structured values whose character set the format already limits.
pub fn bounded_string(max: usize) -> Schema {
    string().max(max as f64)
}

/// `safeText(max)`: freetext that rejects control characters other than tab and line breaks.
pub fn safe_text(max: usize) -> Schema {
    string().max(max as f64).regex_with_message(
        has_no_control_characters,
        "must not contain control characters",
    )
}

/// `safeLine(max)`: single-line freetext, for values that reach headers.
pub fn safe_line(max: usize) -> Schema {
    string().max(max as f64).regex_with_message(
        has_no_control_characters_or_line_breaks,
        "must not contain control characters or line breaks",
    )
}

/// `boundedArray(item, max)`: the length is checked before any element is parsed.
pub fn bounded_array(item: Schema, max: usize) -> Schema {
    custom_with_message(
        move |value: &Data| match value {
            Some(Value::Array(items)) => items.len() <= max,
            _ => true,
        },
        format!("Array must contain at most {max} element(s)"),
    )
    .pipe(array(item).max(max as f64))
}
