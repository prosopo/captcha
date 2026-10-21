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
use crate::address::{check_address_checksum, decode_address, encode_address, validate_address};
use crate::base::base58_decode;
use crate::u8a::{string_to_u8a, u8a_to_hex, U8aLike};

pub(crate) const ALICE_PUBLIC_SR: [u8; 32] = [
    212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44, 133, 88, 133,
    76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
];

pub(crate) const ALICE_PUBLIC_ED: [u8; 32] = [
    209, 114, 167, 76, 218, 76, 134, 89, 18, 195, 43, 160, 168, 10, 87, 174, 105, 171, 174, 65, 14,
    92, 203, 89, 222, 232, 78, 47, 68, 50, 219, 79,
];

fn decode(encoded: &str, ignore_checksum: bool, ss58_format: Option<i32>) -> crate::Result<Vec<u8>> {
    decode_address(Some(U8aLike::Str(encoded)), ignore_checksum, ss58_format)
}

fn error_of<T: std::fmt::Debug>(result: crate::Result<T>) -> String {
    result.expect_err("expected an error").message().to_string()
}

mod checksum_spec {
    // Ported from src/address/checksum.spec.ts
    use super::*;

    fn check(address: &str) -> (bool, usize, usize, u16) {
        check_address_checksum(&base58_decode(address, false).unwrap_or_default()).unwrap_or_default()
    }

    #[test]
    fn extracts_the_info_from_a_1_byte_prefix_address() {
        assert_eq!(check("F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29"), (true, 33, 1, 2));
    }

    #[test]
    fn extracts_the_info_from_a_2_byte_prefix_address_66() {
        assert_eq!(check("cTGShekJ1L1UKFZR9xmv9UTJod7vqjFAPo4sDhXih2c3y1yLS"), (true, 34, 2, 66));
    }

    #[test]
    fn extracts_the_info_from_a_2_byte_prefix_address_69() {
        assert_eq!(check("cnVvyMzRdqjwejTFuByQQ4w2yu78V2hpFixjHQz5zr6NSYsxA"), (true, 34, 2, 69));
    }

    #[test]
    fn extracts_the_info_from_a_2_byte_prefix_address_252() {
        assert_eq!(check("xw8Ffc2SZtDqUJKd9Ky4vc7PRz2D2asuVkEEzf3WGAbw9cnfq"), (true, 34, 2, 252));
    }

    #[test]
    fn extracts_the_info_from_a_2_byte_prefix_address_255() {
        assert_eq!(check("yGHU8YKprxHbHdEv7oUK4rzMZXtsdhcXVG2CAMyC9WhzhjH2k"), (true, 34, 2, 255));
    }

    #[test]
    fn extracts_the_info_from_a_2_byte_prefix_address_ecdsa() {
        assert_eq!(check("4pbsSkWcBaYoFHrKJZp5fDVUKbqSYD9dhZZGvpp3vQ5ysVs5ybV"), (true, 35, 2, 200));
    }
}

mod decode_spec {
    // Ported from src/address/decode.spec.ts
    use super::*;

    #[test]
    fn decodes_an_address() {
        assert_eq!(
            decode("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", false, None),
            Ok(ALICE_PUBLIC_SR.to_vec())
        );
    }

    #[test]
    fn decodes_the_council_address() {
        let mut expected = string_to_u8a("modlpy/trsry");
        expected.resize(32, 0);
        assert_eq!(
            decode("F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29", false, None).map(|d| u8a_to_hex(&d)),
            Ok(u8a_to_hex(&expected))
        );
    }

    #[test]
    fn converts_a_public_key_u8a_as_is() {
        assert_eq!(
            decode_address(Some(U8aLike::Bytes(&[1, 2, 3])), false, None),
            Ok(vec![1, 2, 3])
        );
    }

    #[test]
    fn converts_a_public_key_hex_as_is() {
        assert_eq!(decode("0x01020304", false, None), Ok(vec![1, 2, 3, 4]));
    }

    #[test]
    fn decodes_a_short_address() {
        assert_eq!(decode("F7NZ", false, None), Ok(vec![1]));
    }

