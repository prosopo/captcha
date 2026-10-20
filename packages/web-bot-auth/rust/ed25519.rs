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

//! Ed25519 verification with the ZIP-215 rules `@noble/curves` applies by
//! default: non-canonical point encodings are accepted and the cofactored
//! equation `[8](R + kA - sB) = 0` is checked. ed25519-dalek's `verify`
//! re-encodes R and checks the cofactorless equation instead, which disagrees
//! with noble on crafted small-order/non-canonical inputs.

use curve25519_dalek::edwards::{CompressedEdwardsY, EdwardsPoint};
use curve25519_dalek::scalar::Scalar;
use curve25519_dalek::traits::IsIdentity;
use sha2::{Digest, Sha512};

pub(crate) fn verify_zip215(signature: &[u8], message: &[u8], public_key: &[u8]) -> bool {
    let (Ok(signature), Ok(public_key)) = (
        <[u8; 64]>::try_from(signature),
        <[u8; 32]>::try_from(public_key),
    ) else {
        return false;
    };
    let mut r_bytes: [u8; 32] = [0; 32];
    let mut s_bytes: [u8; 32] = [0; 32];
    r_bytes.copy_from_slice(&signature[..32]);
    s_bytes.copy_from_slice(&signature[32..]);
    let Some(a) = CompressedEdwardsY(public_key).decompress() else {
        return false;
    };
    let Some(r) = CompressedEdwardsY(r_bytes).decompress() else {
        return false;
    };
    let Some(s) = Option::<Scalar>::from(Scalar::from_canonical_bytes(s_bytes)) else {
        return false;
    };
    let k: Scalar = Scalar::from_hash(
        Sha512::new()
            .chain_update(r_bytes)
            .chain_update(public_key)
            .chain_update(message),
    );
    let sb: EdwardsPoint = EdwardsPoint::mul_base(&s);
    (r + a * k - sb).mul_by_cofactor().is_identity()
}
