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

//! The few JavaScript built-ins whose exact behaviour leaks into index hashes, command
//! arguments and URL handling.

/// `Number.prototype.toString()` (and `JSON.stringify` for finite numbers). ryu-js picks the
/// digit JS picks when two shortest round-tripping forms exist, which Rust's `{:e}` does not.
pub(crate) fn number_to_js_string(value: f64) -> String {
    if value == 0.0 {
        return "0".to_string();
    }
    let mut buffer: ryu_js::Buffer = ryu_js::Buffer::new();
    buffer.format(value).to_string()
}

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

fn is_decimal_literal(s: &str) -> bool {
    let unsigned = s.strip_prefix(['+', '-']).unwrap_or(s);
    let (significand, exponent) = match unsigned.find(['e', 'E']) {
        Some(at) => (&unsigned[..at], Some(&unsigned[at + 1..])),
        None => (unsigned, None),
    };
    let (int, frac) = significand.split_once('.').unwrap_or((significand, ""));
    let all_digits = |part: &str| part.bytes().all(|b| b.is_ascii_digit());
    if !all_digits(int) || !all_digits(frac) || (int.is_empty() && frac.is_empty()) {
        return false;
    }
    match exponent {
        None => true,
        Some(exp) => {
            let exp = exp.strip_prefix(['+', '-']).unwrap_or(exp);
            !exp.is_empty() && all_digits(exp)
        }
    }
}

fn radix_literal(s: &str) -> Option<(u32, &str)> {
    let bytes = s.as_bytes();
    if bytes.len() < 2 || bytes[0] != b'0' {
        return None;
    }
    let radix = match bytes[1] {
        b'x' | b'X' => 16,
        b'o' | b'O' => 8,
        b'b' | b'B' => 2,
        _ => return None,
    };
    Some((radix, &s[2..]))
}

/// `Number(string)`: the StringToNumber conversion, NaN when the text is not a numeric literal.
pub(crate) fn string_to_js_number(input: &str) -> f64 {
    let s = input.trim_matches(is_js_whitespace);
    if s.is_empty() {
        return 0.0;
    }
    if let Some((radix, digits)) = radix_literal(s) {
        if digits.is_empty() || !digits.chars().all(|c| c.is_digit(radix)) {
            return f64::NAN;
        }
        return digits.chars().fold(0.0, |acc, c| {
            acc * f64::from(radix) + f64::from(c.to_digit(radix).unwrap_or(0))
        });
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

/// `decodeURIComponent`: `None` where JS throws `URIError: URI malformed`.
pub(crate) fn decode_uri_component(input: &str) -> Option<String> {
    let mut bytes: Vec<u8> = Vec::with_capacity(input.len());
    let raw = input.as_bytes();
    let mut i = 0;
    while i < raw.len() {
        if raw[i] == b'%' {
            let hex = raw.get(i + 1..i + 3)?;
            let hex = std::str::from_utf8(hex).ok()?;
            bytes.push(u8::from_str_radix(hex, 16).ok()?);
            i += 3;
        } else {
            bytes.push(raw[i]);
            i += 1;
        }
    }
    String::from_utf8(bytes).ok()
}

/// Whether JS treats `key` as an array index, which puts it before every other key of an
/// object, in ascending numeric order.
pub(crate) fn is_array_index(key: &str) -> bool {
    if key == "0" {
        return true;
    }
    if key.is_empty() || key.starts_with('0') || !key.bytes().all(|b| b.is_ascii_digit()) {
        return false;
    }
    key.parse::<u64>().is_ok_and(|n| n < u64::from(u32::MAX))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_numbers_like_js() {
        let cases: [(f64, &str); 16] = [
            (1.0, "1"),
            (-0.0, "0"),
            (1.5, "1.5"),
            (0.1, "0.1"),
            (0.000001, "0.000001"),
            (1e-7, "1e-7"),
            (1e21, "1e+21"),
            (123456789012345680000.0, "123456789012345680000"),
            (-2.5, "-2.5"),
            (5e-324, "5e-324"),
            (f64::MAX, "1.7976931348623157e+308"),
            (1.0 / 3.0, "0.3333333333333333"),
            (f64::NAN, "NaN"),
            (f64::NEG_INFINITY, "-Infinity"),
            (f64::INFINITY, "Infinity"),
            (1.2345678901234568e20, "123456789012345680000"),
        ];
        for (value, expected) in cases {
            assert_eq!(number_to_js_string(value), expected, "{value}");
        }
    }

    #[test]
    fn converts_strings_like_js_number() {
        let cases: [(&str, f64); 12] = [
            ("", 0.0),
            (" 4 ", 4.0),
            ("02", 2.0),
            ("2.5", 2.5),
            ("1e1", 10.0),
            ("0x10", 16.0),
            ("0b11", 3.0),
            ("0o17", 15.0),
            ("-1", -1.0),
            (".5", 0.5),
            ("5.", 5.0),
            ("Infinity", f64::INFINITY),
        ];
        for (input, expected) in cases {
            assert_eq!(string_to_js_number(input), expected, "{input:?}");
        }
        for input in ["abc", "1/2", "inf", "NaN", "-0x10", "0x", "1e", "e1", "."] {
            assert!(string_to_js_number(input).is_nan(), "{input:?}");
        }
    }

    #[test]
    fn decodes_uri_components_like_js() {
        assert_eq!(
            decode_uri_component("p%40ss%2Fw").as_deref(),
            Some("p@ss/w")
        );
        assert_eq!(decode_uri_component("%E2%9C%93").as_deref(), Some("✓"));
        assert_eq!(decode_uri_component("%zz"), None);
        assert_eq!(decode_uri_component("%E0%A4%A"), None);
        assert_eq!(decode_uri_component("%FF"), None);
        assert_eq!(decode_uri_component("%"), None);
    }

    #[test]
    fn recognises_array_indexes() {
        for key in ["0", "2", "10", "4294967294"] {
            assert!(is_array_index(key), "{key}");
        }
        for key in ["", "01", "-1", "1.5", "4294967295", "a"] {
            assert!(!is_array_index(key), "{key}");
        }
    }
}
