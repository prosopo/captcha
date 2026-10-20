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

//! Minimal RFC 8941 Structured Fields parser covering the subset Web Bot
//! Auth's `Signature-Input` and `Signature` headers use. Only the first
//! dictionary entry is interpreted.

use crate::base64::decode_base64;
use crate::js::{
    is_js_whitespace, js_number_to_string, js_string_to_number, js_trim, js_trim_start,
};

#[derive(Clone, Debug, PartialEq)]
pub enum ParamValue {
    String(String),
    Number(f64),
    Boolean(bool),
    Bytes(Vec<u8>),
}

/// Signature parameters as a plain JS object would hold them: array-index
/// keys iterate first in ascending order, the rest in insertion order, and a
/// repeated key keeps its first position with the last value.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Params {
    entries: Vec<(String, ParamValue)>,
}

impl Params {
    pub fn get(&self, key: &str) -> Option<&ParamValue> {
        self.entries.iter().find(|(k, _)| k == key).map(|(_, v)| v)
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    pub fn iter(&self) -> impl Iterator<Item = (&str, &ParamValue)> {
        let mut index_keys: Vec<(u32, &str, &ParamValue)> = Vec::new();
        let mut other_keys: Vec<(&str, &ParamValue)> = Vec::new();
        for (k, v) in &self.entries {
            match array_index(k) {
                Some(i) => index_keys.push((i, k.as_str(), v)),
                None => other_keys.push((k.as_str(), v)),
            }
        }
        index_keys.sort_by_key(|(i, _, _)| *i);
        index_keys
            .into_iter()
            .map(|(_, k, v)| (k, v))
            .chain(other_keys)
    }

    fn insert(&mut self, key: String, value: ParamValue) {
        match self.entries.iter_mut().find(|(k, _)| *k == key) {
            Some(entry) => entry.1 = value,
            None => self.entries.push((key, value)),
        }
    }
}

fn array_index(key: &str) -> Option<u32> {
    let canonical: bool = key == "0"
        || (!key.is_empty()
            && !key.starts_with('0')
            && key.bytes().all(|b: u8| b.is_ascii_digit()));
    if !canonical {
        return None;
    }
    key.parse::<u32>().ok().filter(|i: &u32| *i != u32::MAX)
}

/// Builds the params object the way `out[key] = value` does in JS, including
/// what happens once a byte-sequence `__proto__` param has made a
/// `Uint8Array` the object's prototype: the typed array's getter-only
/// properties make assignment throw (strict mode), and canonical numeric keys
/// outside its length are silently discarded.
#[derive(Default)]
struct ParamsBuilder {
    params: Params,
    prototype_bytes_len: Option<usize>,
}

const TYPED_ARRAY_GETTERS: [&str; 4] = ["buffer", "byteLength", "byteOffset", "length"];

impl ParamsBuilder {
    fn assign(&mut self, key: String, value: ParamValue) -> Result<(), ParseError> {
        if key == "__proto__" {
            if let ParamValue::Bytes(bytes) = &value {
                self.prototype_bytes_len = Some(bytes.len());
            }
            return Ok(());
        }
        if let Some(len) = self.prototype_bytes_len {
            if TYPED_ARRAY_GETTERS.contains(&key.as_str()) {
                return Err(ParseError::ReadOnlyProperty);
            }
            if let Some(index) = canonical_numeric_index(&key) {
                let valid: bool = index.fract() == 0.0
                    && !(index == 0.0 && index.is_sign_negative())
                    && index >= 0.0
                    && index < len as f64;
                if !valid {
                    return Ok(());
                }
            }
        }
        self.params.insert(key, value);
        Ok(())
    }
}

fn canonical_numeric_index(key: &str) -> Option<f64> {
    if key == "-0" {
        return Some(-0.0);
    }
    let n: f64 = js_string_to_number(key);
    (js_number_to_string(n) == key).then_some(n)
}

#[derive(Clone, Debug, PartialEq)]
pub struct SignatureInputEntry {
    pub label: String,
    /// Covered component identifiers in the signer's order, quotes stripped.
    pub covered_components: Vec<String>,
    pub params: Params,
    /// The raw `(...);params` text, reused verbatim as the `@signature-params`
    /// line of the signature base.
    pub serialised_value: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ParseError {
    UnterminatedInnerList,
    UnterminatedQuotedString,
    UnterminatedQuotedItem,
    NotAQuotedString,
    InvalidBase64,
    ReadOnlyProperty,
}

/// Position of the first `ch` at or after `from` outside a double-quoted
/// string (backslash escapes honoured inside strings). `ch` must not be `"`.
fn find_unquoted(s: &str, ch: u8, from: usize) -> Option<usize> {
    let bytes: &[u8] = s.as_bytes();
    let mut in_string: bool = false;
    let mut i: usize = from;
    while i < bytes.len() {
        let c: u8 = bytes[i];
        if in_string {
            if c == b'\\' && i + 1 < bytes.len() {
                i += 2;
                continue;
            }
            if c == b'"' {
                in_string = false;
            }
        } else if c == b'"' {
            in_string = true;
        } else if c == ch {
            return Some(i);
        }
        i += 1;
    }
    None
}

fn find_from(s: &str, needle: char, from: usize) -> Option<usize> {
    s.get(from..)?.find(needle).map(|i: usize| i + from)
}

/// `s.slice(1, -1)` for a string whose first and last characters are ASCII.
fn strip_ends(s: &str) -> &str {
    if s.len() < 2 {
        ""
    } else {
        &s[1..s.len() - 1]
    }
}

/// `raw.slice(1, -1).replace(/\\(.)/g, "$1")` after checking the quotes.
fn unquote(raw: &str) -> Result<String, ParseError> {
    if raw.len() < 2 || !raw.starts_with('"') || !raw.ends_with('"') {
        return Err(ParseError::NotAQuotedString);
    }
    let inner: &str = &raw[1..raw.len() - 1];
    let mut out: String = String::with_capacity(inner.len());
    let mut chars = inner.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\\' {
            if let Some(&next) = chars.peek() {
                if !matches!(next, '\n' | '\r' | '\u{2028}' | '\u{2029}') {
                    out.push(next);
                    chars.next();
                    continue;
                }
            }
        }
        out.push(c);
    }
    Ok(out)
}

