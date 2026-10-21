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

//! Replays rust/equivalence/vectors.json (written by generate.ts from the TS
//! implementation) and asserts the Rust port produces the same outputs.
//! Randomness recorded by the TS run is fed back through `ReplayRng`.

use std::collections::{BTreeSet, VecDeque};
use std::fmt::Debug;
use std::sync::OnceLock;

use rand_core::{CryptoRng, RngCore};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Deserializer};
use serde_json::Value;

use crate::address::{check_address_checksum, decode_address, encode_address, validate_address};
use crate::base::{
    base32_decode, base32_encode, base32_validate, base58_decode, base58_encode, base58_validate,
    base64_decode, base64_encode, base64_pad, base64_trim, base64_url_decode, base64_url_encode,
    base64_validate,
};
use crate::error::Error;
use crate::hashing::{
    blake2_as_hex, blake2_as_u8a, hex_hash, hex_hash_array, pbkdf2_encode, sha256_as_u8a,
    sha512_as_u8a,
};
use crate::js::{json_stringify_number, json_stringify_string, JoinValue, JsonValue};
use crate::jwt::{jwt_verify_at, sr25519_jwt_issue_at, JwtIssueOptions, JwtVerifyOptions};
use crate::key::{key_extract_path, key_extract_suri, key_from_path, DeriveJunction, KeypairType};
use crate::keystore::{
    json_decrypt, json_decrypt_data, json_encrypt_format, json_encrypt_with, EncryptedJson,
    EncryptedJsonEncoding,
};
use crate::mnemonic::{
    entropy_to_mnemonic, mnemonic_generate, mnemonic_to_entropy, mnemonic_to_legacy_seed,
    mnemonic_to_mini_secret, mnemonic_to_seed_sync, mnemonic_validate,
};
use crate::nacl::{nacl_decrypt, nacl_encrypt, nacl_secretbox_open};
use crate::random::random_as_hex;
use crate::scrypt::{scrypt_encode, scrypt_from_u8a, ScryptParams};
use crate::secp256k1::{secp256k1_compress, secp256k1_pair_from_seed};
use crate::signature::signature_verify;
use crate::sr25519::{
    sr25519_agreement, sr25519_derive_hard, sr25519_derive_public, sr25519_derive_soft_with_rng,
    sr25519_from_seed, sr25519_sign_with_rng, sr25519_verify, sr25519_vrf_sign_with_rng,
    sr25519_vrf_verify, Keypair,
};
use crate::u8a::{
    compact_add_length, hex_to_u8a, is_hex, u8a_is_wrapped, u8a_to_string, u8a_to_u8a,
    u8a_unwrap_bytes, u8a_wrap_bytes, U8aLike,
};

const VECTORS: &str = include_str!("equivalence/vectors.json");

const SECTIONS: [&str; 47] = [
    "u8a",
    "u8aToString",
    "compactAddLength",
    "wrap",
    "baseDecode",
    "baseEncode",
    "base64Url",
    "base64Strings",
    "blake2",
    "hexHash",
    "sha",
    "hexHashArray",
    "pbkdf2",
    "scrypt",
    "scryptFromU8a",
    "nacl",
    "naclOpen",
    "jsonEncryptFormat",
    "jsonEncrypt",
    "jsonDecrypt",
    "jsonDecryptData",
    "decodeAddress",
    "checksum",
    "encodeAddress",
    "mnemonic",
    "seedSync",
    "entropyToMnemonic",
    "mnemonicGenerate",
    "randomAsHex",
    "deriveJunction",
    "keyExtractPath",
    "keyExtractSuri",
    "keyFromPath",
    "fromSeed",
    "sign",
    "verify",
    "deriveHard",
    "deriveSoft",
    "derivePublic",
    "agreement",
    "vrfSign",
    "vrfVerify",
    "signatureVerify",
    "jwtIssue",
    "jwtVerify",
    "secp256k1Compress",
    "secp256k1PairFromSeed",
];

fn vectors() -> &'static serde_json::Map<String, Value> {
    static PARSED: OnceLock<serde_json::Map<String, Value>> = OnceLock::new();
    PARSED.get_or_init(|| serde_json::from_str(VECTORS).expect("vectors.json parses"))
}

fn section<T: DeserializeOwned>(name: &str) -> Vec<T> {
    let raw: &Value = vectors()
        .get(name)
        .unwrap_or_else(|| panic!("section {name} missing from vectors.json"));
    let cases: Vec<T> = serde_json::from_value(raw.clone())
        .unwrap_or_else(|e: serde_json::Error| panic!("section {name} does not deserialize: {e}"));
    assert!(!cases.is_empty(), "section {name} has no cases");
    cases
}

fn hex(bytes: &[u8]) -> String {
    let digits: String = bytes.iter().map(|b: &u8| format!("{b:02x}")).collect();
    format!("0x{digits}")
}

fn unhex(value: &str) -> Result<Vec<u8>, String> {
    let digits: &str = value
        .strip_prefix("0x")
        .ok_or_else(|| format!("{value:?} is not 0x-prefixed"))?;
    if !digits.len().is_multiple_of(2) {
        return Err(format!("{value:?} has an odd number of digits"));
    }
    (0..digits.len())
        .step_by(2)
        .map(|i: usize| {
            u8::from_str_radix(&digits[i..i + 2], 16)
                .map_err(|e: std::num::ParseIntError| format!("{value:?} is not hex: {e}"))
        })
        .collect()
}

/// Strictly decoded `0x` hex from the vectors.
#[derive(Clone, PartialEq)]
struct Hex(Vec<u8>);

impl Debug for Hex {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&hex(&self.0))
    }
}

impl<'de> Deserialize<'de> for Hex {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let text: String = String::deserialize(deserializer)?;
        unhex(&text).map(Hex).map_err(serde::de::Error::custom)
    }
}

/// generate.ts's `like()`: a `string | Uint8Array` argument.
#[derive(Debug, Deserialize)]
enum Like {
    #[serde(rename = "s")]
    Str(String),
    #[serde(rename = "b")]
    Bytes(Hex),
}

