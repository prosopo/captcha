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

//! base32 / base58 / base64 codecs with the validation layer from
//! `base32/helpers.ts` and the strict decoders of `@scure/base`.

use crate::error::{err, Error, Result};
use crate::u8a::{u8a_to_u8a, U8aLike};

struct Config {
    chars: &'static str,
    ipfs: Option<char>,
    kind: &'static str,
    with_padding: bool,
}

const BASE32: Config = Config {
    chars: "abcdefghijklmnopqrstuvwxyz234567",
    ipfs: Some('b'),
    kind: "base32",
    with_padding: false,
};

const BASE58: Config = Config {
    chars: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
    ipfs: Some('z'),
    kind: "base58",
    with_padding: false,
};

const BASE64: Config = Config {
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
    ipfs: None,
    kind: "base64",
    with_padding: true,
};

const SCURE_BASE32_ALPHABET: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

fn unit_to_string(unit: u16) -> String {
    char::from_u32(u32::from(unit)).map_or_else(|| '\u{fffd}'.to_string(), |c| c.to_string())
}

fn validate(config: &Config, value: &str, ipfs_compat: bool) -> Result<bool> {
    if let Some(prefix) = config.ipfs {
        if ipfs_compat && !value.starts_with(prefix) {
            return err(format!(
                "Expected ipfs-compatible {} to start with '{prefix}'",
                config.kind
            ));
        }
    }
    let units: Vec<u16> = value.encode_utf16().collect();
    let count = units.len();
    let is_char = |unit: u16| -> bool { unit < 128 && config.chars.as_bytes().contains(&(unit as u8)) };
    let pad = u16::from(b'=');
    let start = usize::from(ipfs_compat);
    for i in start..count {
        let unit = units[i];
        if is_char(unit) {
            continue;
        }
        if config.with_padding && unit == pad {
            if i == count - 1 || units[i + 1] == pad {
                continue;
            }
            return err(format!(
                "Invalid {} padding sequence \"{}{}\" at index {i}",
                config.kind,
                unit_to_string(unit),
                unit_to_string(units[i + 1])
            ));
        }
        return err(format!(
            "Invalid {} character \"{}\" (0x{:x}) at index {i}",
            config.kind,
            unit_to_string(unit),
            unit
        ));
    }
    Ok(true)
}

fn strip_ipfs<'a>(config: &Config, value: &'a str, ipfs_compat: bool) -> &'a str {
    if config.ipfs.is_some() && ipfs_compat {
        let mut chars = value.chars();
        chars.next();
        chars.as_str()
    } else {
        value
    }
}

fn with_ipfs(config: &Config, out: String, ipfs_compat: bool) -> String {
    match config.ipfs {
        Some(prefix) if ipfs_compat => format!("{prefix}{out}"),
        _ => out,
    }
}

fn alphabet_decode(letters: &str, input: &str) -> Result<Vec<u8>> {
    input
        .chars()
        .map(|c| {
            letters
                .find(c)
                .filter(|_| c.is_ascii())
                .map(|index| index as u8)
                .ok_or_else(|| Error::new(format!("Unknown letter \"{c}\". Allowed: {letters}")))
        })
        .collect()
}

fn alphabet_encode(letters: &str, digits: &[u8]) -> String {
    let table = letters.as_bytes();
    digits.iter().map(|d| table[*d as usize] as char).collect()
}

fn radix2_encode(bits: u32, bytes: &[u8]) -> Vec<u8> {
    let mask = (1u32 << bits) - 1;
    let mut out = Vec::with_capacity((bytes.len() * 8).div_ceil(bits as usize));
    let mut carry: u32 = 0;
    let mut pos: u32 = 0;
    for byte in bytes {
        carry = ((carry << 8) | u32::from(*byte)) & 0xffff;
        pos += 8;
        while pos >= bits {
            pos -= bits;
            out.push(((carry >> pos) & mask) as u8);
        }
    }
    if pos > 0 {
        out.push(((carry << (bits - pos)) & mask) as u8);
    }
    out
}

fn radix2_decode(bits: u32, digits: &[u8]) -> Result<Vec<u8>> {
    let mut out = Vec::with_capacity(digits.len() * bits as usize / 8);
    let mut carry: u32 = 0;
    let mut pos: u32 = 0;
    for digit in digits {
        carry = ((carry << bits) | u32::from(*digit)) & 0xffff;
        pos += bits;
        while pos >= 8 {
            out.push(((carry >> (pos - 8)) & 0xff) as u8);
            pos -= 8;
        }
    }
    let carry = (carry << (8 - pos)) & 0xff;
    if pos >= bits {
        return err("Excess padding");
    }
    if carry > 0 {
        return err(format!("Non-zero padding: {carry}"));
    }
    Ok(out)
}

