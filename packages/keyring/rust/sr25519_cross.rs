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

//! sr25519 compatibility with the TS, by cross-verification. ts-signed.json is written by
//! equivalence/sr25519/generate.ts with live randomness, as production signs. Keys, addresses
//! and mini-secrets are deterministic and compared byte for byte. Signatures carry a fresh
//! nonce, so they are never compared: each TS signature must verify in Rust with the outcome
//! the TS gave, and Rust's own signatures go to rust-signed.json, which the TS verifies in
//! src/tests/rustSigned.test.ts.

use crate::*;
use prosopo_types::keyring::{KeyringOptions, KeyringPairMeta};
use prosopo_util_crypto::u8a::{hex_to_u8a, u8a_to_hex, u8a_to_u8a};
use prosopo_util_crypto::{
    decode_address, encode_address, mnemonic_to_mini_secret, signature_verify, sr25519_verify,
    KeypairType, U8aLike, VerifyResult,
};
use schnorrkel::{signing_context, ExpansionMode, MiniSecretKey};
use serde_json::{json, Value};

const TS_SIGNED: &str = include_str!("equivalence/sr25519/ts-signed.json");
const RUST_SIGNED: &str = include_str!("equivalence/sr25519/rust-signed.json");
const RUST_SIGNED_OUT: &str = "PROSOPO_SR25519_RUST_SIGNED";

fn vectors() -> Value {
    serde_json::from_str(TS_SIGNED).expect("ts-signed.json parses")
}

fn text(value: &Value) -> &str {
    value
        .as_str()
        .unwrap_or_else(|| panic!("expected a string: {value}"))
}

fn index(value: &Value) -> usize {
    value
        .as_u64()
        .unwrap_or_else(|| panic!("expected an index: {value}")) as usize
}

fn list(value: &Value) -> &Vec<Value> {
    value
        .as_array()
        .unwrap_or_else(|| panic!("expected an array: {value}"))
}

enum Message {
    Bytes(Vec<u8>),
    Text(String),
}

impl Message {
    fn from_spec(spec: &Value) -> Message {
        match text(&spec["kind"]) {
            "hex" => Message::Bytes(hex_to_u8a(text(&spec["value"]))),
            "string" => Message::Text(text(&spec["value"]).to_string()),
            "pattern" => {
                let seed: usize = index(&spec["seed"]);
                Message::Bytes(
                    (0..index(&spec["length"]))
                        .map(|i: usize| ((i * 31 + seed) & 0xff) as u8)
                        .collect(),
                )
            }
            other => panic!("unknown message kind {other}"),
        }
    }

    fn input(&self) -> U8aLike<'_> {
        match self {
            Message::Bytes(bytes) => U8aLike::Bytes(bytes),
            Message::Text(text) => U8aLike::Str(text),
        }
    }
}

struct Messages(Vec<(String, Value)>);

impl Messages {
    fn from_vectors(vectors: &Value) -> Messages {
        Messages(
            list(&vectors["messages"])
                .iter()
                .map(|spec: &Value| (text(&spec["id"]).to_string(), spec.clone()))
                .collect(),
        )
    }

    fn spec(&self, id: &str) -> &Value {
        &self
            .0
            .iter()
            .find(|(candidate, _)| candidate == id)
            .unwrap_or_else(|| panic!("no message {id}"))
            .1
    }

    fn get(&self, id: &str) -> Message {
        Message::from_spec(self.spec(id))
    }
}

fn keyring() -> Keyring {
    Keyring::new(KeyringOptions {
        ss58_format: Some(42),
        kind: Some(KeypairType::Sr25519),
    })
    .expect("a keyring")
}

fn add_uri(keyring: &mut Keyring, suri: &str) -> Result<KeyringPair> {
    keyring.add_from_uri(suri, KeyringPairMeta::new(), None)
}

