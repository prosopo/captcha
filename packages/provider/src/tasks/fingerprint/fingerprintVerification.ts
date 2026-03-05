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

import { verifyProof } from "@prosopo/datasets";
import type { FingerprintLeafProof, MerkleProof } from "@prosopo/types";
import { hexHash } from "@prosopo/util-crypto";

/**
 * Verifies fingerprint Merkle proofs submitted by the client.
 *
 * Validates that:
 * 1. The client proved exactly the leaves that were requested
 * 2. Each proof's hash matches its value
 * 3. Each Merkle proof path is valid
 * 4. All proofs point to the same Merkle root
 *
 * @param proofs - Array of leaf proofs from the client
 * @param requestedLeaves - The leaf indices the provider originally requested
 * @returns Object with verification result and the Merkle root if valid
 */
export function verifyFingerprintProofs(
	proofs: FingerprintLeafProof[],
	requestedLeaves: number[],
): {
	valid: boolean;
	merkleRoot?: string;
	error?: string;
} {
	if (requestedLeaves.length === 0) {
		return { valid: false, error: "No leaves were requested" };
	}

	if (proofs.length === 0) {
		return { valid: false, error: "No fingerprint proofs provided" };
	}

	// Validate that the submitted leaf indices exactly match the requested ones
	const submittedIndices = proofs.map((p) => p.leafIndex).sort((a, b) => a - b);
	const sortedRequested = [...requestedLeaves].sort((a, b) => a - b);

	if (submittedIndices.length !== sortedRequested.length) {
		return {
			valid: false,
			error: `Expected ${sortedRequested.length} proofs but received ${submittedIndices.length}`,
		};
	}

	for (let i = 0; i < sortedRequested.length; i++) {
		if (submittedIndices[i] !== sortedRequested[i]) {
			return {
				valid: false,
				error: `Proof leaf indices do not match requested leaves. Expected [${sortedRequested.join(",")}], got [${submittedIndices.join(",")}]`,
			};
		}
	}

	let expectedRoot: string | undefined;

	for (const proof of proofs) {
		// Hash the raw value to get the leaf hash
		const leafHash = hexHash(proof.value);

		// Verify the Merkle proof (cast from string[][] to MerkleProof — structurally identical at runtime)
		const isValid = verifyProof(leafHash, proof.proof as MerkleProof);

		if (!isValid) {
			return {
				valid: false,
				error: `Invalid Merkle proof for leaf index ${proof.leafIndex}`,
			};
		}

		// Extract the root from the proof (last element of the last layer)
		const proofRoot = proof.proof[proof.proof.length - 1]?.[0];
		if (!proofRoot) {
			return {
				valid: false,
				error: `Missing root in proof for leaf index ${proof.leafIndex}`,
			};
		}

		// All proofs must point to the same root
		if (expectedRoot === undefined) {
			expectedRoot = proofRoot;
		} else if (expectedRoot !== proofRoot) {
			return {
				valid: false,
				error: "Inconsistent Merkle roots across proofs",
			};
		}
	}

	return { valid: true, merkleRoot: expectedRoot };
}
