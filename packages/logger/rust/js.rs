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

//! The JavaScript semantics the TS logger relies on implicitly: `String.prototype.trim`,
//! `String(value)`, `Number.prototype.toString`, `JSON.stringify` and `Date.prototype.toISOString`.

use serde_json::{Map, Value};
use std::fmt::Write;

/// ECMAScript WhiteSpace plus LineTerminator. Differs from `char::is_whitespace`: U+FEFF is
/// whitespace in JS but not in Unicode, and U+0085 is the other way round.
fn is_js_whitespace(c: char) -> bool {
    matches!(
        c,
        '\u{0009}'
            | '\u{000A}'
            | '\u{000B}'
            | '\u{000C}'
            | '\u{000D}'
            | '\u{0020}'
            | '\u{00A0}'
            | '\u{1680}'
            | '\u{2000}'
            ..='\u{200A}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202F}'
                | '\u{205F}'
                | '\u{3000}'
                | '\u{FEFF}'
    )
}

pub fn js_trim(s: &str) -> &str {
    s.trim_matches(is_js_whitespace)
}

pub fn number_to_js_string(value: f64) -> String {
    if value.is_nan() {
        return "NaN".to_string();
    }
    if value == 0.0 {
        return "0".to_string();
    }
    if value.is_infinite() {
        return if value > 0.0 { "Infinity" } else { "-Infinity" }.to_string();
    }
    let sign = if value < 0.0 { "-" } else { "" };
    // Rust's `{:e}` yields the shortest round-tripping digits, which is what ECMAScript's
    // Number::toString requires; only the layout of those digits differs.
    let exp_form = format!("{:e}", value.abs());
    let (mantissa, exponent) = exp_form
        .split_once('e')
        .expect("LowerExp output always contains an exponent");
    let digits: String = mantissa.chars().filter(|c| *c != '.').collect();
    let exponent: i32 = exponent.parse().expect("LowerExp exponent is an integer");
    let k = digits.len() as i32;
    let n = exponent + 1;
    let body = if k <= n && n <= 21 {
        format!("{digits}{}", "0".repeat((n - k) as usize))
    } else if 0 < n && n <= 21 {
        format!("{}.{}", &digits[..n as usize], &digits[n as usize..])
    } else if -6 < n && n <= 0 {
        format!("0.{}{digits}", "0".repeat((-n) as usize))
    } else {
        let e = n - 1;
        let e_sign = if e < 0 { '-' } else { '+' };
        if k == 1 {
            format!("{digits}e{e_sign}{}", e.abs())
        } else {
            format!("{}.{}e{e_sign}{}", &digits[..1], &digits[1..], e.abs())
        }
    };
    format!("{sign}{body}")
}

fn json_number_to_js_string(n: &serde_json::Number) -> String {
    // Every JS number is an f64, so integers beyond 2^53 print as the nearest double does.
    number_to_js_string(n.as_f64().unwrap_or(f64::NAN))
}

/// `String(value)` for a JSON value.
pub fn js_string(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => json_number_to_js_string(n),
        Value::String(s) => s.clone(),
        Value::Array(items) => items
            .iter()
            .map(|item| match item {
                Value::Null => String::new(),
                other => js_string(other),
            })
            .collect::<Vec<String>>()
            .join(","),
        Value::Object(_) => "[object Object]".to_string(),
    }
}

/// JS truthiness of a JSON value.
pub fn is_truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().is_some_and(|f| f != 0.0 && !f.is_nan()),
        Value::String(s) => !s.is_empty(),
        Value::Array(_) | Value::Object(_) => true,
    }
}

/// Whether V8 treats `key` as an array index, which it enumerates before every other key,
/// in ascending numeric order, regardless of insertion order.
pub fn is_array_index(key: &str) -> bool {
    if key.is_empty() || (key.len() > 1 && key.starts_with('0')) {
        return false;
    }
    if !key.bytes().all(|b| b.is_ascii_digit()) {
        return false;
    }
    key.parse::<u64>().is_ok_and(|n| n < u64::from(u32::MAX))
}

/// Keys of `map` in the order JavaScript enumerates the equivalent object's own properties.
pub fn js_key_order(map: &Map<String, Value>) -> Vec<&String> {
    let mut indices: Vec<(u64, &String)> = Vec::new();
    let mut named: Vec<&String> = Vec::new();
    for key in map.keys() {
        if is_array_index(key) {
            indices.push((key.parse::<u64>().unwrap_or(0), key));
        } else {
            named.push(key);
        }
    }
    indices.sort_by_key(|(index, _)| *index);
    indices
        .into_iter()
        .map(|(_, key)| key)
        .chain(named)
        .collect()
}

