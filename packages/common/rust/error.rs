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

//! `ProsopoBaseError` and its subclasses. As in the TS, constructing an error logs it unless
//! `silent` is set; the log carries the translation key, which stays the same in every locale.

use crate::context::{ContextValue, ErrorContext};
use prosopo_locale::{can_translate, I18nLookup, TranslateOptions};
use prosopo_logger::{get_logger, ErrorObject, LogLevel, LogRecord, Logger};
use serde_json::{Map, Value};
use std::backtrace::Backtrace;
use std::fmt;

/// The TS subclass an error was built as.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ErrorClass {
    Prosopo,
    Env,
    Contract,
    TxQueue,
    Db,
    Cli,
    Dataset,
    Api,
}

impl ErrorClass {
    pub const ALL: [ErrorClass; 8] = [
        ErrorClass::Prosopo,
        ErrorClass::Env,
        ErrorClass::Contract,
        ErrorClass::TxQueue,
        ErrorClass::Db,
        ErrorClass::Cli,
        ErrorClass::Dataset,
        ErrorClass::Api,
    ];

    /// The class name, logged as `errorType` unless the `name` option overrides it.
    pub fn class_name(self) -> &'static str {
        match self {
            ErrorClass::Prosopo => "ProsopoError",
            ErrorClass::Env => "ProsopoEnvError",
            ErrorClass::Contract => "ProsopoContractError",
            ErrorClass::TxQueue => "ProsopoTxQueueError",
            ErrorClass::Db => "ProsopoDBError",
            ErrorClass::Cli => "ProsopoCliError",
            ErrorClass::Dataset => "ProsopoDatasetError",
            ErrorClass::Api => "ProsopoApiError",
        }
    }
}

/// The TS constructor's first argument: a translation key, or an `Error` whose message is
/// taken over. Wrapping one of our errors also carries its translation key.
#[derive(Debug, Clone, PartialEq)]
pub enum ErrorSource {
    Key(String),
    Error {
        message: String,
        translation_key: Option<String>,
    },
}

impl ErrorSource {
    pub fn key(key: impl Into<String>) -> ErrorSource {
        ErrorSource::Key(key.into())
    }

    /// `new Error(message)`.
    pub fn message(message: impl Into<String>) -> ErrorSource {
        ErrorSource::Error {
            message: message.into(),
            translation_key: None,
        }
    }

    pub fn from_error(error: &dyn std::error::Error) -> ErrorSource {
        ErrorSource::message(error.to_string())
    }
}

impl From<&ProsopoError> for ErrorSource {
    fn from(error: &ProsopoError) -> ErrorSource {
        ErrorSource::Error {
            message: error.message.clone(),
            translation_key: error.translation_key.clone(),
        }
    }
}

#[derive(Clone, Default)]
pub struct ErrorOptions<'a> {
    pub name: Option<String>,
    pub translation_key: Option<String>,
    /// Defaults to an `info` logger scoped `common:error`.
    pub logger: Option<&'a Logger>,
    /// Only `debug` changes anything: it logs at debug with the stack instead of at error.
    pub log_level: Option<LogLevel>,
    pub context: Option<ErrorContext>,
    pub silent: bool,
    /// Without one, keys stay untranslated.
    pub i18n: Option<&'a dyn I18nLookup>,
}

/// The TS fallback translator: `t` is the identity and nothing `exists`.
pub(crate) struct UntranslatedLookup;

impl I18nLookup for UntranslatedLookup {
    fn t(&self, key: &str) -> String {
        key.to_string()
    }

    fn t_with(&self, key: &str, _options: &TranslateOptions) -> String {
        key.to_string()
    }

    fn exists(&self, _key: &str) -> bool {
        false
    }
}

/// `translateMessage`: only text the instance has a translation for is passed to `t`.
pub(crate) fn translate_message(i18n: &dyn I18nLookup, message: &str) -> String {
    if can_translate(i18n, message) {
        i18n.t(message)
    } else {
        message.to_string()
    }
}

fn truthy(value: &Option<String>) -> Option<&str> {
    value.as_deref().filter(|value| !value.is_empty())
}

const DEFAULT_API_CODE: u16 = 500;

#[derive(Debug, Clone, PartialEq)]
pub struct ProsopoError {
    class: ErrorClass,
    error_type: String,
    message: String,
    translation_key: Option<String>,
    context: Option<ErrorContext>,
    code: Option<u16>,
}

