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

//! accounts/: `getPair`, which turns the configured secret into the provider's pair, and the
//! mnemonic generators.

use crate::error::{KeyringError, Result};
use crate::keyring::{FromAddress, Keyring};
use crate::pair::KeyringPair;
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_logger::ErrorObject;
use prosopo_types::keyring::{KeyringOptions, KeyringPairJson, KeyringPairMeta};
use prosopo_util_crypto::address::{Prefix, DEFAULT_PREFIX};
use prosopo_util_crypto::u8a::{hex_to_u8a, is_hex};
use prosopo_util_crypto::{
    mnemonic_generate, mnemonic_to_mini_secret, mnemonic_validate, KeypairType, U8aLike,
};
use serde_json::Value;

/// What `getPair` is given as the secret.
#[derive(Clone, Copy, Debug)]
pub enum Secret<'a> {
    /// A mnemonic, a hex seed, a secret URI, or a JSON key file as text.
    Text(&'a str),
    Json(&'a KeyringPairJson),
}

fn missing_secret_key(cause: Option<ErrorObject>) -> KeyringError {
    let context: Option<ErrorContext> = cause.map(|cause| ErrorContext::new().with_error(cause));
    KeyringError::MissingSecretKey(Box::new(ProsopoError::new(
        ErrorClass::Env,
        ErrorSource::key("GENERAL.MISSING_SECRET_KEY"),
        ErrorOptions {
            context,
            ..ErrorOptions::default()
        },
    )))
}

/// A JSON key file given as text, in a keyring of the type its `content` names. The TS
/// reports every failure here as a missing secret key, carrying the cause.
fn pair_from_json_text(text: &str, ss58_format: Prefix) -> Result<KeyringPair> {
    let attempt = || -> std::result::Result<KeyringPair, ErrorObject> {
        let value: Value = serde_json::from_str(text)
            .map_err(|error| ErrorObject::new("SyntaxError", error.to_string()))?;
        let json: KeyringPairJson = serde_json::from_value(value)
            .map_err(|error| ErrorObject::new("TypeError", error.to_string()))?;
        let kind: Option<KeypairType> = match json.encoding.content.get(1).map(String::as_str) {
            None | Some("") => None,
            Some(name) => Some(KeypairType::parse(name).ok_or_else(|| {
                ErrorObject::new(
                    "Error",
                    format!("Expected a keyring type of either 'sr25519', found '{name}"),
                )
            })?),
        };
        let as_error = |error: KeyringError| ErrorObject::new("Error", error.to_string());
        let mut keyring: Keyring = Keyring::new(KeyringOptions {
            kind,
            ss58_format: Some(ss58_format),
        })
        .map_err(as_error)?;
        keyring.add_from_json(&json, false).map_err(as_error)
    };
    attempt().map_err(|cause| missing_secret_key(Some(cause)))
}

/// `getPair(secret, account, pairType, ss58Format)`: the pair for a secret, or a watch-only
/// pair for an account when there is no secret. An `ss58_format` of 0 means 42, as the TS
/// `||` default makes it.
pub fn get_pair(
    secret: Option<Secret<'_>>,
    account: Option<U8aLike<'_>>,
    pair_type: Option<KeypairType>,
    ss58_format: Option<Prefix>,
) -> Result<KeyringPair> {
    let ss58_format: Prefix = ss58_format
        .filter(|format| *format != 0)
        .unwrap_or(DEFAULT_PREFIX);
    let mut keyring: Keyring = Keyring::new(KeyringOptions {
        kind: Some(pair_type.unwrap_or(KeypairType::Sr25519)),
        ss58_format: Some(ss58_format),
    })?;
    let secret: Option<Secret<'_>> = secret.filter(|secret| !matches!(secret, Secret::Text("")));
    match (secret, account) {
        (None, Some(account)) if account != U8aLike::Str("") => {
            keyring.add_from_address(account, FromAddress::default())
        }
        (Some(Secret::Text(secret)), _) => {
            if mnemonic_validate(secret, None) {
                keyring.add_from_mnemonic(secret, KeyringPairMeta::new(), None)
            } else if is_hex(secret) {
                keyring.add_from_seed(&hex_to_u8a(secret), KeyringPairMeta::new(), None)
            } else if secret.contains("//") {
                keyring.add_from_uri(secret, KeyringPairMeta::new(), None)
            } else {
                pair_from_json_text(secret, ss58_format)
            }
        }
        (Some(Secret::Json(json)), _) => keyring.add_from_json(json, false),
        (None, _) => Err(missing_secret_key(None)),
    }
}

/// `generateMnemonic`: a new twelve-word mnemonic and its address, added to `keyring` when one
/// is given. `pair_type` is only used to build a keyring when none is given.
pub fn generate_mnemonic(
    keyring: Option<&mut Keyring>,
    pair_type: Option<KeypairType>,
) -> Result<(String, String)> {
    let mut own: Keyring;
    let keyring: &mut Keyring = match keyring {
        Some(keyring) => keyring,
        None => {
            own = Keyring::new(KeyringOptions {
                kind: Some(pair_type.unwrap_or(KeypairType::Sr25519)),
                ss58_format: None,
            })?;
            &mut own
        }
    };
    let mnemonic: String = mnemonic_generate(12, None)?;
    let address: String = keyring
        .add_from_mnemonic(&mnemonic, KeyringPairMeta::new(), None)?
        .address()?;
    Ok((mnemonic, address))
}

/// `generateMiniSecret`: the mini secret of a new mnemonic, and its address.
pub fn generate_mini_secret(
    keyring: Option<&mut Keyring>,
    pair_type: Option<KeypairType>,
) -> Result<(Vec<u8>, String)> {
    let (mnemonic, address) = generate_mnemonic(keyring, pair_type)?;
    Ok((mnemonic_to_mini_secret(&mnemonic, "", None)?, address))
}
