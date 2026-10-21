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

use crate::base::*;
use crate::u8a::{string_to_u8a, u8a_to_string};

fn error_of<T: std::fmt::Debug>(result: crate::Result<T>) -> String {
    result.expect_err("expected an error").message().to_string()
}

const CID_BASE32: &str = "afkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy";
const CID_BASE32_IPFS: &str = "bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy";
const CID_BASE58: &str = "b2rhk6GMPQF3hfzwXTaNYFLKomMeC6UXdUt6jZKPpeVirLtV";
const CID_BASE58_IPFS: &str = "zb2rhk6GMPQF3hfzwXTaNYFLKomMeC6UXdUt6jZKPpeVirLtV";
const MIXED: &str = "aGVsbG8gd29ybGQg0J/RgNC40LLQtdGC0YHRgtCy0YPRjiDQvNC4IOS9oOWlvQ==";

mod base32_decode_spec {
    // Ported from src/base32/decode.spec.ts
    use super::*;

    #[test]
    fn decodes_an_empty_string() {
        assert_eq!(base32_decode("", false).map(|d| u8a_to_string(&d)), Ok(String::new()));
    }

    #[test]
    fn decodes_a_base32() {
        assert_eq!(
            base32_decode("irswgzloorzgc3djpjssazlwmvzhs5dinfxgoijb", false).map(|d| u8a_to_string(&d)),
            Ok("Decentralize everything!!".to_string())
        );
    }

    #[test]
    fn decodes_a_base32_ipfs_compat() {
        assert_eq!(
            base32_decode("birswgzloorzgc3djpjssazlwmvzhs5dinfxgoijb", true).map(|d| u8a_to_string(&d)),
            Ok("Decentralize everything!!".to_string())
        );
    }
}

mod base32_encode_spec {
    // Ported from src/base32/encode.spec.ts
    use super::*;

    #[test]
    fn encodes_to_a_base32() {
        assert_eq!(
            base32_encode("Decentralize everything!!", false),
            "irswgzloorzgc3djpjssazlwmvzhs5dinfxgoijb"
        );
    }

    #[test]
    fn encodes_to_a_base32_ipfs_compat() {
        assert_eq!(
            base32_encode("Decentralize everything!!", true),
            "birswgzloorzgc3djpjssazlwmvzhs5dinfxgoijb"
        );
    }

    #[test]
    fn encodes_a_base58_to_a_base32() {
        let decoded = base58_decode(CID_BASE58_IPFS, true).unwrap_or_default();
        assert_eq!(
            base32_encode(&decoded, true),
            "bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy"
        );
    }
}

mod base32_is_spec {
    // Ported from src/base32/is.spec.ts
    use super::*;

    #[test]
    fn validates_encoded() {
        assert!(is_base32(CID_BASE32, false));
    }

    #[test]
    fn validates_ipfs_compat_encoded() {
        assert!(is_base32(CID_BASE32_IPFS, false));
    }

    #[test]
    fn fails_on_invalid() {
        assert!(!is_base32("not in base32", false));
    }

    #[test]
    fn fails_on_non_ipfs() {
        assert!(!is_base32(CID_BASE32, true));
    }
}

mod base32_validate_spec {
    // Ported from src/base32/validate.spec.ts
    use super::*;

    #[test]
    fn validates_encoded() {
        assert_eq!(base32_validate(CID_BASE32, false), Ok(true));
    }

    #[test]
    fn validates_ipfs_compat_encoded() {
        assert_eq!(base32_validate(CID_BASE32_IPFS, true), Ok(true));
    }

    #[test]
    fn does_not_fail_on_empty() {
        assert_eq!(base32_validate("", false), Ok(true));
    }

    #[test]
    fn fails_on_invalid() {
        assert!(error_of(base32_validate("not in base32", false)).contains("Invalid"));
    }

    #[test]
    fn fails_on_non_ipfs() {
        assert!(error_of(base32_validate(CID_BASE32, true)).contains("Expected"));
    }
}

mod base58_decode_spec {
    // Ported from src/base58/decode.spec.ts
    use super::*;

    #[test]
    fn decodes_an_empty_string() {
        assert_eq!(base58_decode("", false), Ok(Vec::new()));
    }

    #[test]
    fn decodes_a_base58_to_the_base32_bytes() {
        assert_eq!(base58_decode(CID_BASE58, false), base32_decode(CID_BASE32, false));
    }

