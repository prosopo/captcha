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

use std::fmt;

use serde::ser::SerializeStruct;
use serde::{Deserialize, Serialize, Serializer};
use serde_json::{Map, Value};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum PathSegment {
    Index(usize),
    Key(String),
}

impl From<&str> for PathSegment {
    fn from(key: &str) -> PathSegment {
        PathSegment::Key(key.to_string())
    }
}

impl From<String> for PathSegment {
    fn from(key: String) -> PathSegment {
        PathSegment::Key(key)
    }
}

impl From<usize> for PathSegment {
    fn from(index: usize) -> PathSegment {
        PathSegment::Index(index)
    }
}

/// A zod `ZodIssue`. Serialises with zod's key order: `code`, the code-specific params
/// (e.g. `expected`, `received`), then `path` and `message`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ValidationIssue {
    pub code: String,
    #[serde(flatten)]
    pub params: Map<String, Value>,
    pub path: Vec<PathSegment>,
    pub message: String,
}

impl ValidationIssue {
    /// zod's `invalid_type` issue with its default error map message.
    pub fn invalid_type(path: Vec<PathSegment>, expected: &str, received: &str) -> ValidationIssue {
        let message = if received == "undefined" {
            "Required".to_string()
        } else {
            format!("Expected {expected}, received {received}")
        };
        let mut params = Map::new();
        params.insert("expected".to_string(), Value::String(expected.to_string()));
        params.insert("received".to_string(), Value::String(received.to_string()));
        ValidationIssue {
            code: "invalid_type".to_string(),
            params,
            path,
            message,
        }
    }

    pub fn custom(path: Vec<PathSegment>, message: impl Into<String>) -> ValidationIssue {
        ValidationIssue {
            code: "custom".to_string(),
            params: Map::new(),
            path,
            message: message.into(),
        }
    }
}

/// A zod `ZodError`: what a failed `schema.parse` throws.
#[derive(Debug, Clone, PartialEq)]
pub struct ValidationError {
    pub issues: Vec<ValidationIssue>,
}

impl ValidationError {
    pub fn new(issues: Vec<ValidationIssue>) -> ValidationError {
        ValidationError { issues }
    }

    /// `ZodError.message`: the issues as `JSON.stringify(issues, null, 2)`.
    pub fn message(&self) -> String {
        serde_json::to_string_pretty(&self.issues).unwrap_or_default()
    }
}

impl From<ValidationIssue> for ValidationError {
    fn from(issue: ValidationIssue) -> ValidationError {
        ValidationError::new(vec![issue])
    }
}

/// Matches `JSON.stringify(zodError)`: `{"issues":[...],"name":"ZodError"}`.
impl Serialize for ValidationError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut state = serializer.serialize_struct("ZodError", 2)?;
        state.serialize_field("issues", &self.issues)?;
        state.serialize_field("name", "ZodError")?;
        state.end()
    }
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message())
    }
}

impl std::error::Error for ValidationError {}

/// zod's `getParsedType` for JSON input; `None` is an absent (`undefined`) value.
pub fn parsed_type(value: Option<&Value>) -> &'static str {
    match value {
        None => "undefined",
        Some(Value::Null) => "null",
        Some(Value::Bool(_)) => "boolean",
        Some(Value::Number(_)) => "number",
        Some(Value::String(_)) => "string",
        Some(Value::Array(_)) => "array",
        Some(Value::Object(_)) => "object",
    }
}

/// The Rust counterpart of a zod schema. serde only parses shapes, so zod's coercions,
/// transforms and refinements are done here: the result is what zod's `parse` would output
/// (unknown keys stripped, defaults and coercions applied), which serde then types.
pub trait Validate {
    fn validate(input: Option<&Value>) -> Result<Value, ValidationError>;
}
