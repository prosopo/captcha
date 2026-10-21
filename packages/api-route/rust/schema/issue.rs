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

//! Issues as zod builds them: the issue data in the order each check writes it, then `path`,
//! then `message` (which keeps its slot when the check wrote one), with the English default
//! message from zod's error map.

use super::js::{number_to_js_string, to_js_string};
use crate::validation::PathSegment;
use serde_json::{Map, Value};

/// zod's issue data before `makeIssue`. A `None` value is a key holding `undefined`: it
/// keeps its slot (which matters for `message`) but never appears in JSON.
#[derive(Debug, Clone, Default)]
pub struct IssueData {
    entries: Vec<(String, Option<Value>)>,
    pub(crate) fatal: bool,
}

impl IssueData {
    pub fn new() -> IssueData {
        IssueData::default()
    }

    pub fn code(code: &str) -> IssueData {
        IssueData::new().with("code", code)
    }

    pub fn with(mut self, key: &str, value: impl Into<Value>) -> IssueData {
        self.set(key, Some(value.into()));
        self
    }

    /// A key the check writes as `undefined`, such as `message: check.message` with no
    /// custom message.
    pub fn with_undefined(mut self, key: &str) -> IssueData {
        self.set(key, None);
        self
    }

    pub fn with_optional(mut self, key: &str, value: Option<Value>) -> IssueData {
        self.set(key, value);
        self
    }

    /// `ctx.addIssue({ ..., fatal: true })`: the issue carries `fatal` and aborts the parse.
    pub fn fatal(mut self) -> IssueData {
        self.fatal = true;
        self.with("fatal", true)
    }

    fn set(&mut self, key: &str, value: Option<Value>) {
        match self.entries.iter_mut().find(|(name, _)| name == key) {
            Some(entry) => entry.1 = value,
            None => self.entries.push((key.to_string(), value)),
        }
    }

    fn get(&self, key: &str) -> Option<&Value> {
        self.entries
            .iter()
            .find(|(name, _)| name == key)
            .and_then(|(_, value)| value.as_ref())
    }

    /// `makeIssue`: `{ ...issueData, path, message }`.
    pub(crate) fn into_issue(self, path: &[PathSegment]) -> Map<String, Value> {
        let mut full_path: Vec<Value> = path.iter().map(path_value).collect();
        if let Some(Value::Array(extra)) = self.get("path") {
            full_path.extend(extra.iter().cloned());
        }
        let message: String = match self.get("message").and_then(Value::as_str) {
            Some(message) => message.to_string(),
            None => default_message(&self),
        };
        let mut issue: Map<String, Value> = Map::new();
        let mut path_written: bool = false;
        let mut message_written: bool = false;
        for (key, value) in self.entries {
            match key.as_str() {
                "path" => {
                    issue.insert(key, Value::Array(full_path.clone()));
                    path_written = true;
                }
                "message" => {
                    issue.insert(key, Value::from(message.clone()));
                    message_written = true;
                }
                _ => {
                    if let Some(value) = value {
                        issue.insert(key, value);
                    }
                }
            }
        }
        if !path_written {
            issue.insert("path".to_string(), Value::Array(full_path));
        }
        if !message_written {
            issue.insert("message".to_string(), Value::from(message));
        }
        issue
    }
}

fn path_value(segment: &PathSegment) -> Value {
    match segment {
        PathSegment::Index(index) => Value::from(*index),
        PathSegment::Key(key) => Value::from(key.clone()),
    }
}

fn number_text(value: Option<&Value>) -> String {
    match value {
        Some(Value::Number(number)) => number_to_js_string(number.as_f64().unwrap_or(f64::NAN)),
        other => to_js_string(other),
    }
}

/// `util.joinValues`: strings quoted with `'`, everything else as `String(value)`.
pub(crate) fn join_values(values: &[Value], separator: &str) -> String {
    values
        .iter()
        .map(|value| match value {
            Value::String(text) => format!("'{text}'"),
            other => to_js_string(Some(other)),
        })
        .collect::<Vec<String>>()
        .join(separator)
}

fn flag(data: &IssueData, key: &str) -> bool {
    data.get(key).and_then(Value::as_bool).unwrap_or(false)
}

