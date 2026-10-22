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

//! tasks/powCaptcha/powTasksUtils.ts: the checks a PoW solution submission runs.

use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_util_crypto::js::js_number_to_string;
use prosopo_util_crypto::signature::signature_verify;
use prosopo_util_crypto::u8a::U8aLike;
use sha2::{Digest, Sha256};

/// `validateSolution`: whether `sha256(nonce + challenge)` meets `difficulty`, the nonce
/// written as JS writes a number.
pub fn validate_solution(nonce: f64, challenge: &str, difficulty: f64) -> Result<bool, String> {
    let message: String = format!("{}{challenge}", js_number_to_string(nonce));
    let hash = Sha256::digest(message.as_bytes());
    prosopo_util::hash_meets_difficulty(&hash, difficulty).map_err(|error| error.to_string())
}

/// Why a PoW signature check did not pass: the signature is wrong, or it could not be checked
/// at all (a malformed signature or address), which the TS throws as a plain error.
#[derive(Debug)]
pub enum PowSignatureError {
    Invalid(ProsopoError),
    Unreadable(String),
}

/// `checkPowSignature`: `signature` is `address`'s over the UTF-8 of `message`.
pub fn check_pow_signature(message: &str, signature: &str, address: &str, signature_type: Option<&str>) -> Result<(), PowSignatureError> {
    let verification = signature_verify(U8aLike::Bytes(message.as_bytes()), U8aLike::Str(signature), U8aLike::Str(address))
        .map_err(|error| PowSignatureError::Unreadable(error.to_string()))?;
    if verification.is_valid {
        return Ok(());
    }
    let label: String = signature_type.map_or_else(|| "undefined".to_string(), str::to_string);
    let mut context: ErrorContext = ErrorContext::new()
        .with("ERROR", format!("Signature is invalid for this message: {label}"))
        .with("failedFuncName", "checkPowSignature")
        .with("address", address)
        .with("message", message)
        .with("signature", signature);
    if let Some(signature_type) = signature_type {
        context = context.with("signatureType", signature_type);
    }
    Err(PowSignatureError::Invalid(ProsopoError::new(
        ErrorClass::Api,
        ErrorSource::key("GENERAL.INVALID_SIGNATURE"),
        ErrorOptions { context: Some(context), ..ErrorOptions::default() },
    )))
}

/// `isCoordsAllZero`: there are coordinates, and every group has some and all are `(0, 0)`.
pub fn is_coords_all_zero(coords: Option<&[Vec<[f64; 2]>]>) -> bool {
    coords.is_some_and(|groups| !groups.is_empty() && groups.iter().all(|group| !group.is_empty() && group.iter().all(|[x, y]| *x == 0.0 && *y == 0.0)))
}
