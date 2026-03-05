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
import {
	FINGERPRINT_SOURCE_COUNT,
	FINGERPRINT_SOURCE_NAMES,
	type FingerprintLeafProof,
	type FingerprintMerkleState,
} from "@prosopo/types";
import { hexHash } from "@prosopo/util-crypto";
import { describe, expect, it } from "vitest";
import { generateFingerprintProofRequest } from "../../tasks/fingerprint/fingerprintProofRequest.js";
import { verifyFingerprintProofs } from "../../tasks/fingerprint/fingerprintVerification.js";

/**
 * Simulates the client-side flow: builds a Merkle tree from fingerprint
 * component values and provides a function to generate proofs on demand.
 * This mirrors the logic in ExtensionWeb2.createAccount() and
 * ExtensionWeb2.generateFingerprintProofs().
 */
function simulateClientSide(componentData: Record<string, string>): {
	merkleState: FingerprintMerkleState;
	tree: CaptchaMerkleTree;
	generateProofs: (requestedLeaves: number[]) => FingerprintLeafProof[];
} {
	const componentValues: string[] = [];
	const leafHashes: string[] = [];

	for (const sourceName of FINGERPRINT_SOURCE_NAMES) {
		const value = componentData[sourceName] ?? "error";
		const valueStr = JSON.stringify(value);
		componentValues.push(valueStr);
		leafHashes.push(hexHash(valueStr));
	}

	const tree = new CaptchaMerkleTree();
	tree.build(leafHashes);
	const merkleRoot = tree.getRoot().hash;

	const merkleState: FingerprintMerkleState = {
		merkleRoot,
		leafHashes,
		componentValues,
	};

	const generateProofs = (
		requestedLeaves: number[],
	): FingerprintLeafProof[] => {
		return requestedLeaves.map((leafIndex) => {
			const leafHash = leafHashes[leafIndex];
			const componentValue = componentValues[leafIndex];
			if (leafHash === undefined || componentValue === undefined) {
				throw new Error(`Invalid leaf index ${leafIndex}`);
			}
			const proof = tree.proof(leafHash);
			return { leafIndex, value: componentValue, proof };
		});
	};

	return { merkleState, tree, generateProofs };
}

/** Generates mock fingerprint component data for all sources. */
function generateMockFingerprintData(): Record<string, string> {
	const data: Record<string, string> = {};
	for (const name of FINGERPRINT_SOURCE_NAMES) {
		data[name] = `mock-${name}-value-${Math.random().toString(36).slice(2, 8)}`;
	}
	return data;
}

