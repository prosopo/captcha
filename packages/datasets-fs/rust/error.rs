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
    ContextValue, ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError,
};
use serde_json::{Map, Value};
use std::fmt;

/// A Node `fs` error: its code (`ENOENT`, …), the call that failed and the path or paths.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FsError {
    pub code: String,
    pub syscall: &'static str,
    pub path: String,
    pub dest: Option<String>,
    description: String,
}

/// libuv's description of the errno values a file command meets.
fn errno(error: &std::io::Error) -> (String, String) {
    let known: Option<(&str, &str)> = match error.raw_os_error() {
        Some(1) => Some(("EPERM", "operation not permitted")),
        Some(2) => Some(("ENOENT", "no such file or directory")),
        Some(13) => Some(("EACCES", "permission denied")),
        Some(17) => Some(("EEXIST", "file already exists")),
        Some(18) => Some(("EXDEV", "cross-device link not permitted")),
        Some(20) => Some(("ENOTDIR", "not a directory")),
        Some(21) => Some(("EISDIR", "illegal operation on a directory")),
        Some(39) => Some(("ENOTEMPTY", "directory not empty")),
        Some(36) => Some(("ENAMETOOLONG", "name too long")),
        _ => None,
    };
    match known {
        Some((code, description)) => (code.to_string(), description.to_string()),
        None => ("EIO".to_string(), error.to_string()),
    }
}

impl FsError {
    pub fn new(
        error: &std::io::Error,
        syscall: &'static str,
        path: &str,
        dest: Option<&str>,
    ) -> FsError {
        let (code, description): (String, String) = errno(error);
        FsError {
            code,
            syscall,
            path: path.to_string(),
            dest: dest.map(str::to_string),
            description,
        }
    }

    /// An error the TS would get from a call Rust does not make the same way.
    pub fn of(code: &str, description: &str, syscall: &'static str, path: &str) -> FsError {
        FsError {
            code: code.to_string(),
            syscall,
            path: path.to_string(),
            dest: None,
            description: description.to_string(),
        }
    }
}

impl fmt::Display for FsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}: {}, {} '{}'",
            self.code, self.description, self.syscall, self.path
        )?;
        match &self.dest {
            Some(dest) => write!(f, " -> '{dest}'"),
            None => Ok(()),
        }
    }
}

#[derive(Debug)]
pub enum DatasetsFsError {
    /// A `ProsopoDatasetError`, `ProsopoEnvError` or `ProsopoCliError`.
    Prosopo(Box<ProsopoError>),
    /// A `ZodError`'s issues.
    Invalid(Vec<Map<String, Value>>),
    /// `JSON.parse`'s `SyntaxError`.
    Json(String),
    /// An `Error` from sharp.
    Image(String),
    Fs(FsError),
    /// A `TypeError`, or one of util's `at`/`get` errors.
    Type(String),
}

impl fmt::Display for DatasetsFsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DatasetsFsError::Prosopo(error) => f.write_str(error.message()),
            DatasetsFsError::Invalid(issues) => {
                f.write_str(&serde_json::to_string_pretty(issues).unwrap_or_default())
            }
            DatasetsFsError::Json(message)
            | DatasetsFsError::Image(message)
            | DatasetsFsError::Type(message) => f.write_str(message),
            DatasetsFsError::Fs(error) => error.fmt(f),
        }
    }
}

impl std::error::Error for DatasetsFsError {}

impl From<FsError> for DatasetsFsError {
    fn from(error: FsError) -> DatasetsFsError {
        DatasetsFsError::Fs(error)
    }
}

pub type Result<T> = std::result::Result<T, DatasetsFsError>;

/// `new <class>(new Error(message), { translationKey })`.
pub(crate) fn wrapped(class: ErrorClass, message: impl Into<String>, key: &str) -> DatasetsFsError {
    DatasetsFsError::Prosopo(Box::new(ProsopoError::new(
        class,
        ErrorSource::message(message),
        ErrorOptions {
            translation_key: Some(key.to_string()),
            ..ErrorOptions::default()
        },
    )))
}

/// `new <class>(key, { context })`.
pub(crate) fn keyed(class: ErrorClass, key: &str, context: Vec<(&str, Value)>) -> DatasetsFsError {
    let mut error_context: ErrorContext = ErrorContext::new();
    for (name, value) in context {
        error_context.set(name, ContextValue::Json(value));
    }
    DatasetsFsError::Prosopo(Box::new(ProsopoError::new(
        class,
        ErrorSource::key(key),
        ErrorOptions {
            context: Some(error_context),
            ..ErrorOptions::default()
        },
    )))
}
