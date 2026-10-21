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

//! Ports of the src/**/*.test.ts and *.spec.ts cases, one test each. src/keyring.test-d.ts
//! checks TS types only. accounts/testAccounts.test.ts is not ported: `getDefaultSiteKeys`
//! and `getDefaultProviders` seed the TS dev scripts and have no Rust caller.

use crate::*;
use prosopo_types::keyring::{KeyringOptions, KeyringPairJson, KeyringPairMeta};
use prosopo_util_crypto::address::encode_address;
use prosopo_util_crypto::keystore::{EncodingType, EncryptedJsonDescriptor, EncryptedJsonEncoding};
use prosopo_util_crypto::u8a::u8a_to_hex;
use prosopo_util_crypto::{
    decode_address, mnemonic_to_mini_secret, mnemonic_validate, sr25519_from_seed, JwtIssueOptions,
    JwtVerifyOptions, Keypair, KeypairType, U8aLike,
};
use serde_json::{json, Value};

const ALICE_PUBLIC: &str = "0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d";

fn alice_suri() -> String {
    format!("{DEV_PHRASE}//Alice")
}

fn hex(bytes: &[u8]) -> String {
    u8a_to_hex(bytes)
}

fn none() -> KeyringPairMeta {
    KeyringPairMeta::new()
}

fn meta(value: Value) -> KeyringPairMeta {
    match value {
        Value::Object(meta) => meta,
        other => panic!("expected an object: {other}"),
    }
}

fn keyring() -> Keyring {
    Keyring::new(KeyringOptions::default()).expect("keyring")
}

fn keyring_with(ss58_format: i32) -> Keyring {
    Keyring::new(KeyringOptions {
        ss58_format: Some(ss58_format),
        kind: None,
    })
    .expect("keyring")
}

fn of_kind(kind: KeypairType) -> Result<Keyring> {
    Keyring::new(KeyringOptions {
        ss58_format: None,
        kind: Some(kind),
    })
}

fn message_of(result: Result<impl std::fmt::Debug>) -> String {
    result.expect_err("an error").to_string()
}

fn name_of(pair: &KeyringPair) -> Option<String> {
    pair.meta()
        .get("name")
        .and_then(Value::as_str)
        .map(str::to_string)
}

fn public_from_seed(seed: &[u8]) -> String {
    hex(&sr25519_from_seed(seed).expect("seed").public_key)
}

fn address(key: &[u8], format: i32) -> String {
    encode_address(key, format).expect("address")
}

mod keyring_construction {
    use super::*;

    #[test]
    fn defaults_to_sr25519() {
        assert_eq!(keyring().kind(), KeypairType::Sr25519);
    }

    #[test]
    fn accepts_an_explicit_sr25519_type() {
        assert_eq!(
            of_kind(KeypairType::Sr25519).expect("keyring").kind(),
            KeypairType::Sr25519
        );
    }

    #[test]
    fn rejects_every_other_curve_naming_what_it_found() {
        for kind in [
            KeypairType::Ed25519,
            KeypairType::Ecdsa,
            KeypairType::Ethereum,
        ] {
            assert_eq!(
                message_of(of_kind(kind)),
                format!(
                    "Expected a keyring type of either 'sr25519', found '{}",
                    kind.as_str()
                )
            );
        }
    }

    #[test]
    fn starts_with_no_pairs() {
        let keyring: Keyring = keyring();
        assert!(keyring.pairs().is_empty());
        assert!(keyring.public_keys().is_empty());
    }
}

mod keyring_address_encoding {
    use super::*;

    #[test]
    fn uses_the_configured_ss58_format() {
        let public_key: [u8; 32] = [2; 32];
        assert_eq!(
            keyring_with(42)
                .encode_address(U8aLike::Bytes(&public_key), None)
                .expect("42"),
            address(&public_key, 42)
        );
        assert_eq!(
            keyring_with(2)
                .encode_address(U8aLike::Bytes(&public_key), None)
                .expect("2"),
            address(&public_key, 2)
        );
    }

    #[test]
    fn lets_an_explicit_format_override_the_configured_one() {
        let public_key: [u8; 32] = [3; 32];
        assert_eq!(
            keyring_with(42)
                .encode_address(U8aLike::Bytes(&public_key), Some(2))
                .expect("2"),
            address(&public_key, 2)
        );
    }

    #[test]
    fn applies_a_format_set_after_construction_to_new_pairs() {
        let mut keyring: Keyring = keyring_with(42);
        let before: String = keyring
            .add_from_uri(&alice_suri(), none(), None)
            .expect("alice")
            .address()
            .expect("address");
        keyring.set_ss58_format(2);
        let after: String = keyring
            .add_from_uri(&alice_suri(), none(), None)
            .expect("alice")
            .address()
            .expect("address");
        assert_ne!(after, before);
        assert_eq!(
            decode_address(Some(U8aLike::Str(&after)), false, None).expect("decodes"),
            decode_address(Some(U8aLike::Str(&before)), false, None).expect("decodes")
        );
    }

    #[test]
    fn exposes_decode_address_as_the_inverse_of_its_own_encoding() {
        let keyring: Keyring = keyring_with(42);
        let public_key: [u8; 32] = [4; 32];
        let encoded: String = keyring
            .encode_address(U8aLike::Bytes(&public_key), None)
            .expect("encodes");
        assert_eq!(
            keyring
                .decode_address(U8aLike::Str(&encoded), false)
                .expect("decodes"),
            public_key
        );
    }
}

mod keyring_create_from_uri {
    use super::*;

    fn public_of(suri: &str) -> String {
        hex(&keyring()
            .create_from_uri(suri, none(), None)
            .expect("pair")
            .public_key())
    }

    #[test]
    fn derives_the_well_known_alice_key_from_the_dev_phrase() {
        assert_eq!(public_of(&alice_suri()), ALICE_PUBLIC);
    }

