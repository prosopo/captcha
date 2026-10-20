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

use num_bigint::BigUint;
use sha2::{Digest, Sha256};

use crate::error::UtilError;
use crate::js::{number_to_string, round};

// Difficulty counts leading zero hex characters, so each whole step is 4 bits
// and each 0.25 step is 1 bit (4.25 = 17 bits).
const HEX_BITS_PER_DIFFICULTY: f64 = 4.0;
const HASH_BITS: u32 = 256;

fn bits_required(difficulty: f64) -> Result<f64, UtilError> {
    // A non-finite difficulty would otherwise make every hash pass.
    if !difficulty.is_finite() {
        return Err(UtilError::new(format!(
            "Invalid PoW difficulty: {}",
            number_to_string(difficulty)
        )));
    }
    Ok(round(HEX_BITS_PER_DIFFICULTY * difficulty))
}

/// The value a hash (as a big-endian integer) must be below: `2^(256 - bits)`.
pub fn target_for_difficulty(difficulty: f64) -> Result<BigUint, UtilError> {
    let bits = bits_required(difficulty)?;
    let one = BigUint::from(1u8);
    if bits <= 0.0 {
        return Ok(one << HASH_BITS);
    }
    if bits >= f64::from(HASH_BITS) {
        return Ok(one);
    }
    Ok(one << (HASH_BITS - bits as u32))
}

#[derive(Debug, Clone, Copy)]
struct DifficultyMask {
    zero_bytes: usize,
    /// Exclusive bound on the byte after the zero run; 1 when there is no partial byte.
    partial_bound: u16,
    always: bool,
    require_zero_hash: bool,
}

fn difficulty_mask(difficulty: f64) -> Result<DifficultyMask, UtilError> {
    let bits = bits_required(difficulty)?;
    if bits <= 0.0 {
        return Ok(DifficultyMask {
            zero_bytes: 0,
            partial_bound: 1,
            always: true,
            require_zero_hash: false,
        });
    }
    if bits >= f64::from(HASH_BITS) {
        return Ok(DifficultyMask {
            zero_bytes: 32,
            partial_bound: 1,
            always: false,
            require_zero_hash: true,
        });
    }
    let bits = bits as u32;
    let rem_bits = bits & 7;
    Ok(DifficultyMask {
        zero_bytes: (bits >> 3) as usize,
        partial_bound: if rem_bits == 0 {
            1
        } else {
            1 << (8 - rem_bits)
        },
        always: false,
        require_zero_hash: false,
    })
}

fn hash_meets_mask(hash: &[u8], mask: DifficultyMask) -> bool {
    if mask.always {
        return true;
    }
    if (0..mask.zero_bytes).any(|i| hash.get(i) != Some(&0)) {
        return false;
    }
    if mask.require_zero_hash {
        return true;
    }
    if mask.partial_bound > 1 {
        return hash
            .get(mask.zero_bytes)
            .is_some_and(|b| u16::from(*b) < mask.partial_bound);
    }
    true
}

/// Whether the leading `round(4 * difficulty)` bits of `hash` are zero,
/// i.e. `hash < targetForDifficulty(difficulty)`.
pub fn hash_meets_difficulty(hash: &[u8], difficulty: f64) -> Result<bool, UtilError> {
    Ok(hash_meets_mask(hash, difficulty_mask(difficulty)?))
}

/// The smallest nonce for which `sha256(nonce + data)` meets `difficulty`.
/// CPU-bound: call it from `tokio::task::spawn_blocking` in async code.
pub fn solve_pow(data: &str, difficulty: f64) -> Result<u64, UtilError> {
    let mask = difficulty_mask(difficulty)?;
    let data = data.as_bytes();
    let mut digits = 1;
    let mut rollover: u64 = 10;
    let mut message: Vec<u8> = vec![0; digits + data.len()];
    message[digits..].copy_from_slice(data);
    let mut nonce: u64 = 0;
    loop {
        if nonce == rollover {
            digits += 1;
            rollover *= 10;
            message = vec![0; digits + data.len()];
            message[digits..].copy_from_slice(data);
        }
        let mut n = nonce;
        for slot in message[..digits].iter_mut().rev() {
            *slot = b'0' + (n % 10) as u8;
            n /= 10;
        }
        if hash_meets_mask(&Sha256::digest(&message), mask) {
            return Ok(nonce);
        }
        nonce += 1;
    }
}

#[cfg(test)]
mod tests {
    // Ported from src/tests/solverService.unit.test.ts and src/tests/solverService.benchmark.unit.test.ts
    use super::*;

    fn hash_of(data: &str) -> Vec<u8> {
        Sha256::digest(data.as_bytes()).to_vec()
    }

    fn pow2(bits: u32) -> BigUint {
        BigUint::from(1u8) << bits
    }