    #[test]
    fn decodes_a_base58_to_the_base32_bytes_ipfs_compat() {
        assert_eq!(base58_decode(CID_BASE58_IPFS, true), base32_decode(CID_BASE32_IPFS, true));
    }
}

mod base58_encode_spec {
    // Ported from src/base58/encode.spec.ts
    use super::*;

    #[test]
    fn encodes_a_base32_to_a_base58() {
        let bytes = base32_decode(CID_BASE32_IPFS, true).unwrap_or_default();
        assert_eq!(base58_encode(&bytes, false), CID_BASE58);
    }

    #[test]
    fn encodes_a_base32_to_a_base58_ipfs_compat() {
        let bytes = base32_decode(CID_BASE32_IPFS, true).unwrap_or_default();
        assert_eq!(base58_encode(&bytes, true), CID_BASE58_IPFS);
    }
}

mod base58_validate_spec {
    // Ported from src/base58/validate.spec.ts
    use super::*;

    #[test]
    fn validates_encoded() {
        assert_eq!(base58_validate("a1UbyspTdnyZXLUQaQbciCxrCWWxz24kgSwGXSQnkbs", false), Ok(true));
    }

    #[test]
    fn fails_on_string_with_extra_padding() {
        assert!(error_of(base58_validate("a1UbyspTdnyZXLUQaQbciCxrCWWxz24kgSwGXSQnkbs=", false))
            .contains("Invalid base58 character \"=\""));
    }
}

mod base64_decode_spec {
    // Ported from src/base64/decode.spec.ts
    use super::*;

    #[test]
    fn decodes_an_empty_string() {
        assert_eq!(base64_decode("", false), Ok(string_to_u8a("")));
    }

    #[test]
    fn decodes_a_mixed_base64_utf8_string_1() {
        assert_eq!(base64_decode(MIXED, false), Ok(string_to_u8a("hello world Приветствую ми 你好")));
    }

    #[test]
    fn decodes_a_mixed_base64_utf8_string_2() {
        assert_eq!(base64_decode("4pyTIMOgIGxhIG1vZGU=", false), Ok(string_to_u8a("✓ à la mode")));
    }

    #[test]
    fn decodes_a_mixed_base64_utf8_string_3() {
        assert_eq!(base64_decode("SGVsbG8gV29ybGQh", false), Ok(string_to_u8a("Hello World!")));
    }
}

mod base64_encode_spec {
    // Ported from src/base64/encode.spec.ts
    use super::*;

    #[test]
    fn encodes_a_mixed_base64_utf8_string() {
        assert_eq!(base64_encode("hello world Приветствую ми 你好", false), MIXED);
    }
}

mod base64_pad_spec {
    // Ported from src/base64/pad.spec.ts
    use super::*;

    #[test]
    fn pads_a_utf8_string() {
        assert_eq!(base64_pad("YWJjZA"), "YWJjZA==");
    }
}

mod base64_trim_spec {
    // Ported from src/base64/trim.spec.ts
    use super::*;

    #[test]
    fn trims_a_utf8_string() {
        assert_eq!(base64_trim(MIXED), "aGVsbG8gd29ybGQg0J/RgNC40LLQtdGC0YHRgtCy0YPRjiDQvNC4IOS9oOWlvQ");
    }
}

mod base64_validate_spec {
    // Ported from src/base64/validate.spec.ts
    use super::*;

    #[test]
    fn validates_a_mixed_base64_utf8_string() {
        assert!(error_of(base64_validate(
            "aGVsbG8gd29ybGQg0J/RgNC40LLQtd^GC0YHRgtCy0YPRjiDQvNC4IOS9oOWlvQ==",
            false
        ))
        .contains("Invalid base64 character \"^\" (0x5e) at index 30"));
    }

    #[test]
    fn validates_with_one_extra_padding_character() {
        assert_eq!(base64_validate("bGlnaHQgd28=", false), Ok(true));
    }

    #[test]
    fn validates_with_two_extra_padding_characters() {
        assert_eq!(base64_validate("bGlnaHQgdw==", false), Ok(true));
    }

    #[test]
    fn validates_misplaced_padding_characters() {
        assert!(error_of(base64_validate("bGlnaHQgdw=g=", false)).contains("Invalid base64 padding sequence \"=g\""));
    }
}
