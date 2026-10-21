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

//! Replays rust/equivalence/vectors.json, recorded from the TS by generate.ts. Random draws
//! the TS recorded are fed back through `ReplayRng`; noble's 16-byte blinding draws do not
//! reach any output, and the Rust makes none, so they are dropped.

use crate::*;
use prosopo_types::keyring::{KeyringOptions, KeyringPairJson, KeyringPairMeta};
use prosopo_util_crypto::u8a::{hex_to_u8a, u8a_to_hex};
use prosopo_util_crypto::{
    JwtIssueOptions, JwtVerifyOptions, JwtVerifyResult, KeypairType, U8aLike,
};
use rand_core::{CryptoRng, RngCore};
use serde_json::{json, Map, Value};
use std::collections::VecDeque;

const VECTORS: &str = include_str!("equivalence/vectors.json");

const NOW_MS: f64 = 1_750_000_000_123.0;

const NOBLE_BLINDING_LENGTH: usize = 16;

fn vectors() -> Value {
    serde_json::from_str(VECTORS).expect("vectors.json parses")
}

fn field<'a>(value: &'a Value, key: &str) -> &'a Value {
    value
        .get(key)
        .unwrap_or_else(|| panic!("vector has no {key}: {value}"))
}

fn text(value: &Value) -> &str {
    value
        .as_str()
        .unwrap_or_else(|| panic!("expected a string: {value}"))
}

fn optional_text(value: &Value) -> Option<&str> {
    value.as_str()
}

fn hex(bytes: &[u8]) -> String {
    u8a_to_hex(bytes)
}

fn kind(value: &Value) -> Option<KeypairType> {
    optional_text(value).map(|name| KeypairType::parse(name).expect("a keypair type"))
}

fn meta(value: Value) -> KeyringPairMeta {
    match value {
        Value::Object(meta) => meta,
        other => panic!("expected an object: {other}"),
    }
}

fn named(name: &str) -> KeyringPairMeta {
    meta(json!({ "name": name }))
}

fn ss58(format: i32) -> KeyringOptions {
    KeyringOptions {
        ss58_format: Some(format),
        kind: None,
    }
}

struct ReplayRng {
    context: String,
    draws: VecDeque<Vec<u8>>,
}

impl ReplayRng {
    fn new(context: &str, outcome: &Value) -> ReplayRng {
        let draws: VecDeque<Vec<u8>> = outcome
            .get("random")
            .and_then(Value::as_array)
            .map(|draws| {
                draws
                    .iter()
                    .map(|draw| hex_to_u8a(text(draw)))
                    .filter(|draw| draw.len() != NOBLE_BLINDING_LENGTH)
                    .collect()
            })
            .unwrap_or_default();
        ReplayRng {
            context: context.to_string(),
            draws,
        }
    }

    fn assert_drained(&self) {
        assert!(
            self.draws.is_empty(),
            "{}: Rust consumed fewer random draws than TS ({} left)",
            self.context,
            self.draws.len()
        );
    }
}

impl RngCore for ReplayRng {
    fn next_u32(&mut self) -> u32 {
        panic!("{}: next_u32 is not a replayable draw", self.context)
    }

    fn next_u64(&mut self) -> u64 {
        panic!("{}: next_u64 is not a replayable draw", self.context)
    }

    fn fill_bytes(&mut self, dest: &mut [u8]) {
        let draw: Vec<u8> = self.draws.pop_front().unwrap_or_else(|| {
            panic!(
                "{}: Rust drew more randomness than TS recorded",
                self.context
            )
        });
        assert_eq!(draw.len(), dest.len(), "{}: draw length", self.context);
        dest.copy_from_slice(&draw);
    }

    fn try_fill_bytes(&mut self, dest: &mut [u8]) -> std::result::Result<(), rand_core::Error> {
        self.fill_bytes(dest);
        Ok(())
    }
}

impl CryptoRng for ReplayRng {}

/// Compares a Rust outcome with a recorded `{ result }` or `{ error }`.
fn check(context: &str, expected: &Value, actual: Result<Value>) {
    match (expected.get("result"), expected.get("error"), actual) {
        (Some(result), None, Ok(actual)) => assert_eq!(&actual, result, "{context}"),
        (None, Some(error), Err(actual)) => {
            assert_eq!(actual.to_string(), text(error), "{context}")
        }
        (_, _, actual) => panic!("{context}: TS gave {expected}, Rust gave {actual:?}"),
    }
}