impl Like {
    fn u8a(&self) -> U8aLike<'_> {
        match self {
            Like::Str(s) => U8aLike::Str(s),
            Like::Bytes(b) => U8aLike::Bytes(&b.0),
        }
    }
}

/// generate.ts's `run()`: `{ result }` when the TS returned, `{ error }` when it threw.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
enum Outcome<T> {
    Result(T),
    Error(String),
}

fn check<T: PartialEq + Debug>(context: &str, expected: &Outcome<T>, actual: Result<T, Error>) {
    match (expected, actual) {
        (Outcome::Result(want), Ok(got)) => assert_eq!(&got, want, "{context}"),
        (Outcome::Error(want), Err(got)) => {
            assert_eq!(got.message(), want, "{context}: error message")
        }
        (Outcome::Result(want), Err(got)) => {
            panic!(
                "{context}: TS returned {want:?}, Rust threw {:?}",
                got.message()
            )
        }
        (Outcome::Error(want), Ok(got)) => {
            panic!("{context}: TS threw {want:?}, Rust returned {got:?}")
        }
    }
}

/// Hands each `fill_bytes` call the next random draw recorded by the TS run,
/// requiring the requested length to equal the recorded one.
struct ReplayRng {
    context: String,
    draws: VecDeque<Vec<u8>>,
}

impl ReplayRng {
    fn new(context: &str, draws: &[Hex]) -> Self {
        Self {
            context: context.to_string(),
            draws: draws.iter().map(|d: &Hex| d.0.clone()).collect(),
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
        assert_eq!(
            draw.len(),
            dest.len(),
            "{}: Rust drew a different number of random bytes than TS",
            self.context
        );
        dest.copy_from_slice(&draw);
    }

    fn try_fill_bytes(&mut self, dest: &mut [u8]) -> Result<(), rand_core::Error> {
        self.fill_bytes(dest);
        Ok(())
    }
}

impl CryptoRng for ReplayRng {}

fn replay<T>(
    context: &str,
    draws: &[Hex],
    f: impl FnOnce(&mut ReplayRng) -> Result<T, Error>,
) -> Result<T, Error> {
    let mut rng: ReplayRng = ReplayRng::new(context, draws);
    let result: Result<T, Error> = f(&mut rng);
    if result.is_ok() {
        rng.assert_drained();
    }
    result
}

#[derive(Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct PairJson {
    public_key: String,
    secret_key: String,
}

impl PairJson {
    fn of(pair: &Keypair) -> Self {
        Self {
            public_key: hex(&pair.public_key),
            secret_key: hex(&pair.secret_key),
        }
    }

    fn keypair(&self) -> Keypair {
        Keypair {
            public_key: unhex(&self.public_key).expect("pair publicKey hex"),
            secret_key: unhex(&self.secret_key).expect("pair secretKey hex"),
        }
    }
}

#[test]
fn vectors_cover_every_section() {
    let present: BTreeSet<&str> = vectors().keys().map(String::as_str).collect();
    let expected: BTreeSet<&str> = SECTIONS.into_iter().collect();
    assert_eq!(
        present, expected,
        "sections in vectors.json vs sections replayed here"
    );
    for name in SECTIONS {
        let count: usize = vectors()[name].as_array().map_or(0, Vec::len);
        assert!(count > 0, "section {name} has no cases");
    }
}

// ---------------------------------------------------------------- @polkadot/util helpers

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct U8aCase {
    input: String,
    is_hex: bool,
    hex_to_u8a: String,
    u8a_to_u8a: String,
}

#[derive(Deserialize)]
struct U8aToStringCase {
    input: String,
    result: String,
}

