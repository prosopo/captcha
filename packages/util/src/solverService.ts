// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import { sha256 } from "@noble/hashes/sha256";

// batching prevents complete lock of Browser renders during resolution
const BATCH_SIZE = 1_000;

export const solvePoW = async (
	data: string,
	difficulty: number,
): Promise<number> => {
	let nonce = 0;
	const prefix = "0".repeat(difficulty);

	while (true) {
		const message = new TextEncoder().encode(nonce + data);
		const hashHex = bufferToHex(sha256(message));

		if (hashHex.startsWith(prefix)) {
			return nonce;
		}

		nonce += 1;

		if (0 === nonce % BATCH_SIZE) {
			// browser handles UI rendering between Macrotasks
			await newMacrotask();
		}
	}
};

const bufferToHex = (buffer: Uint8Array): string =>
	Array.from(buffer)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");

/**
 * Usage:
 *   await newMacrotask();
 *
 * Sequence (simplified):
 *   1. setTimeout creates a Macro_task, the function returns the mastered Promise
 *   2. "await" suspends your code flow
 *   3. The engine drains the current Micro_task queue
 *   4. => Browser performs renders
 *   5. ...The created Macro_task runs (for sure after the ones scheduled before)
 *   6. The Promise resolves, and it creates a Micro_task for your suspended code.
 *   7. The Micro_task runs and execution continues after the "await" line.
 */
const newMacrotask = async () =>
	new Promise((resolve) => setTimeout(resolve, 0));
