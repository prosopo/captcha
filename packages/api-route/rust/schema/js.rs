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

//! The JavaScript conversions zod applies: `Number(x)` for `coerce.number()`, `String(x)` for
//! `coerce.string()`, number formatting in messages, and the order JS enumerates keys in.

use num_bigint::BigInt;
use num_traits::{FromPrimitive, Zero};
use serde_json::{Map, Value};

pub(crate) fn number_to_js_string(value: f64) -> String {
    if value == 0.0 {
        return "0".to_string();
    }
    if value.is_nan() {
        return "NaN".to_string();
    }
    if value.is_infinite() {
        return if value > 0.0 { "Infinity" } else { "-Infinity" }.to_string();
    }
    ryu_js::Buffer::new().format(value).to_string()
}

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

fn is_decimal_literal(s: &str) -> bool {
    let unsigned: &str = s.strip_prefix(['+', '-']).unwrap_or(s);
    let (significand, exponent): (&str, Option<&str>) = match unsigned.find(['e', 'E']) {
        Some(at) => (&unsigned[..at], Some(&unsigned[at + 1..])),
        None => (unsigned, None),
    };
    let (int, frac): (&str, &str) = significand.split_once('.').unwrap_or((significand, ""));
    let digits = |part: &str| part.bytes().all(|b| b.is_ascii_digit());
    if !digits(int) || !digits(frac) || (int.is_empty() && frac.is_empty()) {
        return false;
    }
    match exponent {
        None => true,
        Some(exponent) => {
            let exponent: &str = exponent.strip_prefix(['+', '-']).unwrap_or(exponent);
            !exponent.is_empty() && digits(exponent)
        }
    }
}

/// `Number(string)`.
pub(crate) fn string_to_number(input: &str) -> f64 {
    let s: &str = js_trim(input);
    if s.is_empty() {
        return 0.0;
    }
    let bytes: &[u8] = s.as_bytes();
    if bytes.len() > 2 && bytes[0] == b'0' {
        let radix: Option<u32> = match bytes[1] {
            b'x' | b'X' => Some(16),
            b'o' | b'O' => Some(8),
            b'b' | b'B' => Some(2),
            _ => None,
        };
        if let Some(radix) = radix {
            let digits: &str = &s[2..];
            if !digits.chars().all(|c| c.is_digit(radix)) {
                return f64::NAN;
            }
            return digits.chars().fold(0.0, |acc, c| {
                acc * f64::from(radix) + f64::from(c.to_digit(radix).unwrap_or(0))
            });
        }
    }
    match s {
        "Infinity" | "+Infinity" => return f64::INFINITY,
        "-Infinity" => return f64::NEG_INFINITY,
        _ => {}
    }
    if !is_decimal_literal(s) {
        return f64::NAN;
    }
    s.parse::<f64>().unwrap_or(f64::NAN)
}

/// `String(value)`; `None` is `undefined`.
pub(crate) fn to_js_string(value: Option<&Value>) -> String {
    match value {
        None => "undefined".to_string(),
        Some(Value::Null) => "null".to_string(),
        Some(Value::Bool(flag)) => flag.to_string(),
        Some(Value::Number(number)) => number_to_js_string(number.as_f64().unwrap_or(f64::NAN)),
        Some(Value::String(text)) => text.clone(),
        Some(Value::Array(items)) => items
            .iter()
            .map(|item| match item {
                Value::Null => String::new(),
                item => to_js_string(Some(item)),
            })
            .collect::<Vec<String>>()
            .join(","),
        Some(Value::Object(_)) => "[object Object]".to_string(),
    }
}

/// `Number(value)`; `None` is `undefined`.
pub(crate) fn to_js_number(value: Option<&Value>) -> f64 {
    match value {
        None => f64::NAN,
        Some(Value::Null) => 0.0,
        Some(Value::Bool(flag)) => f64::from(u8::from(*flag)),
        Some(Value::Number(number)) => number.as_f64().unwrap_or(f64::NAN),
        Some(Value::String(text)) => string_to_number(text),
        Some(array @ Value::Array(_)) => string_to_number(&to_js_string(Some(array))),
        Some(Value::Object(_)) => f64::NAN,
    }
}