/// Runs `f` with the recorded randomness, and checks it used all of it when it succeeded.
fn replayed(context: &str, expected: &Value, f: impl FnOnce(&mut ReplayRng) -> Result<Value>) {
    let mut rng: ReplayRng = ReplayRng::new(context, expected);
    let actual: Result<Value> = f(&mut rng);
    if actual.is_ok() {
        rng.assert_drained();
    }
    check(context, expected, actual);
}

fn state(pair: &KeyringPair) -> Result<Value> {
    Ok(json!({
        "publicKey": hex(&pair.public_key()),
        "address": pair.address()?,
        "isLocked": pair.is_locked(),
        "meta": Value::Object(pair.meta()),
    }))
}

/// The pair's state, plus its secret key when the TS recorded one.
fn state_with_secret(pair: &KeyringPair, expected: &Value) -> Result<Value> {
    let mut value: Value = state(pair)?;
    let wants_secret: bool = expected
        .get("result")
        .is_some_and(|result| result.get("secretKey").is_some());
    if wants_secret {
        value["secretKey"] = Value::String(secret_of(pair)?);
    }
    Ok(value)
}

/// `pair.encodePkcs8().subarray(16, 80)`: the secret key.
fn secret_of(pair: &KeyringPair) -> Result<String> {
    let encoded: Vec<u8> = pair.encode_pkcs8(None)?;
    Ok(hex(&encoded[16.min(encoded.len())..80.min(encoded.len())]))
}

fn json_of(pair_json: KeyringPairJson) -> Value {
    serde_json::to_value(pair_json).expect("serialises")
}

/// Compares serialised text, so key order counts too.
fn check_text(context: &str, expected: &Value, actual: &Result<Value>) {
    if let (Some(result), Ok(actual)) = (expected.get("result"), actual) {
        assert_eq!(
            serde_json::to_string(actual).expect("serialises"),
            serde_json::to_string(result).expect("serialises"),
            "{context}: key order"
        );
    }
}

fn message(value: &Value) -> Vec<u8> {
    match value {
        Value::String(text) => prosopo_util_crypto::u8a::u8a_to_u8a(text.as_str()),
        Value::Array(bytes) => bytes
            .iter()
            .map(|byte| byte.as_u64().expect("a byte") as u8)
            .collect(),
        other => panic!("not a message: {other}"),
    }
}

fn jwt_json(result: JwtVerifyResult) -> Value {
    let mut value: Map<String, Value> = Map::new();
    value.insert("isValid".to_string(), Value::Bool(result.is_valid));
    if let Some(error) = result.error {
        value.insert("error".to_string(), Value::String(error));
    }
    value.insert(
        "crypto".to_string(),
        Value::String(
            result
                .crypto
                .map_or("none", |crypto| crypto.as_str())
                .to_string(),
        ),
    );
    value.insert(
        "publicKey".to_string(),
        Value::String(hex(&result.public_key)),
    );
    value.insert("isWrapped".to_string(), Value::Bool(result.is_wrapped));
    if let Some(payload) = result.payload {
        value.insert("payload".to_string(), payload.to_serde());
    }
    Value::Object(value)
}

#[test]
fn create_from_uri_matches_the_ts() {
    for vector in field(&vectors(), "uri").as_array().expect("uri") {
        let suri: &str = text(field(vector, "suri"));
        let context: String = format!("createFromUri({suri:?}, {})", field(vector, "type"));
        let actual: Result<Value> = Keyring::new(ss58(42))
            .and_then(|keyring| {
                keyring.create_from_uri(suri, named("uri"), kind(field(vector, "type")))
            })
            .and_then(|pair| state_with_secret(&pair, vector));
        check(&context, vector, actual);
    }
}

