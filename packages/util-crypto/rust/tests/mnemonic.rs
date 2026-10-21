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

use super::{testing_vectors, wordlist, wordlists};
use crate::mnemonic::*;
use crate::sr25519::sr25519_from_seed;
use crate::u8a::u8a_to_hex;

const MNEMONIC: &str = "seed sock milk update focus rotate barely fade car face mechanic mercy";
const FRENCH_MNEMONIC: &str = "pompier circuler pulpe injure aspect abyssal nuque boueux equerre balisage pieuvre medecin petit suffixe soleil cumuler monstre arlequin liasse pixel garrigue noble buisson scandale";

mod bip39_spec {
    // Ported from src/mnemonic/bip39.spec.ts
    use super::*;

    const ENTROPY: [u8; 16] = [194, 249, 194, 50, 119, 69, 163, 120, 68, 162, 142, 34, 74, 50, 40, 197];

    #[test]
    fn wordlists_have_the_correct_number_of_words_and_no_empty_words() {
        for (lang, words) in wordlists() {
            assert_eq!(words.len(), 2048, "{lang}");
            assert!(!words.iter().any(|w| w.is_empty() || w.trim() != *w), "{lang}");
        }
    }

    #[test]
    fn english_wordlist_matches_the_ts_wordlist() {
        assert_eq!(english_wordlist().to_vec(), wordlist("english"));
    }

    #[test]
    fn generates_a_known_entropy() {
        assert_eq!(mnemonic_to_entropy(MNEMONIC, None), Ok(ENTROPY.to_vec()));
    }

    #[test]
    fn has_a_two_way_entropy_mnemonic_default_wordlist() {
        let there = entropy_to_mnemonic(&ENTROPY, None).unwrap_or_default();
        let back = mnemonic_to_entropy(&there, None).unwrap_or_default();
        assert_eq!(entropy_to_mnemonic(&back, None), Ok(MNEMONIC.to_string()));
    }

    fn assert_uses_list(test: &str, words: &[&str], length: usize) {
        let split: Vec<&str> = test.split(' ').collect();
        assert_eq!(split.len(), length);
        assert!(split.iter().all(|w| words.contains(w)));
    }

    #[test]
    fn has_a_two_way_entropy_mnemonic_per_language() {
        for (lang, words) in wordlists() {
            let test = entropy_to_mnemonic(&ENTROPY, Some(&words)).unwrap_or_default();
            let entropy = mnemonic_to_entropy(&test, Some(&words));
            assert_uses_list(&test, &words, 12);
            assert_eq!(entropy, Ok(ENTROPY.to_vec()), "{lang}");
            assert_eq!(entropy_to_mnemonic(&ENTROPY, Some(&words)), Ok(test), "{lang}");
        }
    }

    #[test]
    fn generates_a_valid_mnemonic_per_language() {
        for (lang, words) in wordlists() {
            let test = mnemonic_generate(24, Some(&words)).unwrap_or_default();
            assert_uses_list(&test, &words, 24);
            assert!(mnemonic_validate(&test, Some(&words)), "{lang}");
        }
    }
}

mod generate_spec {
    // Ported from src/mnemonic/generate.spec.ts
    use super::*;

    #[test]
    fn generates_a_valid_mnemonic_default_strength() {
        assert!(mnemonic_validate(&mnemonic_generate(12, None).unwrap_or_default(), None));
    }

    #[test]
    fn generates_a_french_mnemonic() {
        let french = wordlist("french");
        let mnemonic = mnemonic_generate(24, Some(&french)).unwrap_or_default();
        let words: Vec<&str> = mnemonic.split(' ').collect();
        assert_eq!(words.len(), 24);
        assert!(mnemonic_validate(&mnemonic, Some(&french)));
        assert!(!mnemonic_validate(&mnemonic, None));
        assert!(words.iter().all(|w| french.contains(w)));
    }

    #[test]
    fn generates_a_valid_mnemonic_for_each_length() {
        for num in [12, 15, 18, 21, 24] {
            let mnemonic = mnemonic_generate(num, None).unwrap_or_default();
            assert_eq!(mnemonic.split(' ').count(), num);
            assert!(mnemonic_validate(&mnemonic, None));
        }
    }

    #[test]
    fn generates_non_deterministic() {
        let m1 = mnemonic_generate(24, None).unwrap_or_default();
        let m2 = mnemonic_generate(24, None).unwrap_or_default();
        assert_ne!(m1, m2);
        assert!(mnemonic_validate(&m1, None));
        assert!(mnemonic_validate(&m2, None));
    }
}

mod to_entropy_spec {
    // Ported from src/mnemonic/toEntropy.spec.ts
    use super::*;

    #[test]
    fn creates_correct_entropy_for_the_known_vectors() {
        for (index, [mnemonic, entropy, _, _]) in testing_vectors().into_iter().enumerate() {
            assert_eq!(
                mnemonic_to_entropy(mnemonic, None).map(|e| u8a_to_hex(&e)),
                Ok(entropy.to_string()),
                "{index}"
            );
        }
    }

