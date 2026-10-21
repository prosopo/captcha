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

// Ported from src/tests/errorMessage.unit.test.ts

use crate::error_message::{localise_error_message, KeyedErrorMessage};
use crate::tests::files_i18n;
use crate::translator::FixedT;

fn german() -> FixedT<'static> {
    files_i18n().fixed_t("de")
}

fn error(message: &str, key: Option<&str>) -> KeyedErrorMessage {
    KeyedErrorMessage {
        message: message.to_owned(),
        key: key.map(str::to_owned),
    }
}

#[test]
fn translates_a_catalogue_key_into_the_widget_language_not_the_server_one() {
    assert_eq!(
        localise_error_message(
            Some(&german()),
            &error("Invalid site key", Some("API.INVALID_SITE_KEY"))
        ),
        "Ungültiger Site-Schlüssel"
    );
}

#[test]
fn keeps_the_server_message_when_the_key_is_not_in_the_catalogue() {
    assert_eq!(
        localise_error_message(
            Some(&german()),
            &error("upstream timed out", Some("API.NOT_A_REAL_KEY"))
        ),
        "upstream timed out"
    );
}

#[test]
fn keeps_the_server_message_for_a_key_outside_the_widget_namespace() {
    assert_eq!(
        localise_error_message(
            Some(&german()),
            &error("Datenbankfehler", Some("DATABASE.UNKNOWN"))
        ),
        "Datenbankfehler"
    );
}

#[test]
fn keeps_the_server_message_when_there_is_no_key() {
    assert_eq!(
        localise_error_message(Some(&german()), &error("Invalid site key", None)),
        "Invalid site key"
    );
}

// An uninitialised instance has no Rust counterpart: an instance only exists
// once its catalogues are loaded, so "not initialised" is `None`.
#[test]
fn keeps_the_server_message_until_i18n_is_initialised() {
    assert_eq!(
        localise_error_message::<FixedT<'_>>(
            None,
            &error("Invalid site key", Some("API.INVALID_SITE_KEY"))
        ),
        "Invalid site key"
    );
}
