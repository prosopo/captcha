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

// Ported from src/signature/verify.spec.ts (the ed25519/ecdsa/ethereum cases are commented out in the TS)
use super::hex;
use crate::address::decode_address;
use crate::key::KeypairType;
use crate::signature::{signature_verify, VerifyResult};
use crate::u8a::{u8a_wrap_bytes, U8aLike};

const ADDR_ED: &str = "DxN4uvzwPzJLtn17yew6jEffPhXQfdKHTp2brufb98vGbPN";
const ADDR_SR: &str = "EK1bFgKm2FsghcttHT7TB7rNyXApFgs9fCbijMGQNyFGBQm";
const ADDR_SR_WRAP: &str = "J9nD3s7zssCX7bion1xctAF6xcVexcpy2uwy4jTm9JL8yuK";
const MESSAGE: &str = "hello world";
const SIG_SR: &str = "0xca01419b5a17219f7b78335658cab3b126db523a5df7be4bfc2bef76c2eb3b1dcf4ca86eb877d0a6cf6df12db5995c51d13b00e005d053b892bd09c594434288";
const SIG_SR_WRAP: &str = "0x84b6afb1c8e54bbcb3f4872baf172580e21310e9387a53742627d6652d121447fa406b82805ed3184fb7bd519175cc9f99f283f97954d95cf966ee164df85489";

fn public(address: &str) -> Vec<u8> {
    decode_address(Some(U8aLike::Str(address)), false, None).expect("valid address")
}

fn multisig_sr() -> Vec<u8> {
    [vec![1u8], hex(SIG_SR)].concat()
}

#[test]
fn throws_on_invalid_signature_length() {
    let error = signature_verify(MESSAGE, &[0u8; 32], ADDR_ED).expect_err("invalid");
    assert_eq!(
        error.message(),
        "Invalid signature length, expected [64..66] bytes, found 32"
    );
}

#[test]
fn verify_detect_verifies_an_sr25519_signature() {
    assert_eq!(
        signature_verify(MESSAGE, SIG_SR, ADDR_SR),
        Ok(VerifyResult {
            crypto: Some(KeypairType::Sr25519),
            is_valid: true,
            is_wrapped: false,
            public_key: public(ADDR_SR),
        })
    );
}

#[test]
fn verify_detect_with_msg_wrapper_without_wrapped_sig() {
    assert_eq!(
        signature_verify(&u8a_wrap_bytes(MESSAGE.as_bytes()), SIG_SR_WRAP, ADDR_SR_WRAP),
        Ok(VerifyResult {
            crypto: Some(KeypairType::Sr25519),
            is_valid: true,
            is_wrapped: true,
            public_key: public(ADDR_SR_WRAP),
        })
    );
}

#[test]
fn verify_detect_without_msg_wrapper_with_wrapped_sig() {
    assert_eq!(
        signature_verify(MESSAGE, SIG_SR_WRAP, ADDR_SR_WRAP),
        Ok(VerifyResult {
            crypto: Some(KeypairType::Sr25519),
            is_valid: true,
            is_wrapped: false,
            public_key: public(ADDR_SR_WRAP),
        })
    );
}

#[test]
fn verify_detect_fails_on_an_invalid_signature() {
    assert_eq!(
        signature_verify(MESSAGE, SIG_SR, ADDR_ED),
        Ok(VerifyResult {
            crypto: None,
            is_valid: false,
            is_wrapped: false,
            public_key: public(ADDR_ED),
        })
    );
}

#[test]
fn verify_multisig_verifies_an_sr25519_signature() {
    assert_eq!(
        signature_verify(MESSAGE, &multisig_sr(), ADDR_SR),
        Ok(VerifyResult {
            crypto: Some(KeypairType::Sr25519),
            is_valid: true,
            is_wrapped: false,
            public_key: public(ADDR_SR),
        })
    );
}

#[test]
fn verify_multisig_fails_on_an_invalid_signature() {
    assert_eq!(
        signature_verify(MESSAGE, &multisig_sr(), ADDR_ED),
        Ok(VerifyResult {
            crypto: Some(KeypairType::Sr25519),
            is_valid: false,
            is_wrapped: false,
            public_key: vec![
                61, 12, 55, 211, 0, 211, 97, 199, 4, 37, 17, 213, 81, 175, 166, 23, 251, 199, 144, 210,
                19, 83, 186, 1, 196, 231, 14, 156, 171, 46, 141, 146,
            ],
        })
    );
}