fn write_json_string(out: &mut String, s: &str) {
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{0008}' => out.push_str("\\b"),
            '\u{000C}' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => {
                let _ = write!(out, "\\u{:04x}", c as u32);
            }
            c => out.push(c),
        }
    }
    out.push('"');
}

fn write_newline(out: &mut String, indent: usize, depth: usize) {
    if indent > 0 {
        out.push('\n');
        out.push_str(&" ".repeat(indent * depth));
    }
}

fn write_json(out: &mut String, value: &Value, indent: usize, depth: usize) {
    match value {
        Value::Null => out.push_str("null"),
        Value::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        Value::Number(n) => {
            let f = n.as_f64().unwrap_or(f64::NAN);
            if f.is_finite() {
                out.push_str(&number_to_js_string(f));
            } else {
                out.push_str("null");
            }
        }
        Value::String(s) => write_json_string(out, s),
        Value::Array(items) => {
            if items.is_empty() {
                out.push_str("[]");
                return;
            }
            out.push('[');
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write_newline(out, indent, depth + 1);
                write_json(out, item, indent, depth + 1);
            }
            write_newline(out, indent, depth);
            out.push(']');
        }
        Value::Object(map) => {
            if map.is_empty() {
                out.push_str("{}");
                return;
            }
            out.push('{');
            for (i, key) in js_key_order(map).into_iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write_newline(out, indent, depth + 1);
                write_json_string(out, key);
                out.push(':');
                if indent > 0 {
                    out.push(' ');
                }
                write_json(out, &map[key.as_str()], indent, depth + 1);
            }
            write_newline(out, indent, depth);
            out.push('}');
        }
    }
}

/// `JSON.stringify(value, null, indent)`.
pub fn json_stringify(value: &Value, indent: usize) -> String {
    let mut out = String::new();
    write_json(&mut out, value, indent, 0);
    out
}

fn civil_from_days(days: i64) -> (i64, u32, u32) {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let month = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    let year = yoe + era * 400 + i64::from(month <= 2);
    (year, month, day)
}

/// `new Date(epoch_ms).toISOString()`, including the six-digit signed form for years outside
/// 0..=9999.
pub fn iso_timestamp(epoch_ms: i64) -> String {
    let days = epoch_ms.div_euclid(86_400_000);
    let ms_of_day = epoch_ms.rem_euclid(86_400_000);
    let (year, month, day) = civil_from_days(days);
    let year = if (0..=9999).contains(&year) {
        format!("{year:04}")
    } else if year < 0 {
        format!("-{:06}", -year)
    } else {
        format!("+{year:06}")
    };
    format!(
        "{year}-{month:02}-{day:02}T{:02}:{:02}:{:02}.{:03}Z",
        ms_of_day / 3_600_000,
        ms_of_day / 60_000 % 60,
        ms_of_day / 1000 % 60,
        ms_of_day % 1000
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn formats_numbers_like_javascript() {
        let cases: [(f64, &str); 12] = [
            (1.0, "1"),
            (-1.5, "-1.5"),
            (1e21, "1e+21"),
            (1e20, "100000000000000000000"),
            (1.5e-7, "1.5e-7"),
            (0.000001, "0.000001"),
            (123e-20, "1.23e-18"),
            (-0.0, "0"),
            (5e-324, "5e-324"),
            (f64::MAX, "1.7976931348623157e+308"),
            (0.1 + 0.2, "0.30000000000000004"),
            (12345678901234567890.0, "12345678901234567000"),
        ];
        for (value, expected) in cases {
            assert_eq!(number_to_js_string(value), expected);
        }
    }

    #[test]
    fn stringifies_like_javascript() {
        assert_eq!(
            js_string(&json!([1, [2, null], {}])),
            "1,2,,[object Object]"
        );
        assert_eq!(
            json_stringify(&json!({"a": [], "b": {}, "c": [1]}), 2),
            "{\n  \"a\": [],\n  \"b\": {},\n  \"c\": [\n    1\n  ]\n}"
        );
        assert_eq!(
            json_stringify(&json!("\u{0}\u{1f}\u{7f}\u{2028}\u{8}"), 0),
            "\"\\u0000\\u001f\u{7f}\u{2028}\\b\""
        );
    }

    #[test]
    fn formats_iso_timestamps_like_javascript() {
        assert_eq!(iso_timestamp(0), "1970-01-01T00:00:00.000Z");
        assert_eq!(iso_timestamp(-1), "1969-12-31T23:59:59.999Z");
        assert_eq!(iso_timestamp(951_782_400_000), "2000-02-29T00:00:00.000Z");
        assert_eq!(
            iso_timestamp(253_402_300_800_000),
            "+010000-01-01T00:00:00.000Z"
        );
        assert_eq!(
            iso_timestamp(-62_198_755_200_000),
            "-000001-01-01T00:00:00.000Z"
        );
    }
}
