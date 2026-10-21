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

use crate::u8a::u8a_to_hex;
use rand_core::{OsRng, RngCore};

pub fn random_as_u8a(length: usize) -> Vec<u8> {
    let mut out = vec![0u8; length];
    OsRng.fill_bytes(&mut out);
    out
}

pub fn random_as_hex(length: usize) -> String {
    u8a_to_hex(&random_as_u8a(length))
}

/// `randomAsNumber`: 8 random bytes read big-endian, masked to 53 bits.
pub fn random_as_number() -> u64 {
    let mut bytes = [0u8; 8];
    OsRng.fill_bytes(&mut bytes);
    u64::from_be_bytes(bytes) & ((1u64 << 53) - 1)
}

#[cfg(test)]
mod tests {
    // Ported from src/random/asU8a.spec.ts, src/random/asHex.spec.ts, src/random/asNumber.spec.ts
    use super::*;
    use crate::u8a::is_hex;

    #[test]
    fn as_u8a_generated_results_do_not_match() {
        assert_ne!(random_as_u8a(32), random_as_u8a(32));
    }

    #[test]
    fn as_u8a_generates_32_bytes_by_default() {
        assert_eq!(random_as_u8a(32).len(), 32);
    }

    #[test]
    fn as_u8a_generates_with_the_supplied_length() {
        assert_eq!(random_as_u8a(66).len(), 66);
    }

    #[test]
    fn as_hex_generated_results_do_not_match() {
        assert_ne!(random_as_hex(32), random_as_hex(32));
    }

    #[test]
    fn as_hex_is_a_valid_hex_number() {
        assert!(is_hex(&random_as_hex(32)));
    }

    #[test]
    fn as_hex_generates_32_bytes_by_default() {
        assert_eq!(random_as_hex(32).len(), 32 * 2 + 2);
    }

    #[test]
    fn as_hex_generates_with_the_supplied_length() {
        assert_eq!(random_as_hex(66).len(), 66 * 2 + 2);
    }

    #[test]
    fn as_number_generates_subsequent_non_matching_numbers() {
        assert_ne!(random_as_number(), random_as_number());
    }
}