/// The pairs the TS built, by key index; `None` where the TS rejected the URI.
fn pairs(vectors: &Value) -> Vec<Option<KeyringPair>> {
    let mut keyring: Keyring = keyring();
    list(&vectors["keys"])
        .iter()
        .map(|key: &Value| {
            let pair: Result<KeyringPair> = add_uri(&mut keyring, text(&key["suri"]));
            key.get("error")
                .is_none()
                .then(|| pair.expect("the TS accepted it"))
        })
        .collect()
}

fn outcome<T>(result: prosopo_util_crypto::Result<T>, ok: impl FnOnce(T) -> Value) -> Value {
    match result {
        Ok(value) => json!({ "result": ok(value) }),
        Err(error) => json!({ "error": error.message() }),
    }
}

fn verify_result(result: VerifyResult) -> Value {
    json!({
        "isValid": result.is_valid,
        "isWrapped": result.is_wrapped,
        "crypto": result.crypto.map_or("none", |kind: KeypairType| kind.as_str()),
    })
}

/// The outcome of each verification API, in the shape generate.ts records.
fn verify_all(
    message: &Message,
    signature: &[u8],
    signer: &KeyringPair,
    public_key: &[u8],
) -> Value {
    let raw: &[u8] = if signature.len() == 65 {
        &signature[1..]
    } else {
        signature
    };
    let address = |prefix: i32| encode_address(public_key, prefix).expect("an address");
    let pair: Value = match signer.verify(
        message.input(),
        U8aLike::Bytes(signature),
        U8aLike::Bytes(public_key),
    ) {
        Ok(valid) => json!({ "result": valid }),
        Err(error) => json!({ "error": error.to_string() }),
    };
    json!({
        "raw": outcome(sr25519_verify(message.input(), raw, public_key), Value::Bool),
        "address": outcome(signature_verify(message.input(), signature, &address(42)), verify_result),
        "addressPrefix0": outcome(signature_verify(message.input(), signature, &address(0)), verify_result),
        "pair": pair,
    })
}

#[test]
fn public_keys_and_addresses_match_the_ts() {
    let vectors: Value = vectors();
    let mut keyring: Keyring = keyring();
    let prefixes: Vec<i32> = list(&vectors["prefixes"])
        .iter()
        .map(|prefix: &Value| prefix.as_i64().expect("a prefix") as i32)
        .collect();
    for key in list(&vectors["keys"]) {
        let suri: &str = text(&key["suri"]);
        let pair: KeyringPair = match add_uri(&mut keyring, suri) {
            Ok(pair) => pair,
            Err(error) => {
                assert_eq!(key["error"], json!(error.to_string()), "{suri}");
                continue;
            }
        };
        assert_eq!(key.get("error"), None, "{suri}: the TS rejected it");
        assert_eq!(
            text(&key["publicKey"]),
            u8a_to_hex(&pair.public_key()),
            "{suri}"
        );
        assert_eq!(
            text(&key["address"]),
            pair.address().expect("an address"),
            "{suri}"
        );
        for prefix in &prefixes {
            let rust: Value = outcome(encode_address(&pair.public_key(), *prefix), Value::String);
            assert_eq!(
                key["addresses"][prefix.to_string()],
                rust,
                "{suri} at prefix {prefix}"
            );
        }
        let decoded: Vec<u8> =
            decode_address(Some(U8aLike::Str(text(&key["address"]))), false, None)
                .expect("decodes");
        assert_eq!(text(&key["decoded"]), u8a_to_hex(&decoded), "{suri}");
    }
}

#[test]
fn mini_secrets_match_the_ts() {
    for case in list(&vectors()["miniSecrets"]) {
        let mnemonic: &str = text(&case["mnemonic"]);
        let password: &str = text(&case["password"]);
        let rust: Value = outcome(
            mnemonic_to_mini_secret(mnemonic, password, None),
            |secret: Vec<u8>| Value::String(u8a_to_hex(&secret)),
        );
        let ts: Value = match case.get("error") {
            Some(error) => json!({ "error": error }),
            None => json!({ "result": case["result"] }),
        };
        assert_eq!(ts, rust, "{mnemonic:?} with password {password:?}");
    }
}

