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

import { CaptchaMerkleTree } from "@prosopo/datasets";
import type { FingerprintLeafProof } from "@prosopo/types";
import { hexHash } from "@prosopo/util-crypto";
import { describe, expect, it } from "vitest";
import { verifyFingerprintProofs } from "../../../../tasks/fingerprint/fingerprintVerification.js";

/**
 * Helper: builds a Merkle tree from string values and returns leaf hashes,
 * component values, and the tree itself.
 */
function buildTestTree(values: string[]): {
	tree: CaptchaMerkleTree;
	leafHashes: string[];
	componentValues: string[];
	merkleRoot: string;
} {
	const componentValues = values.map((v) => JSON.stringify(v));
	const leafHashes = componentValues.map((v) => hexHash(v));
	const tree = new CaptchaMerkleTree();
	tree.build(leafHashes);
	const merkleRoot = tree.getRoot().hash;
	return { tree, leafHashes, componentValues, merkleRoot };
}

/**
 * Helper: generates a valid FingerprintLeafProof for a given leaf index.
 */
function makeProof(
	tree: CaptchaMerkleTree,
	leafHashes: string[],
	componentValues: string[],
	leafIndex: number,
): FingerprintLeafProof {
	const leafHash = leafHashes[leafIndex];
	if (leafHash === undefined) {
		throw new Error(`No leaf hash at index ${leafIndex}`);
	}
	const componentValue = componentValues[leafIndex];
	if (componentValue === undefined) {
		throw new Error(`No component value at index ${leafIndex}`);
	}
	return {
		leafIndex,
		value: componentValue,
		proof: tree.proof(leafHash),
	};
}