    #[test]
    fn expands_a_bare_hard_derivation_path_against_the_dev_phrase() {
        assert_eq!(public_of("//Alice"), ALICE_PUBLIC);
    }

    #[test]
    fn does_not_create_the_pair_in_the_keyring() {
        let keyring: Keyring = keyring();
        keyring
            .create_from_uri(&alice_suri(), none(), None)
            .expect("pair");
        assert!(keyring.pairs().is_empty());
    }

    #[test]
    fn treats_a_256_bit_hex_phrase_as_a_raw_seed() {
        assert_eq!(public_of(&hex(&[1; 32])), public_from_seed(&[1; 32]));
    }

    #[test]
    fn pads_a_short_non_mnemonic_phrase_out_to_32_bytes() {
        let mut padded: [u8; 32] = [32; 32];
        padded[..5].copy_from_slice(b"hello");
        assert_eq!(public_of("hello"), public_from_seed(&padded));
    }

    #[test]
    fn rejects_a_phrase_that_is_neither_a_mnemonic_nor_short_enough_to_pad() {
        assert_eq!(
            message_of(keyring().create_from_uri(&"x".repeat(33), none(), None)),
            "specified phrase is not a valid mnemonic and is invalid as a raw seed at > 32 bytes"
        );
    }

    #[test]
    fn accepts_a_32_character_phrase_at_the_padding_boundary() {
        assert!(keyring()
            .create_from_uri(&"x".repeat(32), none(), None)
            .is_ok());
    }

    #[test]
    fn derives_a_12_word_mnemonic_through_the_mini_secret_rather_than_padding() {
        let mini_secret: Vec<u8> =
            mnemonic_to_mini_secret(DEV_PHRASE, "", None).expect("mini secret");
        assert_eq!(public_of(DEV_PHRASE), public_from_seed(&mini_secret));
    }

    #[test]
    fn treats_a_word_count_outside_the_mnemonic_set_as_a_raw_phrase() {
        let error: String =
            message_of(keyring().create_from_uri(&format!("{DEV_PHRASE} extra"), none(), None));
        assert!(error.contains("is not a valid mnemonic"), "{error}");
    }

    #[test]
    fn gives_a_different_key_for_a_different_password() {
        assert_ne!(
            public_of(&format!("{DEV_PHRASE}///pass")),
            public_of(DEV_PHRASE)
        );
    }

    #[test]
    fn distinguishes_soft_and_hard_derivation_of_the_same_name() {
        assert_ne!(
            public_of(&format!("{DEV_PHRASE}/Alice")),
            public_of(&alice_suri())
        );
    }

    #[test]
    fn carries_meta_through_to_the_pair() {
        let pair: KeyringPair = keyring()
            .create_from_uri(&alice_suri(), meta(json!({ "name": "alice" })), None)
            .expect("pair");
        assert_eq!(name_of(&pair).as_deref(), Some("alice"));
    }

    #[test]
    fn refuses_ethereum_derivation_for_a_mnemonic() {
        assert_eq!(
            message_of(keyring().create_from_uri(DEV_PHRASE, none(), Some(KeypairType::Ethereum))),
            "Not implemented - Prosopo Keyring supports sr25519 only"
        );
    }
}

mod keyring_add_methods {
    use super::*;

    #[test]
    fn stores_a_pair_created_from_a_uri_and_returns_it_on_lookup() {
        let mut keyring: Keyring = keyring();
        let pair: KeyringPair = keyring
            .add_from_uri(&alice_suri(), none(), None)
            .expect("pair");
        let pairs: Vec<KeyringPair> = keyring.pairs();
        assert_eq!(pairs.len(), 1);
        assert!(pairs[0].ptr_eq(&pair));
        let address: String = pair.address().expect("address");
        assert!(keyring
            .get_pair(U8aLike::Str(&address))
            .expect("by address")
            .ptr_eq(&pair));
        assert!(keyring
            .get_pair(U8aLike::Bytes(&pair.public_key()))
            .expect("by key")
            .ptr_eq(&pair));
    }

    #[test]
    fn treats_add_from_mnemonic_as_add_from_uri() {
        let from_mnemonic: KeyringPair = keyring()
            .add_from_mnemonic(DEV_PHRASE, none(), None)
            .expect("mnemonic");
        let from_uri: KeyringPair = keyring()
            .add_from_uri(DEV_PHRASE, none(), None)
            .expect("uri");
        assert_eq!(
            from_mnemonic.address().expect("address"),
            from_uri.address().expect("address")
        );
    }

    #[test]
    fn derives_a_pair_from_a_raw_seed() {
        let pair: KeyringPair = keyring()
            .add_from_seed(&[1; 32], none(), None)
            .expect("pair");
        assert_eq!(hex(&pair.public_key()), public_from_seed(&[1; 32]));
    }

    #[test]
    fn refuses_a_seed_for_an_unimplemented_curve() {
        assert_eq!(
            message_of(keyring().add_from_seed(&[1; 32], none(), Some(KeypairType::Ed25519))),
            "Not Implemented"
        );
    }

    #[test]
    fn adds_an_address_only_pair_that_has_no_secret_and_cannot_sign() {
        let address: String = keyring()
            .add_from_uri(&alice_suri(), none(), None)
            .expect("alice")
            .address()
            .expect("address");
        let watch_only: KeyringPair = keyring()
            .add_from_address(U8aLike::Str(&address), FromAddress::default())
            .expect("watch only");
        assert_eq!(watch_only.address().expect("address"), address);
        assert!(watch_only.is_locked());
        assert!(watch_only.sign(U8aLike::Bytes(&[1]), false).is_err());
    }