#[test]
fn create_from_json_matches_the_ts() {
    let passphrases: [Option<&str>; 4] = [None, Some(""), Some("testing"), Some("wrong")];
    for vector in field(&vectors(), "json").as_array().expect("json") {
        let label: &str = text(field(vector, "label"));
        let input: KeyringPairJson =
            serde_json::from_value(field(vector, "input").clone()).expect("a key file");
        let ignore_checksum: bool = field(vector, "ignoreChecksum").as_bool().expect("a flag");
        let create = || {
            Keyring::new(ss58(42))
                .and_then(|keyring| keyring.create_from_json(&input, ignore_checksum))
        };
        check(
            label,
            field(vector, "created"),
            create().and_then(|pair| state(&pair)),
        );
        let unlocks: &Vec<Value> = field(vector, "unlock").as_array().expect("unlock");
        for (passphrase, expected) in passphrases.iter().zip(unlocks) {
            let actual: Result<Value> = create().and_then(|pair| {
                pair.unlock(*passphrase)?;
                Ok(json!({
                    "publicKey": hex(&pair.public_key()),
                    "secretKey": secret_of(&pair)?,
                    "isLocked": pair.is_locked(),
                }))
            });
            check(
                &format!("{label}: unlock({passphrase:?})"),
                expected,
                actual,
            );
        }
        let context: String = format!("{label}: re-encode, lock and unlock");
        replayed(&context, field(vector, "reencode"), |rng| {
            let pair: KeyringPair = create()?;
            pair.unlock(None)?;
            pair.encode_pkcs8_with_rng(Some("pw"), rng)?;
            pair.lock();
            pair.unlock(Some("pw"))?;
            Ok(json!({ "publicKey": hex(&pair.public_key()), "isLocked": pair.is_locked() }))
        });
        let context: String = format!("{label}: toJson");
        let expected: &Value = field(vector, "toJson");
        let mut rng: ReplayRng = ReplayRng::new(&context, expected);
        let actual: Result<Value> = create().and_then(|pair| {
            pair.to_json_with_rng(Some("testing"), &mut rng)
                .map(json_of)
        });
        check_text(&context, expected, &actual);
        if actual.is_ok() {
            rng.assert_drained();
        }
        check(&context, expected, actual);
    }
}

fn make(label: &str) -> KeyringPair {
    match label {
        "alice test pair" => create_test_keyring(ss58(42), true)
            .expect("test keyring")
            .pairs()[0]
            .clone(),
        "uri //Bob" => Keyring::new(ss58(42))
            .and_then(|mut keyring| keyring.add_from_uri("//Bob", KeyringPairMeta::new(), None))
            .expect("bob"),
        "seed" => Keyring::new(ss58(2))
            .and_then(|mut keyring| keyring.add_from_seed(&[9; 32], KeyringPairMeta::new(), None))
            .expect("seed pair"),
        "all-zero secret" => Keyring::new(ss58(42))
            .and_then(|mut keyring| {
                let alice: Vec<u8> = hex_to_u8a(PAIRSSR25519[0].p);
                keyring.add_from_pair(
                    prosopo_util_crypto::Keypair {
                        public_key: alice,
                        secret_key: vec![0; 64],
                    },
                    KeyringPairMeta::new(),
                    None,
                )
            })
            .expect("zero pair"),
        other => panic!("unknown pair source {other}"),
    }
}

fn jwt_options(value: &Value) -> JwtIssueOptions {
    JwtIssueOptions {
        expires_in: value.get("expiresIn").and_then(Value::as_f64),
        not_before: value.get("notBefore").and_then(Value::as_f64),
    }
}

fn claims(value: &Value) -> Vec<(String, String)> {
    value
        .as_object()
        .map(|claims| {
            claims
                .iter()
                .map(|(key, value)| (key.clone(), text(value).to_string()))
                .collect()
        })
        .unwrap_or_default()
}

