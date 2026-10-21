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

//! `unwrapError`: any thrown error as the status code, reason phrase and `error` body of an
//! API response.

use crate::context::{own_value, status_code, ThrownError, ZodLikeError};
use crate::error::{translate_message, UntranslatedLookup};
use prosopo_locale::{english_text, is_translation_key, is_widget_translation_key, I18nLookup};
use serde::{Deserialize, Serialize};
use serde_json::Value;

const UNKNOWN_KEY: &str = "API.UNKNOWN";
const INVALID_BODY_KEY: &str = "API.INVALID_BODY";
const DEFAULT_CODE: u16 = 400;

/// A validation error has always sent its (bounded) issue list as `message`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ApiErrorMessage {
    Text(String),
    Issues(Vec<Value>),
}

/// The `error` of an API response body (`ApiJsonError` in @prosopo/types), with its keys in
/// the order the TS builds them.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ApiJsonError {
    pub code: u16,
    /// In the request's language.
    pub message: ApiErrorMessage,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
    /// `key`'s English text, only sent when the widget has no text of its own for `key`.
    #[serde(rename = "messageEn", default, skip_serializing_if = "Option::is_none")]
    pub message_en: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct UnwrappedError {
    pub code: u16,
    pub status_message: &'static str,
    pub json_error: ApiJsonError,
}

/// The reason phrase for `code`; unmapped codes fall back by class.
pub fn status_message(code: u16) -> &'static str {
    match code {
        400 => "Bad Request",
        401 => "Unauthorized",
        402 => "Payment Required",
        403 => "Forbidden",
        404 => "Not Found",
        405 => "Method Not Allowed",
        408 => "Request Timeout",
        409 => "Conflict",
        410 => "Gone",
        413 => "Payload Too Large",
        415 => "Unsupported Media Type",
        422 => "Unprocessable Entity",
        429 => "Too Many Requests",
        500 => "Internal Server Error",
        501 => "Not Implemented",
        502 => "Bad Gateway",
        503 => "Service Unavailable",
        504 => "Gateway Timeout",
        code if code >= 500 => "Internal Server Error",
        _ => "Bad Request",
    }
}

fn own_code(error: &ThrownError) -> Option<u16> {
    match error {
        ThrownError::Prosopo(error) => error.code(),
        ThrownError::Zod(_) => None,
        ThrownError::Other(error) => own_value(error, "code").and_then(status_code),
    }
}

/// `"translationKey" in err ? err.translationKey : "API.UNKNOWN"`. Every `ProsopoError` has
/// the property, even when it holds `undefined`.
fn own_key(error: &ThrownError) -> Option<String> {
    match error {
        ThrownError::Prosopo(error) => error.translation_key().map(str::to_string),
        ThrownError::Zod(_) => Some(UNKNOWN_KEY.to_string()),
        ThrownError::Other(error) => {
            match error
                .props
                .iter()
                .find(|property| property.key == "translationKey")
            {
                Some(_) => own_value(error, "translationKey")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                None => Some(UNKNOWN_KEY.to_string()),
            }
        }
    }
}

fn first_truthy(candidates: [Option<&str>; 2]) -> &str {
    candidates
        .into_iter()
        .flatten()
        .find(|candidate| !candidate.is_empty())
        .unwrap_or(UNKNOWN_KEY)
}

pub fn unwrap_error(error: &ThrownError, i18n: Option<&dyn I18nLookup>) -> UnwrappedError {
    let i18n: &dyn I18nLookup = i18n.unwrap_or(&UntranslatedLookup);
    let initial_code: u16 = own_code(error).unwrap_or(DEFAULT_CODE);
    let mut code: u16 = initial_code;
    let mut json_error: ApiJsonError = ApiJsonError {
        code: initial_code,
        message: ApiErrorMessage::Text(translate_message(i18n, &error.message())),
        key: own_key(error),
        data: None,
        message_en: None,
    };

    let mut current: &ThrownError = error;
    while let ThrownError::Prosopo(prosopo) = current {
        let Some(context) = prosopo.context() else {
            break;
        };
        let context_key: Option<&str> = context.json("translationKey").and_then(Value::as_str);
        json_error.key = Some(first_truthy([context_key, prosopo.translation_key()]).to_string());
        json_error.message = ApiErrorMessage::Text(translate_message(i18n, prosopo.message()));
        json_error.data = context.get("data").map(|data| data.to_json());
        code = context.code().unwrap_or(initial_code);
        match context.error() {
            Some(next @ (ThrownError::Prosopo(_) | ThrownError::Zod(_))) => current = next,
            _ => break,
        }
    }

    if let ThrownError::Zod(zod) = current {
        json_error.message = ApiErrorMessage::Issues(ZodLikeError::reported_issues(zod));
        if json_error.key.as_deref() == Some(UNKNOWN_KEY) {
            json_error.key = Some(INVALID_BODY_KEY.to_string());
        }
        code = DEFAULT_CODE;
    }

    json_error.code = code;
    if let Some(key) = json_error.key.as_deref().filter(|key| !key.is_empty()) {
        if is_translation_key(key)
            && !is_widget_translation_key(key)
            && json_error.message == ApiErrorMessage::Text(i18n.t(key))
        {
            json_error.message_en = Some(english_text(key));
        }
    }
    UnwrappedError {
        code,
        status_message: status_message(code),
        json_error,
    }
}
