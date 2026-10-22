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

//! Node's `util.inspect` for a JSON value, as mongoose quotes one in a cast error, on one line.
//! Node breaks an inspection longer than 72 characters over several lines; this does not.

use prosopo_util::number_to_string;
use serde_json::Value;

/// Past this depth Node writes `[Object]` or `[Array]`.
const DEPTH: usize = 2;

fn is_identifier(key: &str) -> bool {
    let mut chars = key.chars();
    chars.next().is_some_and(|c| c.is_ascii_alphabetic() || c == '_') && chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

/// A string as Node quotes it: single quotes, or double quotes when it holds a single quote and
/// no double quote.
fn quoted(text: &str) -> String {
    let quote: char = if text.contains('\'') && !text.contains('"') { '"' } else { '\'' };
    let mut out: String = String::from(quote);
    for c in text.chars() {
        match c {
            '\n' => out.push_str("\\n"),
            '\t' => out.push_str("\\t"),
            '\r' => out.push_str("\\r"),
            '\\' => out.push_str("\\\\"),
            c if c == quote => {
                out.push('\\');
                out.push(c);
            }
            c if (c as u32) < 0x20 || c == '\u{7f}' => out.push_str(&format!("\\x{:02X}", c as u32)),
            c => out.push(c),
        }
    }
    out.push(quote);
    out
}

fn at_depth(value: &Value, depth: usize) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(flag) => flag.to_string(),
        Value::Number(number) => number_to_string(number.as_f64().unwrap_or(f64::NAN)),
        Value::String(text) => quoted(text),
        Value::Array(items) if items.is_empty() => "[]".to_string(),
        Value::Array(_) if depth > DEPTH => "[Array]".to_string(),
        Value::Array(items) => format!("[ {} ]", items.iter().map(|item| at_depth(item, depth + 1)).collect::<Vec<String>>().join(", ")),
        Value::Object(fields) if fields.is_empty() => "{}".to_string(),
        Value::Object(_) if depth > DEPTH => "[Object]".to_string(),
        Value::Object(fields) => {
            let entries: Vec<String> = fields
                .iter()
                .map(|(key, value)| {
                    let key: String = if is_identifier(key) { key.clone() } else { quoted(key) };
                    format!("{key}: {}", at_depth(value, depth + 1))
                })
                .collect();
            format!("{{ {} }}", entries.join(", "))
        }
    }
}

/// `util.inspect(value)`.
pub fn inspect(value: &Value) -> String {
    at_depth(value, 0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn writes_values_as_node_does() {
        assert_eq!(inspect(&json!({ "$ne": null })), "{ '$ne': null }");
        assert_eq!(inspect(&json!(["repeat@example.com", "again@example.com"])), "[ 'repeat@example.com', 'again@example.com' ]");
        assert_eq!(inspect(&json!({ "first": "A", "n": 1.5, "ok": true })), "{ first: 'A', n: 1.5, ok: true }");
        assert_eq!(inspect(&json!({})), "{}");
        assert_eq!(inspect(&json!([])), "[]");
        assert_eq!(inspect(&json!("it's")), "\"it's\"");
        assert_eq!(inspect(&json!({ "a": { "b": { "c": { "d": 1 } } } })), "{ a: { b: { c: [Object] } } }");
    }
}
