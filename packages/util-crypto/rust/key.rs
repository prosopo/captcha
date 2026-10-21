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

//! Secret URIs (`<phrase>/soft//hard///password`) and HDKD paths.

use crate::error::{err, Result};
use crate::hashing::blake2_as_u8a;
use crate::sr25519::{sr25519_derive_hard, sr25519_derive_soft, Keypair};
use crate::u8a::{compact_add_length, hex_to_u8a, is_hex, string_to_u8a};
use regex::Regex;
use std::sync::OnceLock;

const JUNCTION_ID_LEN: usize = 32;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum KeypairType {
    Ed25519,
    Sr25519,
    Ecdsa,
    Ethereum,
}

impl KeypairType {
    pub fn as_str(&self) -> &'static str {
        match self {
            KeypairType::Ed25519 => "ed25519",
            KeypairType::Sr25519 => "sr25519",
            KeypairType::Ecdsa => "ecdsa",
            KeypairType::Ethereum => "ethereum",
        }
    }

    pub fn parse(value: &str) -> Option<KeypairType> {
        match value {
            "ed25519" => Some(KeypairType::Ed25519),
            "sr25519" => Some(KeypairType::Sr25519),
            "ecdsa" => Some(KeypairType::Ecdsa),
            "ethereum" => Some(KeypairType::Ethereum),
            _ => None,
        }
    }
}

/// A value accepted by `DeriveJunction#soft`/`#hard`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum JunctionValue<'a> {
    /// A number, given as its decimal digits (`BN`), encoded as 32 LE bytes.
    Number(&'a str),
    /// A string: hex is decoded, anything else is SCALE-encoded (compact length + UTF-8).
    Str(&'a str),
    Bytes(&'a [u8]),
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DeriveJunction {
    chain_code: [u8; 32],
    is_hard: bool,
}

impl Default for DeriveJunction {
    fn default() -> Self {
        Self::new()
    }
}

/// `bnToU8a(new BN(digits), { bitLength: 256, isLe: true })`.
fn decimal_to_le_256(digits: &str) -> Result<Vec<u8>> {
    let mut out: Vec<u8> = Vec::new();
    for digit in digits.bytes() {
        let mut carry = u32::from(digit - b'0');
        for byte in out.iter_mut() {
            let value = u32::from(*byte) * 10 + carry;
            *byte = (value & 0xff) as u8;
            carry = value >> 8;
        }
        if carry > 0 {
            out.push(carry as u8);
        }
    }
    while out.last() == Some(&0) {
        out.pop();
    }
    if out.len() > 32 {
        return err("byte array longer than desired length");
    }
    out.resize(32, 0);
    Ok(out)
}

impl DeriveJunction {
    pub fn new() -> Self {
        Self {
            chain_code: [0u8; 32],
            is_hard: false,
        }
    }

    /// `DeriveJunction.from(value)`: a leading `/` marks a hard junction, all-digit codes are numbers.
    pub fn from(value: &str) -> Result<DeriveJunction> {
        let (code, is_hard) = match value.strip_prefix('/') {
            Some(rest) => (rest, true),
            None => (value, false),
        };
        let is_number = !code.is_empty() && code.bytes().all(|b| b.is_ascii_digit());
        let mut result = DeriveJunction::new();
        result.soft(if is_number {
            JunctionValue::Number(code)
        } else {
            JunctionValue::Str(code)
        })?;
        if is_hard {
            result.harden();
        }
        Ok(result)
    }

    pub fn chain_code(&self) -> &[u8; 32] {
        &self.chain_code
    }

    pub fn is_hard(&self) -> bool {
        self.is_hard
    }

    pub fn is_soft(&self) -> bool {
        !self.is_hard
    }

    pub fn hard(&mut self, value: JunctionValue<'_>) -> Result<&mut Self> {
        self.soft(value)?;
        Ok(self.harden())
    }

    pub fn harden(&mut self) -> &mut Self {
        self.is_hard = true;
        self
    }

    pub fn soft(&mut self, value: JunctionValue<'_>) -> Result<&mut Self> {
        let bytes = match value {
            JunctionValue::Number(digits) => decimal_to_le_256(digits)?,
            JunctionValue::Str(s) if is_hex(s) => hex_to_u8a(s),
            JunctionValue::Str(s) => compact_add_length(&string_to_u8a(s)),
            JunctionValue::Bytes(b) => b.to_vec(),
        };
        let bytes = if bytes.len() > JUNCTION_ID_LEN {
            blake2_as_u8a(bytes.as_slice(), 256, None)?
        } else {
            bytes
        };
        self.chain_code = [0u8; 32];
        self.chain_code[..bytes.len()].copy_from_slice(&bytes);
        Ok(self)
    }

    pub fn soften(&mut self) -> &mut Self {
        self.is_hard = false;
        self
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ExtractPathResult {
    /// The matched junctions; `None` when nothing matched (`String#match` returning `null`).
    pub parts: Option<Vec<String>>,
    pub path: Vec<DeriveJunction>,
}

fn junction_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"/(/?)([^/]+)").expect("valid regex"))
}

fn suri_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"^((?-u:\w)+( (?-u:\w)+)*)((//?[^/]+)*)(///([^\n\r\x{2028}\x{2029}]*))?$",
        )
        .expect("valid regex")
    })
}

