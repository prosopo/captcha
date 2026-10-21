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

use crate::error::{err, Error, Result};
use crate::u8a::{u8a_to_u8a, U8aLike};

#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct ScryptParams {
    #[serde(rename = "N")]
    pub n: u32,
    pub p: u32,
    pub r: u32,
}

pub const DEFAULT_PARAMS: ScryptParams = ScryptParams {
    n: 1 << 15,
    p: 1,
    r: 8,
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ScryptResult {
    pub params: ScryptParams,
    pub password: Vec<u8>,
    pub salt: Vec<u8>,
}

const SCRYPT_DEFAULT_MAXMEM: u64 = 128 * 8 * ((1 << 20) + 1 + 1);

fn check_params(params: &ScryptParams) -> Result<()> {
    let ScryptParams { n, p, r } = *params;
    if r < 1 {
        return err("\"r\" expected integer >= 1");
    }
    let block_size = 128 * u64::from(r);
    if n <= 1 || !n.is_power_of_two() {
        return err("\"N\" expected a power of 2, and 2^1 <= N <= 2^32");
    }
    if p < 1 || u64::from(p) * block_size > (u64::from(u32::MAX)) * 32 {
        return err("\"p\" expected integer 1..((2^32 - 1) * 32) / (128 * r)");
    }
    let mem_used = block_size * (u64::from(n) + u64::from(p) + 1);
    if mem_used > SCRYPT_DEFAULT_MAXMEM {
        return err(format!(
            "\"maxmem\" limit was hit: memUsed(128*r*(N+p+1))={mem_used}, maxmem={SCRYPT_DEFAULT_MAXMEM}"
        ));
    }
    Ok(())
}

/// `scryptEncode(passphrase, salt, params)` with a 64-byte output.
pub fn scrypt_encode<'a>(
    passphrase: impl Into<U8aLike<'a>>,
    salt: &[u8],
    params: ScryptParams,
) -> Result<ScryptResult> {
    check_params(&params)?;
    let log_n = params.n.trailing_zeros() as u8;
    let scrypt_params = scrypt::Params::new(log_n, params.r, params.p, 64)
        .map_err(|e| Error::new(e.to_string()))?;
    let mut password = vec![0u8; 64];
    scrypt::scrypt(
        &u8a_to_u8a(passphrase),
        salt,
        &scrypt_params,
        &mut password,
    )
    .map_err(|e| Error::new(e.to_string()))?;
    Ok(ScryptResult {
        params,
        password,
        salt: salt.to_vec(),
    })
}

/// `scryptEncode(passphrase)` with a random 32-byte salt and the default params.
pub fn scrypt_encode_random_salt<'a>(passphrase: impl Into<U8aLike<'a>>) -> Result<ScryptResult> {
    scrypt_encode(passphrase, &crate::random::random_as_u8a(32), DEFAULT_PARAMS)
}

fn le_number(bytes: &[u8]) -> u64 {
    bytes
        .iter()
        .rev()
        .fold(0u64, |acc, byte| (acc << 8) | u64::from(*byte))
}

fn sub(data: &[u8], start: usize, end: usize) -> &[u8] {
    let end = end.min(data.len());
    let start = start.min(end);
    &data[start..end]
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ScryptFromU8aResult {
    pub params: ScryptParams,
    pub salt: Vec<u8>,
}

/// `scryptFromU8a`: reads `salt(32) || N || p || r` (u32 LE) and only accepts the default params.
pub fn scrypt_from_u8a(data: &[u8]) -> Result<ScryptFromU8aResult> {
    let salt = sub(data, 0, 32).to_vec();
    let n = le_number(sub(data, 32, 36));
    let p = le_number(sub(data, 36, 40));
    let r = le_number(sub(data, 40, 44));
    if n != u64::from(DEFAULT_PARAMS.n)
        || p != u64::from(DEFAULT_PARAMS.p)
        || r != u64::from(DEFAULT_PARAMS.r)
    {
        return err("Invalid injected scrypt params found");
    }
    Ok(ScryptFromU8aResult {
        params: DEFAULT_PARAMS,
        salt,
    })
}

pub fn scrypt_to_u8a(salt: &[u8], params: &ScryptParams) -> Vec<u8> {
    let mut out = salt.to_vec();
    out.extend_from_slice(&params.n.to_le_bytes());
    out.extend_from_slice(&params.p.to_le_bytes());
    out.extend_from_slice(&params.r.to_le_bytes());
    out
}
