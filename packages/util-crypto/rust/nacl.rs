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

//! NaCl `secretbox` (xsalsa20-poly1305), with the tweetnacl framing: the
//! 16-byte MAC precedes the ciphertext.

use crate::error::{err, Result};
use crypto_secretbox::aead::{Aead, KeyInit};
use crypto_secretbox::XSalsa20Poly1305;

pub const NONCE_LENGTH: usize = 24;
const KEY_LENGTH: usize = 32;
const MAC_LENGTH: usize = 16;

fn check_lengths(key: &[u8], nonce: &[u8]) -> Result<()> {
    if key.len() != KEY_LENGTH {
        return err("bad key size");
    }
    if nonce.len() != NONCE_LENGTH {
        return err("bad nonce size");
    }
    Ok(())
}

pub fn nacl_secretbox(msg: &[u8], nonce: &[u8], key: &[u8]) -> Result<Vec<u8>> {
    check_lengths(key, nonce)?;
    let cipher = XSalsa20Poly1305::new(key.into());
    cipher
        .encrypt(nonce.into(), msg)
        .map_or_else(|_| err("secretbox encryption failed"), Ok)
}

/// Returns `Ok(None)` where tweetnacl returns `null` (short or unauthenticated box).
pub fn nacl_secretbox_open(sealed: &[u8], nonce: &[u8], key: &[u8]) -> Result<Option<Vec<u8>>> {
    check_lengths(key, nonce)?;
    if sealed.len() < MAC_LENGTH {
        return Ok(None);
    }
    let cipher = XSalsa20Poly1305::new(key.into());
    Ok(cipher.decrypt(nonce.into(), sealed).ok())
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Encrypted {
    pub encrypted: Vec<u8>,
    pub nonce: Vec<u8>,
}

pub fn nacl_encrypt(message: &[u8], secret: &[u8], nonce: &[u8]) -> Result<Encrypted> {
    Ok(Encrypted {
        encrypted: nacl_secretbox(message, nonce, secret)?,
        nonce: nonce.to_vec(),
    })
}

/// `naclEncrypt(message, secret)` with the default random 24-byte nonce.
pub fn nacl_encrypt_random_nonce(message: &[u8], secret: &[u8]) -> Result<Encrypted> {
    nacl_encrypt(message, secret, &crate::random::random_as_u8a(NONCE_LENGTH))
}

pub fn nacl_decrypt(encrypted: &[u8], nonce: &[u8], secret: &[u8]) -> Result<Option<Vec<u8>>> {
    nacl_secretbox_open(encrypted, nonce, secret)
}
