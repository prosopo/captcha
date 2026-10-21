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

//! pair/: `createPair` and the inert `nobody` pair, with the PKCS#8 encoding they export.

use crate::defaults::{PAIR_DIV, PAIR_HDR, PUB_LENGTH, SALT_LENGTH, SEC_LENGTH, SEED_LENGTH};
use crate::error::{err, Result};
use prosopo_types::keyring::{KeyringPairJson, KeyringPairMeta};
use prosopo_util_crypto::address::{encode_address, Prefix, DEFAULT_PREFIX};
use prosopo_util_crypto::jwt::now_millis;
use prosopo_util_crypto::keystore::{
    json_decrypt_data, json_encrypt_format, EncodingType, EncryptedJsonDescriptor,
    EncryptedJsonEncoding, ENCODING,
};
use prosopo_util_crypto::nacl::{nacl_encrypt, NONCE_LENGTH};
use prosopo_util_crypto::scrypt::{scrypt_encode, scrypt_to_u8a, DEFAULT_PARAMS};
use prosopo_util_crypto::sr25519::{sr25519_sign_with_rng, sr25519_vrf_sign_with_rng};
use prosopo_util_crypto::u8a::u8a_to_u8a;
use prosopo_util_crypto::{
    jwt_verify_at, key_extract_path, key_from_path, signature_verify, sr25519_from_seed,
    sr25519_jwt_issue_at, sr25519_vrf_verify, Jwt, JwtIssueOptions, JwtVerifyOptions,
    JwtVerifyResult, Keypair, KeypairType, U8aLike,
};
use rand_core::{CryptoRng, OsRng, RngCore};
use serde_json::{json, Value};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, LazyLock, Mutex, MutexGuard, RwLock};

const SEED_OFFSET: usize = PAIR_HDR.len();

/// `TYPE_PREFIX.sr25519`, the MultiSignature indicator `sign({ withType: true })` prepends.
const SR25519_SIGNATURE_PREFIX: u8 = 1;

const LOCKED_SIGN: &str = "Cannot sign with a locked key pair";

/// The keyring's SS58 format. Pairs read it each time they encode their address, so a later
/// `setSS58Format` changes the address of pairs already made, as the TS closure does.
#[derive(Clone, Debug, Default)]
pub(crate) struct Ss58(Arc<RwLock<Option<Prefix>>>);

impl Ss58 {
    pub(crate) fn new(format: Option<Prefix>) -> Ss58 {
        Ss58(Arc::new(RwLock::new(format)))
    }

    pub(crate) fn set(&self, format: Prefix) {
        *self.0.write().expect("ss58 lock") = Some(format);
    }

    /// The keyring's `encodeAddress(address, ss58Format)`.
    pub(crate) fn encode(&self, key: U8aLike<'_>, format: Option<Prefix>) -> Result<String> {
        let configured: Option<Prefix> = *self.0.read().expect("ss58 lock");
        Ok(encode_address(
            key,
            format.or(configured).unwrap_or(DEFAULT_PREFIX),
        )?)
    }
}

fn sub(data: &[u8], start: usize, end: usize) -> &[u8] {
    &data[start.min(data.len())..end.min(data.len())]
}

/// `decodePair`: the public and secret key inside an exported pair, of any generation.
pub fn decode_pair(
    passphrase: Option<&str>,
    encrypted: Option<&[u8]>,
    enc_type: Option<&[EncryptedJsonEncoding]>,
) -> Result<(Vec<u8>, Vec<u8>)> {
    let decrypted: Vec<u8> =
        json_decrypt_data(encrypted, passphrase, enc_type.unwrap_or(&ENCODING))?;
    if sub(&decrypted, 0, PAIR_HDR.len()) != PAIR_HDR {
        return err("Invalid encoding header found in body");
    }
    let mut secret_key: &[u8] = sub(&decrypted, SEED_OFFSET, SEED_OFFSET + SEC_LENGTH);
    let mut div_offset: usize = SEED_OFFSET + SEC_LENGTH;
    if sub(&decrypted, div_offset, div_offset + PAIR_DIV.len()) != PAIR_DIV {
        div_offset = SEED_OFFSET + SEED_LENGTH;
        secret_key = sub(&decrypted, SEED_OFFSET, div_offset);
        if sub(&decrypted, div_offset, div_offset + PAIR_DIV.len()) != PAIR_DIV {
            return err("Invalid encoding divider found in body");
        }
    }
    let pub_offset: usize = div_offset + PAIR_DIV.len();
    let public_key: &[u8] = sub(&decrypted, pub_offset, pub_offset + PUB_LENGTH);
    Ok((public_key.to_vec(), secret_key.to_vec()))
}

