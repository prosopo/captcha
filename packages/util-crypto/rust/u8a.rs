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

//! The subset of `@polkadot/util` byte/string helpers that util-crypto relies on.

/// A `string | Uint8Array` argument. Strings that are `0x`-prefixed hex are
/// decoded as hex, every other string is UTF-8 encoded (`u8aToU8a`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum U8aLike<'a> {
    Str(&'a str),
    Bytes(&'a [u8]),
}

impl<'a> From<&'a str> for U8aLike<'a> {
    fn from(value: &'a str) -> Self {
        U8aLike::Str(value)
    }
}

impl<'a> From<&'a String> for U8aLike<'a> {
    fn from(value: &'a String) -> Self {
        U8aLike::Str(value.as_str())
    }
}

impl<'a> From<&'a [u8]> for U8aLike<'a> {
    fn from(value: &'a [u8]) -> Self {
        U8aLike::Bytes(value)
    }
}

impl<'a> From<&'a Vec<u8>> for U8aLike<'a> {
    fn from(value: &'a Vec<u8>) -> Self {
        U8aLike::Bytes(value.as_slice())
    }
}

impl<'a, const N: usize> From<&'a [u8; N]> for U8aLike<'a> {
    fn from(value: &'a [u8; N]) -> Self {
        U8aLike::Bytes(value.as_slice())
    }
}

const U8A_WRAP_ETHEREUM: &[u8] = b"\x19Ethereum Signed Message:\n";
const U8A_WRAP_PREFIX: &[u8] = b"<Bytes>";
const U8A_WRAP_POSTFIX: &[u8] = b"</Bytes>";

pub fn u8a_to_u8a<'a>(value: impl Into<U8aLike<'a>>) -> Vec<u8> {
    match value.into() {
        U8aLike::Bytes(bytes) => bytes.to_vec(),
        U8aLike::Str(s) if is_hex(s) => hex_to_u8a(s),
        U8aLike::Str(s) => string_to_u8a(s),
    }
}

/// `isHex(value)` with the default bit length: `0x`-prefixed, hex digits only, even length.
pub fn is_hex(value: &str) -> bool {
    let Some(digits) = value.strip_prefix("0x") else {
        return false;
    };
    (digits.is_empty() || digits.bytes().all(|b| b.is_ascii_hexdigit())) && value.len() % 2 == 0
}

fn hex_nibble(code: u32) -> u32 {
    match char::from_u32(code) {
        Some(c @ '0'..='9') => c as u32 - '0' as u32,
        Some(c @ 'a'..='f') => c as u32 - 'a' as u32 + 10,
        Some(c @ 'A'..='F') => c as u32 - 'A' as u32 + 10,
        _ => 0,
    }
}

/// `hexToU8a(value)`. Mirrors the lookup-table decoder exactly, including how it
/// treats non-hex characters (as zero nibbles) and an odd trailing digit.
pub fn hex_to_u8a(value: &str) -> Vec<u8> {
    if value.is_empty() {
        return Vec::new();
    }
    let units: Vec<u16> = value.encode_utf16().collect();
    let mut s = if value.starts_with("0x") { 2 } else { 0 };
    let dec_length = (units.len() - s).div_ceil(2);
    let mut result = Vec::with_capacity(dec_length);
    for _ in 0..dec_length {
        let hi = units.get(s).copied().map_or(0, u32::from);
        let lo = units.get(s + 1).copied().map_or(0, u32::from);
        let index = (hi << 8) | lo;
        let byte = if index < 65536 {
            ((hex_nibble(index >> 8) << 4) | hex_nibble(index & 0xff)) & 0xff
        } else {
            0
        };
        result.push(byte as u8);
        s += 2;
    }
    result
}

pub fn u8a_to_hex(value: &[u8]) -> String {
    let mut out = String::with_capacity(2 + value.len() * 2);
    out.push_str("0x");
    for byte in value {
        out.push_str(&format!("{byte:02x}"));
    }
    out
}

pub fn string_to_u8a(value: &str) -> Vec<u8> {
    value.as_bytes().to_vec()
}

/// `u8aToString`: a non-fatal UTF-8 `TextDecoder`, which drops a leading BOM.
pub fn u8a_to_string(value: &[u8]) -> String {
    let value = value.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(value);
    String::from_utf8_lossy(value).into_owned()
}

