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

use prosopo_common::ProsopoError;
use std::fmt;

#[derive(Debug, Clone, PartialEq)]
pub enum KeyringError {
    /// A thrown `Error`, by its message.
    Message(String),
    /// `getPair`'s `ProsopoEnvError("GENERAL.MISSING_SECRET_KEY")`.
    MissingSecretKey(Box<ProsopoError>),
}

impl fmt::Display for KeyringError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            KeyringError::Message(message) => f.write_str(message),
            KeyringError::MissingSecretKey(error) => f.write_str(error.message()),
        }
    }
}

impl std::error::Error for KeyringError {}

impl From<prosopo_util_crypto::Error> for KeyringError {
    fn from(error: prosopo_util_crypto::Error) -> KeyringError {
        KeyringError::Message(error.message().to_string())
    }
}

pub type Result<T> = std::result::Result<T, KeyringError>;

pub(crate) fn err<T>(message: impl Into<String>) -> Result<T> {
    Err(KeyringError::Message(message.into()))
}