/// `keyExtractPath(derivePath)`.
pub fn key_extract_path(derive_path: &str) -> Result<ExtractPathResult> {
    let parts: Vec<String> = junction_regex()
        .find_iter(derive_path)
        .map(|m| m.as_str().to_string())
        .collect();
    let mut path = Vec::with_capacity(parts.len());
    for part in &parts {
        path.push(DeriveJunction::from(&part[1..])?);
    }
    let constructed = parts.concat();
    if constructed != derive_path {
        return err(format!(
            "Re-constructed path \"{constructed}\" does not match input"
        ));
    }
    Ok(ExtractPathResult {
        parts: if parts.is_empty() { None } else { Some(parts) },
        path,
    })
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ExtractSuriResult {
    pub derive_path: String,
    pub password: Option<String>,
    pub path: Vec<DeriveJunction>,
    pub phrase: String,
}

/// `keyExtractSuri(suri)`.
pub fn key_extract_suri(suri: &str) -> Result<ExtractSuriResult> {
    let Some(captures) = suri_regex().captures(suri) else {
        return err("Unable to match provided value to a secret URI");
    };
    let phrase = captures.get(1).map_or("", |m| m.as_str());
    if phrase.is_empty() {
        return err("Unable to extract phrase from provided value");
    }
    let derive_path = captures.get(3).map_or("", |m| m.as_str());
    let password = captures.get(6).map(|m| m.as_str().to_string());
    let ExtractPathResult { path, .. } = key_extract_path(derive_path)?;
    Ok(ExtractSuriResult {
        derive_path: derive_path.to_string(),
        password,
        path,
        phrase: phrase.to_string(),
    })
}

/// `keyHdkdSr25519(keypair, junction)`.
pub fn key_hdkd_sr25519(keypair: &Keypair, junction: &DeriveJunction) -> Result<Keypair> {
    if junction.is_soft() {
        sr25519_derive_soft(keypair, junction.chain_code())
    } else {
        sr25519_derive_hard(keypair, junction.chain_code())
    }
}

/// `keyFromPath(pair, path, type)`; only sr25519 derivation is implemented.
pub fn key_from_path(
    pair: &Keypair,
    path: &[DeriveJunction],
    kind: KeypairType,
) -> Result<Keypair> {
    let not_implemented = match kind {
        KeypairType::Sr25519 => None,
        KeypairType::Ecdsa => Some("ECDSA key derivation not implemented yet"),
        KeypairType::Ed25519 => Some("ED25519 key derivation not implemented yet"),
        KeypairType::Ethereum => Some("Ethereum key derivation not implemented yet"),
    };
    let mut result = pair.clone();
    for junction in path {
        if let Some(message) = not_implemented {
            return err(message);
        }
        result = key_hdkd_sr25519(&result, junction)?;
    }
    Ok(result)
}
