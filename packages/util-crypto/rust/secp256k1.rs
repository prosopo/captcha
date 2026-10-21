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

use crate::error::{err, Result};
use crate::sr25519::Keypair;
use k256::elliptic_curve::sec1::ToEncodedPoint;

/// `secp256k1Compress`: 33-byte keys are returned as-is, 65-byte keys are compressed.
pub fn secp256k1_compress(public_key: &[u8]) -> Result<Vec<u8>> {
    match public_key.len() {
        33 => Ok(public_key.to_vec()),
        65 if public_key[0] != 0x04 => {
            err("bad point: got length 65, expected compressed=33 or uncompressed=65")
        }
        65 => k256::PublicKey::from_sec1_bytes(public_key)
            .map(|key| key.to_encoded_point(true).as_bytes().to_vec())
            .map_or_else(|_| err("bad point: is not on curve"), Ok),
        length => err(format!(
            "Invalid publicKey provided, received {length} bytes input"
        )),
    }
}

/// `secp256k1PairFromSeed`: the seed is the secret key; the public key is compressed.
pub fn secp256k1_pair_from_seed(seed: &[u8]) -> Result<Keypair> {
    if seed.len() != 32 {
        return err("Expected valid 32-byte private key as a seed");
    }
    if seed.iter().all(|b| *b == 0) {
        return err("invalid scalar: out of range");
    }
    let secret = k256::SecretKey::from_slice(seed)
        .map_or_else(|_| err("invalid field element: outside of range 0..ORDER"), Ok)?;
    Ok(Keypair {
        public_key: secret.public_key().to_encoded_point(true).as_bytes().to_vec(),
        secret_key: seed.to_vec(),
    })
}
