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

use crate::error::{err, Result};
use crate::js::{js_join, JoinValue};
use crate::u8a::{u8a_to_hex, u8a_to_u8a, U8aLike};
use sha2::Digest;

pub const HEX_HASH_BIT_LENGTH: u32 = 256;

/// `blake2AsU8a(data, bitLength, key)`. `None` hashes unkeyed; an empty key is
/// rejected, as an empty `Uint8Array` is truthy in the TS and reaches noble.
pub fn blake2_as_u8a<'a>(
    data: impl Into<U8aLike<'a>>,
    bit_length: u32,
    key: Option<&[u8]>,
) -> Result<Vec<u8>> {
    let byte_length = bit_length.div_ceil(8) as usize;
    if !(1..=64).contains(&byte_length) {
        return err(format!("\"dkLen\" must be 1..64, got {byte_length}"));
    }
    if key.is_some_and(|k| k.is_empty() || k.len() > 64) {
        return err("\"key\" expected to be undefined or of length=1..64");
    }
    let key = key.unwrap_or_default();
    let hash = blake2b_simd::Params::new()
        .hash_length(byte_length)
        .key(key)
        .hash(&u8a_to_u8a(data));
    Ok(hash.as_bytes().to_vec())
}

pub fn blake2_as_hex<'a>(
    data: impl Into<U8aLike<'a>>,
    bit_length: u32,
    key: Option<&[u8]>,
) -> Result<String> {
    blake2_as_u8a(data, bit_length, key).map(|h| u8a_to_hex(&h))
}

/// `hexHash(data, bitLength)`: a blake2b hex digest, 256 bits by default.
pub fn hex_hash<'a>(data: impl Into<U8aLike<'a>>, bit_length: Option<u32>) -> Result<String> {
    blake2_as_hex(data, bit_length.unwrap_or(HEX_HASH_BIT_LENGTH), None)
}

/// `hexHashArray(arr)`: hashes `arr.join("")` with JavaScript join semantics.
pub fn hex_hash_array(items: &[JoinValue]) -> Result<String> {
    hex_hash(js_join(items, "").as_str(), None)
}

pub fn sha256_as_u8a(data: &[u8]) -> Vec<u8> {
    sha2::Sha256::digest(data).to_vec()
}

pub fn sha512_as_u8a(data: &[u8]) -> Vec<u8> {
    sha2::Sha512::digest(data).to_vec()
}

/// `shaAsU8a[bitLength]` for the two supported lengths.
pub fn sha_as_u8a(data: &[u8], bit_length: u32) -> Result<Vec<u8>> {
    match bit_length {
        256 => Ok(sha256_as_u8a(data)),
        512 => Ok(sha512_as_u8a(data)),
        _ => err(format!("Unsupported sha bit length {bit_length}")),
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Pbkdf2Result {
    pub password: Vec<u8>,
    pub rounds: u32,
    pub salt: Vec<u8>,
}

pub const PBKDF2_DEFAULT_ROUNDS: u32 = 2048;

/// `pbkdf2Encode(passphrase, salt, rounds)` with HMAC-SHA512 and a 64-byte output.
pub fn pbkdf2_encode<'a>(
    passphrase: impl Into<U8aLike<'a>>,
    salt: &[u8],
    rounds: u32,
) -> Result<Pbkdf2Result> {
    if rounds < 1 {
        return err("\"c\" (iterations) must be >= 1");
    }
    let mut password = vec![0u8; 64];
    pbkdf2::pbkdf2_hmac::<sha2::Sha512>(&u8a_to_u8a(passphrase), salt, rounds, &mut password);
    Ok(Pbkdf2Result {
        password,
        rounds,
        salt: salt.to_vec(),
    })
}

/// `pbkdf2Encode` with the default random 32-byte salt.
pub fn pbkdf2_encode_random_salt<'a>(
    passphrase: impl Into<U8aLike<'a>>,
    rounds: u32,
) -> Result<Pbkdf2Result> {
    pbkdf2_encode(passphrase, &crate::random::random_as_u8a(32), rounds)
}