/// A JSON number for `value`, keeping integers integral; non-finite values become `null`, as
/// `JSON.stringify` writes them.
pub(crate) fn number_value(value: f64) -> Value {
    if value.fract() == 0.0 && value.abs() < 9_007_199_254_740_992.0 {
        if value == 0.0 {
            return Value::from(0);
        }
        return Value::from(value as i64);
    }
    serde_json::Number::from_f64(value).map_or(Value::Null, Value::Number)
}

fn array_index(key: &str) -> Option<u32> {
    let canonical: bool = key == "0" || (!key.is_empty() && !key.starts_with('0'));
    if !canonical || !key.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    key.parse::<u32>().ok().filter(|index| *index < u32::MAX)
}

/// Keys in the order JS enumerates an object's own properties.
pub(crate) fn js_keys(map: &Map<String, Value>) -> Vec<&String> {
    let (mut indexes, named): (Vec<&String>, Vec<&String>) =
        map.keys().partition(|key| array_index(key).is_some());
    indexes.sort_by_key(|key| array_index(key));
    indexes.into_iter().chain(named).collect()
}

/// `map` with its keys in JS enumeration order.
pub(crate) fn js_ordered(map: Map<String, Value>) -> Map<String, Value> {
    let order: Vec<String> = js_keys(&map).into_iter().cloned().collect();
    let mut map: Map<String, Value> = map;
    order
        .into_iter()
        .filter_map(|key| map.remove(&key).map(|value| (key, value)))
        .collect()
}

/// `===` between two parsed values; objects and arrays are never identical.
pub(crate) fn strictly_equal(a: Option<&Value>, b: Option<&Value>) -> bool {
    match (a, b) {
        (None, None) => true,
        (Some(Value::Null), Some(Value::Null)) => true,
        (Some(Value::Bool(a)), Some(Value::Bool(b))) => a == b,
        (Some(Value::Number(a)), Some(Value::Number(b))) => a.as_f64() == b.as_f64(),
        (Some(Value::String(a)), Some(Value::String(b))) => a == b,
        _ => false,
    }
}

/// `StringToBigInt`: surrounding whitespace is ignored, an empty string is zero, and the rest
/// must be a signed decimal integer or an unsigned `0x`/`0o`/`0b` literal.
fn string_to_bigint(input: &str) -> Option<BigInt> {
    let text: &str = js_trim(input);
    if text.is_empty() {
        return Some(BigInt::zero());
    }
    let radix_literal = |prefix: [&str; 2], radix: u32| {
        prefix
            .iter()
            .find_map(|prefix| text.strip_prefix(prefix))
            .map(|digits| (digits, radix))
    };
    if let Some((digits, radix)) = radix_literal(["0x", "0X"], 16)
        .or_else(|| radix_literal(["0o", "0O"], 8))
        .or_else(|| radix_literal(["0b", "0B"], 2))
    {
        let valid: bool = !digits.is_empty() && digits.chars().all(|c| c.is_digit(radix));
        return valid
            .then(|| BigInt::parse_bytes(digits.as_bytes(), radix))
            .flatten();
    }
    let (negative, digits): (bool, &str) = match text.as_bytes()[0] {
        b'-' => (true, &text[1..]),
        b'+' => (false, &text[1..]),
        _ => (false, text),
    };
    if digits.is_empty() || !digits.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let magnitude: BigInt = BigInt::parse_bytes(digits.as_bytes(), 10)?;
    Some(if negative { -magnitude } else { magnitude })
}

/// `BigInt(value)`, or `None` where it throws: on `undefined` and `null`, a number that is
/// not an integer, and text that is not an integer literal. Objects and arrays go through
/// their string form, so `[]` is zero and `[5]` is five.
pub(crate) fn js_to_bigint(value: Option<&Value>) -> Option<BigInt> {
    match value? {
        Value::Null => None,
        Value::Bool(flag) => Some(BigInt::from(u8::from(*flag))),
        Value::Number(number) => {
            let value: f64 = number.as_f64()?;
            (value.is_finite() && value.fract() == 0.0)
                .then(|| BigInt::from_f64(value))
                .flatten()
        }
        Value::String(text) => string_to_bigint(text),
        other => string_to_bigint(&to_js_string(Some(other))),
    }
}