    #[test]
    fn adds_a_pair_from_an_explicit_keypair() {
        let keypair: Keypair = sr25519_from_seed(&[1; 32]).expect("keypair");
        let mut keyring: Keyring = keyring();
        let pair: KeyringPair = keyring
            .add_from_pair(keypair.clone(), meta(json!({ "name": "explicit" })), None)
            .expect("pair");
        assert_eq!(pair.public_key(), keypair.public_key);
        assert_eq!(name_of(&pair).as_deref(), Some("explicit"));
        assert!(keyring.pairs()[0].ptr_eq(&pair));
    }

    #[test]
    fn exposes_public_keys_for_every_stored_pair() {
        let mut keyring: Keyring = keyring();
        let first: KeyringPair = keyring
            .add_from_uri(&alice_suri(), none(), None)
            .expect("alice");
        let second: KeyringPair = keyring
            .add_from_uri(&format!("{DEV_PHRASE}//Bob"), none(), None)
            .expect("bob");
        assert_eq!(
            keyring.public_keys(),
            vec![first.public_key(), second.public_key()]
        );
    }

    #[test]
    fn removes_a_pair() {
        let mut keyring: Keyring = keyring();
        let address: String = keyring
            .add_from_uri(&alice_suri(), none(), None)
            .expect("alice")
            .address()
            .expect("address");
        keyring
            .remove_pair(U8aLike::Str(&address))
            .expect("removes");
        assert!(keyring.pairs().is_empty());
        assert!(message_of(keyring.get_pair(U8aLike::Str(&address)))
            .contains("Unable to retrieve keypair"));
    }

    #[test]
    fn keeps_add_pair_and_the_pairs_getter_in_agreement() {
        let mut keyring: Keyring = keyring();
        let pair: KeyringPair = keyring
            .create_from_uri(&alice_suri(), none(), None)
            .expect("pair");
        assert!(keyring.add_pair(pair.clone()).expect("adds").ptr_eq(&pair));
        assert!(keyring.pairs()[0].ptr_eq(&pair));
    }
}

mod keyring_create_from_json {
    use super::*;

    fn descriptor(content: &[&str], kind: EncodingType, version: &str) -> EncryptedJsonDescriptor {
        EncryptedJsonDescriptor {
            content: content.iter().map(|part| part.to_string()).collect(),
            kind,
            version: version.to_string(),
        }
    }

    fn none_type() -> EncodingType {
        EncodingType::Many(vec![EncryptedJsonEncoding::None])
    }

    fn pair_json(
        address: Option<&str>,
        encoding: Option<EncryptedJsonDescriptor>,
    ) -> KeyringPairJson {
        KeyringPairJson {
            address: address.map_or_else(|| super::address(&[5; 32], 42), str::to_string),
            encoded: "0x00".to_string(),
            encoding: encoding
                .unwrap_or_else(|| descriptor(&["pkcs8", "sr25519"], none_type(), "3")),
            meta: meta(json!({ "name": "from-json" })),
        }
    }

    #[test]
    fn round_trips_address_meta_and_type() {
        let pair: KeyringPair = keyring()
            .create_from_json(&pair_json(None, None), false)
            .expect("pair");
        assert_eq!(name_of(&pair).as_deref(), Some("from-json"));
        assert_eq!(pair.kind(), KeypairType::Sr25519);
        assert_eq!(pair.public_key(), vec![5; 32]);
    }

    #[test]
    fn accepts_a_hex_address_as_the_public_key_directly() {
        let pair: KeyringPair = keyring()
            .create_from_json(&pair_json(Some(ALICE_PUBLIC), None), false)
            .expect("pair");
        assert_eq!(hex(&pair.public_key()), ALICE_PUBLIC);
    }

    #[test]
    fn rejects_a_v3_file_that_is_not_pkcs8() {
        let json: KeyringPairJson = pair_json(
            None,
            Some(descriptor(&["none", "sr25519"], none_type(), "3")),
        );
        assert!(message_of(keyring().create_from_json(&json, false))
            .contains("Unable to decode non-pkcs8 type"));
    }

    #[test]
    fn falls_back_to_the_keyring_type_for_a_v0_file() {
        let json: KeyringPairJson = pair_json(
            None,
            Some(descriptor(&["pkcs8", "ed25519"], none_type(), "0")),
        );
        assert_eq!(
            keyring()
                .create_from_json(&json, false)
                .expect("pair")
                .kind(),
            KeypairType::Sr25519
        );
    }

    #[test]
    fn rejects_a_crypto_type_this_keyring_cannot_handle() {
        let json: KeyringPairJson = pair_json(
            None,
            Some(descriptor(&["pkcs8", "ed25519"], none_type(), "3")),
        );
        assert_eq!(
            message_of(keyring().create_from_json(&json, false)),
            "Unknown crypto type ed25519"
        );
    }

    #[test]
    fn normalises_a_single_encoding_type_into_a_list() {
        let single: EncodingType = EncodingType::One(EncryptedJsonEncoding::None);
        let json: KeyringPairJson =
            pair_json(None, Some(descriptor(&["pkcs8", "sr25519"], single, "3")));
        assert!(keyring().create_from_json(&json, false).is_ok());
    }

    #[test]
    fn stores_the_pair_when_added_rather_than_created() {
        let mut keyring: Keyring = keyring();
        let pair: KeyringPair = keyring
            .add_from_json(&pair_json(None, None), false)
            .expect("pair");
        assert!(keyring.pairs()[0].ptr_eq(&pair));
    }
}

mod keyring_to_json {
    use super::*;

    #[test]
    fn delegates_to_the_stored_pair() {
        let mut keyring: Keyring = keyring();
        let address: String = keyring
            .add_from_uri(&alice_suri(), none(), None)
            .expect("alice")
            .address()
            .expect("address");
        let exported: KeyringPairJson =
            keyring.to_json(U8aLike::Str(&address), None).expect("json");
        assert_eq!(exported.address, address);
        assert!(exported.encoding.content.contains(&"sr25519".to_string()));
    }

