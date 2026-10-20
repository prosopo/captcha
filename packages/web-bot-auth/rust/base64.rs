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

use std::fmt;

/// Why `atob` would have thrown. The messages are the `DOMException` messages
/// Node uses.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Base64Error {
    InvalidCharacter,
    NotCorrectlyEncoded,
}

impl fmt::Display for Base64Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Base64Error::InvalidCharacter => "Invalid character",
            Base64Error::NotCorrectlyEncoded => {
                "The string to be decoded is not correctly encoded."
            }
        })
    }
}

impl std::error::Error for Base64Error {}

fn sextet(byte: u8) -> Option<u32> {
    match byte {
        b'A'..=b'Z' => Some(u32::from(byte - b'A')),
        b'a'..=b'z' => Some(u32::from(byte - b'a') + 26),
        b'0'..=b'9' => Some(u32::from(byte - b'0') + 52),
        b'+' => Some(62),
        b'/' => Some(63),
        _ => None,
    }
}

/// `atob`: WHATWG forgiving-base64 decode, with Node's choice of error when
/// an input is wrong in more than one way.
pub fn decode_base64(input: &str) -> Result<Vec<u8>, Base64Error> {
    let mut data: Vec<u8> = Vec::with_capacity(input.len());
    let mut equals: usize = 0;
    for c in input.chars() {
        match c {
            '\t' | '\n' | '\x0C' | '\r' | ' ' => {}
            '=' => {
                equals += 1;
                if equals > 2 {
                    return Err(Base64Error::InvalidCharacter);
                }
            }
            _ if c.is_ascii() && sextet(c as u8).is_some() => {
                if equals > 0 {
                    return Err(Base64Error::InvalidCharacter);
                }
                data.push(c as u8);
            }
            _ => return Err(Base64Error::InvalidCharacter),
        }
    }
    let significant: usize = data.len() + equals;
    if !significant.is_multiple_of(4) && equals > 0 {
        return Err(Base64Error::InvalidCharacter);
    }
    if data.len() % 4 == 1 {
        return Err(Base64Error::NotCorrectlyEncoded);
    }
    let mut out: Vec<u8> = Vec::with_capacity(data.len() * 3 / 4);
    let mut buffer: u32 = 0;
    let mut bits: u32 = 0;
    for byte in data {
        let value: u32 = sextet(byte).unwrap_or(0);
        buffer = ((buffer << 6) | value) & 0xFFFF;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push(((buffer >> bits) & 0xFF) as u8);
        }
    }
    Ok(out)
}

/// base64url (`-`/`_`, padding optional), as accepted for JWK `x` values.
pub fn decode_base64_url(input: &str) -> Result<Vec<u8>, Base64Error> {
    let mut b64: String = input.replace('-', "+").replace('_', "/");
    let pad: usize = (4 - b64.encode_utf16().count() % 4) % 4;
    b64.push_str(&"=".repeat(pad));
    decode_base64(&b64)
}