    #[test]
    fn decodes_a_1_byte_account_id_with_prefix() {
        assert_eq!(decode("g4b", false, Some(2)), Ok(vec![1]));
    }

    #[test]
    fn decodes_a_2_byte_account_id() {
        assert_eq!(decode("3xygo", false, Some(2)), Ok(vec![0, 1]));
    }

    #[test]
    fn decodes_a_4_byte_address() {
        assert_eq!(decode("zswfoZa", false, Some(2)), Ok(vec![1, 2, 3, 4]));
    }

    #[test]
    fn decodes_a_8_byte_address() {
        assert_eq!(
            decode("848Gh2GcGaZia", false, Some(2)),
            Ok(vec![42, 44, 10, 0, 0, 0, 0, 0])
        );
    }

    #[test]
    fn decodes_a_33_byte_address() {
        assert_eq!(
            decode("KWCv1L3QX9LDPwY4VzvLmarEmXjVJidUzZcinvVnmxAJJCBou", false, None),
            Ok(hex("0x03b9dc646dd71118e5f7fda681ad9eca36eb3ee96f344f582fbe7b5bcdebb13077"))
        );
    }

    #[test]
    fn decodes_a_2_byte_prefix_65() {
        assert_eq!(
            decode("cLtA6nCDyvwKcEHH4QkZDSHMhS9s78BvUJUsKUbUAn1Jc2SCF", false, None),
            Ok(hex("0x08e8969768fc14399930d4b8d693f68a2ff6c6a597325d6946095e5e9d9d1b0e"))
        );
    }

    #[test]
    fn decodes_a_2_byte_prefix_69() {
        assert_eq!(
            decode("cnUaoo5wodnTVA4bnr4woSweto8hWZADUvLFXkR9Q6U7BRsbF", false, None),
            Ok(hex("0x88eafe0305d460d1695cf34c2f786050df8e40d215e488790cc70929c9e8316d"))
        );
    }

    #[test]
    fn decodes_a_2_byte_prefix_252() {
        assert_eq!(
            decode("xw9Hca4RJTmBRgzJT4ieJBh7XCK9gE3NXBDSEmgGHd4TCrbnG", false, None),
            Ok(hex("0xfc422da6c3bc6dfa2a436a506428072941662f816987baaa8914e02ff5947f4b"))
        );
    }

    #[test]
    fn decodes_a_2_byte_prefix_255() {
        assert_eq!(
            decode("yGHU8YKprxHbHdEv7oUK4rzMZXtsdhcXVG2CAMyC9WhzhjH2k", false, None),
            decode("5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaQua", false, None)
        );
    }

    #[test]
    fn decodes_a_2_byte_prefix_ecdsa() {
        assert_eq!(
            decode("4pbsSkWcBaYoFHrKJZp5fDVUKbqSYD9dhZZGvpp3vQ5ysVs5ybV", false, None).map(|d| u8a_to_hex(&d)),
            Ok("0x035676109c54b9a16d271abeb4954316a40a32bcce023ac14c8e26e958aa68fba9".to_string())
        );
    }

    #[test]
    fn fails_when_length_is_invalid() {
        assert!(error_of(decode("y9EMHt34JJo4rWLSaxoLGdYXvjgSXEd4zHUnQgfNzwES8b", false, None))
            .contains("address length"));
    }

    #[test]
    fn fails_when_the_checksum_does_not_match() {
        assert!(error_of(decode("5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMa9cj", false, None))
            .contains("address checksum"));
        assert!(error_of(decode("5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDwU", false, None))
            .contains("address checksum"));
    }

    #[test]
    fn fails_when_invalid_base58_encoded_address_is_found() {
        assert!(error_of(decode("F3opIRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29", false, None)).contains(
            "Decoding F3opIRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29: Invalid base58 character \"I\" (0x49) at index 4"
        ));
    }
}

mod encode_spec {
    // Ported from src/address/encode.spec.ts
    use super::*;

