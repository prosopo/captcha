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

//! api/requestBodySummary.ts: a bounded, redacted summary of a request body for the logs.

use prosopo_logger::{js_key_order, json_stringify};
use serde_json::{json, Map, Value};

const REDACTED: &str = "[redacted]";
const MAX_DEPTH: usize = 3;
const MAX_KEYS: usize = 20;
const MAX_ARRAY_ITEMS: usize = 5;
const MAX_STRING_CHARS: usize = 64;
const MAX_PREVIEW_CHARS: usize = 512;
const SENSITIVE_KEY_PARTS: [&str; 11] = ["signature", "token", "secret", "proof", "procaptcha", "salt", "mnemonic", "password", "email", "behavioral", "detectorkey"];

/// `SENSITIVE_KEY.test(key)`, the `/i` matching ASCII case only.
fn sensitive(key: &str) -> bool {
    let lowered: String = key.chars().map(|c| c.to_ascii_lowercase()).collect();
    lowered == "ip" || SENSITIVE_KEY_PARTS.iter().any(|part| lowered.contains(part))
}

/// The first `count` UTF-16 code units of `text`, a split surrogate pair kept as JS keeps it
/// (then lost to the lossy conversion, as `JSON.stringify` would escape it).
fn utf16_prefix(text: &str, count: usize) -> String {
    let units: Vec<u16> = text.encode_utf16().take(count).collect();
    String::from_utf16_lossy(&units)
}

fn truncate(text: &str) -> String {
    let length: usize = text.encode_utf16().count();
    if length > MAX_STRING_CHARS {
        format!("{}...(+{} chars)", utf16_prefix(text, MAX_STRING_CHARS), length - MAX_STRING_CHARS)
    } else {
        text.to_string()
    }
}

fn redact(value: &Value, depth: usize) -> Value {
    match value {
        Value::String(text) => Value::String(truncate(text)),
        Value::Array(items) if depth >= MAX_DEPTH => Value::String(format!("[array({})]", items.len())),
        Value::Object(_) if depth >= MAX_DEPTH => Value::String("[object]".to_string()),
        Value::Array(items) => {
            let mut out: Vec<Value> = items.iter().take(MAX_ARRAY_ITEMS).map(|item| redact(item, depth + 1)).collect();
            if items.len() > MAX_ARRAY_ITEMS {
                out.push(Value::String(format!("...(+{} items)", items.len() - MAX_ARRAY_ITEMS)));
            }
            Value::Array(out)
        }
        Value::Object(fields) => {
            let keys: Vec<&String> = js_key_order(fields);
            let mut out: Map<String, Value> = Map::new();
            for key in keys.iter().take(MAX_KEYS) {
                out.insert((*key).clone(), if sensitive(key) { Value::String(REDACTED.to_string()) } else { redact(&fields[key.as_str()], depth + 1) });
            }
            if keys.len() > MAX_KEYS {
                out.insert("...".to_string(), Value::String(format!("+{} keys", keys.len() - MAX_KEYS)));
            }
            Value::Object(out)
        }
        other => other.clone(),
    }
}

/// `Number(headers["content-length"])` when finite.
fn content_length(header: Option<&str>) -> Option<f64> {
    let trimmed: &str = header?.trim();
    let bytes: f64 = if trimmed.is_empty() { 0.0 } else { trimmed.parse::<f64>().ok()? };
    bytes.is_finite().then_some(bytes)
}

/// `summariseRequestBody`.
pub fn summarise_request_body(body: Option<&Value>, content_length_header: Option<&str>) -> Value {
    let kind: &str = match body {
        None => "undefined",
        Some(Value::Null) => "null",
        Some(Value::Array(_)) => "array",
        Some(Value::Object(_)) => "object",
        Some(Value::String(_)) => "string",
        Some(Value::Number(_)) => "number",
        Some(Value::Bool(_)) => "boolean",
    };
    let preview: String = body.map(|body| utf16_prefix(&json_stringify(&redact(body, 0), 0), MAX_PREVIEW_CHARS)).unwrap_or_default();
    let mut out: Map<String, Value> = Map::new();
    out.insert("type".to_string(), json!(kind));
    if let Some(bytes) = content_length(content_length_header) {
        out.insert("bytes".to_string(), json!(bytes));
    }
    if let Some(Value::Object(fields)) = body {
        let keys: Vec<&String> = js_key_order(fields);
        out.insert("keys".to_string(), json!(keys.iter().take(MAX_KEYS).collect::<Vec<_>>()));
        out.insert("keyCount".to_string(), json!(keys.len()));
    }
    out.insert("preview".to_string(), json!(preview));
    Value::Object(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_truncates_and_bounds_as_the_ts_does() {
        let body: Value = json!({
            "challenge": "x".repeat(70),
            "signature": { "user": "s" },
            "IP": "1.2.3.4",
            "ipAddress": "kept",
            "nested": { "a": { "b": { "c": 1 } } },
            "list": [1, 2, 3, 4, 5, 6],
            "2": "index first",
        });
        let summary: Value = summarise_request_body(Some(&body), Some("120"));
        assert_eq!(summary["type"], json!("object"));
        assert_eq!(summary["bytes"], json!(120.0));
        assert_eq!(summary["keys"][0], json!("2"));
        assert_eq!(summary["keyCount"], json!(7));
        let preview: Value = serde_json::from_str(summary["preview"].as_str().expect("a preview")).expect("json");
        assert_eq!(preview["challenge"], json!(format!("{}...(+6 chars)", "x".repeat(64))));
        assert_eq!(preview["signature"], json!("[redacted]"));
        assert_eq!(preview["IP"], json!("[redacted]"));
        assert_eq!(preview["ipAddress"], json!("kept"));
        assert_eq!(preview["nested"], json!({ "a": { "b": "[object]" } }));
        assert_eq!(preview["list"], json!([1, 2, 3, 4, 5, "...(+1 items)"]));
        assert_eq!(summarise_request_body(None, None), json!({ "type": "undefined", "preview": "" }));
    }
}