/// `encodePair`: the generation 3 PKCS#8 body, sealed with scrypt and xsalsa20-poly1305 when
/// there is a passphrase. The salt is drawn before the nonce, as the TS draws them.
pub fn encode_pair<R: RngCore + CryptoRng>(
    public_key: &[u8],
    secret_key: &[u8],
    passphrase: Option<&str>,
    rng: &mut R,
) -> Result<Vec<u8>> {
    let encoded: Vec<u8> = [&PAIR_HDR[..], secret_key, &PAIR_DIV[..], public_key].concat();
    let Some(passphrase) = passphrase.filter(|passphrase| !passphrase.is_empty()) else {
        return Ok(encoded);
    };
    let mut salt: [u8; SALT_LENGTH] = [0; SALT_LENGTH];
    rng.fill_bytes(&mut salt);
    let scrypted = scrypt_encode(passphrase, &salt, DEFAULT_PARAMS)?;
    let mut nonce: [u8; NONCE_LENGTH] = [0; NONCE_LENGTH];
    rng.fill_bytes(&mut nonce);
    let sealed = nacl_encrypt(&encoded, &scrypted.password[..32], &nonce)?;
    Ok([
        scrypt_to_u8a(&salt, &DEFAULT_PARAMS),
        sealed.nonce,
        sealed.encrypted,
    ]
    .concat())
}

/// `pairToJson`.
pub fn pair_to_json(
    address: String,
    meta: KeyringPairMeta,
    encoded: &[u8],
    is_encrypted: bool,
) -> KeyringPairJson {
    let content: [String; 2] = [
        "pkcs8".to_string(),
        KeypairType::Sr25519.as_str().to_string(),
    ];
    let format = json_encrypt_format(encoded, &content, is_encrypted);
    KeyringPairJson {
        encoded: format.encoded,
        encoding: format.encoding,
        address,
        meta,
    }
}

/// `isLocked`: no secret, or one that is all zeroes (`u8aEmpty`).
fn is_locked(secret_key: &[u8]) -> bool {
    secret_key.iter().all(|byte| *byte == 0)
}

fn bytes(value: Option<U8aLike<'_>>) -> U8aLike<'_> {
    value.unwrap_or(U8aLike::Bytes(&[]))
}

struct State {
    public_key: Vec<u8>,
    secret_key: Vec<u8>,
    encoded: Option<Vec<u8>>,
    enc_types: Option<Vec<EncryptedJsonEncoding>>,
    meta: KeyringPairMeta,
}

impl State {
    fn decode_pkcs8(&mut self, passphrase: Option<&str>, encoded: Option<&[u8]>) -> Result<()> {
        let encoded: Option<&[u8]> = encoded.or(self.encoded.as_deref());
        let (public_key, secret_key) = decode_pair(passphrase, encoded, self.enc_types.as_deref())?;
        if secret_key.len() == SEC_LENGTH {
            self.public_key = public_key;
            self.secret_key = secret_key;
        } else {
            let pair: Keypair = sr25519_from_seed(secret_key.as_slice())?;
            self.public_key = pair.public_key;
            self.secret_key = pair.secret_key;
        }
        Ok(())
    }

    /// Unlocks from the stored encoding if need be, then re-encodes in the latest format.
    fn recode<R: RngCore + CryptoRng>(
        &mut self,
        passphrase: Option<&str>,
        rng: &mut R,
    ) -> Result<Vec<u8>> {
        if is_locked(&self.secret_key) && self.encoded.is_some() {
            self.decode_pkcs8(passphrase, None)?;
        }
        let encoded: Vec<u8> = encode_pair(&self.public_key, &self.secret_key, passphrase, rng)?;
        self.encoded = Some(encoded.clone());
        self.enc_types = None;
        Ok(encoded)
    }

    fn unlocked_secret(&self, locked_message: &str) -> Result<&[u8]> {
        if is_locked(&self.secret_key) {
            return err(locked_message);
        }
        Ok(&self.secret_key)
    }
}

struct Keyed {
    ss58: Ss58,
    state: Mutex<State>,
    lock_is_noop: AtomicBool,
}

enum Inner {
    Keyed(Keyed),
    Nobody,
}

/// A `KeyringPair`. Clones share one pair, as JS references do: unlocking or locking any
/// clone changes them all.
#[derive(Clone)]
pub struct KeyringPair(Arc<Inner>);

impl std::fmt::Debug for KeyringPair {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("KeyringPair")
            .field("public_key", &self.public_key())
            .field("is_locked", &self.is_locked())
            .finish()
    }
}

