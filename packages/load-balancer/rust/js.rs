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

//! The JS string semantics the provider list relies on.

use std::cmp::Ordering;

fn is_js_whitespace(c: char) -> bool {
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
}

/// `String.prototype.trim`.
pub(crate) fn js_trim(value: &str) -> &str {
    value.trim_matches(is_js_whitespace)
}

/// Printable ASCII in the order Node 24's default ICU collation puts it, letters case-folded.
const ICU_ASCII_ORDER: &str =
    " _-,;:!?.'\"()[]{}@*/\\&#%`^+<=>|~$0123456789abcdefghijklmnopqrstuvwxyz";

fn primary_weight(c: char) -> u32 {
    match ICU_ASCII_ORDER.find(c.to_ascii_lowercase()) {
        Some(index) => index as u32,
        None => ICU_ASCII_ORDER.len() as u32 + c as u32,
    }
}

/// `a.localeCompare(b)` under Node's default collation. Exact for printable ASCII: the
/// characters compare by `ICU_ASCII_ORDER`, and strings equal but for case put lowercase
/// first at the first difference. Other characters sort after printable ASCII by code point.
pub(crate) fn locale_compare(a: &str, b: &str) -> Ordering {
    a.chars()
        .map(primary_weight)
        .cmp(b.chars().map(primary_weight))
        .then_with(|| {
            a.chars()
                .map(|c| c.is_ascii_uppercase())
                .cmp(b.chars().map(|c| c.is_ascii_uppercase()))
        })
}