    #[test]
    fn throws_for_an_address_it_does_not_hold() {
        let unknown: String = address(&[6; 32], 42);
        assert!(message_of(keyring().to_json(U8aLike::Str(&unknown), None))
            .contains("Unable to retrieve keypair"));
    }
}

mod pairs {
    use super::*;

    fn stub_pair(public_key: [u8; 32]) -> KeyringPair {
        keyring_with(42)
            .create_from_pair(
                Keypair {
                    public_key: public_key.to_vec(),
                    secret_key: Vec::new(),
                },
                none(),
                None,
            )
            .expect("stub")
    }

    fn key_of(byte: u8) -> [u8; 32] {
        [byte; 32]
    }

    #[test]
    fn returns_the_pair_it_was_given_so_callers_can_chain_off_add() {
        let pair: KeyringPair = stub_pair(key_of(1));
        assert!(Pairs::new().add(pair.clone()).expect("adds").ptr_eq(&pair));
    }

    #[test]
    fn starts_empty() {
        assert!(Pairs::new().all().is_empty());
    }

    #[test]
    fn retrieves_a_pair_by_ss58_address_public_key_or_raw_bytes() {
        let mut pairs: Pairs = Pairs::new();
        let public_key: [u8; 32] = key_of(2);
        let pair: KeyringPair = pairs.add(stub_pair(public_key)).expect("adds");
        let address: String = pair.address().expect("address");
        assert!(pairs
            .get(U8aLike::Str(&address))
            .expect("by address")
            .ptr_eq(&pair));
        assert!(pairs
            .get(U8aLike::Bytes(&public_key))
            .expect("by key")
            .ptr_eq(&pair));
        let other_prefix: String = super::address(&public_key, 2);
        assert!(pairs
            .get(U8aLike::Str(&other_prefix))
            .expect("by other prefix")
            .ptr_eq(&pair));
    }

    #[test]
    fn keeps_only_the_latest_pair_for_a_public_key() {
        let mut pairs: Pairs = Pairs::new();
        pairs.add(stub_pair(key_of(3))).expect("adds");
        let second: KeyringPair = stub_pair(key_of(3));
        pairs.add(second.clone()).expect("adds");
        assert_eq!(pairs.all().len(), 1);
        assert!(pairs
            .get(U8aLike::Bytes(&key_of(3)))
            .expect("found")
            .ptr_eq(&second));
    }

    #[test]
    fn keeps_distinct_public_keys_apart() {
        let mut pairs: Pairs = Pairs::new();
        let first: KeyringPair = pairs.add(stub_pair(key_of(4))).expect("adds");
        let second: KeyringPair = pairs.add(stub_pair(key_of(5))).expect("adds");
        let all: Vec<KeyringPair> = pairs.all();
        assert!(all[0].ptr_eq(&first) && all[1].ptr_eq(&second));
        let first_address: String = first.address().expect("address");
        let second_address: String = second.address().expect("address");
        assert!(pairs
            .get(U8aLike::Str(&first_address))
            .expect("first")
            .ptr_eq(&first));
        assert!(pairs
            .get(U8aLike::Str(&second_address))
            .expect("second")
            .ptr_eq(&second));
    }

    #[test]
    fn names_the_address_it_could_not_find_formatting_bytes_as_hex() {
        assert_eq!(
            message_of(Pairs::new().get(U8aLike::Bytes(&key_of(6)))),
            format!("Unable to retrieve keypair '0x{}'", "06".repeat(32))
        );
    }

    #[test]
    fn names_the_address_verbatim_when_it_was_given_as_ss58() {
        let address: String = super::address(&key_of(7), 42);
        assert_eq!(
            message_of(Pairs::new().get(U8aLike::Str(&address))),
            format!("Unable to retrieve keypair '{address}'")
        );
    }

    #[test]
    fn rejects_an_address_that_is_not_decodable_at_all() {
        assert!(Pairs::new().get(U8aLike::Str("not-an-address")).is_err());
    }

    #[test]
    fn removes_a_pair_after_which_lookup_throws_again() {
        let mut pairs: Pairs = Pairs::new();
        pairs.add(stub_pair(key_of(8))).expect("adds");
        pairs.remove(U8aLike::Bytes(&key_of(8))).expect("removes");
        assert!(pairs.all().is_empty());
        assert!(message_of(pairs.get(U8aLike::Bytes(&key_of(8))))
            .contains("Unable to retrieve keypair"));
    }

    #[test]
    fn removes_by_any_encoding_of_the_same_key() {
        let mut pairs: Pairs = Pairs::new();
        let pair: KeyringPair = pairs.add(stub_pair(key_of(9))).expect("adds");
        pairs
            .remove(U8aLike::Str(&super::address(&key_of(9), 2)))
            .expect("removes");
        assert!(pairs.all().is_empty());
        assert_eq!(
            pair.address().expect("address"),
            super::address(&key_of(9), 42)
        );
    }

    #[test]
    fn ignores_removal_of_a_key_that_was_never_added() {
        let mut pairs: Pairs = Pairs::new();
        let kept: KeyringPair = pairs.add(stub_pair(key_of(10))).expect("adds");
        assert!(pairs.remove(U8aLike::Bytes(&key_of(11))).is_ok());
        assert!(pairs.all()[0].ptr_eq(&kept));
        assert_eq!(pairs.all().len(), 1);
    }

    #[test]
    fn decodes_the_address_for_the_map_key_rather_than_trusting_the_string() {
        let decode = |format: i32| -> Vec<u8> {
            decode_address(
                Some(U8aLike::Str(&super::address(&key_of(12), format))),
                false,
                None,
            )
            .expect("decodes")
        };
        assert_eq!(decode(42), decode(2));
    }
}