/// zod's English error map (`locales/en.js`) for the issue codes this module produces.
fn default_message(data: &IssueData) -> String {
    let code: &str = data.get("code").and_then(Value::as_str).unwrap_or("");
    let kind: &str = data.get("type").and_then(Value::as_str).unwrap_or("");
    let exact: bool = flag(data, "exact");
    let inclusive: bool = flag(data, "inclusive");
    match code {
        "invalid_type" => {
            let received: String = to_js_string(data.get("received"));
            if received == "undefined" {
                "Required".to_string()
            } else {
                format!(
                    "Expected {}, received {received}",
                    to_js_string(data.get("expected"))
                )
            }
        }
        "invalid_literal" => format!(
            "Invalid literal value, expected {}",
            serde_json::to_string(data.get("expected").unwrap_or(&Value::Null)).unwrap_or_default()
        ),
        "unrecognized_keys" => {
            let keys: Vec<Value> = match data.get("keys") {
                Some(Value::Array(keys)) => keys.clone(),
                _ => Vec::new(),
            };
            format!(
                "Unrecognized key(s) in object: {}",
                join_values(&keys, ", ")
            )
        }
        "invalid_union" => "Invalid input".to_string(),
        "invalid_enum_value" => {
            let options: Vec<Value> = match data.get("options") {
                Some(Value::Array(options)) => options.clone(),
                _ => Vec::new(),
            };
            format!(
                "Invalid enum value. Expected {}, received '{}'",
                join_values(&options, " | "),
                to_js_string(data.get("received"))
            )
        }
        "invalid_string" => match data.get("validation") {
            Some(Value::Object(validation)) => {
                if let Some(includes) = validation.get("includes") {
                    let mut message: String = format!(
                        "Invalid input: must include \"{}\"",
                        to_js_string(Some(includes))
                    );
                    if let Some(position @ Value::Number(_)) = validation.get("position") {
                        message = format!(
                            "{message} at one or more positions greater than or equal to {}",
                            number_text(Some(position))
                        );
                    }
                    message
                } else if let Some(prefix) = validation.get("startsWith") {
                    format!(
                        "Invalid input: must start with \"{}\"",
                        to_js_string(Some(prefix))
                    )
                } else if let Some(suffix) = validation.get("endsWith") {
                    format!(
                        "Invalid input: must end with \"{}\"",
                        to_js_string(Some(suffix))
                    )
                } else {
                    "Invalid input".to_string()
                }
            }
            Some(Value::String(validation)) if validation != "regex" => {
                format!("Invalid {validation}")
            }
            _ => "Invalid".to_string(),
        },
        "too_small" => {
            let minimum: String = number_text(data.get("minimum"));
            match kind {
                "array" => format!(
                    "Array must contain {} {minimum} element(s)",
                    if exact {
                        "exactly"
                    } else if inclusive {
                        "at least"
                    } else {
                        "more than"
                    }
                ),
                "string" => format!(
                    "String must contain {} {minimum} character(s)",
                    if exact {
                        "exactly"
                    } else if inclusive {
                        "at least"
                    } else {
                        "over"
                    }
                ),
                "number" => format!(
                    "Number must be {}{minimum}",
                    if exact {
                        "exactly equal to "
                    } else if inclusive {
                        "greater than or equal to "
                    } else {
                        "greater than "
                    }
                ),
                _ => "Invalid input".to_string(),
            }
        }
        "too_big" => {
            let maximum: String = number_text(data.get("maximum"));
            match kind {
                "array" => format!(
                    "Array must contain {} {maximum} element(s)",
                    if exact {
                        "exactly"
                    } else if inclusive {
                        "at most"
                    } else {
                        "less than"
                    }
                ),
                "string" => format!(
                    "String must contain {} {maximum} character(s)",
                    if exact {
                        "exactly"
                    } else if inclusive {
                        "at most"
                    } else {
                        "under"
                    }
                ),
                "number" => format!(
                    "Number must be {} {maximum}",
                    if exact {
                        "exactly"
                    } else if inclusive {
                        "less than or equal to"
                    } else {
                        "less than"
                    }
                ),
                _ => "Invalid input".to_string(),
            }
        }
        "custom" => "Invalid input".to_string(),
        "invalid_intersection_types" => "Intersection results could not be merged".to_string(),
        "not_multiple_of" => format!(
            "Number must be a multiple of {}",
            number_text(data.get("multipleOf"))
        ),
        "not_finite" => "Number must be finite".to_string(),
        _ => "Invalid input".to_string(),
    }
}
