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

//! JavaScript value semantics that leak into outputs: `Number#toString`,
//! `JSON.parse`, `JSON.stringify` of strings and `Array#join`.

use crate::error::{err, Result};

/// `Number.prototype.toString()` for a double (also what `JSON.stringify`
/// prints for finite numbers).
pub fn js_number_to_string(value: f64) -> String {
    if value.is_nan() {
        return "NaN".to_string();
    }
    if value.is_infinite() {
        return if value > 0.0 { "Infinity" } else { "-Infinity" }.to_string();
    }
    if value == 0.0 {
        return "0".to_string();
    }
    let sign = if value < 0.0 { "-" } else { "" };
    let formatted = format!("{:e}", value.abs());
    let (mantissa, exponent) = formatted.split_once('e').unwrap_or((&formatted, "0"));
    let digits: String = mantissa.chars().filter(|c| *c != '.').collect();
    let k = digits.len() as i32;
    let n = exponent.parse::<i32>().unwrap_or(0) + 1;
    let body = if k <= n && n <= 21 {
        format!("{digits}{}", "0".repeat((n - k) as usize))
    } else if 0 < n && n <= 21 {
        format!("{}.{}", &digits[..n as usize], &digits[n as usize..])
    } else if -6 < n && n <= 0 {
        format!("0.{}{digits}", "0".repeat((-n) as usize))
    } else {
        let exp_sign = if n - 1 < 0 { "-" } else { "+" };
        let exp = (n - 1).abs();
        if k == 1 {
            format!("{digits}e{exp_sign}{exp}")
        } else {
            format!("{}.{}e{exp_sign}{exp}", &digits[..1], &digits[1..])
        }
    };
    format!("{sign}{body}")
}

/// `JSON.stringify(number)`.
pub fn json_stringify_number(value: f64) -> String {
    if value.is_finite() {
        js_number_to_string(value)
    } else {
        "null".to_string()
    }
}