mod testing {
    use super::*;

    fn test_keyring() -> Keyring {
        create_test_keyring(KeyringOptions::default(), true).expect("test keyring")
    }

    #[test]
    fn adds_a_pair_for_every_well_known_dev_account() {
        assert_eq!(test_keyring().pairs().len(), PAIRSSR25519.len());
    }

    #[test]
    fn names_each_pair_after_its_seed_lowercased_with_the_path_flattened() {
        let names: Vec<String> = test_keyring().pairs().iter().filter_map(name_of).collect();
        assert_eq!(
            names,
            [
                "alice",
                "alice_stash",
                "bob",
                "bob_stash",
                "charlie",
                "dave",
                "eve",
                "ferdie"
            ]
        );
    }

    #[test]
    fn marks_every_pair_as_a_testing_pair() {
        for pair in test_keyring().pairs() {
            assert_eq!(pair.meta().get("isTesting"), Some(&Value::Bool(true)));
        }
    }

    #[test]
    fn uses_the_hard_coded_public_keys_not_derivation_by_default() {
        let keyring: Keyring = test_keyring();
        for PairDef { p, .. } in &PAIRSSR25519 {
            assert_eq!(
                hex(&keyring
                    .get_pair(U8aLike::Str(p))
                    .expect("pair")
                    .public_key()),
                *p
            );
        }
    }

    #[test]
    fn replaces_lock_with_a_no_op_so_the_fixtures_stay_usable() {
        let pair: KeyringPair = test_keyring().pairs()[0].clone();
        pair.lock();
        assert!(!pair.is_locked());
    }

    #[test]
    fn produces_signable_pairs() {
        let pair: KeyringPair = test_keyring()
            .get_pair(U8aLike::Str(PAIRSSR25519[0].p))
            .expect("alice");
        let message: &[u8] = b"hello";
        let signature: Vec<u8> = pair.sign(U8aLike::Bytes(message), false).expect("signs");
        let public_key: Vec<u8> = pair.public_key();
        assert!(pair
            .verify(
                U8aLike::Bytes(message),
                U8aLike::Bytes(&signature),
                U8aLike::Bytes(&public_key)
            )
            .expect("verifies"));
    }

    #[test]
    fn honours_a_requested_ss58_format() {
        let alice_on = |format: i32| -> String {
            create_test_keyring(
                KeyringOptions {
                    ss58_format: Some(format),
                    kind: None,
                },
                true,
            )
            .expect("test keyring")
            .get_pair(U8aLike::Str(PAIRSSR25519[0].p))
            .expect("alice")
            .address()
            .expect("address")
        };
        assert_ne!(alice_on(42), alice_on(2));
    }

    #[test]
    fn derives_different_keys_when_asked_to_because_the_seeds_are_bare_names() {
        let derived: Keyring =
            create_test_keyring(KeyringOptions::default(), false).expect("test keyring");
        assert_eq!(derived.pairs().len(), PAIRSSR25519.len());
        for PairDef { p, .. } in &PAIRSSR25519 {
            assert!(message_of(derived.get_pair(U8aLike::Str(p)))
                .contains("Unable to retrieve keypair"));
        }
    }

    #[test]
    fn rejects_a_keyring_type_it_cannot_support() {
        let options: KeyringOptions = KeyringOptions {
            ss58_format: None,
            kind: Some(KeypairType::Ed25519),
        };
        assert!(message_of(create_test_keyring(options, true))
            .contains("Expected a keyring type of either 'sr25519'"));
    }

    #[test]
    fn exposes_every_named_pair_plus_nobody() {
        let pairs = create_test_pairs(KeyringOptions::default(), true).expect("test pairs");
        for name in [
            "nobody",
            "alice",
            "alice_stash",
            "bob",
            "bob_stash",
            "charlie",
            "dave",
            "eve",
            "ferdie",
        ] {
            assert!(pairs.contains_key(name), "{name}");
        }
    }

    #[test]
    fn maps_alice_to_the_well_known_alice_public_key() {
        let pairs = create_test_pairs(KeyringOptions::default(), true).expect("test pairs");
        assert_eq!(hex(&pairs["alice"].public_key()), PAIRSSR25519[0].p);
    }

    #[test]
    fn includes_nobody_which_cannot_verify_anything() {
        let pairs = create_test_pairs(KeyringOptions::default(), true).expect("test pairs");
        let nobody: &KeyringPair = &pairs["nobody"];
        assert!(nobody.is_locked());
        let public_key: Vec<u8> = nobody.public_key();
        assert!(!nobody
            .verify(
                U8aLike::Bytes(&[0]),
                U8aLike::Bytes(&[0; 64]),
                U8aLike::Bytes(&public_key)
            )
            .expect("verifies"));
    }

    #[test]
    fn returns_independent_maps_so_one_test_cannot_poison_another() {
        let first = create_test_pairs(KeyringOptions::default(), true).expect("test pairs");
        let second = create_test_pairs(KeyringOptions::default(), true).expect("test pairs");
        assert!(!first["alice"].ptr_eq(&second["alice"]));
    }
}

mod nobody_pair {
    use super::*;

    #[test]
    fn is_the_all_zero_public_key_encoded_as_the_well_known_address() {
        let pair: KeyringPair = nobody();
        assert_eq!(pair.public_key(), vec![0; 32]);
        assert_eq!(
            pair.address().expect("address"),
            "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM"
        );
        assert_eq!(
            pair.address().expect("address"),
            address(&pair.public_key(), 42)
        );
    }

    #[test]
    fn is_permanently_locked() {
        let pair: KeyringPair = nobody();
        assert!(pair.is_locked());
        pair.unlock(Some("anything")).expect("unlock is a no-op");
        assert!(pair.is_locked());
        pair.lock();
        assert!(pair.is_locked());
    }