    const SUBKEY: [(&str, &str, i32); 10] = [
        ("5DA4D4GL5iakrn22h5uKoevgvo18Pqj5BcdEUv8etEDPdijA", "0x3050f8456519829fe03302da802d22d3233a5f4037b9a3e2bcc403ccfcb2d735", 42),
        ("cLtA6nCDyvwKcEHH4QkZDSHMhS9s78BvUJUsKUbUAn1Jc2SCF", "0x08e8969768fc14399930d4b8d693f68a2ff6c6a597325d6946095e5e9d9d1b0e", 65),
        ("cTGShekJ1L1UKFZR9xmv9UTJod7vqjFAPo4sDhXih2c3y1yLS", "0x04a047d52fe542484c69bc528990cfeaf3a663dded0638ee1b51cf78bacd1072", 66),
        ("cnVRwXfAnz3RSVQyBUC8f8McrK3YBX2QYd4WoctpeSC6VTJYm", "0xae640d53cfa815f4a6a50ae70235cd7d9d134d0f1c3a4ccd118e321dfb6ab51f", 69),
        ("4pbsSkWcBaYoFHrKJZp5fDVUKbqSYD9dhZZGvpp3vQ5ysVs5ybV", "0x035676109c54b9a16d271abeb4954316a40a32bcce023ac14c8e26e958aa68fba9", 200),
        ("xw5g1Eec8LT99pZLZMaTWwrwvNtfM6vrSuZeVbtEszCDUwByg", "0x5c64f1151f0ce4358c27238fb20c88e7c899825436f565410724c8c2c5add869", 252),
        ("yGF4JP7q5AK46d1FPCEm9sYQ4KooSjHMpyVAjLnsCSWVafPnf", "0x66cd6cf085627d6c85af1aaf2bd10cf843033e929b4e3b1c2ba8e4aa46fe111b", 255),
        ("yGDYxQatQwuxqT39Zs4LtcTnpzE12vXb7ZJ6xpdiHv6gTu1hF", "0x242fd5a078ac6b7c3c2531e9bcf1314343782aeb58e7bc6880794589e701db55", 255),
        ("mHm8k9Emsvyfp3piCauSH684iA6NakctF8dySQcX94GDdrJrE", "0x44d5a3ac156335ea99d33a83c57c7146c40c8e2260a8a4adf4e7a86256454651", 4242),
        ("r6Gr4gaMP8TsjhFbqvZhv3YvnasugLiRJpzpRHifsqqG18UXa", "0x88f01441682a17b52d6ae12d1a5670cf675fd254897efabaa5069eb3a701ab73", 14269),
    ];

    #[test]
    fn encodes_an_address_to_a_valid_value() {
        assert_eq!(
            encode_address(&ALICE_PUBLIC_ED, 42),
            Ok("5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaQua".to_string())
        );
    }

    #[test]
    fn can_re_encode_an_address() {
        assert_eq!(
            encode_address("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", 2),
            Ok("HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F".to_string())
        );
    }

    #[test]
    fn can_re_encode_an_address_to_polkadot_live() {
        assert_eq!(
            encode_address("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", 0),
            Ok("15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5".to_string())
        );
    }

    #[test]
    fn fails_when_non_valid_public_key_provided() {
        assert!(error_of(encode_address(&ALICE_PUBLIC_ED[..30], 42)).contains("Expected a valid key"));
    }

    #[test]
    fn encodes_a_1_byte_address() {
        assert_eq!(encode_address(&[1u8], 42), Ok("F7NZ".to_string()));
    }

    #[test]
    fn encodes_a_1_byte_address_with_prefix() {
        assert_eq!(encode_address(&[1u8], 2), Ok("g4b".to_string()));
    }

    #[test]
    fn encodes_a_2_byte_address() {
        assert_eq!(encode_address(&[0u8, 1], 2), Ok("3xygo".to_string()));
    }

    #[test]
    fn encodes_a_4_byte_address() {
        assert_eq!(encode_address(&[1u8, 2, 3, 4], 2), Ok("zswfoZa".to_string()));
    }

