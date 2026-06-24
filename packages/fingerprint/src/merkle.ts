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

import type { MerkleLeaf, MerkleProof, MerkleProofLayer } from "@prosopo/types";
import { hexHashArray } from "@prosopo/util-crypto";

// A standalone, dependency-light Merkle tree that mirrors the layout of
// @prosopo/datasets' CaptchaMerkleTree (odd nodes paired with themselves,
// parent = hexHashArray([left, right])) so the proofs use the shared
// @prosopo/types MerkleProof shape and the same blake2b-256 hash. Both the
// browser client and the (closed-source) provider-side validator can rely on
// the identical pure-JS hashing here, with no WASM and no implementation drift.

const at = <T>(arr: readonly T[], index: number): T => {
	const value = arr[index];
	if (value === undefined) {
		throw new Error(
			`merkle: index ${index} out of range (length ${arr.length})`,
		);
	}
	return value;
};

/** Hash a pair of child hashes into their parent. */
export const hashMerklePair = (left: string, right: string): string =>
	hexHashArray([left, right]);

/**
 * Build every layer of the Merkle tree, bottom-up. Layer 0 is the leaf hashes,
 * the final layer is `[root]`. An odd node at the end of a layer is paired with
 * itself.
 */
export const buildMerkleLayers = (leafHashes: string[]): string[][] => {
	if (leafHashes.length === 0) {
		throw new Error("merkle: cannot build a tree with no leaves");
	}
	const layers: string[][] = [[...leafHashes]];
	let current: string[] = leafHashes;
	while (current.length > 1) {
		const next: string[] = [];
		for (let i = 0; i < current.length; i += 2) {
			const left = at(current, i);
			const right = i + 1 < current.length ? at(current, i + 1) : left;
			next.push(hashMerklePair(left, right));
		}
		layers.push(next);
		current = next;
	}
	return layers;
};

export const merkleRootFromLayers = (layers: string[][]): string =>
	at(at(layers, layers.length - 1), 0);

/** Produce the sibling path proving `leafHash` belongs to the tree. */
export const merkleProofFromLayers = (
	layers: string[][],
	leafHash: MerkleLeaf,
): MerkleProof => {
	const proof: MerkleProofLayer[] = [];
	let hash = leafHash;
	for (let layerNum = 0; layerNum < layers.length - 1; layerNum++) {
		const layer = at(layers, layerNum);
		const index = layer.indexOf(hash);
		if (index === -1) {
			throw new Error("merkle: leaf hash not present in layer");
		}
		let partnerIndex = index % 2 === 1 ? index - 1 : index + 1;
		if (partnerIndex > layer.length - 1) {
			// odd node at the end of the layer is paired with itself
			partnerIndex = index;
		}
		const partner = at(layer, partnerIndex);
		const pair: MerkleProofLayer =
			partnerIndex > index ? [hash, partner] : [partner, hash];
		proof.push(pair);
		hash = hashMerklePair(pair[0], pair[1]);
	}
	return [...proof, [merkleRootFromLayers(layers)]];
};

/** Verify a leaf + sibling path recomputes to the proof's embedded root. */
export const verifyMerkleProof = (
	leafHash: MerkleLeaf,
	proof: MerkleProof,
): boolean => {
	try {
		const firstLayer = proof[0];
		if (firstLayer === undefined || firstLayer.indexOf(leafHash) === -1) {
			return false;
		}
		// Single-leaf tree: the only layer is `[root]` and the leaf is the root.
		if (proof.length === 1) {
			return at(firstLayer, 0) === leafHash;
		}
		const root = at(at(proof, proof.length - 1), 0);
		let hash = leafHash;
		for (let i = 0; i < proof.length - 1; i++) {
			const layer = at(proof, i);
			if (layer.indexOf(hash) === -1) {
				return false;
			}
			hash = hashMerklePair(at(layer, 0), at(layer, 1));
			if (at(proof, i + 1).indexOf(hash) === -1) {
				return false;
			}
		}
		return hash === root;
	} catch {
		return false;
	}
};