#[test]
fn ts_signatures_verify_in_rust() {
    let vectors: Value = vectors();
    let messages: Messages = Messages::from_vectors(&vectors);
    let pairs: Vec<Option<KeyringPair>> = pairs(&vectors);
    let pair = |case: &Value| pairs[index(&case["key"])].clone().expect("a pair");
    let mut checked: usize = 0;
    for case in list(&vectors["signatures"]) {
        let signer: KeyringPair = pair(case);
        let signature: Vec<u8> = hex_to_u8a(text(&case["signature"]));
        let message: Message = messages.get(text(&case["message"]));
        assert_eq!(
            case["verify"],
            verify_all(&message, &signature, &signer, &signer.public_key()),
            "key {} message {}",
            case["key"],
            case["message"]
        );
        assert_eq!(case["verify"]["pair"], json!({ "result": true }));
        checked += 1;
    }
    for case in list(&vectors["wrapped"]) {
        let signer: KeyringPair = pair(case);
        let signature: Vec<u8> = hex_to_u8a(text(&case["signature"]));
        let message: Message = messages.get(text(&case["verified"]));
        assert_eq!(
            case["verify"],
            verify_all(&message, &signature, &signer, &signer.public_key()),
            "key {} signed {} verified {}",
            case["key"],
            case["signed"],
            case["verified"]
        );
        checked += 1;
    }
    assert_eq!(checked, 541);
}

#[test]
fn signatures_that_must_fail_fail_in_rust_as_in_the_ts() {
    let vectors: Value = vectors();
    let pairs: Vec<Option<KeyringPair>> = pairs(&vectors);
    let negatives: &Vec<Value> = list(&vectors["negatives"]);
    for case in negatives {
        let signer: KeyringPair = pairs[index(&case["key"])].clone().expect("a pair");
        let signature: Vec<u8> = hex_to_u8a(text(&case["signature"]));
        let public_key: Vec<u8> = hex_to_u8a(text(&case["publicKey"]));
        let message: Message = Message::from_spec(&case["message"]);
        let rust: Value = verify_all(&message, &signature, &signer, &public_key);
        assert_eq!(
            case["verify"], rust,
            "{} for key {}",
            case["name"], case["key"]
        );
        assert_ne!(
            rust["pair"],
            json!({ "result": true }),
            "{} verified",
            case["name"]
        );
    }
    assert_eq!(negatives.len(), 720);
}

fn wrong_context_signature(seed: &[u8], message: &[u8], context: &[u8]) -> (Vec<u8>, Vec<u8>) {
    let keypair = MiniSecretKey::from_bytes(seed)
        .expect("a mini secret")
        .expand_to_keypair(ExpansionMode::Ed25519);
    let signature = keypair.sign(signing_context(context).bytes(message));
    (
        keypair.public.to_bytes().to_vec(),
        signature.to_bytes().to_vec(),
    )
}

