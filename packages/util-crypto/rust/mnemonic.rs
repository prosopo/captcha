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

//! BIP39 mnemonics, adapted (like the TS) from bitcoinjs/bip39, and the
//! Substrate mini-secret derivation from the mnemonic entropy.

use crate::error::{err, Result};
use crate::hashing::{pbkdf2_encode, sha256_as_u8a, PBKDF2_DEFAULT_ROUNDS};
use crate::random::random_as_u8a;
use unicode_normalization::UnicodeNormalization;

const INVALID_MNEMONIC: &str = "Invalid mnemonic";
const INVALID_ENTROPY: &str = "Invalid entropy";
const INVALID_CHECKSUM: &str = "Invalid mnemonic checksum";

pub fn english_wordlist() -> &'static [&'static str] {
    bip39::Language::English.word_list()
}

fn normalize(value: &str) -> String {
    value.nfkd().collect()
}

fn bits_of(bytes: &[u8]) -> Vec<bool> {
    bytes
        .iter()
        .flat_map(|byte| (0..8).rev().map(move |i| (byte >> i) & 1 == 1))
        .collect()
}

fn checksum_bits(entropy: &[u8]) -> Vec<bool> {
    let mut bits = bits_of(&sha256_as_u8a(entropy));
    bits.truncate(entropy.len() * 8 / 32);
    bits
}

fn is_valid_entropy_length(length: usize) -> bool {
    length % 4 == 0 && (16..=32).contains(&length)
}

pub fn mnemonic_to_entropy(mnemonic: &str, wordlist: Option<&[&str]>) -> Result<Vec<u8>> {
    let wordlist: &[&str] = match wordlist {
        Some(list) => list,
        None => english_wordlist(),
    };
    let normalized = normalize(mnemonic);
    let words: Vec<&str> = normalized.split(' ').collect();
    if words.len() % 3 != 0 {
        return err(INVALID_MNEMONIC);
    }
    let mut bits: Vec<bool> = Vec::with_capacity(words.len() * 11);
    for word in &words {
        let Some(index) = wordlist.iter().position(|w| w == word) else {
            return err(INVALID_MNEMONIC);
        };
        bits.extend((0..11).rev().map(|i| (index >> i) & 1 == 1));
    }
    let divider = bits.len() / 33 * 32;
    let (entropy_bits, checksum) = bits.split_at(divider);
    let entropy: Vec<u8> = entropy_bits
        .chunks(8)
        .map(|chunk| chunk.iter().fold(0u8, |acc, bit| (acc << 1) | u8::from(*bit)))
        .collect();
    if !is_valid_entropy_length(entropy.len()) {
        return err(INVALID_ENTROPY);
    }
    if checksum_bits(&entropy) != checksum {
        return err(INVALID_CHECKSUM);
    }
    Ok(entropy)
}

pub fn entropy_to_mnemonic(entropy: &[u8], wordlist: Option<&[&str]>) -> Result<String> {
    let wordlist: &[&str] = match wordlist {
        Some(list) => list,
        None => english_wordlist(),
    };
    if !is_valid_entropy_length(entropy.len()) {
        return err(INVALID_ENTROPY);
    }
    let mut bits = bits_of(entropy);
    bits.extend(checksum_bits(entropy));
    let words: Vec<&str> = bits
        .chunks(11)
        .map(|chunk| {
            let index = chunk
                .iter()
                .fold(0usize, |acc, bit| (acc << 1) | usize::from(*bit));
            wordlist.get(index).copied().unwrap_or("")
        })
        .collect();
    Ok(words.join(" "))
}

/// `mnemonicGenerate(numWords, wordlist)`; the TS default is 12 words.
pub fn mnemonic_generate(num_words: usize, wordlist: Option<&[&str]>) -> Result<String> {
    entropy_to_mnemonic(&random_as_u8a(num_words * 4 / 3), wordlist)
}

pub fn mnemonic_validate(mnemonic: &str, wordlist: Option<&[&str]>) -> bool {
    mnemonic_to_entropy(mnemonic, wordlist).is_ok()
}

/// The standard BIP39 seed (`mnemonicToSeedSync`), 64 bytes.
pub fn mnemonic_to_seed_sync(mnemonic: &str, password: &str) -> Result<Vec<u8>> {
    let mnemonic = normalize(mnemonic);
    let salt = format!("mnemonic{}", normalize(password));
    Ok(pbkdf2_encode(
        crate::u8a::U8aLike::Bytes(mnemonic.as_bytes()),
        salt.as_bytes(),
        PBKDF2_DEFAULT_ROUNDS,
    )?
    .password)
}

/// `mnemonicToMiniSecret(mnemonic, password)`: PBKDF2 over the entropy, not the phrase.
pub fn mnemonic_to_mini_secret(
    mnemonic: &str,
    password: &str,
    wordlist: Option<&[&str]>,
) -> Result<Vec<u8>> {
    if !mnemonic_validate(mnemonic, wordlist) {
        return err("Invalid bip39 mnemonic specified");
    }
    let entropy = mnemonic_to_entropy(mnemonic, wordlist)?;
    let salt = format!("mnemonic{password}");
    let mut seed = pbkdf2_encode(entropy.as_slice(), salt.as_bytes(), PBKDF2_DEFAULT_ROUNDS)?.password;
    seed.truncate(32);
    Ok(seed)
}

/// `mnemonicToLegacySeed(mnemonic, password, onlyJs, byteLength)`.
pub fn mnemonic_to_legacy_seed(mnemonic: &str, password: &str, byte_length: u32) -> Result<Vec<u8>> {
    if !mnemonic_validate(mnemonic, None) {
        return err("Invalid bip39 mnemonic specified");
    }
    if ![32, 64].contains(&byte_length) {
        return err(format!(
            "Invalid seed length {byte_length}, expected 32 or 64"
        ));
    }
    let mut seed = mnemonic_to_seed_sync(mnemonic, password)?;
    seed.truncate(byte_length as usize);
    Ok(seed)
}
