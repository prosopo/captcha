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

import {
	FINGERPRINT_SOURCE_COUNT,
	type FingerprintProofRequest,
} from "@prosopo/types";

/**
 * Generates a fingerprint proof request with random leaf indices.
 * The provider sends this to the client to challenge them to prove
 * specific fingerprint components via Merkle proofs.
 *
 * @param numLeaves - Number of random leaves to request (default 3)
 * @returns A FingerprintProofRequest with randomly selected leaf indices
 */
export function generateFingerprintProofRequest(
	numLeaves = 3,
): FingerprintProofRequest {
	const clampedCount = Math.min(numLeaves, FINGERPRINT_SOURCE_COUNT);
	const indices = new Set<number>();

	while (indices.size < clampedCount) {
		indices.add(Math.floor(Math.random() * FINGERPRINT_SOURCE_COUNT));
	}

	return {
		requestedLeaves: Array.from(indices).sort((a, b) => a - b),
	};
}