impl ProsopoError {
    pub fn new(
        class: ErrorClass,
        source: impl Into<ErrorSource>,
        options: ErrorOptions<'_>,
    ) -> ProsopoError {
        let source: ErrorSource = source.into();
        let error_type: String = truthy(&options.name)
            .unwrap_or(class.class_name())
            .to_string();
        let i18n: &dyn I18nLookup = options.i18n.unwrap_or(&UntranslatedLookup);
        let (message, translation_key, wrapped_key): (String, Option<String>, Option<String>) =
            match source {
                ErrorSource::Key(key) => (translate_message(i18n, &key), Some(key), None),
                ErrorSource::Error {
                    message,
                    translation_key,
                } => (
                    translate_message(i18n, &message),
                    options.translation_key,
                    translation_key,
                ),
            };
        let (context, code): (Option<ErrorContext>, Option<u16>) = match class {
            ErrorClass::Api => {
                let mut context: ErrorContext = options.context.unwrap_or_default();
                let code: u16 = context
                    .code()
                    .filter(|code| *code != 0)
                    .unwrap_or(DEFAULT_API_CODE);
                context.set("code", ContextValue::Json(Value::from(code)));
                if let Some(key) = truthy(&wrapped_key) {
                    context.set("translationKey", ContextValue::Json(Value::from(key)));
                }
                (Some(context), Some(code))
            }
            _ => (options.context, None),
        };
        let error: ProsopoError = ProsopoError {
            class,
            error_type,
            message,
            translation_key,
            context,
            code,
        };
        if !options.silent {
            let default_logger: Logger;
            let logger: &Logger = match options.logger {
                Some(logger) => logger,
                None => {
                    default_logger = get_logger(LogLevel::Info, "common:error");
                    &default_logger
                }
            };
            error.log(logger, options.log_level.unwrap_or(LogLevel::Error));
        }
        error
    }

    pub fn class(&self) -> ErrorClass {
        self.class
    }

    pub fn error_type(&self) -> &str {
        &self.error_type
    }

    /// Translated when the instance had text for it.
    pub fn message(&self) -> &str {
        &self.message
    }

    pub fn translation_key(&self) -> Option<&str> {
        self.translation_key.as_deref()
    }

    pub fn context(&self) -> Option<&ErrorContext> {
        self.context.as_ref()
    }

    /// The HTTP status of a [`ErrorClass::Api`] error; other classes have none.
    pub fn code(&self) -> Option<u16> {
        self.code
    }

    /// The locale-stable identifier logs are grouped by: the key, else the message.
    fn log_identifier(&self) -> &str {
        truthy(&self.translation_key).unwrap_or(&self.message)
    }

    fn log(&self, logger: &Logger, level: LogLevel) {
        let identifier: &str = self.log_identifier();
        let mut data: Map<String, Value> = Map::new();
        data.insert(
            "errorType".to_string(),
            Value::from(self.error_type.clone()),
        );
        if let Some(context) = &self.context {
            data.insert("context".to_string(), context.to_log_json());
        }
        let record = |data: Map<String, Value>| -> LogRecord {
            LogRecord::msg(identifier)
                .with_err(identifier)
                .with_data(Value::Object(data))
        };
        if level == LogLevel::Debug {
            logger.debug(|| {
                let stack: String =
                    format!("Error: {}\n{}", self.message, Backtrace::force_capture());
                data.insert("stack".to_string(), Value::from(stack));
                record(data)
            });
            return;
        }
        logger.error(|| record(data));
    }

    /// `JSON.stringify(error)`: the enumerable own properties `translationKey`, `context` and,
    /// on an API error, `code`.
    pub fn to_json(&self) -> Value {
        let mut object: Map<String, Value> = Map::new();
        if let Some(key) = &self.translation_key {
            object.insert("translationKey".to_string(), Value::from(key.clone()));
        }
        if let Some(context) = &self.context {
            object.insert("context".to_string(), context.to_json());
        }
        if let Some(code) = self.code {
            object.insert("code".to_string(), Value::from(code));
        }
        Value::Object(object)
    }

    /// The error as the logger sees it when passed as `err`: a JS `Error` (so named `Error`,
    /// with a non-enumerable `message`) plus the own properties above.
    pub fn to_error_object(&self) -> ErrorObject {
        let mut error: ErrorObject = ErrorObject::new("Error", self.message.clone());
        if let Some(key) = &self.translation_key {
            error = error.with_prop("translationKey", Value::from(key.clone()));
        }
        if let Some(context) = &self.context {
            error = error.with_prop("context", context.to_json());
        }
        if let Some(code) = self.code {
            error = error.with_prop("code", Value::from(code));
        }
        error
    }
}

impl fmt::Display for ProsopoError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for ProsopoError {}
