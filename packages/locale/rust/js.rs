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

//! The JavaScript semantics the TS implementation leans on without saying so.

use serde_json::{Map, Value};

/// `String.prototype.trim`: ECMAScript's WhiteSpace and LineTerminator set,
/// which differs from Rust's `char::is_whitespace` (U+FEFF in, U+0085 out).
pub fn is_js_whitespace(c: char) -> bool {
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

pub fn js_trim(value: &str) -> &str {
    value.trim_matches(is_js_whitespace)
}

/// JavaScript truthiness of a JSON value.
pub fn is_truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(flag) => *flag,
        Value::Number(number) => number.as_f64().is_some_and(|n| n != 0.0 && !n.is_nan()),
        Value::String(text) => !text.is_empty(),
        Value::Array(_) | Value::Object(_) => true,
    }
}

/// `typeof value` is string, number or boolean.
pub fn is_primitive(value: &Value) -> bool {
    matches!(value, Value::String(_) | Value::Number(_) | Value::Bool(_))
}

/// `Number.prototype.toString()`.
pub fn number_to_string(value: f64) -> String {
    if value == 0.0 {
        return "0".to_owned();
    }
    let mut buffer = ryu_js::Buffer::new();
    buffer.format(value).to_owned()
}

/// `String(value)` for a JSON value; `null` gives the empty string, as
/// i18next's `makeString` does.
pub fn make_string(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::Bool(flag) => flag.to_string(),
        Value::Number(number) => number_to_string(number.as_f64().unwrap_or(f64::NAN)),
        Value::String(text) => text.clone(),
        Value::Array(items) => items
            .iter()
            .map(|item| match item {
                Value::Null => String::new(),
                other => make_string(other),
            })
            .collect::<Vec<String>>()
            .join(","),
        Value::Object(_) => "[object Object]".to_owned(),
    }
}

/// The array index a property name denotes, if it is a canonical one.
pub fn array_index(key: &str) -> Option<usize> {
    if key.is_empty() || (key.len() > 1 && key.starts_with('0')) {
        return None;
    }
    if !key.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    key.parse::<u32>()
        .ok()
        .filter(|index| *index != u32::MAX)
        .map(|index| index as usize)
}

/// An own property of a value, as `Object.prototype.hasOwnProperty` sees it
/// for parsed JSON. Strings are never indexed by the callers, so they have none.
pub fn own_property<'a>(value: &'a Value, key: &str) -> Option<&'a Value> {
    match value {
        Value::Object(map) => map.get(key),
        Value::Array(items) => array_index(key).and_then(|index| items.get(index)),
        _ => None,
    }
}

/// `Object.keys` order: array-index keys ascending, then the rest in
/// insertion order.
pub fn object_keys(map: &Map<String, Value>) -> Vec<&str> {
    let mut indices: Vec<(usize, &str)> = map
        .keys()
        .filter_map(|key| array_index(key).map(|index| (index, key.as_str())))
        .collect();
    indices.sort_unstable_by_key(|(index, _)| *index);
    let mut keys: Vec<&str> = indices.into_iter().map(|(_, key)| key).collect();
    keys.extend(
        map.keys()
            .filter(|key| array_index(key).is_none())
            .map(String::as_str),
    );
    keys
}

/// The number of UTF-16 code units in `value`, which is what JS string
/// lengths and regex `lastIndex` count.
pub fn utf16_len(value: &str) -> usize {
    value.chars().map(char::len_utf16).sum()
}

/// The byte offset of UTF-16 offset `index`, or `None` past the end. An index
/// inside a surrogate pair rounds up, which only matters to patterns that
/// could start on a low surrogate, and none here can.
pub fn byte_offset(value: &str, index: usize) -> Option<usize> {
    let mut units: usize = 0;
    for (offset, c) in value.char_indices() {
        if units >= index {
            return Some(offset);
        }
        units += c.len_utf16();
    }
    (units >= index).then_some(value.len())
}

pub fn utf16_offset(value: &str, byte: usize) -> usize {
    utf16_len(&value[..byte])
}
