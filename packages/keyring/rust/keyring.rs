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

//! keyring/keyring.ts: the sr25519 keyring.

use crate::error::{err, Result};
use crate::pair::{create_pair, KeyringPair, Ss58};
use crate::pairs::Pairs;
use prosopo_types::keyring::{KeyringOptions, KeyringPairJson, KeyringPairMeta};
use prosopo_util_crypto::address::Prefix;
use prosopo_util_crypto::keystore::{EncryptedJsonDescriptor, EncryptedJsonEncoding};
use prosopo_util_crypto::u8a::{hex_to_u8a, is_hex};
use prosopo_util_crypto::{
    base64_decode, decode_address, key_extract_suri, key_from_path, mnemonic_to_mini_secret,
    sr25519_from_seed, Keypair, KeypairType, U8aLike,
};

pub const DEV_PHRASE: &str =
    "bottom drive obey lake curtain smoke basket hold race lonely fit walk";

const MNEMONIC_WORD_COUNTS: [usize; 5] = [12, 15, 18, 21, 24];

/// The longest phrase that is padded into a raw seed rather than refused.
const RAW_SEED_LENGTH: usize = 32;

const NOT_IMPLEMENTED: &str = "Not Implemented";

/// `PairFromSeed[type](seed)`.
fn pair_from_seed(kind: KeypairType, seed: &[u8]) -> Result<Keypair> {
    match kind {
        KeypairType::Sr25519 => Ok(sr25519_from_seed(seed)?),
        _ => err(NOT_IMPLEMENTED),
    }
}

/// The TS builds a pair of another kind here and only fails when the pair is used; the Rust
/// cannot represent such a pair, so it fails as the pair is built.
fn sr25519_only(kind: KeypairType) -> Result<()> {
    match kind {
        KeypairType::Sr25519 => Ok(()),
        _ => err(NOT_IMPLEMENTED),
    }
}

/// `isHex(value, 256)`.
fn is_hex_256(value: &str) -> bool {
    value.len() == 2 + 64 && is_hex(value)
}

fn watch_only(public_key: Vec<u8>) -> Keypair {
    Keypair {
        public_key,
        secret_key: Vec::new(),
    }
}

/// `addFromAddress`'s optional arguments.
#[derive(Clone, Debug, Default)]
pub struct FromAddress {
    pub meta: KeyringPairMeta,
    pub encoded: Option<Vec<u8>>,
    pub kind: Option<KeypairType>,
    pub ignore_checksum: bool,
    pub enc_type: Option<Vec<EncryptedJsonEncoding>>,
}

#[derive(Debug)]
pub struct Keyring {
    pairs: Pairs,
    kind: KeypairType,
    ss58: Ss58,
}

impl Keyring {
    pub fn new(options: KeyringOptions) -> Result<Keyring> {
        let kind: KeypairType = options.kind.unwrap_or(KeypairType::Sr25519);
        if kind != KeypairType::Sr25519 {
            return err(format!(
                "Expected a keyring type of either 'sr25519', found '{}",
                kind.as_str()
            ));
        }
        Ok(Keyring {
            pairs: Pairs::new(),
            kind,
            ss58: Ss58::new(options.ss58_format),
        })
    }

    pub(crate) fn ss58(&self) -> &Ss58 {
        &self.ss58
    }

    pub fn pairs(&self) -> Vec<KeyringPair> {
        self.pairs.all()
    }

    pub fn public_keys(&self) -> Vec<Vec<u8>> {
        self.pairs
            .all()
            .iter()
            .map(KeyringPair::public_key)
            .collect()
    }

    pub fn kind(&self) -> KeypairType {
        self.kind
    }

    pub fn add_pair(&mut self, pair: KeyringPair) -> Result<KeyringPair> {
        self.pairs.add(pair)
    }

    pub fn add_from_address(
        &mut self,
        address: U8aLike<'_>,
        options: FromAddress,
    ) -> Result<KeyringPair> {
        let public_key: Vec<u8> = self.decode_address(address, options.ignore_checksum)?;
        sr25519_only(options.kind.unwrap_or(self.kind))?;
        let pair: KeyringPair = create_pair(
            &self.ss58,
            watch_only(public_key),
            options.meta,
            options.encoded,
            options.enc_type,
        );
        self.add_pair(pair)
    }

    pub fn add_from_json(
        &mut self,
        json: &KeyringPairJson,
        ignore_checksum: bool,
    ) -> Result<KeyringPair> {
        let pair: KeyringPair = self.create_from_json(json, ignore_checksum)?;
        self.add_pair(pair)
    }

    pub fn add_from_mnemonic(
        &mut self,
        mnemonic: &str,
        meta: KeyringPairMeta,
        kind: Option<KeypairType>,
    ) -> Result<KeyringPair> {
        self.add_from_uri(mnemonic, meta, kind)
    }

    pub fn add_from_pair(
        &mut self,
        pair: Keypair,
        meta: KeyringPairMeta,
        kind: Option<KeypairType>,
    ) -> Result<KeyringPair> {
        let pair: KeyringPair = self.create_from_pair(pair, meta, kind)?;
        self.add_pair(pair)
    }