fn is_number_literal(s: &str) -> bool {
    let digits: &str = s.strip_prefix('-').unwrap_or(s);
    let (int_part, frac_part): (&str, Option<&str>) = match digits.split_once('.') {
        Some((i, f)) => (i, Some(f)),
        None => (digits, None),
    };
    let all_digits =
        |p: &str| -> bool { !p.is_empty() && p.bytes().all(|b: u8| b.is_ascii_digit()) };
    all_digits(int_part) && frac_part.is_none_or(all_digits)
}

fn parse_param_value(raw: &str) -> Result<ParamValue, ParseError> {
    let trimmed: &str = js_trim(raw);
    if trimmed.is_empty() {
        return Ok(ParamValue::Boolean(true));
    }
    if trimmed.starts_with('"') {
        return unquote(trimmed).map(ParamValue::String);
    }
    if trimmed.starts_with(':') && trimmed.ends_with(':') {
        return decode_base64(strip_ends(trimmed))
            .map(ParamValue::Bytes)
            .map_err(|_| ParseError::InvalidBase64);
    }
    if trimmed == "?1" {
        return Ok(ParamValue::Boolean(true));
    }
    if trimmed == "?0" {
        return Ok(ParamValue::Boolean(false));
    }
    if is_number_literal(trimmed) {
        return Ok(ParamValue::Number(js_string_to_number(trimmed)));
    }
    Ok(ParamValue::String(trimmed.to_string()))
}

/// Splits `(...);p1=v1;p2=v2` into the value and its raw param entries,
/// respecting quoted strings.
fn split_entry(value: &str) -> Result<(String, Vec<String>), ParseError> {
    let first: &str = js_trim_start(value);
    let inner: String;
    let mut cursor: usize;
    if first.starts_with('(') {
        let open: usize = value.find('(').unwrap_or(0);
        let close: usize =
            find_unquoted(value, b')', open + 1).ok_or(ParseError::UnterminatedInnerList)?;
        inner = value[open..=close].to_string();
        cursor = close + 1;
    } else if first.starts_with('"') {
        let open: usize = value.find('"').unwrap_or(0);
        let close: usize =
            find_from(value, '"', open + 1).ok_or(ParseError::UnterminatedQuotedString)?;
        inner = value[open..=close].to_string();
        cursor = close + 1;
    } else {
        match find_unquoted(value, b';', 0) {
            None => return Ok((js_trim(value).to_string(), Vec::new())),
            Some(semi) => {
                inner = js_trim(&value[..semi]).to_string();
                cursor = semi;
            }
        }
    }
    let bytes: &[u8] = value.as_bytes();
    let mut params: Vec<String> = Vec::new();
    while cursor < bytes.len() {
        if bytes[cursor] == b';' {
            let end: usize = find_unquoted(value, b';', cursor + 1).unwrap_or(bytes.len());
            let p: &str = js_trim(&value[cursor + 1..end]);
            if !p.is_empty() {
                params.push(p.to_string());
            }
            cursor = end;
        } else {
            cursor += 1;
        }
    }
    Ok((inner, params))
}

