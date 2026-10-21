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

//! The `context` of a `ProsopoError`: a plain object whose values may themselves be thrown
//! errors (`context.error`), which is what `unwrapError` walks and what the logs show.

use crate::error::ProsopoError;
use prosopo_logger::{ErrorObject, LogErr};
use serde_json::{Map, Value};

/// A request body can fail validation with tens of thousands of issues; only the first few
/// are reported in a response or a log line.
pub const MAX_REPORTED_ISSUES: usize = 10;

/// What `isZodError` recognises: an error named `ZodError`. In Rust these come from request
/// validation, so the issues are always present; the TS fallback of parsing `message` when
/// `issues` is missing has no Rust caller.
#[derive(Debug, Clone, PartialEq)]
pub struct ZodLikeError {
    pub message: String,
    pub issues: Vec<Value>,
}

impl ZodLikeError {
    pub const NAME: &'static str = "ZodError";

    pub(crate) fn reported_issues(&self) -> Vec<Value> {
        self.issues
            .iter()
            .take(MAX_REPORTED_ISSUES)
            .cloned()
            .collect()
    }

    /// `{ name, issueCount, issues }`, the summary logged in place of the full error.
    pub(crate) fn bounded_summary(&self) -> Value {
        let mut summary: Map<String, Value> = Map::new();
        summary.insert("name".to_string(), Value::from(ZodLikeError::NAME));
        summary.insert("issueCount".to_string(), Value::from(self.issues.len()));
        summary.insert("issues".to_string(), Value::Array(self.reported_issues()));
        Value::Object(summary)
    }
}

/// A thrown value the error handling distinguishes: one of ours, a validation error, or any
/// other `Error` as the logger models it.
#[derive(Debug, Clone, PartialEq)]
pub enum ThrownError {
    Prosopo(Box<ProsopoError>),
    Zod(ZodLikeError),
    Other(ErrorObject),
}

impl From<ProsopoError> for ThrownError {
    fn from(error: ProsopoError) -> ThrownError {
        ThrownError::Prosopo(Box::new(error))
    }
}

impl From<ZodLikeError> for ThrownError {
    fn from(error: ZodLikeError) -> ThrownError {
        ThrownError::Zod(error)
    }
}

impl From<ErrorObject> for ThrownError {
    fn from(error: ErrorObject) -> ThrownError {
        ThrownError::Other(error)
    }
}

impl ThrownError {
    /// `JSON.stringify(error)`: an Error's enumerable own properties only, so never its
    /// `message` or `stack`.
    pub fn to_json(&self) -> Value {
        match self {
            ThrownError::Prosopo(error) => error.to_json(),
            ThrownError::Zod(error) => {
                let mut object: Map<String, Value> = Map::new();
                object.insert("issues".to_string(), Value::Array(error.issues.clone()));
                object.insert("name".to_string(), Value::from(ZodLikeError::NAME));
                Value::Object(object)
            }
            ThrownError::Other(error) => error_object_to_json(error),
        }
    }

    pub(crate) fn message(&self) -> String {
        match self {
            ThrownError::Prosopo(error) => error.message().to_string(),
            ThrownError::Zod(error) => error.message.clone(),
            ThrownError::Other(error) => match own_value(error, "message") {
                Some(Value::String(message)) => message.clone(),
                _ => String::new(),
            },
        }
    }
}

pub(crate) fn own_value<'a>(error: &'a ErrorObject, key: &str) -> Option<&'a Value> {
    error
        .props
        .iter()
        .find(|property| property.key == key)
        .and_then(|property| match &property.value {
            LogErr::Value(value) => Some(value),
            LogErr::Error(_) => None,
        })
}

fn log_err_to_json(value: &LogErr) -> Value {
    match value {
        LogErr::Value(value) => value.clone(),
        LogErr::Error(error) => error_object_to_json(error),
    }
}

fn error_object_to_json(error: &ErrorObject) -> Value {
    Value::Object(
        error
            .props
            .iter()
            .filter(|property| property.enumerable)
            .map(|property| (property.key.clone(), log_err_to_json(&property.value)))
            .collect(),
    )
}

#[derive(Debug, Clone, PartialEq)]
pub enum ContextValue {
    Json(Value),
    Thrown(ThrownError),
}