    #[test]
    fn target_returns_2_240_for_difficulty_4() {
        assert_eq!(target_for_difficulty(4.0).unwrap(), pow2(240));
    }

    #[test]
    fn target_returns_2_236_for_difficulty_5() {
        assert_eq!(target_for_difficulty(5.0).unwrap(), pow2(236));
    }

    #[test]
    fn target_quantises_fractional_difficulty_to_bit_level_granularity() {
        assert_eq!(target_for_difficulty(4.25).unwrap(), pow2(239));
        assert_eq!(target_for_difficulty(4.5).unwrap(), pow2(238));
        assert_eq!(target_for_difficulty(4.75).unwrap(), pow2(237));
    }

    #[test]
    fn target_is_strictly_decreasing_in_difficulty() {
        let ds: [f64; 11] = [1.0, 2.0, 3.0, 3.5, 4.0, 4.25, 4.5, 4.75, 5.0, 6.0, 7.0];
        for pair in ds.windows(2) {
            assert!(
                target_for_difficulty(pair[1]).unwrap() < target_for_difficulty(pair[0]).unwrap()
            );
        }
    }

    #[test]
    fn target_fails_closed_on_a_non_finite_difficulty() {
        for bad in [f64::NAN, f64::INFINITY] {
            assert!(target_for_difficulty(bad).is_err());
        }
    }

    #[test]
    fn hash_matches_the_legacy_hex_prefix_check_for_integer_difficulty() {
        for n in 0..200 {
            let hash = hash_of(&format!("{n}challenge"));
            let hex: String = hash.iter().map(|b| format!("{b:02x}")).collect();
            for d in [1usize, 2, 3, 4] {
                assert_eq!(
                    hash_meets_difficulty(&hash, d as f64).unwrap(),
                    hex.starts_with(&"0".repeat(d))
                );
            }
        }
    }

    #[test]
    fn hash_fails_closed_on_a_non_finite_difficulty() {
        assert!(hash_meets_difficulty(&hash_of("nan-guard"), f64::NAN).is_err());
    }

    #[test]
    fn hash_is_monotonic() {
        let met = (0..200_000)
            .map(|n| hash_of(&format!("{n}monotonic")))
            .find(|h| hash_meets_difficulty(h, 3.0).unwrap())
            .expect("a nonce meeting difficulty 3");
        for easier in [2.75, 2.5, 2.0, 1.0] {
            assert!(hash_meets_difficulty(&met, easier).unwrap());
        }
    }

    #[test]
    fn solve_returns_a_nonce_whose_hash_meets_the_difficulty() {
        let nonce = solve_pow("solver-roundtrip", 2.0).unwrap();
        let hash = hash_of(&format!("{nonce}solver-roundtrip"));
        assert!(hash_meets_difficulty(&hash, 2.0).unwrap());
    }

    #[test]
    fn solve_respects_fractional_difficulty() {
        let nonce = solve_pow("solver-fractional", 2.5).unwrap();
        let hash = hash_of(&format!("{nonce}solver-fractional"));
        assert!(hash_meets_difficulty(&hash, 2.5).unwrap());
    }

    #[test]
    fn solve_returns_the_first_qualifying_nonce() {
        let nonce = solve_pow("solver-first-nonce", 2.0).unwrap();
        for n in 0..nonce {
            let earlier = hash_of(&format!("{n}solver-first-nonce"));
            assert!(!hash_meets_difficulty(&earlier, 2.0).unwrap());
        }
    }

    #[test]
    fn solve_matches_a_reference_brute_force_solver() {
        let reference = |data: &str, difficulty: f64| -> u64 {
            (0..)
                .find(|n| {
                    hash_meets_difficulty(&hash_of(&format!("{n}{data}")), difficulty).unwrap()
                })
                .expect("a solution exists")
        };
        for challenge in ["a", "longer-challenge-string", "12345"] {
            assert_eq!(
                solve_pow(challenge, 2.0).unwrap(),
                reference(challenge, 2.0)
            );
        }
    }

    #[test]
    fn solve_encodes_multi_digit_nonces_correctly_across_buffer_growth() {
        let nonce = solve_pow("solver-multidigit", 3.0).unwrap();
        assert!(nonce > 99);
        let hash = hash_of(&format!("{nonce}solver-multidigit"));
        assert!(hash_meets_difficulty(&hash, 3.0).unwrap());
    }

    #[test]
    fn end_to_end_solve_completes_within_a_sane_time_budget() {
        let start = std::time::Instant::now();
        let nonce = solve_pow("end-to-end-benchmark", 3.0).unwrap();
        let hash = hash_of(&format!("{nonce}end-to-end-benchmark"));
        assert_eq!(hash[0], 0);
        assert!(start.elapsed() < std::time::Duration::from_secs(5));
    }
}