#[derive(Deserialize)]
struct CompactAddLengthCase {
    length: usize,
    result: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WrapCase {
    input: Hex,
    is_wrapped: bool,
    is_wrapped_eth: bool,
    wrap: String,
    unwrap: String,
}

#[test]
fn u8a_helpers() {
    for case in section::<U8aCase>("u8a") {
        let input: &str = &case.input;
        assert_eq!(is_hex(input), case.is_hex, "isHex({input:?})");
        assert_eq!(
            hex(&hex_to_u8a(input)),
            case.hex_to_u8a,
            "hexToU8a({input:?})"
        );
        assert_eq!(
            hex(&u8a_to_u8a(input)),
            case.u8a_to_u8a,
            "u8aToU8a({input:?})"
        );
    }
    for case in section::<U8aToStringCase>("u8aToString") {
        let bytes: Vec<u8> = unhex(&format!("0x{}", case.input)).expect("hex input");
        assert_eq!(
            u8a_to_string(&bytes),
            case.result,
            "u8aToString(0x{})",
            case.input
        );
    }
    for case in section::<CompactAddLengthCase>("compactAddLength") {
        let encoded: String = hex(&compact_add_length(&vec![0u8; case.length]));
        let prefix: String = encoded.chars().take(20).collect();
        assert_eq!(
            prefix, case.result,
            "compactAddLength(length {})",
            case.length
        );
    }
    for case in section::<WrapCase>("wrap") {
        let input: &[u8] = &case.input.0;
        let context: String = hex(input);
        assert_eq!(
            u8a_is_wrapped(input, false),
            case.is_wrapped,
            "u8aIsWrapped({context}, false)"
        );
        assert_eq!(
            u8a_is_wrapped(input, true),
            case.is_wrapped_eth,
            "u8aIsWrapped({context}, true)"
        );
        assert_eq!(
            hex(&u8a_wrap_bytes(input)),
            case.wrap,
            "u8aWrapBytes({context})"
        );
        assert_eq!(
            hex(&u8a_unwrap_bytes(input)),
            case.unwrap,
            "u8aUnwrapBytes({context})"
        );
    }
}

// ---------------------------------------------------------------- base32 / base58 / base64

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BaseDecodeCase {
    codec: String,
    input: String,
    ipfs_compat: bool,
    validate: Outcome<bool>,
    decode: Outcome<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BaseEncodeCase {
    input: Like,
    ipfs_compat: bool,
    base32: String,
    base58: String,
    base64: String,
}

#[derive(Deserialize)]
struct Base64UrlCase {
    input: Like,
    encode: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Base64StringsCase {
    input: String,
    pad: String,
    trim: String,
    url_decode: Outcome<String>,
}

type Validate = fn(&str, bool) -> crate::Result<bool>;
type Decode = fn(&str, bool) -> crate::Result<Vec<u8>>;

#[test]
fn base_codecs() {
    for case in section::<BaseDecodeCase>("baseDecode") {
        let (validate, decode): (Validate, Decode) = match case.codec.as_str() {
            "base32" => (base32_validate, base32_decode),
            "base58" => (base58_validate, base58_decode),
            "base64" => (base64_validate, base64_decode),
            other => panic!("unknown codec {other}"),
        };
        let context: String = format!(
            "{}({:?}, ipfsCompat {})",
            case.codec, case.input, case.ipfs_compat
        );
        check(
            &format!("{context} validate"),
            &case.validate,
            validate(&case.input, case.ipfs_compat),
        );
        check(
            &format!("{context} decode"),
            &case.decode,
            decode(&case.input, case.ipfs_compat).map(|b: Vec<u8>| hex(&b)),
        );
    }
    for case in section::<BaseEncodeCase>("baseEncode") {
        let context: String = format!("{:?}, ipfsCompat {}", case.input, case.ipfs_compat);
        assert_eq!(
            base32_encode(case.input.u8a(), case.ipfs_compat),
            case.base32,
            "base32Encode({context})"
        );
        assert_eq!(
            base58_encode(case.input.u8a(), case.ipfs_compat),
            case.base58,
            "base58Encode({context})"
        );
        assert_eq!(
            base64_encode(case.input.u8a(), case.ipfs_compat),
            case.base64,
            "base64Encode({context})"
        );
    }
    for case in section::<Base64UrlCase>("base64Url") {
        assert_eq!(
            base64_url_encode(case.input.u8a()),
            case.encode,
            "base64URLEncode({:?})",
            case.input
        );
    }
    for case in section::<Base64StringsCase>("base64Strings") {
        let input: &str = &case.input;
        assert_eq!(base64_pad(input), case.pad, "base64Pad({input:?})");
        assert_eq!(base64_trim(input), case.trim, "base64Trim({input:?})");
        check(
            &format!("base64URLDecode({input:?})"),
            &case.url_decode,
            base64_url_decode(input).map(|b: Vec<u8>| hex(&b)),
        );
    }
}

// ---------------------------------------------------------------- hashing

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Blake2Case {
    data: Like,
    bit_length: u32,
    key: Option<Hex>,
    result: Outcome<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HexHashCase {
    data: Like,
    default: String,
    bits512: String,
    as_hex: String,
}

#[derive(Deserialize)]
struct ShaCase {
    data: Hex,
    sha256: String,
    sha512: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
enum JoinInput {
    Str(String),
    Num(String),
    Bool(bool),
    Nullish(()),
    Arr(Vec<JoinInput>),
}

impl JoinInput {
    /// generate.ts's `toJoinValue`, where numbers go through `Number(text)`.
    fn value(&self) -> JoinValue {
        match self {
            JoinInput::Str(s) => JoinValue::String(s.clone()),
            JoinInput::Num(text) => JoinValue::Number(
                text.parse::<f64>()
                    .unwrap_or_else(|_| panic!("number {text:?}")),
            ),
            JoinInput::Bool(b) => JoinValue::Bool(*b),
            JoinInput::Nullish(()) => JoinValue::Nullish,
            JoinInput::Arr(items) => JoinValue::Array(items.iter().map(JoinInput::value).collect()),
        }
    }
}

#[derive(Deserialize)]
struct HexHashArrayCase {
    items: JoinInput,
    result: String,
}

#[derive(Deserialize)]
struct Pbkdf2Case {
    passphrase: Like,
    salt: Hex,
    rounds: u32,
    result: Outcome<String>,
}

#[derive(Deserialize)]
struct ScryptCase {
    passphrase: Like,
    salt: Hex,
    params: ScryptParams,
    result: Outcome<String>,
}

#[derive(Debug, Deserialize, PartialEq)]
struct ScryptFromU8aJson {
    #[serde(rename = "N")]
    n: u32,
    p: u32,
    r: u32,
    salt: String,
}

#[derive(Deserialize)]
struct ScryptFromU8aCase {
    data: Hex,
    result: Outcome<ScryptFromU8aJson>,
}

#[test]
fn blake2_hex_hash_and_sha() {
    for case in section::<Blake2Case>("blake2") {
        let key: Option<&[u8]> = case.key.as_ref().map(|k: &Hex| k.0.as_slice());
        check(
            &format!(
                "blake2AsU8a({:?}, {}, {:?})",
                case.data,
                case.bit_length,
                key.map(hex)
            ),
            &case.result,
            blake2_as_u8a(case.data.u8a(), case.bit_length, key).map(|h: Vec<u8>| hex(&h)),
        );
    }
    for case in section::<HexHashCase>("hexHash") {
        let context: String = format!("{:?}", case.data);
        assert_eq!(
            hex_hash(case.data.u8a(), None).expect("hexHash"),
            case.default,
            "hexHash({context})"
        );
        assert_eq!(
            hex_hash(case.data.u8a(), Some(512)).expect("hexHash 512"),
            case.bits512,
            "hexHash({context}, 512)"
        );
        assert_eq!(
            blake2_as_hex(case.data.u8a(), 128, None).expect("blake2AsHex"),
            case.as_hex,
            "blake2AsHex({context}, 128)"
        );
    }
    for case in section::<ShaCase>("sha") {
        let context: String = hex(&case.data.0);
        assert_eq!(
            hex(&sha256_as_u8a(&case.data.0)),
            case.sha256,
            "sha256AsU8a({context})"
        );
        assert_eq!(
            hex(&sha512_as_u8a(&case.data.0)),
            case.sha512,
            "sha512AsU8a({context})"
        );
    }
    for case in section::<HexHashArrayCase>("hexHashArray") {
        let JoinValue::Array(items) = case.items.value() else {
            panic!("hexHashArray items must be an array: {:?}", case.items);
        };
        assert_eq!(
            hex_hash_array(&items).expect("hexHashArray"),
            case.result,
            "hexHashArray({:?})",
            case.items
        );
    }
}

#[test]
fn pbkdf2_and_scrypt() {
    for case in section::<Pbkdf2Case>("pbkdf2") {
        check(
            &format!(
                "pbkdf2Encode({:?}, {}, {})",
                case.passphrase,
                hex(&case.salt.0),
                case.rounds
            ),
            &case.result,
            pbkdf2_encode(case.passphrase.u8a(), &case.salt.0, case.rounds)
                .map(|r| hex(&r.password)),
        );
    }
    for case in section::<ScryptCase>("scrypt") {
        check(
            &format!(
                "scryptEncode({:?}, {}, {:?})",
                case.passphrase,
                hex(&case.salt.0),
                case.params
            ),
            &case.result,
            scrypt_encode(case.passphrase.u8a(), &case.salt.0, case.params)
                .map(|r| hex(&r.password)),
        );
    }
    for case in section::<ScryptFromU8aCase>("scryptFromU8a") {
        check(
            &format!("scryptFromU8a({})", hex(&case.data.0)),
            &case.result,
            scrypt_from_u8a(&case.data.0).map(|r| ScryptFromU8aJson {
                n: r.params.n,
                p: r.params.p,
                r: r.params.r,
                salt: hex(&r.salt),
            }),
        );
    }
}

// ---------------------------------------------------------------- nacl

#[derive(Deserialize)]
struct NaclCase {
    message: Hex,
    secret: Hex,
    nonce: Hex,
    encrypted: Outcome<String>,
    decrypted: Option<Outcome<Option<String>>>,
}

#[derive(Deserialize)]
struct NaclOpenCase {
    sealed: Hex,
    nonce: Hex,
    key: Hex,
    result: Outcome<Option<String>>,
}

#[test]
fn nacl_secretbox() {
    for case in section::<NaclCase>("nacl") {
        let context: String = format!(
            "naclEncrypt({}, secret {}, nonce {})",
            hex(&case.message.0),
            hex(&case.secret.0),
            hex(&case.nonce.0)
        );
        let encrypted: Result<String, Error> =
            nacl_encrypt(&case.message.0, &case.secret.0, &case.nonce.0).map(|e| hex(&e.encrypted));
        check(&context, &case.encrypted, encrypted.clone());
        match (&case.decrypted, encrypted) {
            (Some(expected), Ok(sealed)) => check(
                &format!("naclDecrypt of {context}"),
                expected,
                nacl_decrypt(
                    &unhex(&sealed).expect("sealed hex"),
                    &case.nonce.0,
                    &case.secret.0,
                )
                .map(|out: Option<Vec<u8>>| out.as_deref().map(hex)),
            ),
            (None, Err(_)) => {}
            (expected, got) => {
                panic!("{context}: decrypt expectation {expected:?} vs encrypt {got:?}")
            }
        }
    }
    for case in section::<NaclOpenCase>("naclOpen") {
        check(
            &format!(
                "naclSecretboxOpen({}, {}, {})",
                hex(&case.sealed.0),
                hex(&case.nonce.0),
                hex(&case.key.0)
            ),
            &case.result,
            nacl_secretbox_open(&case.sealed.0, &case.nonce.0, &case.key.0)
                .map(|out: Option<Vec<u8>>| out.as_deref().map(hex)),
        );
    }
}

// ---------------------------------------------------------------- keystore

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonEncryptFormatCase {
    data: Hex,
    content_type: Vec<String>,
    is_encrypted: bool,
    result: Value,
}

#[derive(Deserialize)]
struct DecryptAttempt {
    passphrase: Option<String>,
    result: Option<Outcome<String>>,
}

#[derive(Deserialize)]
struct JsonEncryptCase {
    data: Hex,
    passphrase: Option<String>,
    random: Vec<Hex>,
    result: Value,
    decrypt: Vec<DecryptAttempt>,
}

#[derive(Deserialize)]
struct JsonDecryptCase {
    json: EncryptedJson,
    passphrase: Option<String>,
    result: Outcome<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonDecryptDataCase {
    encrypted: Option<Hex>,
    passphrase: Option<String>,
    enc_type: Vec<EncryptedJsonEncoding>,
    result: Outcome<String>,
}

const KEYSTORE_CONTENT: [&str; 2] = ["pkcs8", "sr25519"];

#[test]
fn keystore_json() {
    for case in section::<JsonEncryptFormatCase>("jsonEncryptFormat") {
        let json: EncryptedJson =
            json_encrypt_format(&case.data.0, &case.content_type, case.is_encrypted);
        assert_eq!(
            serde_json::to_value(&json).expect("serializes"),
            case.result,
            "jsonEncryptFormat({}, {:?}, {})",
            hex(&case.data.0),
            case.content_type,
            case.is_encrypted
        );
    }
    let content: Vec<String> = KEYSTORE_CONTENT
        .iter()
        .map(|s: &&str| s.to_string())
        .collect();
    for case in section::<JsonEncryptCase>("jsonEncrypt") {
        let context: String = format!("jsonEncrypt(passphrase {:?})", case.passphrase);
        // TS draws the 32-byte scrypt salt, then the 24-byte nonce, and draws nothing without a passphrase.
        let (salt, nonce): (Vec<u8>, Vec<u8>) = match case.random.as_slice() {
            [salt, nonce] => (salt.0.clone(), nonce.0.clone()),
            [] => (Vec::new(), Vec::new()),
            other => panic!("{context}: unexpected draws {other:?}"),
        };
        assert_eq!(
            case.random.is_empty(),
            case.passphrase.as_deref().is_none_or(str::is_empty),
            "{context}: draws only with a passphrase"
        );
        let json: EncryptedJson = json_encrypt_with(
            &case.data.0,
            &content,
            case.passphrase.as_deref(),
            &salt,
            &nonce,
        )
        .unwrap_or_else(|e: Error| panic!("{context}: {}", e.message()));
        assert_eq!(
            serde_json::to_value(&json).expect("serializes"),
            case.result,
            "{context}"
        );
        let ts_json: EncryptedJson =
            serde_json::from_value(case.result.clone()).expect("TS keystore json");
        for attempt in &case.decrypt {
            let expected: &Outcome<String> =
                attempt.result.as_ref().expect("TS produced a keystore");
            check(
                &format!(
                    "{context} then jsonDecrypt(passphrase {:?})",
                    attempt.passphrase
                ),
                expected,
                json_decrypt(&ts_json, attempt.passphrase.as_deref()).map(|d: Vec<u8>| hex(&d)),
            );
        }
    }
    for case in section::<JsonDecryptCase>("jsonDecrypt") {
        check(
            &format!("jsonDecrypt({:?}, {:?})", case.json, case.passphrase),
            &case.result,
            json_decrypt(&case.json, case.passphrase.as_deref()).map(|d: Vec<u8>| hex(&d)),
        );
    }
    for case in section::<JsonDecryptDataCase>("jsonDecryptData") {
        let encrypted: Option<&[u8]> = case.encrypted.as_ref().map(|e: &Hex| e.0.as_slice());
        check(
            &format!(
                "jsonDecryptData({:?}, {:?}, {:?})",
                encrypted.map(hex),
                case.passphrase,
                case.enc_type
            ),
            &case.result,
            json_decrypt_data(encrypted, case.passphrase.as_deref(), &case.enc_type)
                .map(|d: Vec<u8>| hex(&d)),
        );
    }
}

// ---------------------------------------------------------------- addresses

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DecodeAddressCase {
    encoded: Like,
    ignore_checksum: bool,
    ss58_format: i32,
    result: Outcome<String>,
    validate: Option<Outcome<bool>>,
}

#[derive(Deserialize)]
struct ChecksumCase {
    decoded: Hex,
    result: Outcome<(bool, usize, usize, u16)>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EncodeAddressCase {
    key: Like,
    ss58_format: i32,
    result: Outcome<String>,
}

#[test]
fn ss58_addresses() {
    for case in section::<DecodeAddressCase>("decodeAddress") {
        let context: String = format!(
            "({:?}, ignoreChecksum {}, ss58Format {})",
            case.encoded, case.ignore_checksum, case.ss58_format
        );
        check(
            &format!("decodeAddress{context}"),
            &case.result,
            decode_address(
                Some(case.encoded.u8a()),
                case.ignore_checksum,
                Some(case.ss58_format),
            )
            .map(|d: Vec<u8>| hex(&d)),
        );
        match (&case.encoded, &case.validate) {
            (Like::Str(address), Some(expected)) => check(
                &format!("validateAddress{context}"),
                expected,
                validate_address(Some(address), case.ignore_checksum, Some(case.ss58_format)),
            ),
            (Like::Bytes(_), None) => {}
            (encoded, validate) => panic!("unexpected validate {validate:?} for {encoded:?}"),
        }
    }
    for case in section::<ChecksumCase>("checksum") {
        check(
            &format!("checkAddressChecksum({})", hex(&case.decoded.0)),
            &case.result,
            check_address_checksum(&case.decoded.0),
        );
    }
    for case in section::<EncodeAddressCase>("encodeAddress") {
        check(
            &format!("encodeAddress({:?}, {})", case.key, case.ss58_format),
            &case.result,
            encode_address(case.key.u8a(), case.ss58_format),
        );
    }
}

// ---------------------------------------------------------------- mnemonic

#[derive(Deserialize)]
struct MiniSecretAttempt {
    password: String,
    result: Outcome<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacySeedAttempt {
    byte_length: u32,
    result: Outcome<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MnemonicCase {
    mnemonic: String,
    entropy: Outcome<String>,
    valid: bool,
    mini_secret: Vec<MiniSecretAttempt>,
    legacy_seed: Vec<LegacySeedAttempt>,
}

#[derive(Deserialize)]
struct SeedSyncCase {
    mnemonic: String,
    password: String,
    result: String,
}

#[derive(Deserialize)]
struct EntropyToMnemonicCase {
    entropy: Hex,
    result: Outcome<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MnemonicGenerateCase {
    num_words: usize,
    random: Vec<Hex>,
    #[serde(flatten)]
    outcome: Outcome<String>,
}

#[derive(Deserialize)]
struct RandomAsHexCase {
    length: usize,
    random: Vec<Hex>,
    #[serde(flatten)]
    outcome: Outcome<String>,
}

#[test]
fn mnemonics() {
    for case in section::<MnemonicCase>("mnemonic") {
        let mnemonic: &str = &case.mnemonic;
        check(
            &format!("mnemonicToEntropy({mnemonic:?})"),
            &case.entropy,
            mnemonic_to_entropy(mnemonic, None).map(|e: Vec<u8>| hex(&e)),
        );
        assert_eq!(
            mnemonic_validate(mnemonic, None),
            case.valid,
            "mnemonicValidate({mnemonic:?})"
        );
        for attempt in &case.mini_secret {
            check(
                &format!("mnemonicToMiniSecret({mnemonic:?}, {:?})", attempt.password),
                &attempt.result,
                mnemonic_to_mini_secret(mnemonic, &attempt.password, None)
                    .map(|s: Vec<u8>| hex(&s)),
            );
        }
        for attempt in &case.legacy_seed {
            check(
                &format!(
                    "mnemonicToLegacySeed({mnemonic:?}, \"\", {})",
                    attempt.byte_length
                ),
                &attempt.result,
                mnemonic_to_legacy_seed(mnemonic, "", attempt.byte_length)
                    .map(|s: Vec<u8>| hex(&s)),
            );
        }
    }
    for case in section::<SeedSyncCase>("seedSync") {
        let seed: Vec<u8> =
            mnemonic_to_seed_sync(&case.mnemonic, &case.password).expect("mnemonicToSeedSync");
        assert_eq!(
            hex(&seed),
            case.result,
            "mnemonicToSeedSync({:?}, {:?})",
            case.mnemonic,
            case.password
        );
    }
    for case in section::<EntropyToMnemonicCase>("entropyToMnemonic") {
        check(
            &format!("entropyToMnemonic({})", hex(&case.entropy.0)),
            &case.result,
            entropy_to_mnemonic(&case.entropy.0, None),
        );
    }
}

/// `mnemonic_generate` and `random_as_hex` draw from `OsRng` with no injection
/// point, so the recorded draw is replayed through the function they compose
/// (`entropy_to_mnemonic` / hex encoding), the draw length is checked against
/// the Rust formula, and the live function is checked for the same shape.
#[test]
fn random_generation() {
    for case in section::<MnemonicGenerateCase>("mnemonicGenerate") {
        let context: String = format!("mnemonicGenerate({})", case.num_words);
        let [entropy] = case.random.as_slice() else {
            panic!(
                "{context}: expected exactly one draw, got {:?}",
                case.random
            );
        };
        assert_eq!(
            entropy.0.len(),
            case.num_words * 4 / 3,
            "{context}: entropy length"
        );
        check(
            &context,
            &case.outcome,
            entropy_to_mnemonic(&entropy.0, None),
        );
        let live: Result<String, Error> = mnemonic_generate(case.num_words, None);
        match (&case.outcome, live) {
            (Outcome::Result(_), Ok(words)) => {
                assert_eq!(
                    words.split(' ').count(),
                    case.num_words,
                    "{context}: live word count"
                );
                assert!(
                    mnemonic_validate(&words, None),
                    "{context}: live mnemonic validates"
                );
            }
            (Outcome::Error(want), Err(got)) => {
                assert_eq!(got.message(), want, "{context}: live error")
            }
            (want, got) => panic!("{context}: TS {want:?}, live Rust {got:?}"),
        }
    }
    for case in section::<RandomAsHexCase>("randomAsHex") {
        let context: String = format!("randomAsHex({})", case.length);
        let [draw] = case.random.as_slice() else {
            panic!(
                "{context}: expected exactly one draw, got {:?}",
                case.random
            );
        };
        assert_eq!(draw.0.len(), case.length, "{context}: draw length");
        check(&context, &case.outcome, Ok(hex(&draw.0)));
        assert_eq!(
            random_as_hex(case.length).len(),
            2 + 2 * case.length,
            "{context}: live length"
        );
    }
}

// ---------------------------------------------------------------- key derivation

#[derive(Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct JunctionJson {
    chain_code: String,
    is_hard: bool,
}

impl JunctionJson {
    fn of(junction: &DeriveJunction) -> Self {
        Self {
            chain_code: hex(junction.chain_code()),
            is_hard: junction.is_hard(),
        }
    }
}

#[derive(Deserialize)]
struct DeriveJunctionCase {
    code: String,
    result: Outcome<JunctionJson>,
}

#[derive(Debug, Deserialize, PartialEq)]
struct ExtractPathJson {
    parts: Option<Vec<String>>,
    path: Vec<JunctionJson>,
}

#[derive(Deserialize)]
struct KeyExtractPathCase {
    path: String,
    result: Outcome<ExtractPathJson>,
}

#[derive(Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct ExtractSuriJson {
    derive_path: String,
    password: Option<String>,
    path: Vec<JunctionJson>,
    phrase: String,
}

#[derive(Deserialize)]
struct KeyExtractSuriCase {
    suri: String,
    result: Outcome<ExtractSuriJson>,
}

#[derive(Deserialize)]
struct KeyFromPathCase {
    pair: PairJson,
    path: String,
    #[serde(rename = "type")]
    kind: String,
    random: Vec<Hex>,
    #[serde(flatten)]
    outcome: Outcome<PairJson>,
}

#[test]
fn key_derivation_paths() {
    for case in section::<DeriveJunctionCase>("deriveJunction") {
        check(
            &format!("DeriveJunction.from({:?})", case.code),
            &case.result,
            DeriveJunction::from(&case.code).map(|j: DeriveJunction| JunctionJson::of(&j)),
        );
    }
    for case in section::<KeyExtractPathCase>("keyExtractPath") {
        check(
            &format!("keyExtractPath({:?})", case.path),
            &case.result,
            key_extract_path(&case.path).map(|r| ExtractPathJson {
                parts: r.parts,
                path: r.path.iter().map(JunctionJson::of).collect(),
            }),
        );
    }
    for case in section::<KeyExtractSuriCase>("keyExtractSuri") {
        check(
            &format!("keyExtractSuri({:?})", case.suri),
            &case.result,
            key_extract_suri(&case.suri).map(|r| ExtractSuriJson {
                derive_path: r.derive_path,
                password: r.password,
                path: r.path.iter().map(JunctionJson::of).collect(),
                phrase: r.phrase,
            }),
        );
    }
    for case in section::<KeyFromPathCase>("keyFromPath") {
        let context: String = format!(
            "keyFromPath({:?}, {:?}, {})",
            case.pair.public_key, case.path, case.kind
        );
        let kind: KeypairType =
            KeypairType::parse(&case.kind).unwrap_or_else(|| panic!("{context}: type"));
        let path: Vec<DeriveJunction> = key_extract_path(&case.path).expect("valid path").path;
        let pair: Keypair = case.pair.keypair();
        let derived: Result<PairJson, Error> =
            replay(&context, &case.random, |rng: &mut ReplayRng| {
                key_from_path_replaying(&pair, &path, kind, rng)
            });
        check(&context, &case.outcome, derived);
        let live_public_key: Result<String, Error> =
            key_from_path(&pair, &path, kind).map(|p: Keypair| hex(&p.public_key));
        let expected_public_key: Outcome<String> = match &case.outcome {
            Outcome::Result(p) => Outcome::Result(p.public_key.clone()),
            Outcome::Error(e) => Outcome::Error(e.clone()),
        };
        check(
            &format!("{context} (live, public key)"),
            &expected_public_key,
            live_public_key,
        );
    }
}

/// `key_from_path` with soft junctions taking their randomness from `rng`
/// (`key_from_path` itself has no injection point); hard junctions and
/// non-sr25519 types go through `key_from_path` unchanged.
fn key_from_path_replaying(
    pair: &Keypair,
    path: &[DeriveJunction],
    kind: KeypairType,
    rng: &mut ReplayRng,
) -> Result<PairJson, Error> {
    if kind != KeypairType::Sr25519 || path.iter().all(DeriveJunction::is_hard) {
        return key_from_path(pair, path, kind).map(|p: Keypair| PairJson::of(&p));
    }
    let mut result: Keypair = pair.clone();
    for junction in path {
        result = if junction.is_hard() {
            key_from_path(&result, std::slice::from_ref(junction), kind)?
        } else {
            sr25519_derive_soft_with_rng(&result, junction.chain_code(), &mut *rng)?
        };
    }
    Ok(PairJson::of(&result))
}

// ---------------------------------------------------------------- sr25519

#[derive(Deserialize)]
struct FromSeedCase {
    seed: Like,
    result: Outcome<PairJson>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SignCase {
    message: Like,
    secret_key: Hex,
    random: Option<Hex>,
    #[serde(flatten)]
    outcome: Outcome<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct VerifyCase {
    message: Like,
    signature: Like,
    public_key: Like,
    result: Outcome<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeriveHardCase {
    pair: PairJson,
    chain_code: Hex,
    result: Outcome<PairJson>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeriveSoftCase {
    pair: PairJson,
    chain_code: Hex,
    random: Option<Hex>,
    #[serde(flatten)]
    outcome: Outcome<PairJson>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DerivePublicCase {
    public_key: Like,
    chain_code: Hex,
    result: Outcome<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgreementCase {
    secret_key: Like,
    public_key: Like,
    result: Outcome<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct VrfSignCase {
    message: Like,
    secret_key: Hex,
    context: Like,
    extra: Like,
    random: Option<Hex>,
    #[serde(flatten)]
    outcome: Outcome<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct VrfVerifyCase {
    message: Like,
    output: Like,
    public_key: Like,
    context: Like,
    extra: Like,
    result: Outcome<bool>,
}

fn draws(random: &Option<Hex>) -> Vec<Hex> {
    random.iter().cloned().collect()
}

#[test]
fn sr25519_keys_and_signatures() {
    for case in section::<FromSeedCase>("fromSeed") {
        check(
            &format!("sr25519FromSeed({:?})", case.seed),
            &case.result,
            sr25519_from_seed(case.seed.u8a()).map(|p: Keypair| PairJson::of(&p)),
        );
    }
    for case in section::<SignCase>("sign") {
        let context: String = format!(
            "sr25519Sign({:?}, {})",
            case.message,
            hex(&case.secret_key.0)
        );
        let signature: Result<String, Error> =
            replay(&context, &draws(&case.random), |rng: &mut ReplayRng| {
                sr25519_sign_with_rng(case.message.u8a(), &case.secret_key.0, rng)
                    .map(|s: Vec<u8>| hex(&s))
            });
        check(&context, &case.outcome, signature);
    }
    for case in section::<VerifyCase>("verify") {
        check(
            &format!(
                "sr25519Verify({:?}, {:?}, {:?})",
                case.message, case.signature, case.public_key
            ),
            &case.result,
            sr25519_verify(
                case.message.u8a(),
                case.signature.u8a(),
                case.public_key.u8a(),
            ),
        );
    }
}

#[test]
fn sr25519_derivation_and_agreement() {
    for case in section::<DeriveHardCase>("deriveHard") {
        check(
            &format!(
                "sr25519DeriveHard({:?}, {})",
                case.pair,
                hex(&case.chain_code.0)
            ),
            &case.result,
            sr25519_derive_hard(&case.pair.keypair(), &case.chain_code.0)
                .map(|p: Keypair| PairJson::of(&p)),
        );
    }
    for case in section::<DeriveSoftCase>("deriveSoft") {
        let context: String = format!(
            "sr25519DeriveSoft({:?}, {})",
            case.pair,
            hex(&case.chain_code.0)
        );
        let pair: Keypair = case.pair.keypair();
        let derived: Result<PairJson, Error> =
            replay(&context, &draws(&case.random), |rng: &mut ReplayRng| {
                sr25519_derive_soft_with_rng(&pair, &case.chain_code.0, rng)
                    .map(|p: Keypair| PairJson::of(&p))
            });
        check(&context, &case.outcome, derived);
    }
    for case in section::<DerivePublicCase>("derivePublic") {
        check(
            &format!(
                "sr25519DerivePublic({:?}, {})",
                case.public_key,
                hex(&case.chain_code.0)
            ),
            &case.result,
            sr25519_derive_public(case.public_key.u8a(), &case.chain_code.0)
                .map(|p: Vec<u8>| hex(&p)),
        );
    }
    for case in section::<AgreementCase>("agreement") {
        check(
            &format!(
                "sr25519Agreement({:?}, {:?})",
                case.secret_key, case.public_key
            ),
            &case.result,
            sr25519_agreement(case.secret_key.u8a(), case.public_key.u8a())
                .map(|a: Vec<u8>| hex(&a)),
        );
    }
}

#[test]
fn sr25519_vrf() {
    for case in section::<VrfSignCase>("vrfSign") {
        let context: String = format!(
            "sr25519VrfSign({:?}, {}, {:?}, {:?})",
            case.message,
            hex(&case.secret_key.0),
            case.context,
            case.extra
        );
        let output: Result<String, Error> =
            replay(&context, &draws(&case.random), |rng: &mut ReplayRng| {
                sr25519_vrf_sign_with_rng(
                    case.message.u8a(),
                    &case.secret_key.0,
                    case.context.u8a(),
                    case.extra.u8a(),
                    rng,
                )
                .map(|o: Vec<u8>| hex(&o))
            });
        check(&context, &case.outcome, output);
    }
    for case in section::<VrfVerifyCase>("vrfVerify") {
        check(
            &format!(
                "sr25519VrfVerify({:?}, {:?}, {:?}, {:?}, {:?})",
                case.message, case.output, case.public_key, case.context, case.extra
            ),
            &case.result,
            sr25519_vrf_verify(
                case.message.u8a(),
                case.output.u8a(),
                case.public_key.u8a(),
                case.context.u8a(),
                case.extra.u8a(),
            ),
        );
    }
}

// ---------------------------------------------------------------- signatureVerify

#[derive(Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct VerifyResultJson {
    crypto: String,
    is_valid: bool,
    is_wrapped: bool,
    public_key: String,
}

#[derive(Deserialize)]
struct SignatureVerifyCase {
    message: Like,
    signature: Like,
    address: Like,
    result: Outcome<VerifyResultJson>,
}

fn crypto_name(crypto: Option<KeypairType>) -> String {
    crypto
        .map_or("none", |k: KeypairType| k.as_str())
        .to_string()
}

#[test]
fn signature_verify_detection() {
    for case in section::<SignatureVerifyCase>("signatureVerify") {
        check(
            &format!(
                "signatureVerify({:?}, {:?}, {:?})",
                case.message, case.signature, case.address
            ),
            &case.result,
            signature_verify(case.message.u8a(), case.signature.u8a(), case.address.u8a()).map(
                |r| VerifyResultJson {
                    crypto: crypto_name(r.crypto),
                    is_valid: r.is_valid,
                    is_wrapped: r.is_wrapped,
                    public_key: hex(&r.public_key),
                },
            ),
        );
    }
}

// ---------------------------------------------------------------- JWT

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct JwtIssueCase {
    name: String,
    now_ms: f64,
    pair: PairJson,
    expires_in: Option<f64>,
    not_before: Option<f64>,
    message: Vec<(String, String)>,
    random: Option<Hex>,
    #[serde(flatten)]
    outcome: Outcome<String>,
}

#[derive(Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
struct JwtVerifyJson {
    is_valid: bool,
    error: Option<String>,
    crypto: String,
    public_key: String,
    is_wrapped: bool,
    payload: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct JwtVerifyCase {
    name: String,
    token: String,
    public_key: Hex,
    now_ms: f64,
    audience: Option<Vec<String>>,
    require_audience: bool,
    max_lifetime_seconds: Option<f64>,
    #[serde(flatten)]
    outcome: Outcome<JwtVerifyJson>,
}

/// `JSON.stringify` of a parsed JSON value.
fn json_stringify(value: &JsonValue) -> String {
    match value {
        JsonValue::Null => "null".to_string(),
        JsonValue::Bool(b) => b.to_string(),
        JsonValue::Number(n) => json_stringify_number(*n),
        JsonValue::String(s) => json_stringify_string(s),
        JsonValue::Array(items) => {
            let inner: Vec<String> = items.iter().map(json_stringify).collect();
            format!("[{}]", inner.join(","))
        }
        JsonValue::Object(entries) => {
            let inner: Vec<String> = entries
                .iter()
                .map(|(k, v): &(String, JsonValue)| {
                    format!("{}:{}", json_stringify_string(k), json_stringify(v))
                })
                .collect();
            format!("{{{}}}", inner.join(","))
        }
    }
}

#[test]
fn jwt_issue() {
    for case in section::<JwtIssueCase>("jwtIssue") {
        let context: String = format!("sr25519jwtIssue {} at {}", case.name, case.now_ms);
        let pair: Keypair = case.pair.keypair();
        let options: JwtIssueOptions = JwtIssueOptions {
            expires_in: case.expires_in,
            not_before: case.not_before,
        };
        let token: Result<String, Error> =
            replay(&context, &draws(&case.random), |rng: &mut ReplayRng| {
                sr25519_jwt_issue_at(
                    &pair.public_key,
                    &pair.secret_key,
                    &options,
                    &case.message,
                    case.now_ms,
                    rng,
                )
            });
        check(&context, &case.outcome, token);
    }
}

#[test]
fn jwt_verify() {
    for case in section::<JwtVerifyCase>("jwtVerify") {
        let context: String = format!(
            "jwtVerify {} with key {} at {} (audience {:?}, requireAudience {}, maxLifetime {:?})",
            case.name,
            hex(&case.public_key.0),
            case.now_ms,
            case.audience,
            case.require_audience,
            case.max_lifetime_seconds
        );
        let options: JwtVerifyOptions = JwtVerifyOptions {
            audience: case.audience.clone(),
            require_audience: case.require_audience,
            max_lifetime_seconds: case.max_lifetime_seconds,
        };
        check(
            &context,
            &case.outcome,
            jwt_verify_at(&case.token, &case.public_key.0, &options, case.now_ms).map(|r| {
                JwtVerifyJson {
                    is_valid: r.is_valid,
                    error: r.error,
                    crypto: crypto_name(r.crypto),
                    public_key: hex(&r.public_key),
                    is_wrapped: r.is_wrapped,
                    payload: r.payload.as_ref().map(json_stringify),
                }
            }),
        );
    }
}

// ---------------------------------------------------------------- secp256k1

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Secp256k1CompressCase {
    public_key: Hex,
    result: Outcome<String>,
}

#[derive(Deserialize)]
struct Secp256k1PairCase {
    seed: Hex,
    result: Outcome<PairJson>,
}

#[test]
fn secp256k1() {
    for case in section::<Secp256k1CompressCase>("secp256k1Compress") {
        check(
            &format!("secp256k1Compress({})", hex(&case.public_key.0)),
            &case.result,
            secp256k1_compress(&case.public_key.0).map(|k: Vec<u8>| hex(&k)),
        );
    }
    for case in section::<Secp256k1PairCase>("secp256k1PairFromSeed") {
        check(
            &format!("secp256k1PairFromSeed({})", hex(&case.seed.0)),
            &case.result,
            secp256k1_pair_from_seed(&case.seed.0).map(|p: Keypair| PairJson::of(&p)),
        );
    }
}