fn padding_decode(bits: usize, input: &str) -> Result<&str> {
    let mut end = input.encode_utf16().count();
    if (end * bits) % 8 != 0 {
        return err("padding: invalid length");
    }
    let mut byte_end = input.len();
    while end > 0 && input.as_bytes()[byte_end - 1] == b'=' {
        if ((end - 1) * bits) % 8 == 0 {
            return err("padding: excess padding");
        }
        end -= 1;
        byte_end -= 1;
    }
    Ok(&input[..byte_end])
}

pub fn base32_validate(value: &str, ipfs_compat: bool) -> Result<bool> {
    validate(&BASE32, value, ipfs_compat)
}

pub fn is_base32(value: &str, ipfs_compat: bool) -> bool {
    base32_validate(value, ipfs_compat).unwrap_or(false)
}

pub fn base32_decode(value: &str, ipfs_compat: bool) -> Result<Vec<u8>> {
    base32_validate(value, ipfs_compat)?;
    let input = strip_ipfs(&BASE32, value, ipfs_compat).to_uppercase();
    radix2_decode(5, &alphabet_decode(SCURE_BASE32_ALPHABET, &input)?)
}

pub fn base32_encode<'a>(value: impl Into<U8aLike<'a>>, ipfs_compat: bool) -> String {
    let digits = radix2_encode(5, &u8a_to_u8a(value));
    let out = alphabet_encode(SCURE_BASE32_ALPHABET, &digits).to_lowercase();
    with_ipfs(&BASE32, out, ipfs_compat)
}

pub fn base58_validate(value: &str, ipfs_compat: bool) -> Result<bool> {
    validate(&BASE58, value, ipfs_compat)
}

pub fn is_base58(value: &str, ipfs_compat: bool) -> bool {
    base58_validate(value, ipfs_compat).unwrap_or(false)
}

pub fn base58_decode(value: &str, ipfs_compat: bool) -> Result<Vec<u8>> {
    base58_validate(value, ipfs_compat)?;
    let input = strip_ipfs(&BASE58, value, ipfs_compat);
    bs58::decode(input)
        .into_vec()
        .map_err(|e| Error::new(e.to_string()))
}

pub fn base58_encode<'a>(value: impl Into<U8aLike<'a>>, ipfs_compat: bool) -> String {
    let out = bs58::encode(u8a_to_u8a(value)).into_string();
    with_ipfs(&BASE58, out, ipfs_compat)
}

pub fn base64_validate(value: &str, ipfs_compat: bool) -> Result<bool> {
    validate(&BASE64, value, ipfs_compat)
}

pub fn is_base64(value: &str, ipfs_compat: bool) -> bool {
    base64_validate(value, ipfs_compat).unwrap_or(false)
}

pub fn base64_decode(value: &str, ipfs_compat: bool) -> Result<Vec<u8>> {
    base64_validate(value, ipfs_compat)?;
    let unpadded = padding_decode(6, value)?;
    radix2_decode(6, &alphabet_decode(BASE64.chars, unpadded)?)
}

pub fn base64_encode<'a>(value: impl Into<U8aLike<'a>>, ipfs_compat: bool) -> String {
    let digits = radix2_encode(6, &u8a_to_u8a(value));
    let mut out = alphabet_encode(BASE64.chars, &digits);
    while (out.len() * 6) % 8 != 0 {
        out.push('=');
    }
    with_ipfs(&BASE64, out, ipfs_compat)
}

/// `base64Pad`, which (faithfully to the TS) appends `length % 4` padding characters.
pub fn base64_pad(value: &str) -> String {
    let length = value.encode_utf16().count();
    format!("{value}{}", "=".repeat(length % 4))
}

pub fn base64_trim(value: &str) -> String {
    value.trim_end_matches('=').to_string()
}

pub fn base64_url_decode(input: &str) -> Result<Vec<u8>> {
    let b64 = input.replace('-', "+").replace('_', "/");
    let length = b64.encode_utf16().count();
    let padded = format!("{b64}{}", "=".repeat((4 - length % 4) % 4));
    base64_decode(&padded, false)
}

pub fn base64_url_encode<'a>(input: impl Into<U8aLike<'a>>) -> String {
    base64_encode(input, false)
        .replace('=', "")
        .replace('+', "-")
        .replace('/', "_")
}