impl ContextValue {
    pub fn to_json(&self) -> Value {
        match self {
            ContextValue::Json(value) => value.clone(),
            ContextValue::Thrown(error) => error.to_json(),
        }
    }
}

/// An object with JS assignment semantics: setting an existing key replaces its value in
/// place, so key order (and so the logged JSON) follows the TS.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct ErrorContext {
    entries: Vec<ContextEntry>,
}

type ContextEntry = (String, ContextValue);

impl ErrorContext {
    pub fn new() -> ErrorContext {
        ErrorContext::default()
    }

    pub fn with(mut self, key: impl Into<String>, value: impl Into<Value>) -> ErrorContext {
        self.set(key, ContextValue::Json(value.into()));
        self
    }

    pub fn with_thrown(
        mut self,
        key: impl Into<String>,
        error: impl Into<ThrownError>,
    ) -> ErrorContext {
        self.set(key, ContextValue::Thrown(error.into()));
        self
    }

    /// `context.error`, the error this one wraps.
    pub fn with_error(self, error: impl Into<ThrownError>) -> ErrorContext {
        self.with_thrown("error", error)
    }

    pub fn set(&mut self, key: impl Into<String>, value: ContextValue) {
        let key: String = key.into();
        match self.entries.iter_mut().find(|(name, _)| *name == key) {
            Some(entry) => entry.1 = value,
            None => self.entries.push((key, value)),
        }
    }

    pub fn get(&self, key: &str) -> Option<&ContextValue> {
        self.entries
            .iter()
            .find(|(name, _)| name == key)
            .map(|(_, value)| value)
    }

    pub(crate) fn json(&self, key: &str) -> Option<&Value> {
        match self.get(key) {
            Some(ContextValue::Json(value)) => Some(value),
            _ => None,
        }
    }

    pub fn error(&self) -> Option<&ThrownError> {
        match self.get("error") {
            Some(ContextValue::Thrown(error)) => Some(error),
            _ => None,
        }
    }

    /// `context.code` when it is a number a status code can hold.
    pub(crate) fn code(&self) -> Option<u16> {
        self.json("code").and_then(status_code)
    }

    pub fn entries(&self) -> impl Iterator<Item = (&str, &ContextValue)> {
        self.entries
            .iter()
            .map(|(key, value)| (key.as_str(), value))
    }

    /// Keys in the order JS enumerates them: array indexes (`"2"`, `"10"`) first, ascending,
    /// then the rest in insertion order.
    fn js_ordered(&self) -> Vec<&ContextEntry> {
        let (mut indexes, named): (Vec<&ContextEntry>, Vec<&ContextEntry>) = self
            .entries
            .iter()
            .partition(|(key, _)| array_index(key).is_some());
        indexes.sort_by_key(|(key, _)| array_index(key));
        indexes.into_iter().chain(named).collect()
    }

    pub fn to_json(&self) -> Value {
        Value::Object(
            self.js_ordered()
                .into_iter()
                .map(|(key, value)| (key.clone(), value.to_json()))
                .collect(),
        )
    }

    /// `boundContextForLog`: a validation error is logged as a bounded summary.
    pub(crate) fn to_log_json(&self) -> Value {
        Value::Object(
            self.js_ordered()
                .into_iter()
                .map(|(key, value)| {
                    let json: Value = match (key.as_str(), value) {
                        ("error", ContextValue::Thrown(ThrownError::Zod(zod))) => {
                            zod.bounded_summary()
                        }
                        _ => value.to_json(),
                    };
                    (key.clone(), json)
                })
                .collect(),
        )
    }
}

fn array_index(key: &str) -> Option<u32> {
    let canonical: bool = key == "0" || (!key.is_empty() && !key.starts_with('0'));
    if !canonical || !key.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    key.parse::<u32>().ok().filter(|index| *index < u32::MAX)
}

/// Status codes are whole numbers in 0..=65535; any other number the TS would carry through
/// is treated as no code.
pub(crate) fn status_code(value: &Value) -> Option<u16> {
    value
        .as_u64()
        .and_then(|code| u16::try_from(code).ok())
        .or_else(|| {
            value
                .as_f64()
                .filter(|code| code.fract() == 0.0 && (0.0..=f64::from(u16::MAX)).contains(code))
                .map(|code| code as u16)
        })
}
