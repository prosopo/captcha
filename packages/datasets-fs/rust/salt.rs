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

//! A captcha's salt: `blake2AsHex(bcrypt.genSaltSync(10))`.

use prosopo_util_crypto::{blake2_as_hex, random_as_u8a, U8aLike};

pub const SALT_ROUNDS: u8 = 10;

const BASE64_CODE: &[u8; 64] = b"./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/// The 16 random bytes `genSaltSync` takes from `crypto.randomBytes`; injected so a run can
/// be replayed.
pub trait RandomBytes: Send {
    fn salt_seed(&mut self) -> [u8; 16];
}

pub struct OsRandom;

impl RandomBytes for OsRandom {
    fn salt_seed(&mut self) -> [u8; 16] {
        let mut seed: [u8; 16] = [0; 16];
        seed.copy_from_slice(&random_as_u8a(16));
        seed
    }
}

/// bcrypt's `encode_base64`: its own alphabet, no padding.
fn encode_base64(data: &[u8]) -> String {
    let mut out: String = String::new();
    let mut bytes = data.iter().copied();
    while let Some(c1) = bytes.next() {
        out.push(char::from(BASE64_CODE[usize::from(c1 >> 2)]));
        let high: u8 = (c1 & 0x03) << 4;
        let Some(c2) = bytes.next() else {
            out.push(char::from(BASE64_CODE[usize::from(high)]));
            break;
        };
        out.push(char::from(
            BASE64_CODE[usize::from(high | ((c2 >> 4) & 0x0f))],
        ));
        let middle: u8 = (c2 & 0x0f) << 2;
        let Some(c3) = bytes.next() else {
            out.push(char::from(BASE64_CODE[usize::from(middle)]));
            break;
        };
        out.push(char::from(
            BASE64_CODE[usize::from(middle | ((c3 >> 6) & 0x03))],
        ));
        out.push(char::from(BASE64_CODE[usize::from(c3 & 0x3f)]));
    }
    out
}

/// `bcrypt.genSaltSync(rounds)` with the random bytes given: `$2b$`, the rounds clamped to
/// 4..=31 as two digits, `$`, and the encoded seed.
pub fn gen_salt(rounds: u8, seed: &[u8; 16]) -> String {
    format!("$2b${:02}${}", rounds.clamp(4, 31), encode_base64(seed))
}

/// A captcha's salt.
pub fn captcha_salt(random: &mut dyn RandomBytes) -> String {
    let salt: String = gen_salt(SALT_ROUNDS, &random.salt_seed());
    blake2_as_hex(U8aLike::Str(&salt), 256, None).expect("a 256-bit blake2 digest")
}
