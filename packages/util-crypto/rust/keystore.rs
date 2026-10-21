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

//! Encrypted JSON keystores (version 3: scrypt + xsalsa20-poly1305).

use crate::base::{base64_decode, base64_encode};
use crate::error::{err, Result};
use crate::nacl::{nacl_decrypt, nacl_encrypt, NONCE_LENGTH};
use crate::scrypt::{scrypt_encode, scrypt_from_u8a, scrypt_to_u8a, DEFAULT_PARAMS};
use crate::u8a::{hex_to_u8a, is_hex, string_to_u8a, u8a_fix_length};
use serde::{Deserialize, Serialize};

pub const SCRYPT_LENGTH: usize = 32 + 3 * 4;
pub const ENCODING_VERSION: &str = "3";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum EncryptedJsonEncoding {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "scrypt")]
    Scrypt,
    #[serde(rename = "xsalsa20-poly1305")]
    Xsalsa20Poly1305,
}

pub const ENCODING: [EncryptedJsonEncoding; 2] = [
    EncryptedJsonEncoding::Scrypt,
    EncryptedJsonEncoding::Xsalsa20Poly1305,
];
pub const ENCODING_NONE: [EncryptedJsonEncoding; 1] = [EncryptedJsonEncoding::None];

/// `type` is a list in current keystores and a single value in old ones.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EncodingType {
    Many(Vec<EncryptedJsonEncoding>),
    One(EncryptedJsonEncoding),
}

impl EncodingType {
    pub fn to_vec(&self) -> Vec<EncryptedJsonEncoding> {
        match self {
            EncodingType::Many(list) => list.clone(),
            EncodingType::One(one) => vec![*one],
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct EncryptedJsonDescriptor {
    pub content: Vec<String>,
    #[serde(rename = "type")]
    pub kind: EncodingType,
    pub version: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct EncryptedJson {
    pub encoded: String,
    pub encoding: EncryptedJsonDescriptor,
}

fn non_empty(passphrase: Option<&str>) -> Option<&str> {
    passphrase.filter(|p| !p.is_empty())
}

pub fn json_decrypt(json: &EncryptedJson, passphrase: Option<&str>) -> Result<Vec<u8>> {
    if json.encoded.is_empty() {
        return err("No encrypted data available to decode");
    }
    let encrypted = if is_hex(&json.encoded) {
        hex_to_u8a(&json.encoded)
    } else {
        base64_decode(&json.encoded, false)?
    };
    json_decrypt_data(Some(&encrypted), passphrase, &json.encoding.kind.to_vec())
}

fn tail(data: &[u8], start: usize) -> &[u8] {
    &data[start.min(data.len())..]
}

/// `jsonDecryptData(encrypted, passphrase, encType)`; pass `&ENCODING` for the TS default.
pub fn json_decrypt_data(
    encrypted: Option<&[u8]>,
    passphrase: Option<&str>,
    enc_type: &[EncryptedJsonEncoding],
) -> Result<Vec<u8>> {
    let Some(mut encrypted) = encrypted else {
        return err("No encrypted data available to decode");
    };
    let passphrase = non_empty(passphrase);
    if enc_type.contains(&EncryptedJsonEncoding::Xsalsa20Poly1305) && passphrase.is_none() {
        return err("Password required to decode encrypted data");
    }
    let Some(passphrase) = passphrase else {
        return Ok(encrypted.to_vec());
    };
    let password = if enc_type.contains(&EncryptedJsonEncoding::Scrypt) {
        let parsed = scrypt_from_u8a(encrypted)?;
        let password = scrypt_encode(passphrase, &parsed.salt, parsed.params)?.password;
        encrypted = tail(encrypted, SCRYPT_LENGTH);
        password
    } else {
        string_to_u8a(passphrase)
    };
    let nonce = &encrypted[..NONCE_LENGTH.min(encrypted.len())];
    nacl_decrypt(
        tail(encrypted, NONCE_LENGTH),
        nonce,
        &u8a_fix_length(&password, 256, true),
    )?
    .map_or_else(|| err("Unable to decode using the supplied passphrase"), Ok)
}

pub fn json_encrypt_format(
    encoded: &[u8],
    content_type: &[String],
    is_encrypted: bool,
) -> EncryptedJson {
    EncryptedJson {
        encoded: base64_encode(encoded, false),
        encoding: EncryptedJsonDescriptor {
            content: content_type.to_vec(),
            kind: EncodingType::Many(if is_encrypted {
                ENCODING.to_vec()
            } else {
                ENCODING_NONE.to_vec()
            }),
            version: ENCODING_VERSION.to_string(),
        },
    }
}

/// `jsonEncrypt` with caller-supplied scrypt salt (32 bytes) and nonce (24 bytes).
pub fn json_encrypt_with(
    data: &[u8],
    content_type: &[String],
    passphrase: Option<&str>,
    salt: &[u8],
    nonce: &[u8],
) -> Result<EncryptedJson> {
    let Some(passphrase) = non_empty(passphrase) else {
        return Ok(json_encrypt_format(data, content_type, false));
    };
    let scrypted = scrypt_encode(passphrase, salt, DEFAULT_PARAMS)?;
    let sealed = nacl_encrypt(data, &scrypted.password[..32], nonce)?;
    let encoded = [
        scrypt_to_u8a(&scrypted.salt, &scrypted.params),
        sealed.nonce,
        sealed.encrypted,
    ]
    .concat();
    Ok(json_encrypt_format(&encoded, content_type, true))
}

pub fn json_encrypt(
    data: &[u8],
    content_type: &[String],
    passphrase: Option<&str>,
) -> Result<EncryptedJson> {
    json_encrypt_with(
        data,
        content_type,
        passphrase,
        &crate::random::random_as_u8a(32),
        &crate::random::random_as_u8a(NONCE_LENGTH),
    )
}
