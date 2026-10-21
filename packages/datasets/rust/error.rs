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

use prosopo_common::{
    ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError, ZodLikeError,
};
use prosopo_logger::{ErrorObject, LogErr};
use prosopo_util::UtilError;
use serde_json::{Map, Value};
use std::fmt;

/// What the TS throws: one of our errors, or a plain `Error` such as `at`'s index checks.
#[derive(Debug, Clone, PartialEq)]
pub enum DatasetsError {
    Prosopo(Box<ProsopoError>),
    Plain(ErrorObject),
}

pub type Result<T> = std::result::Result<T, DatasetsError>;

impl DatasetsError {
    pub(crate) fn new(
        class: ErrorClass,
        key: &str,
        context: Option<ErrorContext>,
    ) -> DatasetsError {
        DatasetsError::Prosopo(Box::new(ProsopoError::new(
            class,
            ErrorSource::key(key),
            ErrorOptions {
                context,
                ..ErrorOptions::default()
            },
        )))
    }

    /// `new Class(key, { context: { error } })`: this error wrapped in another.
    pub(crate) fn wrap(self, class: ErrorClass, key: &str) -> DatasetsError {
        DatasetsError::new(class, key, Some(ErrorContext::new().with_error(self)))
    }

    pub(crate) fn zod(
        class: ErrorClass,
        key: &str,
        issues: Vec<Map<String, Value>>,
    ) -> DatasetsError {
        let issues: Vec<Value> = issues.into_iter().map(Value::Object).collect();
        let zod: ZodLikeError = ZodLikeError {
            message: serde_json::to_string_pretty(&issues).unwrap_or_default(),
            issues,
        };
        DatasetsError::new(class, key, Some(ErrorContext::new().with_error(zod)))
    }

    pub fn prosopo(&self) -> Option<&ProsopoError> {
        match self {
            DatasetsError::Prosopo(error) => Some(error),
            DatasetsError::Plain(_) => None,
        }
    }
}

impl From<UtilError> for DatasetsError {
    fn from(error: UtilError) -> DatasetsError {
        DatasetsError::Plain(ErrorObject::new("Error", error.message()))
    }
}

impl From<DatasetsError> for ThrownError {
    fn from(error: DatasetsError) -> ThrownError {
        match error {
            DatasetsError::Prosopo(error) => ThrownError::Prosopo(error),
            DatasetsError::Plain(error) => ThrownError::Other(error),
        }
    }
}

impl fmt::Display for DatasetsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DatasetsError::Prosopo(error) => f.write_str(error.message()),
            DatasetsError::Plain(error) => f.write_str(&plain_message(error)),
        }
    }
}

impl std::error::Error for DatasetsError {}

/// A plain error's `message`, or its `name` when it has none.
pub fn plain_message(error: &ErrorObject) -> String {
    error
        .props
        .iter()
        .find(|prop| prop.key == "message")
        .and_then(|prop| match &prop.value {
            LogErr::Value(Value::String(message)) => Some(message.clone()),
            _ => None,
        })
        .unwrap_or_else(|| error.name.clone())
}
