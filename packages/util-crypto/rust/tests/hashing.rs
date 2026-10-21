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

use super::hex;
use crate::hashing::*;
use crate::scrypt::{scrypt_encode, DEFAULT_PARAMS};
use crate::u8a::u8a_to_hex;

mod blake2_as_hex_spec {
    // Ported from src/blake2/asHex.spec.ts (the onlyJs=false/true runs are identical in Rust)
    use super::*;

    #[test]
    fn returns_a_64_bit_value_specified() {
        assert_eq!(blake2_as_hex("abc", 64, None), Ok("0xd8bb14d833d59559".to_string()));
    }

    #[test]
    fn returns_a_128_bit_value_as_specified() {
        assert_eq!(
            blake2_as_hex("abc", 128, None),
            Ok("0xcf4ab791c62b8d2b2109c90275287816".to_string())
        );
    }

    #[test]
    fn returns_a_128_bit_value_as_specified_with_key() {
        assert_eq!(
            blake2_as_hex("abc", 128, Some(&[1, 2])),
            Ok("0x36f3d08cda72a00ddf2be103eb5770d9".to_string())
        );
    }

    #[test]
    fn returns_a_256_bit_value_default() {
        assert_eq!(
            blake2_as_hex("abc", HEX_HASH_BIT_LENGTH, None),
            Ok("0xbddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319".to_string())
        );
    }

    #[test]
    fn returns_a_512_bit_value_as_specified() {
        assert_eq!(
            blake2_as_hex("abc", 512, None),
            Ok("0xba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923".to_string())
        );
    }

    #[test]
    fn matches_with_the_rust_implementation() {
        let input = hex("0x454545454545454545454545454545454545454545454545454545454545454501000000000000002481853da20b9f4322f34650fea5f240dcbfb266d02db94bfa0153c31f4a29dbdbf025dd4a69a6f4ee6e1577b251b655097e298b692cb34c18d3182cac3de0dc00000000");
        assert_eq!(
            blake2_as_hex(&input, 256, None),
            Ok("0x1025e5db74fdaf4d2818822dccf0e1604ae9ccc62f26cecfde23448ff0248abf".to_string())
        );
    }
}

mod blake2_as_u8a_spec {
    // Ported from src/blake2/asU8a.spec.ts
    use super::*;

    const ABC_256: [u8; 32] = [
        189, 221, 129, 60, 99, 66, 57, 114, 49, 113, 239, 63, 238, 152, 87, 155, 148, 150, 78, 59,
        177, 203, 62, 66, 114, 98, 200, 192, 104, 213, 35, 25,
    ];

    #[test]
    fn returns_a_256_bit_value_by_default() {
        assert_eq!(blake2_as_u8a("abc", HEX_HASH_BIT_LENGTH, None), Ok(ABC_256.to_vec()));
    }

    #[test]
    fn returns_a_128_bit_value_as_specified() {
        assert_eq!(
            blake2_as_u8a("abc", 128, None),
            Ok(vec![207, 74, 183, 145, 198, 43, 141, 43, 33, 9, 201, 2, 117, 40, 120, 22])
        );
    }

    #[test]
    fn returns_a_256_bit_value_as_specified() {
        assert_eq!(blake2_as_u8a("abc", 256, None), Ok(ABC_256.to_vec()));
    }

    #[test]
    fn returns_a_512_bit_value_as_specified() {
        assert_eq!(
            blake2_as_u8a("abc", 512, None),
            Ok(hex("0xba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923"))
        );
    }

    #[test]
    fn has_equivalent_outputs_on_hex_inputs() {
        assert_eq!(blake2_as_u8a("0x123456", 256, None), blake2_as_u8a(&[0x12u8, 0x34, 0x56], 256, None));
    }

    #[test]
    fn has_equivalent_outputs_with_key_inputs() {
        assert_eq!(
            blake2_as_u8a("0x123456", 256, Some(&[1, 2])),
            blake2_as_u8a(&[0x12u8, 0x34, 0x56], 256, Some(&[1, 2]))
        );
    }
}

mod sha256_spec {
    // Ported from src/sha/asU8a256.spec.ts
    use super::*;

