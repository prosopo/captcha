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

use crate::translation_key::is_widget_translation_key;
use crate::translator::{I18nLookup, TranslateOptions};

/// An error as the provider sends it: text, and the catalogue key it came
/// from when there is one (`KeyedErrorMessage`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KeyedErrorMessage {
    pub message: String,
    pub key: Option<String>,
}

/// `localiseErrorMessage`: the error's widget key translated into the
/// instance's language, falling back to the message. Free text, keys outside
/// the widget namespace and a missing (uninitialised) instance keep the
/// message as it is.
pub fn localise_error_message<L: I18nLookup + ?Sized>(
    i18n: Option<&L>,
    error: &KeyedErrorMessage,
) -> String {
    match (i18n, error.key.as_deref()) {
        (Some(i18n), Some(key)) if !key.is_empty() && is_widget_translation_key(key) => i18n
            .t_with(
                key,
                &TranslateOptions::new().default_value(error.message.clone()),
            ),
        _ => error.message.clone(),
    }
}