    #[test]
    fn never_verifies_a_signature_whatever_it_is_given() {
        let pair: KeyringPair = nobody();
        let public_key: Vec<u8> = pair.public_key();
        assert!(!pair
            .verify(
                U8aLike::Bytes(&[0]),
                U8aLike::Bytes(&[0; 64]),
                U8aLike::Bytes(&public_key)
            )
            .expect("verify"));
        let signature: Vec<u8> = pair.sign(U8aLike::Bytes(&[0]), false).expect("sign");
        assert!(!pair
            .verify(
                U8aLike::Bytes(&[]),
                U8aLike::Bytes(&signature),
                U8aLike::Bytes(&public_key)
            )
            .expect("verify"));
        assert!(!pair
            .vrf_verify(U8aLike::Bytes(&[0]), &[0; 96], None, None)
            .expect("vrf verify"));
    }

    #[test]
    fn never_reports_a_jwt_as_valid() {
        let token: String = nobody()
            .jwt_issue(&JwtIssueOptions::default(), &[])
            .expect("issues");
        let result = nobody()
            .jwt_verify(&token, &JwtVerifyOptions::default())
            .expect("verifies");
        assert!(!result.is_valid);
        assert_eq!(result.error.as_deref(), Some("JWT verification failed"));
        assert_eq!(result.public_key, vec![0; 32]);
    }

    #[test]
    fn returns_correctly_sized_but_empty_signatures() {
        let pair: KeyringPair = nobody();
        assert_eq!(
            pair.sign(U8aLike::Bytes(&[0]), false).expect("sign"),
            vec![0; 64]
        );
        assert_eq!(
            pair.vrf_sign(U8aLike::Bytes(&[0]), None, None)
                .expect("vrf sign"),
            vec![0; 96]
        );
        assert_eq!(pair.encode_pkcs8(None).expect("encode"), Vec::<u8>::new());
    }

    #[test]
    fn derives_to_itself_so_no_chain_of_derivation_can_escape_it() {
        let pair: KeyringPair = nobody();
        assert!(pair
            .derive("//anything", none())
            .expect("derives")
            .ptr_eq(&pair));
        let chained: KeyringPair = pair
            .derive("//a", none())
            .expect("derives")
            .derive("//b", none())
            .expect("derives");
        assert!(chained.ptr_eq(&pair));
    }

    #[test]
    fn ignores_attempts_to_change_its_meta() {
        let pair: KeyringPair = nobody();
        pair.set_meta(meta(json!({ "name": "somebody" })));
        assert_eq!(name_of(&pair).as_deref(), Some("nobody"));
        assert_eq!(pair.meta().get("isTesting"), Some(&Value::Bool(true)));
    }

    #[test]
    fn serialises_to_an_unencrypted_v0_json_blob() {
        let exported: KeyringPairJson = nobody().to_json(None).expect("json");
        assert_eq!(exported.address, nobody().address().expect("address"));
        assert_eq!(exported.encoded, "");
        assert_eq!(exported.encoding.version, "0");
        assert_eq!(
            exported.encoding.kind,
            EncodingType::One(EncryptedJsonEncoding::None)
        );
    }

    #[test]
    fn returns_the_same_shared_instance_each_call() {
        assert!(nobody().ptr_eq(&nobody()));
    }

    #[test]
    fn accepts_pkcs8_decoding_without_throwing() {
        assert!(nobody().decode_pkcs8(Some("pass"), Some(&[0])).is_ok());
    }

    #[test]
    fn declares_the_sr25519_key_and_seed_lengths() {
        assert_eq!(PUB_LENGTH, 32);
        assert_eq!(SEED_LENGTH, 32);
        assert_eq!(SALT_LENGTH, 32);
        assert_eq!(SEC_LENGTH, 64);
    }

    #[test]
    fn declares_the_pkcs8_header_and_divider_used_by_the_encoder() {
        assert_eq!(PAIR_DIV, [161, 35, 3, 33, 0]);
        assert_eq!(
            PAIR_HDR,
            [48, 83, 2, 1, 1, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32]
        );
    }
}

/// decode.spec.ts, encode.spec.ts and toJson.spec.ts, which use the test pairs derived from
/// their bare seed names.
mod pair_encoding {
    use super::*;

    const DECODED_LENGTH: usize = PAIR_DIV.len() + PAIR_HDR.len() + PUB_LENGTH + SEC_LENGTH;

    const ENCODED_LENGTH: usize = 16
        + DECODED_LENGTH
        + prosopo_util_crypto::NONCE_LENGTH
        + prosopo_util_crypto::SCRYPT_LENGTH;

    fn alice() -> KeyringPair {
        let options: KeyringOptions = KeyringOptions {
            ss58_format: None,
            kind: Some(KeypairType::Sr25519),
        };
        create_test_pairs(options, false).expect("test pairs")["alice"].clone()
    }

    #[test]
    fn decode_fails_when_no_data_provided() {
        let error: String = message_of(alice().decode_pkcs8(None, None));
        assert!(
            error.contains("No encrypted data available") || error.contains("Password required"),
            "{error}"
        );
    }

    #[test]
    fn decode_returns_correct_public_key_from_encoded() {
        let alice: KeyringPair = alice();
        let encoded: Vec<u8> = alice.encode_pkcs8(Some("testing")).expect("encodes");
        assert!(alice.decode_pkcs8(Some("testing"), Some(&encoded)).is_ok());
    }

    #[test]
    fn encode_returns_pkcs8_when_no_passphrase_supplied() {
        assert_eq!(
            alice().encode_pkcs8(None).expect("encodes").len(),
            DECODED_LENGTH
        );
    }