    #[test]
    fn creates_known_sha256_hashes() {
        let tests = [
            ("0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "0x5df6e0e2761359d30a8275058e299fcc0381534545f55cf43e41983f5d4c9456"),
            ("0x7941cb07924fdc7b710e11d98d82850e89566e1c3cb980517ffe4b430f86dfd5", "0xe668668fa102ccd4d3cf50e4472be8426e7dc52d6d355bee8c5e2177d1de81f7"),
            ("0x5d9a905bc3ca7c153623af0a05231960eb3f5bdd5b8b7b55ede8b2deac689d65", "0x6721bc38e80d03f4f45f1544819d17e0c33674eb6efcddf6c6192cd78194dd9f"),
            ("0xb0cd6528ae4d5baf7c6f0d202e7f372b6488d22b2a5bd72f794f8f1e6031b31f", "0x353f5a030af27885aed3571cd9e2cac9f4331c51d31cef496a586496aec32256"),
            ("0x841267bd4110e1b634e17cd019abc6ae4f9a6dd097fb063000c1615a643b5463", "0x8174a30d921978e7055516189872cca737b49468c6bcf7fdfe59d4a54c489a1f"),
        ];
        for (input, output) in tests {
            assert_eq!(sha256_as_u8a(&hex(input)), hex(output));
        }
    }
}

mod sha512_spec {
    // Ported from src/sha/asU8a512.spec.ts
    use super::*;

    #[test]
    fn creates_a_sha512_hash() {
        assert_eq!(
            sha512_as_u8a(&[0x61, 0x62, 0x63, 0x64]),
            vec![
                216, 2, 47, 32, 96, 173, 110, 253, 41, 122, 183, 61, 204, 83, 85, 201, 178, 20, 5, 75,
                13, 23, 118, 161, 54, 166, 105, 210, 106, 125, 59, 20, 247, 58, 160, 208, 235, 255, 25,
                238, 51, 51, 104, 240, 22, 75, 100, 25, 169, 109, 164, 158, 62, 72, 23, 83, 231, 233,
                107, 113, 107, 220, 203, 111,
            ]
        );
    }
}

mod pbkdf2_spec {
    // Ported from src/pbkdf2/encode.spec.ts
    use super::*;

    const KNOWN_SALT: [u8; 32] = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
        26, 27, 28, 29, 30, 31, 32,
    ];
    const TEST_PASSWORD: &str = "test password";

    #[test]
    fn is_deterministic_for_the_same_salt_and_rounds() {
        for rounds in [256, 1024, 2048] {
            let salt = crate::random::random_as_u8a(32);
            assert_eq!(
                pbkdf2_encode(TEST_PASSWORD, &salt, rounds).map(|r| r.password),
                pbkdf2_encode(TEST_PASSWORD, &salt, rounds).map(|r| r.password)
            );
        }
    }

    #[test]
    fn creates_known_iterations() {
        assert_eq!(
            pbkdf2_encode(TEST_PASSWORD, &KNOWN_SALT, 2048).map(|r| u8a_to_hex(&r.password)),
            Ok("0x600ba9ad65e4294d112e028fdad5dd8fce0a6a6e6b89fb36ed006785ccc3b3aec46831b3105c24237293e6cfa1a0ef6717c113f87ff9237a3f73d210adfa6634".to_string())
        );
    }
}

mod scrypt_spec {
    // Ported from src/scrypt/encode.spec.ts
    use super::*;

    pub(crate) const KNOWN_PASS: [u8; 64] = [
        223, 185, 241, 135, 125, 17, 195, 27, 64, 64, 154, 69, 47, 82, 123, 38, 255, 230, 199, 200,
        101, 115, 21, 116, 119, 59, 67, 43, 58, 220, 112, 70, 124, 139, 240, 206, 42, 148, 140, 132,
        64, 226, 164, 25, 104, 80, 49, 92, 144, 132, 109, 178, 76, 225, 171, 116, 151, 181, 34, 243,
        177, 235, 134, 76,
    ];
    pub(crate) const KNOWN_SALT: [u8; 32] = [
        1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7,
        8,
    ];

    #[test]
    fn generates_a_known_output() {
        let result = scrypt_encode("testing, 123", &KNOWN_SALT, DEFAULT_PARAMS);
        assert_eq!(
            result.map(|r| (r.params, r.password, r.salt)),
            Ok((DEFAULT_PARAMS, KNOWN_PASS.to_vec(), KNOWN_SALT.to_vec()))
        );
    }
}
