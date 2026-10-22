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

//! The captcha merkle tree (src/captcha/merkle.ts). Hashes are `hexHashArray` of a node's two
//! children; a layer with an odd number of nodes pairs its last node with itself.

use crate::error::{DatasetsError, Result};
use prosopo_common::{ErrorClass, ErrorContext};
use prosopo_logger::ErrorObject;
use prosopo_types::datasets::{MerkleNode, MerkleProof};
use prosopo_util::{at, at_f64, AtOptions};
use prosopo_util_crypto::{hex_hash_array, JoinValue};

/// `hexHashArray(parts)` over strings.
pub fn hash_strings(parts: &[&str]) -> String {
    let values: Vec<JoinValue> = parts.iter().map(|part| JoinValue::from(*part)).collect();
    hex_hash_array(&values).expect("the default bit length is supported")
}

fn node(hash: &str) -> MerkleNode {
    MerkleNode {
        hash: hash.to_string(),
        parent: None,
    }
}

fn merkle_error(error: &str, failed_func_name: &str) -> DatasetsError {
    DatasetsError::new(
        ErrorClass::Prosopo,
        "DATASET.MERKLE_ERROR",
        Some(
            ErrorContext::new()
                .with("error", error)
                .with("failedFuncName", failed_func_name),
        ),
    )
}

/// Every layer above `leaves`, bottom up, ending with the single root.
pub fn parent_layers(leaves: &[String]) -> Vec<Vec<String>> {
    let mut layers: Vec<Vec<String>> = Vec::new();
    let mut current: &[String] = leaves;
    while current.len() > 1 {
        let parents: Vec<String> = current
            .chunks(2)
            .map(|pair: &[String]| {
                let left: &str = &pair[0];
                let right: &str = pair.get(1).map_or(left, String::as_str);
                hash_strings(&[left, right])
            })
            .collect();
        layers.push(parents);
        current = layers.last().expect("just pushed");
    }
    layers
}

/// The root `CaptchaMerkleTree::build` gives over `leaves`, without building the tree; `None`
/// when there are no leaves.
pub fn merkle_root(leaves: &[String]) -> Option<String> {
    match parent_layers(leaves).pop() {
        Some(mut root_layer) => root_layer.pop(),
        None => leaves.first().cloned(),
    }
}

/// `CaptchaMerkleTree`.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct CaptchaMerkleTree {
    pub leaves: Vec<MerkleNode>,
    pub layers: Vec<Vec<String>>,
    pub root: Option<MerkleNode>,
}

impl CaptchaMerkleTree {
    pub fn new() -> CaptchaMerkleTree {
        CaptchaMerkleTree::default()
    }

    pub fn get_root(&self) -> Result<&MerkleNode> {
        self.root
            .as_ref()
            .ok_or_else(|| merkle_error("root undefined", "getRoot"))
    }

    /// Takes layers built elsewhere (layer 0 the leaves, the last one the root) without
    /// re-hashing them, so `proof` works on them.
    pub fn hydrate_from_layers(&mut self, layers: Vec<Vec<String>>) -> Result<()> {
        if layers.is_empty() {
            return Err(merkle_error(
                "cannot hydrate from empty layers",
                "hydrateFromLayers",
            ));
        }
        self.leaves = layers[0].iter().map(|hash: &String| node(hash)).collect();
        self.layers = layers;
        let root_layer: &Vec<String> = self.layers.last().expect("not empty");
        let root_hash: &String = at(root_layer, 0, AtOptions::default())?;
        self.root = Some(node(root_hash));
        Ok(())
    }

    /// Builds the tree over `leaves`. Like the TS, a second `build` replaces the layers but
    /// keeps the leaves of the first, so the upper layers cover both sets of leaves.
    pub fn build(&mut self, leaves: &[String]) -> Result<()> {
        self.layers.clear();
        self.leaves
            .extend(leaves.iter().map(|leaf: &String| node(leaf)));
        self.layers.push(leaves.to_vec());
        if self.leaves.is_empty() {
            return Err(DatasetsError::Plain(ErrorObject::new(
                "Error",
                "cannot build a merkle tree with no leaves",
            )));
        }
        let hashes: Vec<String> = self.leaves.iter().map(|leaf| leaf.hash.clone()).collect();
        let upper: Vec<Vec<String>> = parent_layers(&hashes);
        match upper.first() {
            None => self.root = Some(self.leaves[0].clone()),
            Some(parents) => {
                for (index, leaf) in self.leaves.iter_mut().enumerate() {
                    leaf.parent = Some(parents[index / 2].clone());
                }
                let root: &String = &upper.last().expect("not empty")[0];
                self.root = Some(node(root));
            }
        }
        self.layers.extend(upper);
        Ok(())
    }

    /// The sibling pairs from `leaf` up to the root, then the root alone.
    pub fn proof(&self, leaf: &str) -> Result<MerkleProof> {
        if !at(&self.layers, 0, AtOptions::default())?
            .iter()
            .any(|hash: &String| hash == leaf)
        {
            return Err(merkle_error("leaf not in tree", "proof"));
        }
        let mut proof: MerkleProof = Vec::new();
        let mut leaf_hash: String = leaf.to_string();
        for layer in &self.layers[..self.layers.len() - 1] {
            let leaf_index: i64 = layer
                .iter()
                .position(|hash: &String| *hash == leaf_hash)
                .map_or(-1, |index: usize| index as i64);
            let mut partner_index: i64 = if leaf_index % 2 != 0 && leaf_index > 0 {
                leaf_index - 1
            } else {
                leaf_index + 1
            };
            if partner_index > layer.len() as i64 - 1 {
                partner_index = leaf_index;
            }
            let partner: String =
                at_f64(layer, partner_index as f64, AtOptions::default())?.clone();
            let pair: Vec<String> = if partner_index > leaf_index {
                vec![leaf_hash, partner]
            } else {
                vec![partner, leaf_hash]
            };
            leaf_hash = hash_strings(&[&pair[0], &pair[1]]);
            proof.push(pair);
        }
        let last: &Vec<String> = at(
            &self.layers,
            self.layers.len() as i64 - 1,
            AtOptions::default(),
        )?;
        proof.push(vec![at(last, 0, AtOptions::default())?.clone()]);
        Ok(proof)
    }
}

/// Whether `proof` links `leaf` to `root`. The root must come from a trusted source: a proof
/// carries its own root layer, so checking it only for internal consistency would accept a
/// proof built over any leaf at all.
pub fn verify_proof(leaf: &str, proof: &[Vec<String>], root: &str) -> bool {
    let Some((root_layer, layers)) = proof.split_last() else {
        return false;
    };
    if root_layer.len() != 1 {
        return false;
    }
    let mut hash: String = leaf.to_string();
    for layer in layers {
        if layer.len() != 2 || !layer.contains(&hash) {
            return false;
        }
        hash = hash_strings(&[&layer[0], &layer[1]]);
    }
    hash == root && root_layer[0] == root
}