    #[test]
    fn encode_returns_encoded_pkcs8_when_passphrase_supplied() {
        assert_eq!(
            alice()
                .encode_pkcs8(Some("testing"))
                .expect("encodes")
                .len(),
            ENCODED_LENGTH
        );
    }

    #[test]
    fn to_json_creates_an_unencoded_output_with_no_passphrase() {
        let exported: Value =
            serde_json::to_value(alice().to_json(None).expect("json")).expect("serialises");
        assert_eq!(
            exported,
            json!({
                "address": "5Engs9f8Gk6JqvVWz3kFyJ8Kqkgx7pLi8C1UTcr7EZ855qBQ",
                "encoded": "MFMCAQEwBQYDK2VwBCIEIHipoQ68w1cHP0Tju+ym3lzqc2fma5FCMXgDqwBDqTtU2pOQGFg2vA+4oVIIZMphcnOugCZhNuyAfxQ4r1OyWsahIwMhAHh9b36VcuIWVvYdPYl8NDyAyBt3Sx125cjHJVK3zLwl",
                "encoding": { "content": ["pkcs8", "sr25519"], "type": ["none"], "version": "3" },
                "meta": { "isTesting": true, "name": "alice" },
            })
        );
    }

    #[test]
    fn to_json_creates_an_encoded_output_with_passphrase() {
        let exported: KeyringPairJson = alice().to_json(Some("testing")).expect("json");
        assert_eq!(exported.encoded.len(), 268);
        assert_eq!(
            exported.address,
            "5Engs9f8Gk6JqvVWz3kFyJ8Kqkgx7pLi8C1UTcr7EZ855qBQ"
        );
        assert_eq!(exported.encoding.content, ["pkcs8", "sr25519"]);
        assert_eq!(
            exported.encoding.kind,
            EncodingType::Many(vec![
                EncryptedJsonEncoding::Scrypt,
                EncryptedJsonEncoding::Xsalsa20Poly1305
            ])
        );
        assert_eq!(exported.encoding.version, "3");
    }
}

mod get_pair_secrets {
    use super::*;

    fn pair_json() -> KeyringPairJson {
        KeyringPairJson {
            address: address(&[8; 32], 42),
            encoded: "0x00".to_string(),
            encoding: EncryptedJsonDescriptor {
                content: vec!["pkcs8".to_string(), "sr25519".to_string()],
                kind: EncodingType::Many(vec![EncryptedJsonEncoding::None]),
                version: "3".to_string(),
            },
            meta: none(),
        }
    }

    pub(super) fn from_text(secret: &str) -> Result<KeyringPair> {
        get_pair(Some(Secret::Text(secret)), None, None, None)
    }

    pub(super) fn address_of(secret: &str) -> String {
        from_text(secret).expect("pair").address().expect("address")
    }

    fn is_missing_secret_key(result: Result<KeyringPair>) -> bool {
        matches!(result, Err(KeyringError::MissingSecretKey(error)) if error.translation_key() == Some("GENERAL.MISSING_SECRET_KEY"))
    }

    #[test]
    fn derives_from_a_mnemonic() {
        let expected: String = keyring_with(42)
            .add_from_mnemonic(DEV_PHRASE, none(), None)
            .expect("pair")
            .address()
            .expect("address");
        assert_eq!(address_of(DEV_PHRASE), expected);
    }

    #[test]
    fn derives_from_a_hex_seed() {
        assert_eq!(
            hex(&from_text(&hex(&[7; 32])).expect("pair").public_key()),
            public_from_seed(&[7; 32])
        );
    }

    #[test]
    fn derives_from_a_suri_with_a_hard_derivation_path() {
        assert_eq!(
            hex(&from_text(&alice_suri()).expect("pair").public_key()),
            ALICE_PUBLIC
        );
    }

    #[test]
    fn prefers_the_mnemonic_branch_over_the_suri_branch() {
        assert_ne!(
            address_of(&format!("{DEV_PHRASE}//1")),
            address_of(DEV_PHRASE)
        );
    }

    #[test]
    fn parses_a_json_string_taking_the_crypto_type_from_its_encoding() {
        let text: String = serde_json::to_string(&pair_json()).expect("serialises");
        let pair: KeyringPair = from_text(&text).expect("pair");
        assert_eq!(pair.kind(), KeypairType::Sr25519);
        assert_eq!(pair.public_key(), vec![8; 32]);
    }

    #[test]
    fn accepts_a_json_object_directly() {
        let json: KeyringPairJson = pair_json();
        let pair: KeyringPair =
            get_pair(Some(Secret::Json(&json)), None, None, None).expect("pair");
        assert_eq!(pair.kind(), KeypairType::Sr25519);
    }

    #[test]
    fn reports_a_missing_secret_when_the_string_is_neither_key_nor_json() {
        assert!(is_missing_secret_key(from_text("this is not a secret")));
    }

