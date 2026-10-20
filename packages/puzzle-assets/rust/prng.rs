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

//! xoshiro128**, matching `prng.ts` draw for draw.
//!
//! SECURITY: the algorithm is public, so the seed is the only thing between an
//! attacker and a pixel-exact reproduction of the clean background, which they
//! could diff against the served composite to read the notch position. Seeds
//! therefore come from the system CSPRNG, and may be persisted on the captcha
//! record for replay but never returned to a client or logged.

use crate::PuzzleAssetsError;

pub const SEED_BYTES: usize = 16;

/// Fresh 128-bit seed from the system CSPRNG.
pub fn create_seed() -> Vec<u8> {
    let mut seed = vec![0u8; SEED_BYTES];
    getrandom::fill(&mut seed).expect("system CSPRNG unavailable");
    seed
}

/// Not a CSPRNG: the secrecy of the output rests on the seed, which is.
#[derive(Clone, Debug)]
pub struct Prng {
    s0: u32,
    s1: u32,
    s2: u32,
    s3: u32,
}

/// `createPrng` in `prng.ts`. Only the first [`SEED_BYTES`] bytes are read.
pub fn create_prng(seed: &[u8]) -> Result<Prng, PuzzleAssetsError> {
    if seed.len() < SEED_BYTES {
        return Err(PuzzleAssetsError::SeedTooShort { len: seed.len() });
    }
    let word = |i: usize| u32::from_le_bytes([seed[i], seed[i + 1], seed[i + 2], seed[i + 3]]);
    let (mut s0, s1, s2, s3) = (word(0), word(4), word(8), word(12));
    // An all-zero state is a fixed point for xoshiro.
    if (s0 | s1 | s2 | s3) == 0 {
        s0 = 1;
    }
    Ok(Prng { s0, s1, s2, s3 })
}

impl Prng {
    pub fn next_u32(&mut self) -> u32 {
        let result = self.s1.wrapping_mul(5).rotate_left(7).wrapping_mul(9);
        let t = self.s1 << 9;
        self.s2 ^= self.s0;
        self.s3 ^= self.s1;
        self.s1 ^= self.s2;
        self.s0 ^= self.s3;
        self.s2 ^= t;
        self.s3 = self.s3.rotate_left(11);
        result
    }

    /// Uniform in [0, 1).
    #[allow(clippy::should_implement_trait)]
    pub fn next(&mut self) -> f64 {
        f64::from(self.next_u32()) / 4_294_967_296.0
    }

    /// Uniform integer in [min, max].
    pub fn int(&mut self, min: i64, max: i64) -> i64 {
        let n = self.next();
        (min as f64 + (n * (max as f64 - min as f64 + 1.0)).floor()) as i64
    }

    /// Uniform in [min, max).
    pub fn range(&mut self, min: f64, max: f64) -> f64 {
        min + self.next() * (max - min)
    }

    /// Uniform element of a list. Consumes a draw even when the list is empty,
    /// as the TS does before it throws.
    pub fn pick<'a, T>(&mut self, items: &'a [T]) -> Result<&'a T, PuzzleAssetsError> {
        let index = (self.next() * items.len() as f64).floor() as usize;
        items.get(index).ok_or(PuzzleAssetsError::EmptyPick)
    }
}