describe("Fingerprint Proof End-to-End Flow", () => {
	it("full round trip: provider requests → client generates → provider verifies", () => {
		// 1. Client builds Merkle tree from fingerprint components
		const mockData = generateMockFingerprintData();
		const { merkleState, generateProofs } = simulateClientSide(mockData);

		// 2. Provider generates a proof request (random leaves)
		const proofRequest = generateFingerprintProofRequest(3);
		expect(proofRequest.requestedLeaves).to.have.lengthOf(3);

		// 3. Client generates proofs for requested leaves
		const proofs = generateProofs(proofRequest.requestedLeaves);
		expect(proofs).to.have.lengthOf(3);

		// 4. Provider verifies the proofs against the requested leaves
		const result = verifyFingerprintProofs(
			proofs,
			proofRequest.requestedLeaves,
		);
		expect(result.valid).to.be.true;
		expect(result.merkleRoot).to.equal(merkleState.merkleRoot);
	});

	it("provider correctly rejects proofs from a different fingerprint", () => {
		// Client 1 builds tree
		const data1 = generateMockFingerprintData();
		const client1 = simulateClientSide(data1);

		// Client 2 builds tree (different fingerprint)
		const data2 = generateMockFingerprintData();
		const client2 = simulateClientSide(data2);

		// Proof request
		const proofRequest = generateFingerprintProofRequest(2);

		// Mix proofs: one from client1, one from client2
		const proof1 = client1.generateProofs([proofRequest.requestedLeaves[0]!]);
		const proof2 = client2.generateProofs([proofRequest.requestedLeaves[1]!]);
		const mixedProofs = [...proof1, ...proof2];

		const result = verifyFingerprintProofs(
			mixedProofs,
			proofRequest.requestedLeaves,
		);
		expect(result.valid).to.be.false;
		expect(result.error).to.include("Inconsistent Merkle roots");
	});

	it("verification fails if client tampers with a component value", () => {
		const mockData = generateMockFingerprintData();
		const { generateProofs } = simulateClientSide(mockData);

		const proofRequest = generateFingerprintProofRequest(2);
		const proofs = generateProofs(proofRequest.requestedLeaves);

		// Tamper with first proof's value
		proofs[0]!.value = JSON.stringify("tampered-value");

		const result = verifyFingerprintProofs(
			proofs,
			proofRequest.requestedLeaves,
		);
		expect(result.valid).to.be.false;
		expect(result.error).to.include("Invalid Merkle proof");
	});

	it("all leaf indices can be individually verified", () => {
		const mockData = generateMockFingerprintData();
		const { merkleState, generateProofs } = simulateClientSide(mockData);

		// Verify every single leaf one by one
		for (let i = 0; i < FINGERPRINT_SOURCE_COUNT; i++) {
			const proofs = generateProofs([i]);
			const result = verifyFingerprintProofs(proofs, [i]);
			expect(result.valid).to.be.true;
			expect(result.merkleRoot).to.equal(merkleState.merkleRoot);
		}
	});

	it("requesting all leaves produces valid proofs", () => {
		const mockData = generateMockFingerprintData();
		const { merkleState, generateProofs } = simulateClientSide(mockData);

		const allLeaves = Array.from(
			{ length: FINGERPRINT_SOURCE_COUNT },
			(_, i) => i,
		);
		const proofs = generateProofs(allLeaves);

		const result = verifyFingerprintProofs(proofs, allLeaves);
		expect(result.valid).to.be.true;
		expect(result.merkleRoot).to.equal(merkleState.merkleRoot);
	});

	it("merkle root is deterministic for the same input", () => {
		const mockData = generateMockFingerprintData();
		const client1 = simulateClientSide(mockData);
		const client2 = simulateClientSide(mockData);

		expect(client1.merkleState.merkleRoot).to.equal(
			client2.merkleState.merkleRoot,
		);
	});

	it("merkle root changes when any component changes", () => {
		const mockData = generateMockFingerprintData();
		const client1 = simulateClientSide(mockData);

		// Change one component
		const altData = { ...mockData, canvas: "different-canvas-hash" };
		const client2 = simulateClientSide(altData);

		expect(client1.merkleState.merkleRoot).to.not.equal(
			client2.merkleState.merkleRoot,
		);
	});

	it("handles error components (missing source values)", () => {
		// Simulate a client that doesn't have all components —
		// missing ones default to "error"
		const partialData: Record<string, string> = {
			fonts: "Arial,Verdana",
			canvas: "canvas-hash-123",
			// All other sources missing → will be "error"
		};
		const { merkleState, generateProofs } = simulateClientSide(partialData);

		const proofRequest = generateFingerprintProofRequest(3);
		const proofs = generateProofs(proofRequest.requestedLeaves);

		const result = verifyFingerprintProofs(
			proofs,
			proofRequest.requestedLeaves,
		);
		expect(result.valid).to.be.true;
		expect(result.merkleRoot).to.equal(merkleState.merkleRoot);
	});

	it("proof request always requests valid leaf indices", () => {
		// Run many times to catch randomness edge cases
		for (let i = 0; i < 50; i++) {
			const request = generateFingerprintProofRequest(5);
			for (const idx of request.requestedLeaves) {
				expect(idx).to.be.greaterThanOrEqual(0);
				expect(idx).to.be.lessThan(FINGERPRINT_SOURCE_COUNT);
			}
		}
	});

	it("leaf hash matches hexHash of the component value string", () => {
		const mockData = generateMockFingerprintData();
		const { merkleState } = simulateClientSide(mockData);

		for (let i = 0; i < FINGERPRINT_SOURCE_COUNT; i++) {
			const expectedHash = hexHash(merkleState.componentValues[i]!);
			expect(merkleState.leafHashes[i]).to.equal(expectedHash);
		}
	});

	it("rejects proofs for wrong leaves (client proves different leaves than requested)", () => {
		const mockData = generateMockFingerprintData();
		const { generateProofs } = simulateClientSide(mockData);

		// Provider requests leaves [0, 1, 2]
		const requestedLeaves = [0, 1, 2];
		// Client proves leaves [3, 4, 5] instead
		const proofs = generateProofs([3, 4, 5]);

		const result = verifyFingerprintProofs(proofs, requestedLeaves);
		expect(result.valid).to.be.false;
		expect(result.error).to.include("Proof leaf indices do not match");
	});

	it("rejects when client sends fewer proofs than requested", () => {
		const mockData = generateMockFingerprintData();
		const { generateProofs } = simulateClientSide(mockData);

		// Provider requests 3 leaves
		const requestedLeaves = [5, 10, 15];
		// Client only proves 2
		const proofs = generateProofs([5, 10]);

		const result = verifyFingerprintProofs(proofs, requestedLeaves);
		expect(result.valid).to.be.false;
		expect(result.error).to.include("Expected 3 proofs but received 2");
	});
});