/// `JSON.stringify(string)`.
pub fn json_stringify_string(value: &str) -> String {
    let mut out = String::with_capacity(value.len() + 2);
    out.push('"');
    for c in value.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{08}' => out.push_str("\\b"),
            '\u{0c}' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

/// A value produced by `JSON.parse`. Numbers are doubles, so out-of-range
/// literals become infinities exactly as in JavaScript.
#[derive(Clone, Debug, PartialEq)]
pub enum JsonValue {
    Null,
    Bool(bool),
    Number(f64),
    String(String),
    Array(Vec<JsonValue>),
    /// Properties in insertion order; a repeated key keeps its first position
    /// and takes the last value.
    Object(Vec<(String, JsonValue)>),
}

impl JsonValue {
    pub fn get(&self, key: &str) -> Option<&JsonValue> {
        match self {
            JsonValue::Object(entries) => entries.iter().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }

    pub fn as_str(&self) -> Option<&str> {
        match self {
            JsonValue::String(s) => Some(s),
            _ => None,
        }
    }

    pub fn as_f64(&self) -> Option<f64> {
        match self {
            JsonValue::Number(n) => Some(*n),
            _ => None,
        }
    }

    /// Conversion for callers that work with `serde_json`; non-finite numbers
    /// (which `serde_json` cannot hold) become `null`, as `JSON.stringify` would.
    pub fn to_serde(&self) -> serde_json::Value {
        match self {
            JsonValue::Null => serde_json::Value::Null,
            JsonValue::Bool(b) => serde_json::Value::Bool(*b),
            JsonValue::Number(n) => serde_json::Number::from_f64(*n)
                .map(|num| {
                    if n.fract() == 0.0 && n.abs() < 9_007_199_254_740_992.0 {
                        serde_json::Value::Number(serde_json::Number::from(*n as i64))
                    } else {
                        serde_json::Value::Number(num)
                    }
                })
                .unwrap_or(serde_json::Value::Null),
            JsonValue::String(s) => serde_json::Value::String(s.clone()),
            JsonValue::Array(items) => {
                serde_json::Value::Array(items.iter().map(JsonValue::to_serde).collect())
            }
            JsonValue::Object(entries) => serde_json::Value::Object(
                entries
                    .iter()
                    .map(|(k, v)| (k.clone(), v.to_serde()))
                    .collect(),
            ),
        }
    }
}

/// Whether `key` is an array index, which JavaScript enumerates before an object's other keys.
pub fn array_index(key: &str) -> Option<u32> {
    let index = key.parse::<u32>().ok()?;
    (index.to_string() == key && index != u32::MAX).then_some(index)
}

/// An object's entries in JavaScript's enumeration order: array indices ascending, then the
/// other keys in insertion order.
pub fn js_entry_order<T>(entries: &[(String, T)]) -> Vec<&(String, T)> {
    let mut ordered: Vec<&(String, T)> = entries.iter().collect();
    ordered.sort_by_key(|(key, _)| array_index(key).map_or((1, 0), |index| (0, index)));
    ordered
}

/// `JSON.stringify(value)` for a parsed JSON value.
pub fn json_stringify(value: &JsonValue) -> String {
    match value {
        JsonValue::Null => "null".to_string(),
        JsonValue::Bool(b) => b.to_string(),
        JsonValue::Number(n) => json_stringify_number(*n),
        JsonValue::String(s) => json_stringify_string(s),
        JsonValue::Array(items) => {
            let inner: Vec<String> = items.iter().map(json_stringify).collect();
            format!("[{}]", inner.join(","))
        }
        JsonValue::Object(entries) => {
            let inner: Vec<String> = js_entry_order(entries)
                .into_iter()
                .map(|(k, v)| format!("{}:{}", json_stringify_string(k), json_stringify(v)))
                .collect();
            format!("{{{}}}", inner.join(","))
        }
    }
}

/// `JSON.parse(text)`; the error message is not meant to match V8's.
pub fn json_parse(text: &str) -> Result<JsonValue> {
    let mut parser = Parser {
        chars: text.chars().collect(),
        pos: 0,
    };
    parser.skip_whitespace();
    let value = parser.value()?;
    parser.skip_whitespace();
    if parser.pos != parser.chars.len() {
        return err("Unexpected non-whitespace character after JSON");
    }
    Ok(value)
}

struct Parser {
    chars: Vec<char>,
    pos: usize,
}

impl Parser {
    fn peek(&self) -> Option<char> {
        self.chars.get(self.pos).copied()
    }

    fn next(&mut self) -> Result<char> {
        let c = self.peek();
        self.pos += 1;
        c.map_or_else(|| err("Unexpected end of JSON input"), Ok)
    }

    fn skip_whitespace(&mut self) {
        while matches!(self.peek(), Some(' ' | '\t' | '\n' | '\r')) {
            self.pos += 1;
        }
    }

    fn expect_literal(&mut self, literal: &str, value: JsonValue) -> Result<JsonValue> {
        for expected in literal.chars() {
            if self.next()? != expected {
                return err("Unexpected token in JSON");
            }
        }
        Ok(value)
    }

    fn value(&mut self) -> Result<JsonValue> {
        match self.peek() {
            Some('{') => self.object(),
            Some('[') => self.array(),
            Some('"') => self.string().map(JsonValue::String),
            Some('t') => self.expect_literal("true", JsonValue::Bool(true)),
            Some('f') => self.expect_literal("false", JsonValue::Bool(false)),
            Some('n') => self.expect_literal("null", JsonValue::Null),
            Some('-' | '0'..='9') => self.number(),
            Some(_) => err("Unexpected token in JSON"),
            None => err("Unexpected end of JSON input"),
        }
    }

    fn object(&mut self) -> Result<JsonValue> {
        self.pos += 1;
        let mut entries: Vec<(String, JsonValue)> = Vec::new();
        self.skip_whitespace();
        if self.peek() == Some('}') {
            self.pos += 1;
            return Ok(JsonValue::Object(entries));
        }
        loop {
            self.skip_whitespace();
            if self.peek() != Some('"') {
                return err("Expected property name in JSON");
            }
            let key = self.string()?;
            self.skip_whitespace();
            if self.next()? != ':' {
                return err("Expected ':' after property name in JSON");
            }
            self.skip_whitespace();
            let value = self.value()?;
            match entries.iter_mut().find(|(k, _)| *k == key) {
                Some(entry) => entry.1 = value,
                None => entries.push((key, value)),
            }
            self.skip_whitespace();
            match self.next()? {
                ',' => continue,
                '}' => return Ok(JsonValue::Object(entries)),
                _ => return err("Expected ',' or '}' after property value in JSON"),
            }
        }
    }

    fn array(&mut self) -> Result<JsonValue> {
        self.pos += 1;
        let mut items: Vec<JsonValue> = Vec::new();
        self.skip_whitespace();
        if self.peek() == Some(']') {
            self.pos += 1;
            return Ok(JsonValue::Array(items));
        }
        loop {
            self.skip_whitespace();
            items.push(self.value()?);
            self.skip_whitespace();
            match self.next()? {
                ',' => continue,
                ']' => return Ok(JsonValue::Array(items)),
                _ => return err("Expected ',' or ']' after array element in JSON"),
            }
        }
    }

    fn hex4(&mut self) -> Result<u32> {
        let mut code = 0u32;
        for _ in 0..4 {
            let digit = self
                .next()?
                .to_digit(16)
                .map_or_else(|| err("Bad Unicode escape in JSON"), Ok)?;
            code = code * 16 + digit;
        }
        Ok(code)
    }

    fn string(&mut self) -> Result<String> {
        self.pos += 1;
        let mut out = String::new();
        loop {
            match self.next()? {
                '"' => return Ok(out),
                '\\' => match self.next()? {
                    '"' => out.push('"'),
                    '\\' => out.push('\\'),
                    '/' => out.push('/'),
                    'b' => out.push('\u{08}'),
                    'f' => out.push('\u{0c}'),
                    'n' => out.push('\n'),
                    'r' => out.push('\r'),
                    't' => out.push('\t'),
                    'u' => {
                        let code = self.hex4()?;
                        if (0xd800..0xdc00).contains(&code)
                            && self.chars.get(self.pos) == Some(&'\\')
                            && self.chars.get(self.pos + 1) == Some(&'u')
                        {
                            let save = self.pos;
                            self.pos += 2;
                            let low = self.hex4()?;
                            if (0xdc00..0xe000).contains(&low) {
                                let combined = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
                                out.push(char::from_u32(combined).unwrap_or('\u{fffd}'));
                                continue;
                            }
                            self.pos = save;
                        }
                        out.push(char::from_u32(code).unwrap_or('\u{fffd}'));
                    }
                    _ => return err("Bad escaped character in JSON"),
                },
                c if (c as u32) < 0x20 => return err("Bad control character in string literal in JSON"),
                c => out.push(c),
            }
        }
    }

    fn number(&mut self) -> Result<JsonValue> {
        let start = self.pos;
        if self.peek() == Some('-') {
            self.pos += 1;
        }
        match self.peek() {
            Some('0') => self.pos += 1,
            Some('1'..='9') => {
                while matches!(self.peek(), Some('0'..='9')) {
                    self.pos += 1;
                }
            }
            _ => return err("No number after minus sign in JSON"),
        }
        if self.peek() == Some('.') {
            self.pos += 1;
            if !matches!(self.peek(), Some('0'..='9')) {
                return err("Unterminated fractional number in JSON");
            }
            while matches!(self.peek(), Some('0'..='9')) {
                self.pos += 1;
            }
        }
        if matches!(self.peek(), Some('e' | 'E')) {
            self.pos += 1;
            if matches!(self.peek(), Some('+' | '-')) {
                self.pos += 1;
            }
            if !matches!(self.peek(), Some('0'..='9')) {
                return err("Exponent part is missing a number in JSON");
            }
            while matches!(self.peek(), Some('0'..='9')) {
                self.pos += 1;
            }
        }
        let literal: String = self.chars[start..self.pos].iter().collect();
        literal
            .parse::<f64>()
            .map(JsonValue::Number)
            .map_or_else(|_| err("Invalid number in JSON"), Ok)
    }
}

/// An element of an array passed to `Array.prototype.join`.
#[derive(Clone, Debug, PartialEq)]
pub enum JoinValue {
    /// `null` or `undefined`, which join as the empty string.
    Nullish,
    Bool(bool),
    Number(f64),
    String(String),
    /// A nested array, which stringifies as its elements joined with `,`.
    Array(Vec<JoinValue>),
}

impl From<&str> for JoinValue {
    fn from(value: &str) -> Self {
        JoinValue::String(value.to_string())
    }
}

impl From<String> for JoinValue {
    fn from(value: String) -> Self {
        JoinValue::String(value)
    }
}

impl From<f64> for JoinValue {
    fn from(value: f64) -> Self {
        JoinValue::Number(value)
    }
}

impl From<bool> for JoinValue {
    fn from(value: bool) -> Self {
        JoinValue::Bool(value)
    }
}

impl<T: Into<JoinValue>> From<Option<T>> for JoinValue {
    fn from(value: Option<T>) -> Self {
        value.map_or(JoinValue::Nullish, Into::into)
    }
}

impl<T: Into<JoinValue>> From<Vec<T>> for JoinValue {
    fn from(value: Vec<T>) -> Self {
        JoinValue::Array(value.into_iter().map(Into::into).collect())
    }
}

/// `arr.join(separator)`.
pub fn js_join(items: &[JoinValue], separator: &str) -> String {
    items
        .iter()
        .map(|item| match item {
            JoinValue::Nullish => String::new(),
            JoinValue::Bool(b) => b.to_string(),
            JoinValue::Number(n) => js_number_to_string(*n),
            JoinValue::String(s) => s.clone(),
            JoinValue::Array(inner) => js_join(inner, ","),
        })
        .collect::<Vec<String>>()
        .join(separator)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn number_formatting_matches_javascript() {
        let cases: [(f64, &str); 12] = [
            (1.0, "1"),
            (-0.0, "0"),
            (1.5, "1.5"),
            (0.1, "0.1"),
            (1e21, "1e+21"),
            (1.5e21, "1.5e+21"),
            (123456789012345680000.0, "123456789012345680000"),
            (1e-7, "1e-7"),
            (0.000001, "0.000001"),
            (1.2345e-7, "1.2345e-7"),
            (f64::INFINITY, "Infinity"),
            (-42.25, "-42.25"),
        ];
        for (value, expected) in cases {
            assert_eq!(js_number_to_string(value), expected);
        }
    }

    #[test]
    fn json_parse_overflow_becomes_infinity() {
        assert_eq!(
            json_parse("1e400").unwrap_or(JsonValue::Null),
            JsonValue::Number(f64::INFINITY)
        );
        assert!(json_parse("{\"a\":1,}").is_err());
        assert_eq!(
            json_parse("{\"a\":1,\"b\":2,\"a\":3}").unwrap_or(JsonValue::Null),
            JsonValue::Object(vec![
                ("a".to_string(), JsonValue::Number(3.0)),
                ("b".to_string(), JsonValue::Number(2.0)),
            ])
        );
    }
}
