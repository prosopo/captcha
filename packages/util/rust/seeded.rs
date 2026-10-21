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

//! Seeded randomness (src/lodash.ts): seedrandom 3.0.5's default ARC4 generator, and the
//! lodash 4.18.1 functions that draw from `Math.random` once it is seeded.

use crate::js::number_to_string;

const WIDTH: f64 = 256.0;
const CHUNKS: u32 = 6;
const START_DENOM: f64 = 281_474_976_710_656.0;
const SIGNIFICANCE: f64 = 4_503_599_627_370_496.0;
const OVERFLOW: f64 = SIGNIFICANCE * 2.0;

/// `seedrandom(seed)` for a string seed: RC4 keyed by the seed's UTF-16 code units, with the
/// first 256 bytes dropped.
#[derive(Clone)]
pub struct SeedRandom {
    i: u8,
    j: u8,
    s: [u8; 256],
}

/// `mixkey`: each key byte is the previous smear, xored with 19 times the byte already at
/// that position, plus the code unit. Seeds over 256 code units wrap round the key.
fn mix_key(seed: &str) -> Vec<u8> {
    let mut key: Vec<u8> = Vec::new();
    let mut smear: i32 = 0;
    for (j, code_unit) in seed.encode_utf16().enumerate() {
        let at: usize = j & 0xff;
        let previous: i32 = key.get(at).map_or(0, |byte: &u8| i32::from(*byte) * 19);
        smear ^= previous;
        let byte: u8 = (smear.wrapping_add(i32::from(code_unit)) & 0xff) as u8;
        if at < key.len() {
            key[at] = byte;
        } else {
            key.push(byte);
        }
    }
    key
}

impl SeedRandom {
    pub fn new(seed: &str) -> SeedRandom {
        let mut key: Vec<u8> = mix_key(seed);
        if key.is_empty() {
            key.push(0);
        }
        let mut s: [u8; 256] = [0; 256];
        for (index, slot) in s.iter_mut().enumerate() {
            *slot = index as u8;
        }
        let mut j: u8 = 0;
        for i in 0..256 {
            let t: u8 = s[i];
            j = j.wrapping_add(key[i % key.len()]).wrapping_add(t);
            s[i] = s[usize::from(j)];
            s[usize::from(j)] = t;
        }
        let mut random: SeedRandom = SeedRandom { i: 0, j: 0, s };
        random.g(256);
        random
    }

    /// `arc4.g(count)`: the next `count` bytes as a big-endian number.
    fn g(&mut self, count: u32) -> f64 {
        let mut r: f64 = 0.0;
        for _ in 0..count {
            self.i = self.i.wrapping_add(1);
            let t: u8 = self.s[usize::from(self.i)];
            self.j = self.j.wrapping_add(t);
            self.s[usize::from(self.i)] = self.s[usize::from(self.j)];
            self.s[usize::from(self.j)] = t;
            let index: u8 = self.s[usize::from(self.i)].wrapping_add(t);
            r = r * WIDTH + f64::from(self.s[usize::from(index)]);
        }
        r
    }

    /// `prng()` (and `Math.random()` once seeded globally): a double in `[0, 1)` with 52
    /// significant bits.
    pub fn double(&mut self) -> f64 {
        let mut n: f64 = self.g(CHUNKS);
        let mut d: f64 = START_DENOM;
        let mut x: u32 = 0;
        while n < SIGNIFICANCE {
            n = (n + f64::from(x)) * WIDTH;
            d *= WIDTH;
            x = self.g(1) as u32;
        }
        while n >= OVERFLOW {
            n /= 2.0;
            d /= 2.0;
            x >>= 1;
        }
        (n + f64::from(x)) / d
    }

    /// `prng.int32()`.
    pub fn int32(&mut self) -> i32 {
        self.g(4) as u32 as i32
    }