    #[test]
    fn has_the_correct_entropy_for_non_english_mnemonics() {
        assert!(mnemonic_to_entropy(FRENCH_MNEMONIC, None).is_err());
        assert_eq!(
            mnemonic_to_entropy(FRENCH_MNEMONIC, Some(&wordlist("french"))),
            Ok(vec![
                189, 230, 55, 17, 65, 33, 40, 4, 106, 9, 11, 88, 227, 26, 229, 76, 59, 123, 200, 55,
                177, 232, 158, 66, 34, 54, 93, 54, 255, 74, 137, 70,
            ])
        );
    }
}

mod to_legacy_seed_spec {
    // Ported from src/mnemonic/toLegacySeed.spec.ts
    use super::*;

    const SEED_32: &str = "0x3c121e20de068083b49c2315697fb59a2d9e8643c24e5ea7628132c58969a027";
    const SEED_64: &str = "0x3c121e20de068083b49c2315697fb59a2d9e8643c24e5ea7628132c58969a0275693dd5bd9d4cc9e648475eba9613ed4678f4d62560a9c42f75bac04022ded25";

    #[test]
    fn is_deterministic_for_each_password() {
        for password in ["", "foo", "bar"] {
            assert_eq!(
                mnemonic_to_legacy_seed(MNEMONIC, password, 32),
                mnemonic_to_legacy_seed(MNEMONIC, password, 32)
            );
        }
    }

    #[test]
    fn generates_a_valid_64_byte_seed() {
        assert_eq!(
            mnemonic_to_legacy_seed(MNEMONIC, "", 64).map(|s| u8a_to_hex(&s)),
            Ok(SEED_64.to_string())
        );
    }

    #[test]
    fn generates_a_valid_32_byte_seed() {
        assert_eq!(
            mnemonic_to_legacy_seed(MNEMONIC, "", 32).map(|s| u8a_to_hex(&s)),
            Ok(SEED_32.to_string())
        );
    }

    #[test]
    fn fails_with_non_mnemonics() {
        let error = mnemonic_to_legacy_seed("foo bar baz", "", 32).expect_err("invalid");
        assert!(error.message().contains("mnemonic specified"));
    }
}

mod to_mini_secret_spec {
    // Ported from src/mnemonic/toMiniSecret.spec.ts
    use super::*;

    const SEED: &str = "0x4d1ab2a57929edfd018aaa974e62ed557e3f54b4104acabedf73c8f5a1dbb029";

    #[test]
    fn is_deterministic_for_each_password() {
        for password in ["", "foo", "bar"] {
            assert_eq!(
                mnemonic_to_mini_secret(MNEMONIC, password, None),
                mnemonic_to_mini_secret(MNEMONIC, password, None)
            );
        }
    }

    #[test]
    fn rejects_a_non_english_mnemonic_with_the_default_wordlist() {
        let mnemonic = "ᄋ ᄂ ᄉ ᄑ ᄇ ᄉ ᄑ ᄃ ᄃ ᄋ ᄉ ᄆ ᄃ ᄋ ᄉ ᄉ ᄂ ᄀ ᄋ ᄐ ᄃ ᄀ ᄀ ᄀ";
        assert!(mnemonic_to_mini_secret(mnemonic, "testing", None).is_err());
    }

    #[test]
    fn generates_a_valid_seed() {
        assert_eq!(
            mnemonic_to_mini_secret(MNEMONIC, "", None).map(|s| u8a_to_hex(&s)),
            Ok(SEED.to_string())
        );
    }

    #[test]
    fn fails_with_non_mnemonics() {
        let error = mnemonic_to_mini_secret("foo bar baz", "", None).expect_err("invalid");
        assert!(error.message().contains("mnemonic specified"));
    }

    #[test]
    fn creates_correct_seeds_for_the_known_vectors() {
        for (index, [mnemonic, _, seed, _]) in testing_vectors().into_iter().enumerate() {
            assert_eq!(
                mnemonic_to_mini_secret(mnemonic, "Substrate", None).map(|s| u8a_to_hex(&s)),
                Ok(seed[..66].to_string()),
                "{index}"
            );
        }
    }
}

mod to_mini_secret_cmp_spec {
    // Ported from src/mnemonic/toMiniSecretCmp.spec.ts
    use super::*;

    #[test]
    fn mini_secret_and_keypair_are_stable_for_a_generated_mnemonic() {
        let mnemonic = mnemonic_generate(12, None).unwrap_or_default();
        let mini_secret = mnemonic_to_mini_secret(&mnemonic, "", None).unwrap_or_default();
        let public = sr25519_from_seed(&mini_secret).map(|p| p.public_key);
        let test_mini = mnemonic_to_mini_secret(&mnemonic, "", None).unwrap_or_default();
        assert_eq!(mini_secret, test_mini);
        assert_eq!(public, sr25519_from_seed(&test_mini).map(|p| p.public_key));
    }
}

mod validate_spec {
    // Ported from src/mnemonic/validate.spec.ts
    use super::*;

    #[test]
    fn returns_true_on_valid() {
        assert!(mnemonic_validate(MNEMONIC, None));
    }

    #[test]
    fn returns_false_on_invalid() {
        assert!(!mnemonic_validate(
            "wine photo extra cushion basket dwarf humor cloud truck job boat submit",
            None
        ));
    }

    #[test]
    fn rejects_a_french_mnemonic_with_the_default_wordlist() {
        assert!(!mnemonic_validate(FRENCH_MNEMONIC, None));
    }
}
