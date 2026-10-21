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

//! The JS conversions the backends rely on.

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

/// `Number.parseInt(value, 10)`: leading whitespace, an optional sign, then the longest run
/// of digits; `None` is `NaN`.
pub(crate) fn parse_int_10(value: &str) -> Option<f64> {
    let rest: &str = value.trim_start_matches(is_js_whitespace);
    let (sign, digits): (f64, &str) = match rest.strip_prefix('-') {
        Some(rest) => (-1.0, rest),
        None => (1.0, rest.strip_prefix('+').unwrap_or(rest)),
    };
    let run: &str = &digits[..digits.bytes().take_while(u8::is_ascii_digit).count()];
    if run.is_empty() {
        return None;
    }
    run.parse::<f64>().ok().map(|parsed| sign * parsed)
}

/// `Number.parseFloat(value)`: the longest prefix (after leading whitespace) that is a
/// decimal literal or `Infinity`; `None` is `NaN`.
pub(crate) fn parse_float(value: &str) -> Option<f64> {
    let rest: &str = value.trim_start_matches(is_js_whitespace);
    let (sign, body): (f64, &str) = match rest.strip_prefix('-') {
        Some(body) => (-1.0, body),
        None => (1.0, rest.strip_prefix('+').unwrap_or(rest)),
    };
    if body.starts_with("Infinity") {
        return Some(sign * f64::INFINITY);
    }
    let bytes: &[u8] = body.as_bytes();
    let mut end: usize = 0;
    while end < bytes.len() && bytes[end].is_ascii_digit() {
        end += 1;
    }
    let integer_digits: usize = end;
    let mut fraction_digits: usize = 0;
    if end < bytes.len() && bytes[end] == b'.' {
        let mut probe: usize = end + 1;
        while probe < bytes.len() && bytes[probe].is_ascii_digit() {
            probe += 1;
        }
        fraction_digits = probe - end - 1;
        if integer_digits > 0 || fraction_digits > 0 {
            end = probe;
        }
    }
    if integer_digits == 0 && fraction_digits == 0 {
        return None;
    }
    if end < bytes.len() && (bytes[end] == b'e' || bytes[end] == b'E') {
        let mut probe: usize = end + 1;
        if probe < bytes.len() && (bytes[probe] == b'+' || bytes[probe] == b'-') {
            probe += 1;
        }
        let exponent_start: usize = probe;
        while probe < bytes.len() && bytes[probe].is_ascii_digit() {
            probe += 1;
        }
        if probe > exponent_start {
            end = probe;
        }
    }
    let literal: &str = &body[..end];
    let normalised: String = if literal.starts_with('.') {
        format!("0{literal}")
    } else if literal.ends_with('.') {
        format!("{literal}0")
    } else {
        literal.to_string()
    };
    normalised.parse::<f64>().ok().map(|parsed| sign * parsed)
}