/// `createPair`. Only sr25519 pairs exist: every path that could build another kind refuses
/// earlier.
pub(crate) fn create_pair(
    ss58: &Ss58,
    keypair: Keypair,
    meta: KeyringPairMeta,
    encoded: Option<Vec<u8>>,
    enc_types: Option<Vec<EncryptedJsonEncoding>>,
) -> KeyringPair {
    KeyringPair(Arc::new(Inner::Keyed(Keyed {
        ss58: ss58.clone(),
        state: Mutex::new(State {
            public_key: keypair.public_key,
            secret_key: keypair.secret_key,
            encoded,
            enc_types,
            meta,
        }),
        lock_is_noop: AtomicBool::new(false),
    })))
}

const NOBODY_ADDRESS: &str = "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM";

static NOBODY: LazyLock<KeyringPair> = LazyLock::new(|| KeyringPair(Arc::new(Inner::Nobody)));

/// `nobody()`: the shared stand-in for no account, permanently locked, that never verifies.
pub fn nobody() -> KeyringPair {
    NOBODY.clone()
}

fn nobody_meta() -> KeyringPairMeta {
    match json!({ "isTesting": true, "name": "nobody" }) {
        Value::Object(meta) => meta,
        _ => unreachable!("an object literal"),
    }
}

impl KeyringPair {
    fn keyed(&self) -> Option<&Keyed> {
        match &*self.0 {
            Inner::Keyed(keyed) => Some(keyed),
            Inner::Nobody => None,
        }
    }