/// Signs every key and message as production does (`OsRng`), writing rust-signed.json to the
/// path in `PROSOPO_SR25519_RUST_SIGNED` when it is set.
fn rust_signed(vectors: &Value) -> Value {
    let messages: Messages = Messages::from_vectors(vectors);
    let pairs: Vec<Option<KeyringPair>> = pairs(vectors);
    let long: Vec<&str> = list(&vectors["longMessages"]).iter().map(text).collect();
    let long_keys: Vec<usize> = list(&vectors["longMessageKeys"])
        .iter()
        .map(index)
        .collect();
    let mut keys: Vec<Value> = Vec::new();
    let mut signatures: Vec<Value> = Vec::new();
    for (key, pair) in pairs.iter().enumerate() {
        let Some(pair) = pair else { continue };
        keys.push(json!({
            "key": key,
            "suri": vectors["keys"][key]["suri"],
            "publicKey": u8a_to_hex(&pair.public_key()),
            "address": pair.address().expect("an address"),
        }));
        for (id, _) in &messages.0 {
            if long.contains(&id.as_str()) && !long_keys.contains(&key) {
                continue;
            }
            let message: Message = messages.get(id);
            for with_type in [false, true] {
                let signature: Vec<u8> = pair.sign(message.input(), with_type).expect("signs");
                signatures.push(json!({
                    "key": key,
                    "message": id,
                    "withType": with_type,
                    "signature": u8a_to_hex(&signature),
                }));
            }
        }
    }
    let seed: Vec<u8> = vec![1; 32];
    let seed_key: usize = list(&vectors["keys"])
        .iter()
        .position(|key: &Value| key["suri"] == json!(u8a_to_hex(&seed)))
        .expect("the 0x01 seed key");
    let wrong_context: Vec<Value> = ["hello", "empty", "timestamp"]
        .iter()
        .map(|id: &&str| {
            let bytes: Vec<u8> = u8a_to_u8a(messages.get(id).input());
            let (public_key, signature) = wrong_context_signature(&seed, &bytes, b"not-substrate");
            json!({
                "key": seed_key,
                "message": id,
                "publicKey": u8a_to_hex(&public_key),
                "signature": u8a_to_hex(&signature),
            })
        })
        .collect();
    json!({
        "messages": vectors["messages"],
        "keys": keys,
        "signatures": signatures,
        "wrongContext": wrong_context,
    })
}

fn check_rust_signed(vectors: &Value, signed: &Value) {
    let messages: Messages = Messages::from_vectors(vectors);
    let pairs: Vec<Option<KeyringPair>> = pairs(vectors);
    for case in list(&signed["signatures"]) {
        let signer: KeyringPair = pairs[index(&case["key"])].clone().expect("a pair");
        let signature: Vec<u8> = hex_to_u8a(text(&case["signature"]));
        let message: Message = messages.get(text(&case["message"]));
        let rust: Value = verify_all(&message, &signature, &signer, &signer.public_key());
        assert_eq!(rust["raw"], json!({ "result": true }), "{case}");
        assert_eq!(rust["pair"], json!({ "result": true }), "{case}");
        assert_eq!(rust["address"]["result"]["isValid"], json!(true), "{case}");
    }
    for case in list(&signed["wrongContext"]) {
        let signer: KeyringPair = pairs[index(&case["key"])].clone().expect("a pair");
        assert_eq!(text(&case["publicKey"]), u8a_to_hex(&signer.public_key()));
        let signature: Vec<u8> = hex_to_u8a(text(&case["signature"]));
        let message: Message = messages.get(text(&case["message"]));
        let rust: Value = verify_all(&message, &signature, &signer, &signer.public_key());
        assert_eq!(rust["raw"], json!({ "result": false }), "{case}");
        assert_eq!(rust["pair"], json!({ "result": false }), "{case}");
    }
}

#[test]
fn rust_signatures_verify_and_carry_a_fresh_nonce() {
    let vectors: Value = vectors();
    let first: Value = rust_signed(&vectors);
    check_rust_signed(&vectors, &first);
    let second: Value = rust_signed(&vectors);
    for (a, b) in list(&first["signatures"])
        .iter()
        .zip(list(&second["signatures"]))
    {
        assert_eq!(a["message"], b["message"]);
        assert_ne!(
            a["signature"], b["signature"],
            "signing twice gave the same bytes: {a}"
        );
    }
    if let Ok(path) = std::env::var(RUST_SIGNED_OUT) {
        let text: String = serde_json::to_string_pretty(&first).expect("serialises");
        std::fs::write(&path, format!("{text}\n")).expect("writes rust-signed.json");
    }
}

#[test]
fn committed_rust_signatures_verify_in_rust() {
    let signed: Value = serde_json::from_str(RUST_SIGNED).expect("rust-signed.json parses");
    assert_eq!(list(&signed["signatures"]).len(), 532);
    check_rust_signed(&vectors(), &signed);
}
