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

use std::sync::OnceLock;

use serde_json::{Map, Value};

use crate::js::ordered_keys;

fn flatten_entries(value: &Value, prefix: &str, out: &mut Map<String, Value>) {
    let mut visit = |key: &str, child: &Value| match child {
        Value::Object(_) | Value::Array(_) => {
            flatten_entries(child, &format!("{prefix}{key}."), out);
        }
        scalar => {
            out.insert(format!("{prefix}{key}"), scalar.clone());
        }
    };
    match value {
        Value::Object(map) => {
            for key in ordered_keys(map) {
                visit(key, &map[key]);
            }
        }
        Value::Array(items) => {
            for (index, item) in items.iter().enumerate() {
                visit(&index.to_string(), item);
            }
        }
        _ => {}
    }
}

/// `flatten`: nested objects and arrays become dot-separated keys
/// (`{a: {b: [1]}}` → `{"a.b.0": 1}`). The result is in JS property order,
/// so array-index keys come first.
pub fn flatten(obj: &Map<String, Value>) -> Map<String, Value> {
    let mut flat = Map::new();
    flatten_entries(&Value::Object(obj.clone()), "", &mut flat);
    let mut ordered = Map::new();
    for key in ordered_keys(&flat) {
        ordered.insert(key.clone(), flat[key].clone());
    }
    ordered
}

/// `version`: `PROSOPO_PACKAGE_VERSION` when set and non-empty, else `"dev"`.
pub fn version() -> &'static str {
    static VERSION: OnceLock<String> = OnceLock::new();
    VERSION.get_or_init(|| {
        std::env::var("PROSOPO_PACKAGE_VERSION")
            .ok()
            .filter(|v| !v.is_empty())
            .unwrap_or_else(|| "dev".to_string())
    })
}

#[cfg(test)]
mod tests {
    // Ported from src/tests/util.unit.test.ts
    use super::*;
    use serde_json::json;

    #[test]
    fn flatten_obj() {
        let obj = json!({ "a": { "b": { "c": 1 } }, "d": 2 });
        let Value::Object(obj) = obj else {
            unreachable!()
        };
        assert_eq!(Value::Object(flatten(&obj)), json!({ "a.b.c": 1, "d": 2 }));
    }

    #[test]
    fn flatten_puts_array_index_keys_first() {
        let obj = json!({ "b": [true, null], "1": "x", "a": {} });
        let Value::Object(obj) = obj else {
            unreachable!()
        };
        let keys: Vec<String> = flatten(&obj).keys().cloned().collect();
        assert_eq!(keys, vec!["1", "b.0", "b.1"]);
    }
}
