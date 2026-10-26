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

#[macro_use]
extern crate napi_derive;

mod merkle;

use napi::bindgen_prelude::{Error, Status};

/// blake2b-256 hex of a single string. Equivalent to `blake2AsHex(input)`
/// from @prosopo/util-crypto (default 256-bit output, "0x" prefix).
#[napi(js_name = "hexHash")]
pub fn hex_hash(input: String) -> String {
    merkle::hex_hash(&input)
}

/// blake2b-256 hex of `parts.join("")`. Equivalent to
/// `hexHashArray(parts)` from @prosopo/util-crypto.
#[napi(js_name = "hexHashArray")]
pub fn hex_hash_array(parts: Vec<String>) -> String {
    let refs: Vec<&str> = parts.iter().map(|s| s.as_str()).collect();
    merkle::hex_hash_array(&refs)
}

/// Leaf hash for a single captcha solution, byte-identical to
/// `computeCaptchaSolutionHash` in @prosopo/datasets. `solution` is sorted
/// lexicographically before hashing.
#[napi(js_name = "computeCaptchaSolutionHash")]
pub fn compute_captcha_solution_hash(
    captcha_id: String,
    captcha_content_id: String,
    solution: Vec<String>,
    salt: String,
) -> String {
    merkle::compute_captcha_solution_hash(&captcha_id, &captcha_content_id, &solution, &salt)
}

/// Compute every layer of the Merkle tree, from the leaves up to (and
/// including) the single-element root layer. Uses the JS tree layout in
/// @prosopo/datasets (blake2b-256 of joined-hex-strings, odd tail duplicated
/// per layer, single leaf yields a one-layer tree whose root == the leaf).
///
/// Throws `InvalidArg` if `leaves` is empty — the JS caller
/// (buildTreeAndGetCommitmentId) always throws in that case, so this mirrors it.
#[napi(js_name = "buildMerkleLayers")]
pub fn build_merkle_layers(leaves: Vec<String>) -> napi::Result<Vec<Vec<String>>> {
    let layers = merkle::build_layers(&leaves);
    if layers.is_empty() {
        return Err(Error::new(Status::InvalidArg, "leaves is empty".to_string()));
    }
    Ok(layers)
}