#[test]
fn pair_operations_match_the_ts() {
    for vector in field(&vectors(), "ops").as_array().expect("ops") {
        let label: &str = text(field(vector, "label"));
        let pair: KeyringPair = make(label);
        check(
            label,
            &json!({ "result": field(vector, "state") }),
            state(&pair),
        );

        for sign in field(vector, "signs").as_array().expect("signs") {
            let bytes: Vec<u8> = message(field(sign, "message"));
            let input: U8aLike<'_> = match field(sign, "message") {
                Value::String(text) => U8aLike::Str(text),
                _ => U8aLike::Bytes(&bytes),
            };
            let with_type: bool = field(sign, "withType").as_bool().expect("a flag");
            let context: String = format!("{label}: sign({}, {with_type})", field(sign, "message"));
            replayed(&context, sign, |rng| {
                pair.sign_with_rng(input, with_type, rng)
                    .map(|signature| json!(hex(&signature)))
            });
        }

        for verify in field(vector, "verifies").as_array().expect("verifies") {
            let context: String = format!("{label}: verify({verify})");
            let actual: Result<Value> = pair
                .verify(
                    U8aLike::Str(text(field(verify, "message"))),
                    U8aLike::Str(text(field(verify, "signature"))),
                    U8aLike::Str(text(field(verify, "signer"))),
                )
                .map(Value::Bool);
            check(&context, verify, actual);
        }

        for vrf in field(vector, "vrfs").as_array().expect("vrfs") {
            let message: &str = text(field(vrf, "message"));
            let context_arg: Option<U8aLike<'_>> =
                optional_text(field(vrf, "context")).map(U8aLike::Str);
            let extra: Option<U8aLike<'_>> = optional_text(field(vrf, "extra")).map(U8aLike::Str);
            let context: String = format!("{label}: vrfSign({vrf})");
            replayed(&context, field(vrf, "signed"), |rng| {
                pair.vrf_sign_with_rng(U8aLike::Str(message), context_arg, extra, rng)
                    .map(|output| json!(hex(&output)))
            });
            let output: Vec<u8> = field(vrf, "signed")
                .get("result")
                .map_or_else(Vec::new, |output| hex_to_u8a(text(output)));
            check(
                &format!("{context}: verified"),
                field(vrf, "verified"),
                pair.vrf_verify(U8aLike::Str(message), &output, context_arg, extra)
                    .map(Value::Bool),
            );
            let tampered: String = format!("{message}!");
            check(
                &format!("{context}: tampered"),
                field(vrf, "tampered"),
                pair.vrf_verify(U8aLike::Str(&tampered), &output, context_arg, extra)
                    .map(Value::Bool),
            );
        }

        for jwt in field(vector, "jwts").as_array().expect("jwts") {
            let context: String = format!("{label}: jwtIssue({jwt})");
            let options: JwtIssueOptions = jwt_options(field(jwt, "options"));
            let claims: Vec<(String, String)> = claims(field(jwt, "claims"));
            replayed(&context, field(jwt, "issued"), |rng| {
                pair.jwt_issue_at(&options, &claims, NOW_MS, rng)
                    .map(Value::String)
            });
            let token: &str = field(jwt, "issued").get("result").map_or("", text);
            check(
                &format!("{context}: verified"),
                field(jwt, "verified"),
                pair.jwt_verify_at(token, &JwtVerifyOptions::default(), NOW_MS)
                    .map(jwt_json),
            );
        }

        for export in field(vector, "exports").as_array().expect("exports") {
            let passphrase: Option<&str> = optional_text(field(export, "passphrase"));
            let context: String = format!("{label}: encodePkcs8({passphrase:?})");
            replayed(&context, field(export, "encodePkcs8"), |rng| {
                make(label)
                    .encode_pkcs8_with_rng(passphrase, rng)
                    .map(|encoded| json!(hex(&encoded)))
            });
            let context: String = format!("{label}: toJson({passphrase:?})");
            let expected: &Value = field(export, "toJson");
            let mut rng: ReplayRng = ReplayRng::new(&context, expected);
            let actual: Result<Value> = make(label)
                .to_json_with_rng(passphrase, &mut rng)
                .map(json_of);
            rng.assert_drained();
            check_text(&context, expected, &actual);
            check(&context, expected, actual);
        }

        for derive in field(vector, "derives").as_array().expect("derives") {
            let suri: &str = text(field(derive, "suri"));
            let actual: Result<Value> = make(label)
                .derive(suri, named("derived"))
                .and_then(|derived| state_with_secret(&derived, derive));
            check(&format!("{label}: derive({suri:?})"), derive, actual);
        }

        let after: &Value = field(vector, "afterLock");
        let locked: KeyringPair = make(label);
        locked.lock();
        assert_eq!(
            Value::Bool(locked.is_locked()),
            *field(after, "isLocked"),
            "{label}: isLocked"
        );
        replayed(
            &format!("{label}: locked sign"),
            field(after, "sign"),
            |rng| {
                locked
                    .sign_with_rng(U8aLike::Str("hello"), false, rng)
                    .map(|signature| json!(hex(&signature)))
            },
        );
        check(
            &format!("{label}: locked derive"),
            field(after, "derive"),
            locked
                .derive("//x", KeyringPairMeta::new())
                .and_then(|derived| derived.address())
                .map(Value::String),
        );
        replayed(
            &format!("{label}: locked jwtIssue"),
            field(after, "jwtIssue"),
            |rng| {
                locked
                    .jwt_issue_at(&JwtIssueOptions::default(), &[], NOW_MS, rng)
                    .map(Value::String)
            },
        );
        replayed(
            &format!("{label}: locked vrfSign"),
            field(after, "vrfSign"),
            |rng| {
                locked
                    .vrf_sign_with_rng(U8aLike::Str("hello"), None, None, rng)
                    .map(|output| json!(hex(&output)))
            },
        );
        check(
            &format!("{label}: locked unlock"),
            field(after, "unlock"),
            locked
                .unlock(Some("testing"))
                .map(|()| Value::Bool(locked.is_locked())),
        );
        let context: String = format!("{label}: locked toJson");
        let actual: Result<Value> = locked.to_json(None).map(json_of);
        check_text(&context, field(after, "toJson"), &actual);
        check(&context, field(after, "toJson"), actual);

        let renamed: KeyringPair = make(label);
        renamed.set_meta(meta(json!({ "name": "renamed", "extra": 1 })));
        renamed.set_meta(meta(json!({ "more": [1, 2] })));
        let actual: String = serde_json::to_string(&renamed.meta()).expect("serialises");
        assert_eq!(
            actual,
            serde_json::to_string(field(vector, "meta")).expect("serialises"),
            "{label}: setMeta"
        );
    }
}

