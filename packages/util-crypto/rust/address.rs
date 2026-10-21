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

//! SS58 address encoding and decoding.

use crate::base::{base58_decode, base58_encode};
use crate::error::{err, Error, Result};
use crate::hashing::blake2_as_u8a;
use crate::u8a::{is_hex, u8a_to_u8a, U8aLike};

pub type Prefix = i32;

pub const DEFAULT_PREFIX: Prefix = 42;
pub const ALLOWED_DECODED_LENGTHS: [usize; 6] = [1, 2, 4, 8, 32, 33];
pub const ALLOWED_ENCODED_LENGTHS: [usize; 8] = [3, 4, 6, 10, 35, 36, 37, 38];

const SS58_PREFIX: &[u8] = b"SS58PRE";

pub fn sshash(key: &[u8]) -> Vec<u8> {
    let input = [SS58_PREFIX, key].concat();
    blake2_as_u8a(input.as_slice(), 512, None).unwrap_or_default()
}

/// `checkAddressChecksum`: `(isValid, endPos, ss58Length, ss58Decoded)`.
pub fn check_address_checksum(decoded: &[u8]) -> Result<(bool, usize, usize, u16)> {
    let Some(&first) = decoded.first() else {
        return err("Invalid address: first byte cannot be undefined");
    };
    let Some(&second) = decoded.get(1) else {
        return err("Invalid address: second byte cannot be undefined");
    };
    let ss58_length = if first & 0b0100_0000 != 0 { 2 } else { 1 };
    let ss58_decoded: u16 = if ss58_length == 1 {
        u16::from(first)
    } else {
        (u16::from(first & 0b0011_1111) << 2)
            | u16::from(second >> 6)
            | (u16::from(second & 0b0011_1111) << 8)
    };
    let is_public_key = [34 + ss58_length, 35 + ss58_length].contains(&decoded.len());
    let length = decoded.len() - if is_public_key { 2 } else { 1 };
    let hash = sshash(&decoded[..length]);
    let last = decoded[decoded.len() - 1];
    let is_valid = (first & 0b1000_0000) == 0
        && ![46, 47].contains(&first)
        && if is_public_key {
            decoded[decoded.len() - 2] == hash[0] && last == hash[1]
        } else {
            last == hash[0]
        };
    Ok((is_valid, length, ss58_length, ss58_decoded))
}

fn decode_base58_address(
    encoded: &str,
    ignore_checksum: bool,
    ss58_format: Prefix,
) -> Result<Vec<u8>> {
    let decoded = base58_decode(encoded, false)?;
    if !ALLOWED_ENCODED_LENGTHS.contains(&decoded.len()) {
        return err("Invalid decoded address length");
    }
    let (is_valid, end_pos, ss58_length, ss58_decoded) = check_address_checksum(&decoded)?;
    if !is_valid && !ignore_checksum {
        return err("Invalid decoded address checksum");
    }
    if ss58_format != -1 && ss58_format != Prefix::from(ss58_decoded) {
        return err(format!(
            "Expected ss58Format {ss58_format}, received {ss58_decoded}"
        ));
    }
    Ok(decoded[ss58_length..end_pos].to_vec())
}

/// `decodeAddress(encoded, ignoreChecksum, ss58Format)`. `None` (or `Some(-1)`)
/// for `ss58_format` accepts any prefix. Bytes and hex strings are returned as-is.
pub fn decode_address<'a>(
    encoded: Option<U8aLike<'a>>,
    ignore_checksum: bool,
    ss58_format: Option<Prefix>,
) -> Result<Vec<u8>> {
    let encoded = match encoded {
        None | Some(U8aLike::Str("")) => return err("Invalid empty address passed"),
        Some(U8aLike::Bytes(bytes)) => return Ok(bytes.to_vec()),
        Some(U8aLike::Str(s)) if is_hex(s) => return Ok(u8a_to_u8a(s)),
        Some(U8aLike::Str(s)) => s,
    };
    decode_base58_address(encoded, ignore_checksum, ss58_format.unwrap_or(-1))
        .map_err(|e| Error::new(format!("Decoding {encoded}: {}", e.message())))
}

/// `encodeAddress(key, ss58Format)`; `key` may itself be an address, which is re-encoded.
pub fn encode_address<'a>(key: impl Into<U8aLike<'a>>, ss58_format: Prefix) -> Result<String> {
    let u8a = decode_address(Some(key.into()), false, None)?;
    if !(0..=16383).contains(&ss58_format) || [46, 47].contains(&ss58_format) {
        return err("Out of range ss58Format specified");
    }
    if !ALLOWED_DECODED_LENGTHS.contains(&u8a.len()) {
        return err(format!(
            "Expected a valid key to convert, with length {}",
            ALLOWED_DECODED_LENGTHS.map(|l| l.to_string()).join(", ")
        ));
    }
    let format = ss58_format as u16;
    let mut input: Vec<u8> = if format < 64 {
        vec![format as u8]
    } else {
        vec![
            (((format & 0b0000_0000_1111_1100) >> 2) as u8) | 0b0100_0000,
            ((format >> 8) as u8) | (((format & 0b0000_0000_0000_0011) << 6) as u8),
        ]
    };
    input.extend_from_slice(&u8a);
    let checksum_length = if [32, 33].contains(&u8a.len()) { 2 } else { 1 };
    let hash = sshash(&input);
    input.extend_from_slice(&hash[..checksum_length]);
    Ok(base58_encode(input.as_slice(), false))
}

/// `validateAddress`: `Ok(true)` when the address decodes, otherwise the decode error.
pub fn validate_address(
    encoded: Option<&str>,
    ignore_checksum: bool,
    ss58_format: Option<Prefix>,
) -> Result<bool> {
    decode_address(encoded.map(U8aLike::Str), ignore_checksum, ss58_format).map(|_| true)
}