    #[test]
    fn encodes_a_8_byte_address() {
        assert_eq!(
            encode_address(&[42u8, 44, 10, 0, 0, 0, 0, 0], 2),
            Ok("848Gh2GcGaZia".to_string())
        );
    }

    #[test]
    fn encodes_an_33_byte_address() {
        assert_eq!(
            encode_address("0x03b9dc646dd71118e5f7fda681ad9eca36eb3ee96f344f582fbe7b5bcdebb13077", 42),
            Ok("KWCv1L3QX9LDPwY4VzvLmarEmXjVJidUzZcinvVnmxAJJCBou".to_string())
        );
    }

    #[test]
    fn encodes_with_2_byte_prefix() {
        assert_eq!(
            encode_address(&ALICE_PUBLIC_ED, 255),
            Ok("yGHU8YKprxHbHdEv7oUK4rzMZXtsdhcXVG2CAMyC9WhzhjH2k".to_string())
        );
    }

    #[test]
    fn encodes_with_subkey_equality() {
        for (address, public_key, ss58_format) in SUBKEY {
            assert_eq!(encode_address(public_key, ss58_format), Ok(address.to_string()));
        }
    }

    #[test]
    fn does_not_encode_for_out_of_range_formats() {
        assert!(error_of(encode_address(&ALICE_PUBLIC_ED, -1)).contains("range ss58Format specified"));
        assert!(error_of(encode_address(&ALICE_PUBLIC_ED, 16384)).contains("range ss58Format specified"));
    }

    #[test]
    fn does_not_encode_reserved() {
        assert!(error_of(encode_address(&ALICE_PUBLIC_ED, 46)).contains("range ss58Format specified"));
        assert!(error_of(encode_address(&ALICE_PUBLIC_ED, 47)).contains("range ss58Format specified"));
    }
}

mod validate_spec {
    // Ported from src/address/validate.spec.ts
    use super::*;

    fn validate(encoded: &str, ss58_format: Option<i32>) -> crate::Result<bool> {
        validate_address(Some(encoded), false, ss58_format)
    }

    #[test]
    fn validates_known_addresses() {
        let cases: [(&str, Option<i32>); 14] = [
            ("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", None),
            ("F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29", None),
            ("0x01020304", None),
            ("F7NZ", None),
            ("g4b", Some(2)),
            ("3xygo", Some(2)),
            ("zswfoZa", Some(2)),
            ("848Gh2GcGaZia", Some(2)),
            ("KWCv1L3QX9LDPwY4VzvLmarEmXjVJidUzZcinvVnmxAJJCBou", None),
            ("cLtA6nCDyvwKcEHH4QkZDSHMhS9s78BvUJUsKUbUAn1Jc2SCF", None),
            ("cnUaoo5wodnTVA4bnr4woSweto8hWZADUvLFXkR9Q6U7BRsbF", None),
            ("xw9Hca4RJTmBRgzJT4ieJBh7XCK9gE3NXBDSEmgGHd4TCrbnG", None),
            ("yGHU8YKprxHbHdEv7oUK4rzMZXtsdhcXVG2CAMyC9WhzhjH2k", None),
            ("4pbsSkWcBaYoFHrKJZp5fDVUKbqSYD9dhZZGvpp3vQ5ysVs5ybV", None),
        ];
        for (address, ss58_format) in cases {
            assert_eq!(validate(address, ss58_format), Ok(true), "{address}");
        }
    }

    #[test]
    fn fails_when_length_is_invalid() {
        assert!(error_of(validate("y9EMHt34JJo4rWLSaxoLGdYXvjgSXEd4zHUnQgfNzwES8b", None)).contains("address length"));
    }

    #[test]
    fn fails_when_the_checksum_does_not_match() {
        assert!(error_of(validate("5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMa9cj", None)).contains("address checksum"));
        assert!(error_of(validate("5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDwU", None)).contains("address checksum"));
    }

    #[test]
    fn fails_when_invalid_base58_encoded_address_is_found() {
        assert!(error_of(validate("F3opIRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29", None)).contains(
            "Decoding F3opIRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29: Invalid base58 character \"I\" (0x49) at index 4"
        ));
    }
}
