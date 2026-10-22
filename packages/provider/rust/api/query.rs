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

//! `req.query[name]` where only a plain string will do: express 4 parses the query with qs 6
//! (`allowPrototypes`), which turns a repeated or bracketed name into an array or an object.

use indexmap::IndexMap;

const PARAMETER_LIMIT: usize = 1000;

/// `decodeURIComponent`, or `None` where it throws.
fn decode_uri_component(text: &str) -> Option<String> {
    let bytes: &[u8] = text.as_bytes();
    let mut decoded: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut index: usize = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            let hex: &str = text.get(index + 1..index + 3)?;
            decoded.push(u8::from_str_radix(hex, 16).ok().filter(|_| hex.bytes().all(|b| b.is_ascii_hexdigit()))?);
            index += 3;
        } else {
            decoded.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(decoded).ok()
}

/// qs's decoder: `+` is a space, and text that will not decode is kept as it is.
fn decode(text: &str) -> String {
    let spaced: String = text.replace('+', " ");
    decode_uri_component(&spaced).unwrap_or(spaced)
}

/// The `[...]` segments of a key, as qs's segment pattern finds them: a `[`, no brackets, a `]`.
fn segments(key: &str) -> Vec<(usize, usize)> {
    let mut found: Vec<(usize, usize)> = Vec::new();
    let mut from: usize = 0;
    while let Some(open) = key[from..].find('[').map(|at| from + at) {
        match key[open + 1..].find(['[', ']']).map(|at| open + 1 + at) {
            Some(close) if key.as_bytes()[close] == b']' => {
                found.push((open, close));
                from = close + 1;
            }
            Some(next) => from = next,
            None => break,
        }
    }
    found
}

/// The top-level name a key fills, and whether it fills it with the value itself rather
/// than with an array or object around it.
fn top_level(key: &str) -> (String, bool) {
    let segments: Vec<(usize, usize)> = segments(key);
    match segments.first() {
        None => (key.to_string(), true),
        Some(&(0, close)) => (key[1..close].to_string(), segments.len() == 1),
        Some(&(open, _)) => (key[..open].to_string(), false),
    }
}

/// `req.query[name]` when it is a string, else `None`.
pub fn query_string(query: &str, name: &str) -> Option<String> {
    let bracketed: String = replace_ignoring_case(&replace_ignoring_case(query, "%5B", "["), "%5D", "]");
    let mut values: IndexMap<String, Vec<String>> = IndexMap::new();
    for part in bracketed.split('&').take(PARAMETER_LIMIT) {
        let split: Option<usize> = match part.find("]=") {
            Some(bracket) => Some(bracket + 1),
            None => part.find('='),
        };
        let (key, value) = match split {
            Some(at) => (decode(&part[..at]), decode(&part[at + 1..])),
            None => (decode(part), String::new()),
        };
        values.entry(key).or_default().push(value);
    }
    let mut found: Vec<(bool, Vec<String>)> = values
        .into_iter()
        .filter(|(key, _)| !key.is_empty())
        .filter_map(|(key, values)| {
            let (top, plain) = top_level(&key);
            (top == name).then_some((plain, values))
        })
        .collect();
    match (found.len(), found.pop()) {
        (1, Some((true, mut values))) if values.len() == 1 => values.pop(),
        _ => None,
    }
}

fn replace_ignoring_case(text: &str, from: &str, to: &str) -> String {
    let mut out: String = String::with_capacity(text.len());
    let mut rest: &str = text;
    while let Some(at) = rest.to_ascii_lowercase().find(&from.to_ascii_lowercase()) {
        out.push_str(&rest[..at]);
        out.push_str(to);
        rest = &rest[at + from.len()..];
    }
    out.push_str(rest);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_a_value_only_when_qs_makes_it_a_string() {
        assert_eq!(query_string("m=n&u=x", "m").as_deref(), Some("n"));
        assert_eq!(query_string("m=n&m=n", "m"), None);
        assert_eq!(query_string("m[]=n", "m"), None);
        assert_eq!(query_string("m%5B%5D=n", "m"), None);
        assert_eq!(query_string("[m]=n", "m").as_deref(), Some("n"));
        assert_eq!(query_string("%6D=n", "m").as_deref(), Some("n"));
        assert_eq!(query_string("m=n&[m]=x", "m"), None);
        assert_eq!(query_string("m", "m").as_deref(), Some(""));
        assert_eq!(query_string("u=a+b%zz", "u").as_deref(), Some("a b%zz"));
        assert_eq!(query_string("u[", "u"), None);
        assert_eq!(query_string("[m]x=n", "m").as_deref(), Some("n"));
        assert_eq!(query_string("[m][x]=n", "m"), None);
        assert_eq!(query_string("m[x=n", "m"), None);
    }
}