    fn state(keyed: &Keyed) -> MutexGuard<'_, State> {
        keyed.state.lock().expect("pair state lock")
    }

    /// Whether both handles are the same pair (JS `===`).
    pub fn ptr_eq(&self, other: &KeyringPair) -> bool {
        Arc::ptr_eq(&self.0, &other.0)
    }

    pub fn address(&self) -> Result<String> {
        match self.keyed() {
            None => Ok(NOBODY_ADDRESS.to_string()),
            Some(keyed) => {
                let public_key: Vec<u8> = Self::state(keyed).public_key.clone();
                keyed.ss58.encode(U8aLike::Bytes(&public_key), None)
            }
        }
    }

    pub fn address_raw(&self) -> Vec<u8> {
        self.public_key()
    }

    pub fn is_locked(&self) -> bool {
        self.keyed()
            .is_none_or(|keyed| is_locked(&Self::state(keyed).secret_key))
    }

    pub fn meta(&self) -> KeyringPairMeta {
        self.keyed()
            .map_or_else(nobody_meta, |keyed| Self::state(keyed).meta.clone())
    }

    pub fn public_key(&self) -> Vec<u8> {
        self.keyed().map_or_else(
            || vec![0; PUB_LENGTH],
            |keyed| Self::state(keyed).public_key.clone(),
        )
    }

    pub fn kind(&self) -> KeypairType {
        KeypairType::Sr25519
    }

    pub fn decode_pkcs8(&self, passphrase: Option<&str>, encoded: Option<&[u8]>) -> Result<()> {
        match self.keyed() {
            None => Ok(()),
            Some(keyed) => Self::state(keyed).decode_pkcs8(passphrase, encoded),
        }
    }

    pub fn derive(&self, suri: &str, meta: KeyringPairMeta) -> Result<KeyringPair> {
        let Some(keyed) = self.keyed() else {
            return Ok(self.clone());
        };
        let keypair: Keypair = {
            let state = Self::state(keyed);
            let secret_key: &[u8] = state.unlocked_secret("Cannot derive on a locked keypair")?;
            Keypair {
                public_key: state.public_key.clone(),
                secret_key: secret_key.to_vec(),
            }
        };
        let path = key_extract_path(suri)?.path;
        let derived: Keypair = key_from_path(&keypair, &path, KeypairType::Sr25519)?;
        Ok(create_pair(&keyed.ss58, derived, meta, None, None))
    }

    pub fn encode_pkcs8(&self, passphrase: Option<&str>) -> Result<Vec<u8>> {
        self.encode_pkcs8_with_rng(passphrase, &mut OsRng)
    }

    pub fn encode_pkcs8_with_rng<R: RngCore + CryptoRng>(
        &self,
        passphrase: Option<&str>,
        rng: &mut R,
    ) -> Result<Vec<u8>> {
        match self.keyed() {
            None => Ok(Vec::new()),
            Some(keyed) => Self::state(keyed).recode(passphrase, rng),
        }
    }

    pub fn jwt_issue(
        &self,
        options: &JwtIssueOptions,
        message: &[(String, String)],
    ) -> Result<Jwt> {
        self.jwt_issue_at(options, message, now_millis(), OsRng)
    }

    /// `jwtIssue` at a given `Date.now()` (milliseconds) and with the signing randomness supplied.
    pub fn jwt_issue_at<R: RngCore + CryptoRng>(
        &self,
        options: &JwtIssueOptions,
        message: &[(String, String)],
        now_ms: f64,
        rng: R,
    ) -> Result<Jwt> {
        let Some(keyed) = self.keyed() else {
            return Ok("jwt.dummy.token".to_string());
        };
        let state = Self::state(keyed);
        let secret_key: &[u8] = state.unlocked_secret(LOCKED_SIGN)?;
        Ok(sr25519_jwt_issue_at(
            &state.public_key,
            secret_key,
            options,
            message,
            now_ms,
            rng,
        )?)
    }

    pub fn jwt_verify(&self, jwt: &str, options: &JwtVerifyOptions) -> Result<JwtVerifyResult> {
        self.jwt_verify_at(jwt, options, now_millis())
    }

    /// `jwtVerify` at a given `Date.now()` (milliseconds).
    pub fn jwt_verify_at(
        &self,
        jwt: &str,
        options: &JwtVerifyOptions,
        now_ms: f64,
    ) -> Result<JwtVerifyResult> {
        match self.keyed() {
            None => Ok(JwtVerifyResult {
                is_valid: false,
                error: Some("JWT verification failed".to_string()),
                crypto: Some(KeypairType::Sr25519),
                public_key: vec![0; PUB_LENGTH],
                is_wrapped: false,
                payload: None,
            }),
            Some(keyed) => {
                let public_key: Vec<u8> = Self::state(keyed).public_key.clone();
                Ok(jwt_verify_at(jwt, &public_key, options, now_ms)?)
            }
        }
    }

    pub fn lock(&self) {
        if let Some(keyed) = self.keyed() {
            if !keyed.lock_is_noop.load(Ordering::SeqCst) {
                Self::state(keyed).secret_key = Vec::new();
            }
        }
    }

    /// `createTestKeyring` replaces `lock` with a no-op on its pairs.
    pub(crate) fn disable_lock(&self) {
        if let Some(keyed) = self.keyed() {
            keyed.lock_is_noop.store(true, Ordering::SeqCst);
        }
    }

    /// Merges `additional` over the current meta (`objectSpread`).
    pub fn set_meta(&self, additional: KeyringPairMeta) {
        if let Some(keyed) = self.keyed() {
            let mut state = Self::state(keyed);
            for (key, value) in additional {
                state.meta.insert(key, value);
            }
        }
    }

    pub fn sign(&self, message: U8aLike<'_>, with_type: bool) -> Result<Vec<u8>> {
        self.sign_with_rng(message, with_type, OsRng)
    }

    pub fn sign_with_rng<R: RngCore + CryptoRng>(
        &self,
        message: U8aLike<'_>,
        with_type: bool,
        rng: R,
    ) -> Result<Vec<u8>> {
        let Some(keyed) = self.keyed() else {
            return Ok(vec![0; 64]);
        };
        let state = Self::state(keyed);
        let secret_key: &[u8] = state.unlocked_secret(LOCKED_SIGN)?;
        let message: Vec<u8> = u8a_to_u8a(message);
        let signature: Vec<u8> = sr25519_sign_with_rng(message.as_slice(), secret_key, rng)?;
        Ok(if with_type {
            [&[SR25519_SIGNATURE_PREFIX][..], &signature].concat()
        } else {
            signature
        })
    }

    pub fn to_json(&self, passphrase: Option<&str>) -> Result<KeyringPairJson> {
        self.to_json_with_rng(passphrase, &mut OsRng)
    }

    /// The address is taken before re-encoding, which may unlock the pair and replace its
    /// public key with the one stored in the encoding.
    pub fn to_json_with_rng<R: RngCore + CryptoRng>(
        &self,
        passphrase: Option<&str>,
        rng: &mut R,
    ) -> Result<KeyringPairJson> {
        let Some(keyed) = self.keyed() else {
            return Ok(KeyringPairJson {
                encoded: String::new(),
                encoding: EncryptedJsonDescriptor {
                    content: vec!["pkcs8".to_string(), "ed25519".to_string()],
                    kind: EncodingType::One(EncryptedJsonEncoding::None),
                    version: "0".to_string(),
                },
                address: NOBODY_ADDRESS.to_string(),
                meta: nobody_meta(),
            });
        };
        let address: String = self.address()?;
        let mut state = Self::state(keyed);
        let encoded: Vec<u8> = state.recode(passphrase, rng)?;
        let is_encrypted: bool = passphrase.is_some_and(|passphrase| !passphrase.is_empty());
        Ok(pair_to_json(
            address,
            state.meta.clone(),
            &encoded,
            is_encrypted,
        ))
    }

    pub fn unlock(&self, passphrase: Option<&str>) -> Result<()> {
        self.decode_pkcs8(passphrase, None)
    }

    pub fn verify(
        &self,
        message: U8aLike<'_>,
        signature: U8aLike<'_>,
        signer_public: U8aLike<'_>,
    ) -> Result<bool> {
        if self.keyed().is_none() {
            return Ok(false);
        }
        let signer_public: Vec<u8> = u8a_to_u8a(signer_public);
        Ok(signature_verify(message, signature, signer_public.as_slice())?.is_valid)
    }

    pub fn vrf_sign(
        &self,
        message: U8aLike<'_>,
        context: Option<U8aLike<'_>>,
        extra: Option<U8aLike<'_>>,
    ) -> Result<Vec<u8>> {
        self.vrf_sign_with_rng(message, context, extra, OsRng)
    }

    pub fn vrf_sign_with_rng<R: RngCore + CryptoRng>(
        &self,
        message: U8aLike<'_>,
        context: Option<U8aLike<'_>>,
        extra: Option<U8aLike<'_>>,
        rng: R,
    ) -> Result<Vec<u8>> {
        let Some(keyed) = self.keyed() else {
            return Ok(vec![0; 96]);
        };
        let state = Self::state(keyed);
        let secret_key: &[u8] = state.unlocked_secret(LOCKED_SIGN)?;
        Ok(sr25519_vrf_sign_with_rng(
            message,
            secret_key,
            bytes(context),
            bytes(extra),
            rng,
        )?)
    }

    /// Checks against this pair's own public key: the TS `vrfVerify` ignores its
    /// `signerPublic` argument, so the Rust does not take one.
    pub fn vrf_verify(
        &self,
        message: U8aLike<'_>,
        vrf_result: &[u8],
        context: Option<U8aLike<'_>>,
        extra: Option<U8aLike<'_>>,
    ) -> Result<bool> {
        let Some(keyed) = self.keyed() else {
            return Ok(false);
        };
        let public_key: Vec<u8> = Self::state(keyed).public_key.clone();
        Ok(sr25519_vrf_verify(
            message,
            vrf_result,
            public_key.as_slice(),
            bytes(context),
            bytes(extra),
        )?)
    }
}