#[test]
fn decode_pair_matches_the_ts() {
    for vector in field(&vectors(), "decodes").as_array().expect("decodes") {
        let encoded: Vec<u8> = hex_to_u8a(text(field(vector, "encoded")));
        let passphrase: Option<&str> = optional_text(field(vector, "passphrase"));
        let actual: Result<Value> = decode_pair(passphrase, Some(&encoded), None).map(|(public_key, secret_key)| {
            json!({ "publicKey": hex(&public_key), "secretKey": hex(&secret_key) })
        });
        check(&format!("decodePair({passphrase:?})"), vector, actual);
    }
}

#[test]
fn ss58_formats_match_the_ts() {
    let vector: Value = field(&vectors(), "ss58").clone();
    let mut keyring: Keyring = Keyring::new(ss58(42)).expect("keyring");
    let pair: KeyringPair = keyring
        .add_from_uri("//Alice", KeyringPairMeta::new(), None)
        .expect("alice");
    assert_eq!(
        pair.address().expect("address"),
        text(field(&vector, "before"))
    );
    keyring.set_ss58_format(2);
    assert_eq!(
        pair.address().expect("address"),
        text(field(&vector, "after"))
    );
    let alice: Vec<u8> = PAIRSSR25519[0]
        .p
        .parse::<String>()
        .map(|p| hex_to_u8a(&p))
        .expect("alice");
    for encode in field(&vector, "encodes").as_array().expect("encodes") {
        let configured: Option<i32> = field(encode, "configured")
            .as_i64()
            .map(|format| format as i32);
        let explicit: Option<i32> = field(encode, "explicit")
            .as_i64()
            .map(|format| format as i32);
        let actual: Result<Value> = Keyring::new(KeyringOptions {
            ss58_format: configured,
            kind: None,
        })
        .and_then(|keyring| keyring.encode_address(U8aLike::Str(&hex(&alice)), explicit))
        .map(Value::String);
        check(
            &format!("encodeAddress({configured:?}, {explicit:?})"),
            encode,
            actual,
        );
    }
}

#[test]
fn keyring_types_match_the_ts() {
    for vector in field(&vectors(), "keyringTypes")
        .as_array()
        .expect("keyringTypes")
    {
        let actual: Result<Value> = Keyring::new(KeyringOptions {
            ss58_format: None,
            kind: kind(field(vector, "type")),
        })
        .map(|keyring| json!(keyring.kind().as_str()));
        check(
            &format!("new Keyring({})", field(vector, "type")),
            vector,
            actual,
        );
    }
}

