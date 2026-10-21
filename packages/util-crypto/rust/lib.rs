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

//! Rust port of the server-side subset of `@prosopo/util-crypto` (a trimmed
//! `@polkadot/util-crypto` in which only sr25519 is supported).

pub mod address;
pub mod base;
pub mod error;
pub mod hashing;
pub mod js;
pub mod jwt;
pub mod key;
pub mod keystore;
pub mod mnemonic;
pub mod nacl;
pub mod random;
pub mod scrypt;
pub mod secp256k1;
pub mod signature;
pub mod sr25519;
pub mod u8a;

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;

pub use address::{
    check_address_checksum, decode_address, encode_address, validate_address, Prefix,
};
pub use base::{
    base32_decode, base32_encode, base32_validate, base58_decode, base58_encode, base58_validate,
    base64_decode, base64_encode, base64_pad, base64_trim, base64_url_decode, base64_url_encode,
    base64_validate, is_base32, is_base58, is_base64,
};
pub use error::{Error, Result};
pub use hashing::{
    blake2_as_hex, blake2_as_u8a, hex_hash, hex_hash_array, pbkdf2_encode, sha256_as_u8a,
    sha512_as_u8a, sha_as_u8a, HEX_HASH_BIT_LENGTH,
};
pub use js::{
    array_index, code_unit_cmp, js_entry_order, json_parse, json_stringify, locale_compare,
    JoinValue, JsonValue,
};
pub use jwt::{
    jwt_verify, jwt_verify_at, sr25519_jwt_issue, sr25519_jwt_issue_at, Jwt, JwtIssueOptions,
    JwtVerifyOptions, JwtVerifyResult,
};
pub use key::{
    key_extract_path, key_extract_suri, key_from_path, key_hdkd_sr25519, DeriveJunction,
    JunctionValue, KeypairType,
};
pub use keystore::{
    json_decrypt, json_decrypt_data, json_encrypt, json_encrypt_format, EncryptedJson,
    EncryptedJsonEncoding, ENCODING, ENCODING_NONE, ENCODING_VERSION, SCRYPT_LENGTH,
};
pub use mnemonic::{
    entropy_to_mnemonic, mnemonic_generate, mnemonic_to_entropy, mnemonic_to_legacy_seed,
    mnemonic_to_mini_secret, mnemonic_validate,
};
pub use nacl::{nacl_decrypt, nacl_encrypt, NONCE_LENGTH};
pub use random::{random_as_hex, random_as_number, random_as_u8a};
pub use scrypt::{scrypt_encode, scrypt_from_u8a, scrypt_to_u8a, ScryptParams};
pub use secp256k1::{secp256k1_compress, secp256k1_pair_from_seed};
pub use signature::{signature_verify, VerifyResult};
pub use sr25519::{
    sr25519_agreement, sr25519_derive_hard, sr25519_derive_public, sr25519_derive_soft,
    sr25519_from_seed, sr25519_sign, sr25519_verify, sr25519_vrf_sign, sr25519_vrf_verify,
    Keypair,
};
pub use u8a::U8aLike;