    /// `prng.quick()`: 32 bits as a double.
    pub fn quick(&mut self) -> f64 {
        self.g(4) / 4_294_967_296.0
    }
}

/// `rng(seed)`.
#[derive(Clone)]
pub struct Rng(SeedRandom);

impl Rng {
    pub fn new(seed: &str) -> Rng {
        Rng(SeedRandom::new(seed))
    }

    pub fn double(&mut self) -> f64 {
        self.0.double()
    }

    pub fn float(&mut self) -> f64 {
        self.0.quick()
    }

    /// Two int32s combined as `(a << 21) + b`, the shift wrapping at 32 bits and the sum not.
    pub fn int(&mut self) -> i64 {
        let a: i32 = self.0.int32();
        let b: i32 = self.0.int32();
        i64::from(a.wrapping_shl(21)) + i64::from(b)
    }

    pub fn int32(&mut self) -> i32 {
        self.0.int32()
    }

    pub fn bool(&mut self) -> bool {
        self.0.int32() % 2 == 0
    }
}

/// `toFinite` for a number.
fn to_finite(value: f64) -> f64 {
    if value.is_nan() {
        0.0
    } else if value.is_infinite() {
        f64::MAX.copysign(value)
    } else {
        value
    }
}

/// `toInteger` for a number.
fn to_integer(value: f64) -> f64 {
    to_finite(value).trunc()
}

/// A lodash instance whose `Math.random` is seeded (`setSeedGlobal` then `lodash()`, or
/// `seedLodash`). Every call draws from the one generator, as every instance made after
/// seeding the global does.
#[derive(Clone)]
pub struct SeededLodash(SeedRandom);

impl SeededLodash {
    pub fn new(seed: &str) -> SeededLodash {
        SeededLodash(SeedRandom::new(seed))
    }

    pub fn math_random(&mut self) -> f64 {
        self.0.double()
    }

    /// `baseRandom(lower, upper)`.
    fn base_random(&mut self, lower: f64, upper: f64) -> f64 {
        lower + (self.math_random() * (upper - lower + 1.0)).floor()
    }

    /// `_.random(lower, upper)`: an integer between the two, inclusive, unless either bound
    /// has a fraction, in which case a float.
    pub fn random(&mut self, lower: f64, upper: f64) -> f64 {
        let (mut lower, mut upper): (f64, f64) = (to_finite(lower), to_finite(upper));
        if lower > upper {
            std::mem::swap(&mut lower, &mut upper);
        }
        if lower % 1.0 != 0.0 || upper % 1.0 != 0.0 {
            let rand: f64 = self.math_random();
            let digits: usize = number_to_string(rand).len() - 1;
            let epsilon: f64 = format!("1e-{digits}").parse().unwrap_or(0.0);
            return (lower + rand * (upper - lower + epsilon)).min(upper);
        }
        self.base_random(lower, upper)
    }

    /// `shuffleSelf(array, size)`: a partial Fisher-Yates shuffle, truncated to `size`.
    fn shuffle_self<T>(&mut self, array: &mut Vec<T>, size: usize) {
        let last_index: f64 = array.len() as f64 - 1.0;
        for index in 0..size {
            let rand: usize = self.base_random(index as f64, last_index) as usize;
            array.swap(rand, index);
        }
        array.truncate(size);
    }

    /// `_.shuffle(array)`.
    pub fn shuffle<T: Clone>(&mut self, array: &[T]) -> Vec<T> {
        let mut shuffled: Vec<T> = array.to_vec();
        let size: usize = shuffled.len();
        self.shuffle_self(&mut shuffled, size);
        shuffled
    }

    /// `_.sampleSize(array, n)`.
    pub fn sample_size<T: Clone>(&mut self, array: &[T], n: f64) -> Vec<T> {
        let size: f64 = to_integer(n).clamp(0.0, array.len() as f64);
        let mut sample: Vec<T> = array.to_vec();
        self.shuffle_self(&mut sample, size as usize);
        sample
    }
}