pub fn u8a_fix_length(value: &[u8], bit_length: i64, at_start: bool) -> Vec<u8> {
    let byte_length = (bit_length as f64 / 8.0).ceil() as i64;
    if bit_length == -1 || value.len() as i64 == byte_length {
        return value.to_vec();
    }
    let byte_length = byte_length.max(0) as usize;
    if value.len() > byte_length {
        return value[..byte_length].to_vec();
    }
    let mut result = vec![0u8; byte_length];
    let offset = if at_start {
        0
    } else {
        byte_length - value.len()
    };
    result[offset..offset + value.len()].copy_from_slice(value);
    result
}

pub fn compact_to_u8a(value: u64) -> Vec<u8> {
    if value <= 0b0011_1111 {
        vec![(value << 2) as u8]
    } else if value <= 0x3fff {
        (((value << 2) + 1) as u16).to_le_bytes().to_vec()
    } else if value <= 0x3fff_ffff {
        (((value << 2) + 2) as u32).to_le_bytes().to_vec()
    } else {
        let bytes = value.to_le_bytes();
        let length = bytes.iter().rposition(|b| *b != 0).map_or(0, |i| i + 1);
        let mut out = vec![(((length - 4) << 2) + 0b11) as u8];
        out.extend_from_slice(&bytes[..length]);
        out
    }
}

pub fn compact_add_length(input: &[u8]) -> Vec<u8> {
    let mut out = compact_to_u8a(input.len() as u64);
    out.extend_from_slice(input);
    out
}

pub fn u8a_is_wrapped(u8a: &[u8], with_ethereum: bool) -> bool {
    (u8a.len() >= U8A_WRAP_PREFIX.len() + U8A_WRAP_POSTFIX.len()
        && u8a.starts_with(U8A_WRAP_PREFIX)
        && u8a.ends_with(U8A_WRAP_POSTFIX))
        || (with_ethereum && u8a.starts_with(U8A_WRAP_ETHEREUM))
}

pub fn u8a_unwrap_bytes(bytes: &[u8]) -> Vec<u8> {
    if u8a_is_wrapped(bytes, false) {
        bytes[U8A_WRAP_PREFIX.len()..bytes.len() - U8A_WRAP_POSTFIX.len()].to_vec()
    } else {
        bytes.to_vec()
    }
}

pub fn u8a_wrap_bytes(bytes: &[u8]) -> Vec<u8> {
    if u8a_is_wrapped(bytes, true) {
        return bytes.to_vec();
    }
    [U8A_WRAP_PREFIX, bytes, U8A_WRAP_POSTFIX].concat()
}

/// Little-endian bytes to a decimal string, as BigInt `toString()` prints it.
pub(crate) fn le_bytes_to_decimal(bytes: &[u8]) -> String {
    let mut limbs: Vec<u32> = bytes.iter().rev().map(|b| u32::from(*b)).collect();
    let mut digits: Vec<u8> = Vec::new();
    while limbs.iter().any(|l| *l != 0) {
        let mut remainder = 0u32;
        for limb in limbs.iter_mut() {
            let current = remainder * 256 + *limb;
            *limb = current / 10;
            remainder = current % 10;
        }
        digits.push(b'0' + remainder as u8);
    }
    if digits.is_empty() {
        return "0".to_string();
    }
    digits.reverse();
    String::from_utf8(digits).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_to_u8a_handles_odd_and_invalid_digits() {
        assert_eq!(hex_to_u8a("0x123"), vec![0x12, 0x30]);
        assert_eq!(hex_to_u8a("0xzz"), vec![0]);
        assert_eq!(hex_to_u8a("0x"), Vec::<u8>::new());
        assert_eq!(hex_to_u8a("abcd"), vec![0xab, 0xcd]);
    }

    #[test]
    fn compact_lengths() {
        assert_eq!(compact_to_u8a(3), vec![12]);
        assert_eq!(compact_to_u8a(64), vec![1, 1]);
        assert_eq!(compact_to_u8a(16384), vec![2, 0, 1, 0]);
        assert_eq!(compact_to_u8a(1 << 30), vec![3, 0, 0, 0, 64]);
    }

    #[test]
    fn decimal_formatting() {
        assert_eq!(le_bytes_to_decimal(&[0]), "0");
        assert_eq!(le_bytes_to_decimal(&[0x00, 0x01]), "256");
    }
}