#[test]
fn pair_storage_matches_the_ts() {
    let vector: Value = field(&vectors(), "pairs").clone();
    let mut keyring: Keyring = Keyring::new(ss58(42)).expect("keyring");
    let none = KeyringPairMeta::new;
    let _a: KeyringPair = keyring
        .add_from_uri("//Alice", none(), None)
        .expect("alice");
    let b: KeyringPair = keyring.add_from_uri("//Bob", none(), None).expect("bob");
    let _c: KeyringPair = keyring
        .add_from_uri("//Charlie", none(), None)
        .expect("charlie");
    let mut order: Vec<Value> = Vec::new();
    let snapshot = |keyring: &Keyring, order: &mut Vec<Value>| {
        order.push(json!(keyring
            .public_keys()
            .iter()
            .map(|key| hex(key))
            .collect::<Vec<String>>()));
    };
    snapshot(&keyring, &mut order);
    keyring
        .add_from_uri("//Alice", named("again"), None)
        .expect("alice again");
    snapshot(&keyring, &mut order);
    let b_on_kusama: String = keyring
        .encode_address(U8aLike::Bytes(&b.public_key()), Some(2))
        .expect("address");
    keyring
        .remove_pair(U8aLike::Str(&b_on_kusama))
        .expect("removes");
    snapshot(&keyring, &mut order);
    keyring
        .add_from_uri("//Bob", none(), None)
        .expect("bob again");
    snapshot(&keyring, &mut order);
    keyring
        .remove_pair(U8aLike::Bytes(&[7; 32]))
        .expect("removes nothing");
    snapshot(&keyring, &mut order);
    assert_eq!(
        Value::Array(order),
        *field(&vector, "order"),
        "insertion order"
    );

    for get in field(&vector, "gets").as_array().expect("gets") {
        let address: &str = text(field(get, "address"));
        let actual: Result<Value> = keyring
            .get_pair(U8aLike::Str(address))
            .and_then(|pair| state(&pair));
        check(&format!("getPair({address:?})"), get, actual);
    }
    for get in field(&vector, "byteGets").as_array().expect("byteGets") {
        let bytes: Vec<u8> = message(field(get, "bytes"));
        let actual: Result<Value> = keyring
            .get_pair(U8aLike::Bytes(&bytes))
            .and_then(|pair| state(&pair));
        check(&format!("getPair({})", hex(&bytes)), get, actual);
    }
}

#[test]
fn get_pair_matches_the_ts() {
    for vector in field(&vectors(), "getPair").as_array().expect("getPair") {
        let label: &str = text(field(vector, "label"));
        let json_secret: Option<KeyringPairJson> = field(vector, "json")
            .as_bool()
            .filter(|is_json| *is_json)
            .map(|_| serde_json::from_value(field(vector, "secret").clone()).expect("a key file"));
        let secret: Option<Secret<'_>> = match &json_secret {
            Some(json) => Some(Secret::Json(json)),
            None => optional_text(field(vector, "secret")).map(Secret::Text),
        };
        let account_bytes: Option<Vec<u8>> = field(vector, "account")
            .as_array()
            .map(|_| message(field(vector, "account")));
        let account: Option<U8aLike<'_>> = match &account_bytes {
            Some(bytes) => Some(U8aLike::Bytes(bytes)),
            None => optional_text(field(vector, "account")).map(U8aLike::Str),
        };
        let ss58_format: Option<i32> = field(vector, "ss58").as_i64().map(|format| format as i32);
        let actual: Result<KeyringPair> =
            get_pair(secret, account, kind(field(vector, "type")), ss58_format);
        match (vector.get("envError"), actual) {
            (Some(expected), Err(KeyringError::MissingSecretKey(error))) => {
                assert_eq!(error.message(), text(field(expected, "message")), "{label}");
                assert_eq!(
                    error.translation_key(),
                    optional_text(field(expected, "translationKey")),
                    "{label}"
                );
                assert_eq!(error.error_type(), "ProsopoEnvError", "{label}");
                let has_cause: bool = error
                    .context()
                    .and_then(|context| context.error())
                    .is_some();
                assert_eq!(
                    Value::Bool(has_cause),
                    *field(expected, "hasCause"),
                    "{label}: cause"
                );
            }
            (Some(_), other) => panic!("{label}: TS gave an env error, Rust gave {other:?}"),
            (None, actual) => check(label, vector, actual.and_then(|pair| state(&pair))),
        }
    }
}

#[test]
fn test_keyring_matches_the_ts() {
    for vector in field(&vectors(), "testing").as_array().expect("testing") {
        let format: Option<i32> = field(vector, "options")
            .get("ss58Format")
            .and_then(Value::as_i64)
            .map(|f| f as i32);
        let is_derived: bool = field(vector, "isDerived").as_bool().expect("a flag");
        let keyring: Keyring = create_test_keyring(
            KeyringOptions {
                ss58_format: format,
                kind: None,
            },
            is_derived,
        )
        .expect("test keyring");
        let states: Vec<Value> = keyring
            .pairs()
            .iter()
            .map(|pair| state(pair).expect("state"))
            .collect();
        assert_eq!(
            Value::Array(states),
            *field(vector, "pairs"),
            "createTestKeyring({format:?}, {is_derived})"
        );
    }
}
