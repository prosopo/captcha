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
//! Every derived helper (`int`, `range`, `pick`) consumes exactly one 32-bit
//! draw, in the same order as the TypeScript. Output equality with the JS
//! rests on that: a single extra or reordered draw desynchronises the whole
//! stream and every pixel after it.

pub const SEED_BYTES: usize = 16;

pub struct Prng {
    s0: u32,
    s1: u32,
    s2: u32,
    s3: u32,
}

impl Prng {
    pub fn new(seed: &[u8]) -> Self {
        let word = |i: usize| -> u32 {
            u32::from_le_bytes([seed[i], seed[i + 1], seed[i + 2], seed[i + 3]])
        };
        let (mut s0, s1, s2, s3) = (word(0), word(4), word(8), word(12));
        if (s0 | s1 | s2 | s3) == 0 {
            s0 = 1;
        }
        Self { s0, s1, s2, s3 }
    }

    fn next_u32(&mut self) -> u32 {
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
    pub fn next(&mut self) -> f64 {
        f64::from(self.next_u32()) / 4294967296.0
    }

    /// Uniform integer in [min, max].
    pub fn int(&mut self, min: i32, max: i32) -> i32 {
        let n = self.next();
        min + (n * f64::from(max - min + 1)).floor() as i32
    }

    /// Uniform in [min, max).
    pub fn range(&mut self, min: f64, max: f64) -> f64 {
        let n = self.next();
        min + n * (max - min)
    }

    /// Uniform index into a list of `len` items.
    pub fn pick_index(&mut self, len: usize) -> usize {
        let n = self.next();
        (n * len as f64).floor() as usize
    }
}
