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

//! Reproductions of the JavaScript built-ins whose exact behaviour the ported
//! functions depend on (`String.prototype.trim`, `Number.prototype.toString`,
//! `parseInt`, `Math.round`).

use num_bigint::BigUint;
use num_traits::ToPrimitive;

/// The `WhiteSpace` and `LineTerminator` code points: the set matched by `\s`
/// and stripped by `trim()`. Unlike `char::is_whitespace` it includes U+FEFF
/// and excludes U+0085.
pub(crate) fn is_whitespace(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n' | '\u{000B}' | '\u{000C}' | '\r' | ' ' | '\u{00A0}' | '\u{1680}' | '\u{2000}'
            ..='\u{200A}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202F}'
                | '\u{205F}'
                | '\u{3000}'
                | '\u{FEFF}'
    )
}

pub(crate) fn is_line_terminator(c: char) -> bool {
    matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}')
}

pub(crate) fn trim(s: &str) -> &str {
    s.trim_matches(is_whitespace)
}

pub(crate) fn utf16_len(s: &str) -> usize {
    s.encode_utf16().count()
}

pub(crate) const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;

pub(crate) fn is_safe_integer(n: f64) -> bool {
    n.is_finite() && n.trunc() == n && n.abs() <= MAX_SAFE_INTEGER
}

pub(crate) fn is_integer(n: f64) -> bool {
    n.is_finite() && n.trunc() == n
}

/// `Math.round`: halves round towards +∞, so `-2.5` becomes `-2`.
pub(crate) fn round(x: f64) -> f64 {
    if !x.is_finite() || x.trunc() == x {
        return x;
    }
    let floor = x.floor();
    let rounded = if x - floor >= 0.5 { floor + 1.0 } else { floor };
    if rounded == 0.0 && x < 0.0 {
        -0.0
    } else {
        rounded
    }
}

/// `Number.prototype.toString()` / `String(n)` for a JS number.
pub fn number_to_string(x: f64) -> String {
    if x.is_nan() {
        return "NaN".to_string();
    }
    if x == 0.0 {
        return "0".to_string();
    }
    if x.is_infinite() {
        return if x > 0.0 { "Infinity" } else { "-Infinity" }.to_string();
    }
    if x < 0.0 {
        return format!("-{}", number_to_string(-x));
    }
    // Rust's `{:e}` prints the shortest digits that round-trip, which is the
    // digit string ECMAScript's Number::toString is defined over.
    let scientific = format!("{x:e}");
    let (mantissa, exponent) = scientific
        .split_once('e')
        .expect("LowerExp output always has an exponent");
    let digits: String = mantissa.chars().filter(|c| *c != '.').collect();
    let exponent: i32 = exponent.parse().expect("LowerExp exponent is an integer");
    let k = digits.len() as i32;
    let n = exponent + 1;
    if k <= n && n <= 21 {
        format!("{digits}{}", "0".repeat((n - k) as usize))
    } else if 0 < n && n <= 21 {
        format!("{}.{}", &digits[..n as usize], &digits[n as usize..])
    } else if -6 < n && n <= 0 {
        format!("0.{}{digits}", "0".repeat((-n) as usize))
    } else {
        let sign = if n - 1 < 0 { '-' } else { '+' };
        let magnitude = (n - 1).abs();
        if k == 1 {
            format!("{digits}e{sign}{magnitude}")
        } else {
            format!("{}.{}e{sign}{magnitude}", &digits[..1], &digits[1..])
        }
    }
}

/// `parseInt(s, radix)` for radix 10 or 16.
pub fn parse_int(s: &str, radix: u32) -> f64 {
    let s = s.trim_start_matches(is_whitespace);
    let (negative, s) = match s.as_bytes().first() {
        Some(b'-') => (true, &s[1..]),
        Some(b'+') => (false, &s[1..]),
        _ => (false, s),
    };
    let s = if radix == 16 && (s.starts_with("0x") || s.starts_with("0X")) {
        &s[2..]
    } else {
        s
    };
    let end = s
        .char_indices()
        .find(|(_, c)| !c.is_digit(radix))
        .map_or(s.len(), |(i, _)| i);
    let digits = &s[..end];
    if digits.is_empty() {
        return f64::NAN;
    }
    let magnitude = if radix == 10 {
        digits.parse::<f64>().unwrap_or(f64::NAN)
    } else {
        BigUint::parse_bytes(digits.as_bytes(), radix)
            .and_then(|n| n.to_f64())
            .unwrap_or(f64::NAN)
    };
    if negative {
        -magnitude
    } else {
        magnitude
    }
}

/// The keys of a JS object in `Object.keys` order: array-index keys ascending,
/// then the rest in insertion order.
pub(crate) fn ordered_keys(map: &serde_json::Map<String, serde_json::Value>) -> Vec<&String> {
    let mut indices: Vec<(u32, &String)> = Vec::new();
    let mut rest: Vec<&String> = Vec::new();
    for key in map.keys() {
        match array_index(key) {
            Some(index) => indices.push((index, key)),
            None => rest.push(key),
        }
    }
    indices.sort_by_key(|(index, _)| *index);
    indices
        .into_iter()
        .map(|(_, key)| key)
        .chain(rest)
        .collect()
}

fn array_index(key: &str) -> Option<u32> {
    if key.is_empty() || (key.len() > 1 && key.starts_with('0')) {
        return None;
    }
    if !key.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    key.parse::<u32>().ok().filter(|index| *index != u32::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_numbers_like_js() {
        let cases: [(f64, &str); 16] = [
            (0.0, "0"),
            (-0.0, "0"),
            (1.0, "1"),
            (-5.0, "-5"),
            (1.5, "1.5"),
            (0.1, "0.1"),
            (1e21, "1e+21"),
            (1e20, "100000000000000000000"),
            (123456789012345680000.0, "123456789012345680000"),
            (1e-7, "1e-7"),
            (0.000001, "0.000001"),
            (1.2345e-10, "1.2345e-10"),
            (9007199254740992.0, "9007199254740992"),
            (f64::NAN, "NaN"),
            (f64::INFINITY, "Infinity"),
            (f64::NEG_INFINITY, "-Infinity"),
        ];
        for (input, expected) in cases {
            assert_eq!(number_to_string(input), expected, "{input}");
        }
    }

    #[test]
    fn rounds_like_math_round() {
        assert_eq!(round(2.5), 3.0);
        assert_eq!(round(-2.5), -2.0);
        assert_eq!(round(0.49999999999999994), 0.0);
        assert!(round(-0.2).is_sign_negative());
        assert_eq!(round(150.5), 151.0);
    }

    #[test]
    fn parses_ints_like_parse_int() {
        assert_eq!(parse_int("ff", 16), 255.0);
        assert_eq!(parse_int("0x1f", 16), 31.0);
        assert!(parse_int("0x", 16).is_nan());
        assert_eq!(parse_int("aundefined", 16), 10.0);
        assert_eq!(parse_int(" -12abc", 10), -12.0);
        assert!(parse_int("zz", 16).is_nan());
        assert!(parse_int("", 10).is_nan());
    }
}
