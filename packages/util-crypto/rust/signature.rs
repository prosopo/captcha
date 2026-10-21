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

//! `signatureVerify`: detects the signature scheme (only sr25519 is supported)
//! and retries with the message `<Bytes>`-wrapped or unwrapped.

use crate::address::decode_address;
use crate::error::{err, Result};
use crate::key::KeypairType;
use crate::sr25519::sr25519_verify;
use crate::u8a::{u8a_is_wrapped, u8a_to_u8a, u8a_unwrap_bytes, u8a_wrap_bytes, U8aLike};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct VerifyResult {
    /// The detected scheme; `None` is the TS `"none"`.
    pub crypto: Option<KeypairType>,
    pub is_valid: bool,
    /// Whether the message was wrapped in `<Bytes>...</Bytes>` (or Ethereum-prefixed).
    pub is_wrapped: bool,
    pub public_key: Vec<u8>,
}

const MULTISIG_TYPES: [KeypairType; 3] = [
    KeypairType::Ed25519,
    KeypairType::Sr25519,
    KeypairType::Ecdsa,
];

fn verify_detect(result: &mut VerifyResult, message: &[u8], signature: &[u8]) {
    result.is_valid = matches!(sr25519_verify(message, signature, result.public_key.as_slice()), Ok(true));
    if result.is_valid {
        result.crypto = Some(KeypairType::Sr25519);
    }
}

fn verify_multisig(result: &mut VerifyResult, message: &[u8], signature: &[u8]) {
    let kind = MULTISIG_TYPES[signature[0] as usize];
    result.crypto = Some(kind);
    match kind {
        KeypairType::Sr25519 => {
            if let Ok(valid) = sr25519_verify(message, &signature[1..], result.public_key.as_slice()) {
                result.is_valid = valid;
            }
        }
        _ => result.is_valid = false,
    }
}

/// `signatureVerify(message, signature, addressOrPublicKey)`.
pub fn signature_verify<'a, 'b, 'c>(
    message: impl Into<U8aLike<'a>>,
    signature: impl Into<U8aLike<'b>>,
    address_or_public_key: impl Into<U8aLike<'c>>,
) -> Result<VerifyResult> {
    let signature = u8a_to_u8a(signature);
    if ![64, 65, 66].contains(&signature.len()) {
        return err(format!(
            "Invalid signature length, expected [64..66] bytes, found {}",
            signature.len()
        ));
    }
    let public_key = decode_address(Some(address_or_public_key.into()), false, None)?;
    let message = u8a_to_u8a(message);
    let mut result = VerifyResult {
        crypto: None,
        is_valid: false,
        is_wrapped: u8a_is_wrapped(&message, true),
        public_key,
    };
    let is_wrapped_bytes = u8a_is_wrapped(&message, false);
    let is_multisig = signature[0] <= 2 && [65, 66].contains(&signature.len());
    let verify = if is_multisig {
        verify_multisig
    } else {
        verify_detect
    };
    verify(&mut result, &message, &signature);
    if result.crypto.is_some() || (result.is_wrapped && !is_wrapped_bytes) {
        return Ok(result);
    }
    let retry = if is_wrapped_bytes {
        u8a_unwrap_bytes(&message)
    } else {
        u8a_wrap_bytes(&message)
    };
    verify(&mut result, &retry, &signature);
    Ok(result)
}