fn parse_params(entries: &[String]) -> Result<Params, ParseError> {
    let mut builder: ParamsBuilder = ParamsBuilder::default();
    for entry in entries {
        match find_unquoted(entry, b'=', 0) {
            None => builder.assign(js_trim(entry).to_string(), ParamValue::Boolean(true))?,
            Some(eq) => {
                let key: &str = js_trim(&entry[..eq]);
                let value: &str = js_trim(&entry[eq + 1..]);
                builder.assign(key.to_string(), parse_param_value(value)?)?;
            }
        }
    }
    Ok(builder.params)
}

fn parse_covered_components(inner_list: &str) -> Result<Vec<String>, ParseError> {
    let trimmed: &str = js_trim(inner_list);
    let without_open: &str = trimmed.strip_prefix('(').unwrap_or(trimmed);
    let inside: &str = without_open.strip_suffix(')').unwrap_or(without_open);
    let mut items: Vec<String> = Vec::new();
    let skip_while = |from: usize, whitespace: bool| -> usize {
        inside[from..]
            .char_indices()
            .find(|(_, c)| is_js_whitespace(*c) != whitespace)
            .map_or(inside.len(), |(i, _)| from + i)
    };
    let mut i: usize = 0;
    while i < inside.len() {
        i = skip_while(i, true);
        if i >= inside.len() {
            break;
        }
        if inside.as_bytes()[i] == b'"' {
            let end: usize =
                find_from(inside, '"', i + 1).ok_or(ParseError::UnterminatedQuotedItem)?;
            items.push(unquote(&inside[i..=end])?);
            i = skip_while(end + 1, false);
        } else {
            let end: usize = skip_while(i, false);
            items.push(inside[i..end].to_string());
            i = end;
        }
    }
    Ok(items)
}

fn split_dict_entries(header: &str) -> Vec<&str> {
    let mut entries: Vec<&str> = Vec::new();
    let mut start: usize = 0;
    while start < header.len() {
        let end: usize = find_unquoted(header, b',', start).unwrap_or(header.len());
        let raw: &str = js_trim(&header[start..end]);
        if !raw.is_empty() {
            entries.push(raw);
        }
        start = end + 1;
    }
    entries
}

fn parse_first_dict_entry(header: &str) -> Option<(&str, &str)> {
    let first: &str = split_dict_entries(header).first()?;
    let eq: usize = find_unquoted(first, b'=', 0)?;
    Some((js_trim(&first[..eq]), js_trim(&first[eq + 1..])))
}

/// Parses the first entry of a `Signature-Input` header. `None` when the
/// header is not a dictionary whose first value is a well-formed inner list.
pub fn parse_signature_input(header: &str) -> Option<SignatureInputEntry> {
    let (label, raw_value) = parse_first_dict_entry(header)?;
    let parse = || -> Result<Option<SignatureInputEntry>, ParseError> {
        let (inner_list, params) = split_entry(raw_value)?;
        if !inner_list.starts_with('(') {
            return Ok(None);
        }
        Ok(Some(SignatureInputEntry {
            label: label.to_string(),
            covered_components: parse_covered_components(&inner_list)?,
            params: parse_params(&params)?,
            serialised_value: raw_value.to_string(),
        }))
    };
    parse().ok().flatten()
}

/// Decodes the byte sequence of the first `Signature` entry, provided its
/// label is `expected_label`.
pub fn parse_signature(header: &str, expected_label: &str) -> Option<Vec<u8>> {
    let (label, raw_value) = parse_first_dict_entry(header)?;
    if label != expected_label {
        return None;
    }
    let raw: &str = js_trim(raw_value);
    if !raw.starts_with(':') || !raw.ends_with(':') {
        return None;
    }
    decode_base64(strip_ends(raw)).ok()
}
