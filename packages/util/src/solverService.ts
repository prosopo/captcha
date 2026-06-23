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
import { sha256 } from "@noble/hashes/sha256";

export const solvePoW = (data: string, difficulty: number): number =>
	solvePoWOffset(data, difficulty, 0, 1);

/**
 * Solve a PoW challenge while only trying a subset of the nonce space.
 *
 * Starting from `start`, only nonces `start, start + step, start + 2*step, ...`
 * are tried. This allows the work to be divided across multiple solvers (e.g.
 * web workers): with `step` workers, worker `i` uses `start = i` so that every
 * nonce is covered exactly once across the pool with no overlap.
 *
 * @param data - the challenge data appended to the nonce before hashing
 * @param difficulty - the number of leading hex zeros the hash must have
 * @param start - the first nonce to try (the worker's offset)
 * @param step - the gap between consecutive nonces tried (the worker count)
 */
export const solvePoWOffset = (
	data: string,
	difficulty: number,
	start: number,
	step: number,
): number => {
	if (!Number.isInteger(start)) {
		throw new Error(`solvePoWOffset: start must be an integer, got ${start}`);
	}
	if (!Number.isInteger(step) || step < 1) {
		throw new Error(
			`solvePoWOffset: step must be a positive integer, got ${step}`,
		);
	}
	if (!Number.isInteger(difficulty) || difficulty < 0) {
		throw new Error(
			`solvePoWOffset: difficulty must be a non-negative integer, got ${difficulty}`,
		);
	}

	let nonce = start;
	const prefix = "0".repeat(difficulty);

	while (true) {
		const message = new TextEncoder().encode(nonce + data);
		const hashHex = bufferToHex(sha256(message));

		if (hashHex.startsWith(prefix)) {
			return nonce;
		}

		nonce += step;
	}
};

const bufferToHex = (buffer: Uint8Array): string =>
	Array.from(buffer)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