    pub fn add_from_seed(
        &mut self,
        seed: &[u8],
        meta: KeyringPairMeta,
        kind: Option<KeypairType>,
    ) -> Result<KeyringPair> {
        let keypair: Keypair = pair_from_seed(kind.unwrap_or(self.kind), seed)?;
        let pair: KeyringPair = create_pair(&self.ss58, keypair, meta, None, None);
        self.add_pair(pair)
    }

    pub fn add_from_uri(
        &mut self,
        suri: &str,
        meta: KeyringPairMeta,
        kind: Option<KeypairType>,
    ) -> Result<KeyringPair> {
        let pair: KeyringPair = self.create_from_uri(suri, meta, kind)?;
        self.add_pair(pair)
    }

    /// From a JSON key file. The pair starts locked; `unlock` decodes the stored encoding.
    pub fn create_from_json(
        &self,
        json: &KeyringPairJson,
        ignore_checksum: bool,
    ) -> Result<KeyringPair> {
        let EncryptedJsonDescriptor {
            content,
            kind,
            version,
        } = &json.encoding;
        if version == "3" && content.first().map(String::as_str) != Some("pkcs8") {
            return err(format!(
                "Unable to decode non-pkcs8 type, [{}] found}}",
                content.join(",")
            ));
        }
        let crypto_type: Option<&str> = if version == "0" {
            Some(self.kind.as_str())
        } else {
            content
                .get(1)
                .map(String::as_str)
                .filter(|kind| !kind.is_empty())
        };
        let Some(crypto_type) = crypto_type else {
            return err("cryptoType is undefined");
        };
        if crypto_type != KeypairType::Sr25519.as_str() {
            return err(format!("Unknown crypto type {crypto_type}"));
        }
        let public_key: Vec<u8> = if is_hex(&json.address) {
            hex_to_u8a(&json.address)
        } else {
            self.decode_address(U8aLike::Str(&json.address), ignore_checksum)?
        };
        let decoded: Vec<u8> = if is_hex(&json.encoded) {
            hex_to_u8a(&json.encoded)
        } else {
            base64_decode(&json.encoded, false)?
        };
        Ok(create_pair(
            &self.ss58,
            watch_only(public_key),
            json.meta.clone(),
            Some(decoded),
            Some(kind.to_vec()),
        ))
    }

    pub fn create_from_pair(
        &self,
        pair: Keypair,
        meta: KeyringPairMeta,
        kind: Option<KeypairType>,
    ) -> Result<KeyringPair> {
        sr25519_only(kind.unwrap_or(self.kind))?;
        Ok(create_pair(&self.ss58, pair, meta, None, None))
    }

    /// From a secret URI, `<secret>/<soft>//<hard>///<password>`: the secret is a 256-bit hex
    /// seed, a mnemonic, or a phrase of at most 32 characters padded into a seed. A bare path
    /// such as `//Alice` is taken against the dev phrase.
    pub fn create_from_uri(
        &self,
        suri: &str,
        meta: KeyringPairMeta,
        kind: Option<KeypairType>,
    ) -> Result<KeyringPair> {
        let kind: KeypairType = kind.unwrap_or(self.kind);
        let suri: String = if suri.starts_with("//") {
            format!("{DEV_PHRASE}{suri}")
        } else {
            suri.to_string()
        };
        let extracted = key_extract_suri(&suri)?;
        let phrase: &str = &extracted.phrase;
        let seed: Vec<u8> = if is_hex_256(phrase) {
            hex_to_u8a(phrase)
        } else if MNEMONIC_WORD_COUNTS.contains(&phrase.split(' ').count()) {
            if kind == KeypairType::Ethereum {
                return err("Not implemented - Prosopo Keyring supports sr25519 only");
            }
            mnemonic_to_mini_secret(phrase, extracted.password.as_deref().unwrap_or(""), None)?
        } else if phrase.len() > RAW_SEED_LENGTH {
            return err(
                "specified phrase is not a valid mnemonic and is invalid as a raw seed at > 32 bytes",
            );
        } else {
            format!("{phrase:<RAW_SEED_LENGTH$}").into_bytes()
        };
        let derived: Keypair = key_from_path(&pair_from_seed(kind, &seed)?, &extracted.path, kind)?;
        Ok(create_pair(&self.ss58, derived, meta, None, None))
    }

    pub fn encode_address(
        &self,
        address: U8aLike<'_>,
        ss58_format: Option<Prefix>,
    ) -> Result<String> {
        self.ss58.encode(address, ss58_format)
    }

    pub fn decode_address(&self, address: U8aLike<'_>, ignore_checksum: bool) -> Result<Vec<u8>> {
        Ok(decode_address(Some(address), ignore_checksum, None)?)
    }

    pub fn get_pair(&self, address: U8aLike<'_>) -> Result<KeyringPair> {
        self.pairs.get(address)
    }

    pub fn remove_pair(&mut self, address: U8aLike<'_>) -> Result<()> {
        self.pairs.remove(address)
    }

    /// Also changes the address of the pairs this keyring has already made.
    pub fn set_ss58_format(&self, ss58_format: Prefix) {
        self.ss58.set(ss58_format);
    }

    pub fn to_json(
        &self,
        address: U8aLike<'_>,
        passphrase: Option<&str>,
    ) -> Result<KeyringPairJson> {
        self.pairs.get(address)?.to_json(passphrase)
    }
}