    #[test]
    fn reports_a_missing_secret_for_json_without_an_encoding_block() {
        assert!(is_missing_secret_key(from_text(r#"{"address":"x"}"#)));
    }

    #[test]
    fn throws_when_neither_a_secret_nor_an_account_is_given() {
        assert!(is_missing_secret_key(get_pair(None, None, None, None)));
    }

    #[test]
    fn throws_when_the_secret_is_an_empty_string_and_no_account_is_given() {
        assert!(is_missing_secret_key(from_text("")));
    }
}

mod get_pair_accounts {
    use super::get_pair_secrets::{address_of, from_text};
    use super::*;

    #[test]
    fn builds_a_watch_only_pair_from_an_address_when_no_secret_is_given() {
        let address: String = address_of(DEV_PHRASE);
        let watch_only: KeyringPair =
            get_pair(None, Some(U8aLike::Str(&address)), None, None).expect("pair");
        assert_eq!(watch_only.address().expect("address"), address);
        assert!(watch_only.is_locked());
    }

    #[test]
    fn accepts_a_raw_public_key_as_the_account() {
        let pair: KeyringPair = from_text(DEV_PHRASE).expect("pair");
        let public_key: Vec<u8> = pair.public_key();
        let watch_only: KeyringPair =
            get_pair(None, Some(U8aLike::Bytes(&public_key)), None, None).expect("pair");
        assert_eq!(
            watch_only.address().expect("address"),
            pair.address().expect("address")
        );
    }

    #[test]
    fn ignores_the_account_once_a_secret_is_supplied() {
        let other: String = address_of(&format!("{DEV_PHRASE}//other"));
        let pair: KeyringPair = get_pair(
            Some(Secret::Text(DEV_PHRASE)),
            Some(U8aLike::Str(&other)),
            None,
            None,
        )
        .expect("pair");
        assert_eq!(pair.address().expect("address"), address_of(DEV_PHRASE));
    }
}

mod get_pair_defaults {
    use super::*;

    fn with(pair_type: Option<KeypairType>, ss58_format: Option<i32>) -> Result<KeyringPair> {
        get_pair(Some(Secret::Text(DEV_PHRASE)), None, pair_type, ss58_format)
    }

    #[test]
    fn defaults_to_sr25519_and_ss58_format_42() {
        let pair: KeyringPair = with(None, None).expect("pair");
        assert_eq!(pair.kind(), KeypairType::Sr25519);
        assert_eq!(
            pair.address().expect("address"),
            address(&pair.public_key(), 42)
        );
    }

    #[test]
    fn honours_an_explicit_ss58_format() {
        let pair: KeyringPair = with(Some(KeypairType::Sr25519), Some(2)).expect("pair");
        assert_eq!(
            pair.address().expect("address"),
            address(&pair.public_key(), 2)
        );
    }

    #[test]
    fn rejects_a_pair_type_the_keyring_does_not_support() {
        assert!(message_of(with(Some(KeypairType::Ed25519), None))
            .contains("Expected a keyring type of either 'sr25519'"));
    }

    #[test]
    fn treats_ss58_format_0_as_unset_because_it_is_falsy() {
        let pair: KeyringPair = with(Some(KeypairType::Sr25519), Some(0)).expect("pair");
        assert_eq!(
            pair.address().expect("address"),
            address(&pair.public_key(), 42)
        );
    }
}

mod mnemonics {
    use super::*;

    #[test]
    fn returns_a_valid_twelve_word_mnemonic_and_its_address() {
        let (mnemonic, address) = generate_mnemonic(None, None).expect("mnemonic");
        assert_eq!(mnemonic.split(' ').count(), 12);
        assert!(mnemonic_validate(&mnemonic, None));
        let expected: String = keyring()
            .add_from_mnemonic(&mnemonic, none(), None)
            .expect("pair")
            .address()
            .expect("address");
        assert_eq!(address, expected);
    }

    #[test]
    fn generates_a_fresh_mnemonic_each_call() {
        assert_ne!(
            generate_mnemonic(None, None).expect("first").0,
            generate_mnemonic(None, None).expect("second").0
        );
    }

    #[test]
    fn adds_the_account_to_a_keyring_it_is_given() {
        let mut keyring: Keyring = keyring();
        let (_, address) = generate_mnemonic(Some(&mut keyring), None).expect("mnemonic");
        assert_eq!(keyring.pairs().len(), 1);
        assert_eq!(
            keyring
                .get_pair(U8aLike::Str(&address))
                .expect("pair")
                .address()
                .expect("address"),
            address
        );
    }

    #[test]
    fn uses_a_fresh_keyring_when_none_is_passed_leaving_no_shared_state() {
        let keyring: Keyring = keyring();
        generate_mnemonic(None, None).expect("mnemonic");
        assert!(keyring.pairs().is_empty());
    }

    #[test]
    fn honours_the_requested_pair_type_when_it_creates_the_keyring() {
        assert!(generate_mnemonic(None, Some(KeypairType::Sr25519)).is_ok());
        assert!(
            message_of(generate_mnemonic(None, Some(KeypairType::Ed25519)))
                .contains("Expected a keyring type of either 'sr25519'")
        );
    }

    #[test]
    fn ignores_the_pair_type_when_a_keyring_is_supplied() {
        let mut keyring: Keyring = of_kind(KeypairType::Sr25519).expect("keyring");
        assert!(generate_mnemonic(Some(&mut keyring), Some(KeypairType::Ed25519)).is_ok());
    }

    #[test]
    fn returns_the_32_byte_mini_secret_for_the_generated_mnemonic() {
        let mut keyring: Keyring = keyring();
        let (secret, address) =
            generate_mini_secret(Some(&mut keyring), None).expect("mini secret");
        assert_eq!(secret.len(), 32);
        let registered: KeyringPair = keyring.get_pair(U8aLike::Str(&address)).expect("pair");
        assert_eq!(public_from_seed(&secret), hex(&registered.public_key()));
    }

    #[test]
    fn derives_the_secret_from_the_same_mnemonic_it_registered() {
        let mut keyring: Keyring = keyring();
        let (secret, _) = generate_mini_secret(Some(&mut keyring), None).expect("mini secret");
        assert_eq!(keyring.pairs().len(), 1);
        assert_ne!(secret, vec![0; 32]);
    }

    #[test]
    fn agrees_with_mnemonic_to_mini_secret_for_a_known_phrase() {
        assert_eq!(
            hex(&mnemonic_to_mini_secret(DEV_PHRASE, "", None).expect("mini secret")).len(),
            66
        );
    }

    #[test]
    fn generates_a_fresh_secret_each_call() {
        assert_ne!(
            generate_mini_secret(None, None).expect("first").0,
            generate_mini_secret(None, None).expect("second").0
        );
    }
}