describe("verifyFingerprintProofs", () => {
	const testValues = [
		"Arial",
		"none",
		"16px",
		"0.003456",
		"[0,0,1920,40]",
		"canvas-hash-abc",
		"Intel Mac OS X",
		"en-US",
	];

	it("returns valid=true for a single correct proof", () => {
		const { tree, leafHashes, componentValues, merkleRoot } =
			buildTestTree(testValues);
		const proof = makeProof(tree, leafHashes, componentValues, 0);
		const result = verifyFingerprintProofs([proof], [0]);
		expect(result.valid).to.be.true;
		expect(result.merkleRoot).to.equal(merkleRoot);
		expect(result.error).to.be.undefined;
	});

	it("returns valid=true for multiple correct proofs", () => {
		const { tree, leafHashes, componentValues, merkleRoot } =
			buildTestTree(testValues);
		const proofs = [
			makeProof(tree, leafHashes, componentValues, 0),
			makeProof(tree, leafHashes, componentValues, 3),
			makeProof(tree, leafHashes, componentValues, 7),
		];
		const result = verifyFingerprintProofs(proofs, [0, 3, 7]);
		expect(result.valid).to.be.true;
		expect(result.merkleRoot).to.equal(merkleRoot);
	});

	it("returns valid=false for empty proofs array", () => {
		const result = verifyFingerprintProofs([], [0, 1]);
		expect(result.valid).to.be.false;
		expect(result.error).to.equal("No fingerprint proofs provided");
	});

	it("returns valid=false for empty requestedLeaves", () => {
		const { tree, leafHashes, componentValues } = buildTestTree(testValues);
		const proof = makeProof(tree, leafHashes, componentValues, 0);
		const result = verifyFingerprintProofs([proof], []);
		expect(result.valid).to.be.false;
		expect(result.error).to.equal("No leaves were requested");
	});

	it("returns valid=false when proof value is tampered", () => {
		const { tree, leafHashes, componentValues } = buildTestTree(testValues);
		const proof = makeProof(tree, leafHashes, componentValues, 2);
		// Tamper with the value — hash won't match
		proof.value = JSON.stringify("TAMPERED");
		const result = verifyFingerprintProofs([proof], [2]);
		expect(result.valid).to.be.false;
		expect(result.error).to.include("Invalid Merkle proof");
	});

	it("returns valid=false when proof path is corrupted", () => {
		const { tree, leafHashes, componentValues } = buildTestTree(testValues);
		const proof = makeProof(tree, leafHashes, componentValues, 1);
		// Corrupt a hash in the proof path
		if (proof.proof[0] && proof.proof[0][1]) {
			proof.proof[0][1] = "0xdeadbeef";
		}
		const result = verifyFingerprintProofs([proof], [1]);
		expect(result.valid).to.be.false;
	});

	it("returns valid=false when proofs have inconsistent roots", () => {
		// Build two different trees
		const tree1Data = buildTestTree(testValues);
		const altValues = testValues.map((v) => `${v}-alt`);
		const tree2Data = buildTestTree(altValues);

		const proof1 = makeProof(
			tree1Data.tree,
			tree1Data.leafHashes,
			tree1Data.componentValues,
			0,
		);
		const proof2 = makeProof(
			tree2Data.tree,
			tree2Data.leafHashes,
			tree2Data.componentValues,
			1,
		);

		const result = verifyFingerprintProofs([proof1, proof2], [0, 1]);
		expect(result.valid).to.be.false;
		expect(result.error).to.include("Inconsistent Merkle roots");
	});

	it("verifies proofs for all leaves in a tree", () => {
		const { tree, leafHashes, componentValues, merkleRoot } =
			buildTestTree(testValues);
		const allIndices = testValues.map((_, i) => i);
		const proofs = allIndices.map((i) =>
			makeProof(tree, leafHashes, componentValues, i),
		);
		const result = verifyFingerprintProofs(proofs, allIndices);
		expect(result.valid).to.be.true;
		expect(result.merkleRoot).to.equal(merkleRoot);
	});

	it("returns invalid for a degenerate 1-leaf tree (verifyProof limitation)", () => {
		// A 1-leaf Merkle tree produces a degenerate proof that verifyProof
		// cannot validate. In practice we always have 41 leaves.
		const { tree, leafHashes, componentValues } =
			buildTestTree(["single-value"]);
		const proof = makeProof(tree, leafHashes, componentValues, 0);
		const result = verifyFingerprintProofs([proof], [0]);
		expect(result.valid).to.be.false;
	});

	it("works with a tree of 2 leaves", () => {
		const { tree, leafHashes, componentValues, merkleRoot } = buildTestTree([
			"left",
			"right",
		]);
		const proofs = [
			makeProof(tree, leafHashes, componentValues, 0),
			makeProof(tree, leafHashes, componentValues, 1),
		];
		const result = verifyFingerprintProofs(proofs, [0, 1]);
		expect(result.valid).to.be.true;
		expect(result.merkleRoot).to.equal(merkleRoot);
	});

	it("works with an odd number of leaves (duplicated last leaf in tree)", () => {
		const { tree, leafHashes, componentValues, merkleRoot } = buildTestTree([
			"a",
			"b",
			"c",
		]);
		const proofs = [
			makeProof(tree, leafHashes, componentValues, 0),
			makeProof(tree, leafHashes, componentValues, 2),
		];
		const result = verifyFingerprintProofs(proofs, [0, 2]);
		expect(result.valid).to.be.true;
		expect(result.merkleRoot).to.equal(merkleRoot);
	});

	it("returns valid=false when submitted leaves don't match requested leaves", () => {
		const { tree, leafHashes, componentValues } = buildTestTree(testValues);
		// Client proves leaves 0 and 1, but provider requested 2 and 3
		const proofs = [
			makeProof(tree, leafHashes, componentValues, 0),
			makeProof(tree, leafHashes, componentValues, 1),
		];
		const result = verifyFingerprintProofs(proofs, [2, 3]);
		expect(result.valid).to.be.false;
		expect(result.error).to.include("Proof leaf indices do not match");
	});

	it("returns valid=false when client sends wrong number of proofs", () => {
		const { tree, leafHashes, componentValues } = buildTestTree(testValues);
		// Client proves 2 leaves but provider requested 3
		const proofs = [
			makeProof(tree, leafHashes, componentValues, 0),
			makeProof(tree, leafHashes, componentValues, 1),
		];
		const result = verifyFingerprintProofs(proofs, [0, 1, 2]);
		expect(result.valid).to.be.false;
		expect(result.error).to.include("Expected 3 proofs but received 2");
	});

	it("validates even when requestedLeaves are in different order than proofs", () => {
		const { tree, leafHashes, componentValues, merkleRoot } =
			buildTestTree(testValues);
		// Proofs in order [7, 3, 0] but requested as [0, 3, 7]
		const proofs = [
			makeProof(tree, leafHashes, componentValues, 7),
			makeProof(tree, leafHashes, componentValues, 3),
			makeProof(tree, leafHashes, componentValues, 0),
		];
		const result = verifyFingerprintProofs(proofs, [0, 3, 7]);
		expect(result.valid).to.be.true;
		expect(result.merkleRoot).to.equal(merkleRoot);
	});
});
