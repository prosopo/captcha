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

//! The `err` field of a log record. TS accepts any value there and unpacks objects by
//! reflecting over their own properties, so the Rust side models what that reflection sees.

use crate::js::{is_truthy, js_key_order, js_string};
use serde_json::{Map, Value};

/// Anything that can be logged as `err`, or appear as a property of it (notably `cause`).
#[derive(Debug, Clone, PartialEq)]
pub enum LogErr {
    /// A plain value, as if a primitive, array or plain object had been thrown.
    Value(Value),
    /// An instance of `Error` or a subclass.
    Error(ErrorObject),
}

impl From<Value> for LogErr {
    fn from(value: Value) -> LogErr {
        LogErr::Value(value)
    }
}

impl From<ErrorObject> for LogErr {
    fn from(error: ErrorObject) -> LogErr {
        LogErr::Error(error)
    }
}

impl From<&str> for LogErr {
    fn from(message: &str) -> LogErr {
        LogErr::Value(Value::String(message.to_string()))
    }
}

impl From<String> for LogErr {
    fn from(message: String) -> LogErr {
        LogErr::Value(Value::String(message))
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct ErrorProperty {
    pub key: String,
    pub value: LogErr,
    /// `message`, `stack` and a constructor-supplied `cause` are non-enumerable on a JS Error,
    /// which only matters when an Error is nested under a key other than `cause`.
    pub enumerable: bool,
}

/// A JS `Error` as the logger sees it: the prototype's `name` plus own properties in
/// `Object.getOwnPropertyNames` order.
#[derive(Debug, Clone, PartialEq)]
pub struct ErrorObject {
    pub name: String,
    pub props: Vec<ErrorProperty>,
}

impl ErrorObject {
    /// `new <name>(message)`.
    pub fn new(name: impl Into<String>, message: impl Into<String>) -> ErrorObject {
        ErrorObject::without_message(name).with_own(
            "message",
            LogErr::Value(Value::String(message.into())),
            false,
        )
    }

    /// `new <name>()`, which has no own `message`.
    pub fn without_message(name: impl Into<String>) -> ErrorObject {
        ErrorObject {
            name: name.into(),
            props: Vec::new(),
        }
    }

    /// Converts a Rust error and its `source()` chain into nested `cause`s, the way
    /// `new Error(message, { cause })` builds them.
    pub fn from_std_error(error: &(dyn std::error::Error + 'static)) -> ErrorObject {
        let unpacked = ErrorObject::new("Error", error.to_string());
        match error.source() {
            Some(source) => unpacked.with_cause(ErrorObject::from_std_error(source)),
            None => unpacked,
        }
    }

    /// Every real Error has an own `stack` first; it is only emitted when `printStack` is on.
    pub fn with_stack(mut self, stack: impl Into<String>) -> ErrorObject {
        let value = LogErr::Value(Value::String(stack.into()));
        match self.props.iter_mut().find(|p| p.key == "stack") {
            Some(existing) => existing.value = value,
            None => self.props.insert(
                0,
                ErrorProperty {
                    key: "stack".to_string(),
                    value,
                    enumerable: false,
                },
            ),
        }
        self
    }

    /// `new Error(message, { cause })`.
    pub fn with_cause(self, cause: impl Into<LogErr>) -> ErrorObject {
        self.with_own("cause", cause.into(), false)
    }

    /// `err[key] = value`: replaces an existing property in place, otherwise appends.
    pub fn with_prop(self, key: impl Into<String>, value: impl Into<LogErr>) -> ErrorObject {
        self.with_own(key, value.into(), true)
    }

    fn with_own(mut self, key: impl Into<String>, value: LogErr, enumerable: bool) -> ErrorObject {
        let key = key.into();
        match self.props.iter_mut().find(|p| p.key == key) {
            Some(existing) => existing.value = value,
            None => self.props.push(ErrorProperty {
                key,
                value,
                enumerable,
            }),
        }
        self
    }

    fn own(&self, key: &str) -> Option<&LogErr> {
        self.props.iter().find(|p| p.key == key).map(|p| &p.value)
    }

    /// `err[key]`, falling back to what `Error.prototype` provides.
    fn get(&self, key: &str) -> Option<LogErr> {
        if let Some(value) = self.own(key) {
            return Some(value.clone());
        }
        match key {
            "name" => Some(LogErr::Value(Value::String(self.name.clone()))),
            "message" => Some(LogErr::Value(Value::String(String::new()))),
            _ => None,
        }
    }
}

fn is_nullish(value: &LogErr) -> bool {
    matches!(value, LogErr::Value(Value::Null))
}

/// `JSON.stringify` only sees an Error's enumerable own properties.
fn to_json(value: &LogErr) -> Value {
    match value {
        LogErr::Value(value) => value.clone(),
        LogErr::Error(error) => Value::Object(
            error
                .props
                .iter()
                .filter(|p| p.enumerable)
                .map(|p| (p.key.clone(), to_json(&p.value)))
                .collect(),
        ),
    }
}

/// `String(value)`, using `Error.prototype.toString` for errors.
fn to_js_string(value: &LogErr) -> String {
    match value {
        LogErr::Value(value) => js_string(value),
        LogErr::Error(error) => {
            let name = error
                .get("name")
                .map_or_else(|| "Error".to_string(), |n| to_js_string(&n));
            let message = error
                .get("message")
                .map_or_else(String::new, |m| to_js_string(&m));
            if name.is_empty() {
                message
            } else if message.is_empty() {
                name
            } else {
                format!("{name}: {message}")
            }
        }
    }
}

/// Values the TS `typeof x === "object"` branches treat as objects (null excluded).
pub(crate) fn is_object_like(value: &LogErr) -> bool {
    matches!(
        value,
        LogErr::Error(_) | LogErr::Value(Value::Object(_)) | LogErr::Value(Value::Array(_))
    )
}

fn own_properties(value: &LogErr) -> Vec<(String, LogErr)> {
    match value {
        LogErr::Error(error) => error
            .props
            .iter()
            .map(|p| (p.key.clone(), p.value.clone()))
            .collect(),
        LogErr::Value(Value::Object(map)) => js_key_order(map)
            .into_iter()
            .map(|key| (key.clone(), LogErr::Value(map[key.as_str()].clone())))
            .collect(),
        LogErr::Value(Value::Array(items)) => items
            .iter()
            .enumerate()
            .map(|(i, item)| (i.to_string(), LogErr::Value(item.clone())))
            .chain(std::iter::once((
                "length".to_string(),
                LogErr::Value(Value::from(items.len())),
            )))
            .collect(),
        LogErr::Value(_) => Vec::new(),
    }
}

fn get_property(value: &LogErr, key: &str) -> Option<LogErr> {
    match value {
        LogErr::Error(error) => error.get(key),
        _ => own_properties(value)
            .into_iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v),
    }
}

pub(crate) struct UnpackedError {
    pub msg: String,
    pub data: Map<String, Value>,
}

/// The TS `unpackError`. `err` must be object-like.
pub(crate) fn unpack_error(err: &LogErr, print_stack: bool) -> UnpackedError {
    let mut data: Map<String, Value> = Map::new();
    for (key, value) in own_properties(err) {
        if !print_stack && (key == "stack" || key == "stacktrace") {
            continue;
        }
        data.insert(key, to_json(&value));
    }

    if !data.get("name").is_some_and(is_truthy) {
        let name = match get_property(err, "name") {
            Some(name) if !is_nullish(&name) => to_json(&name),
            _ => Value::String("Error".to_string()),
        };
        data.insert("name".to_string(), name);
    }

    if let Some(cause) = get_property(err, "cause") {
        // TS assigns the whole `{ msg, data }` result here, not just `data`, and Vector sees
        // that nesting, so it is kept.
        let cause_value = if is_object_like(&cause) {
            let unpacked = unpack_error(&cause, print_stack);
            let mut nested: Map<String, Value> = Map::new();
            nested.insert("msg".to_string(), Value::String(unpacked.msg));
            nested.insert("data".to_string(), Value::Object(unpacked.data));
            Value::Object(nested)
        } else {
            to_json(&cause)
        };
        data.insert("cause".to_string(), cause_value);
    }

    let msg = ["translationKey", "message", "msg"]
        .into_iter()
        .filter_map(|key| get_property(err, key))
        .find(|value| !is_nullish(value))
        .map_or_else(String::new, |value| to_js_string(&value));
    UnpackedError { msg, data }
}
