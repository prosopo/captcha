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

// batching prevents complete lock of Browser renders during resolution
const BATCH_SIZE = 1_000;

// Difficulty is interpreted as "hex-character leading zeros" for backward
// compatibility with integer values (e.g. difficulty 4 ≡ 4 hex zeros ≡ 16 bits
// ≡ threshold = 2^240). Fractional values quantise to bit-level granularity:
// each 0.25 step ≡ 1 bit (so 4.25 = 17 bits, 4.5 = 18 bits, 4.75 = 19 bits).
const HEX_BITS_PER_DIFFICULTY = 4;
const HASH_BITS = 256;

const bitsRequired = (difficulty: number): number =>
	Math.round(HEX_BITS_PER_DIFFICULTY * difficulty);

export const targetForDifficulty = (difficulty: number): bigint => {
	const bits = bitsRequired(difficulty);
	if (bits <= 0) return 1n << BigInt(HASH_BITS);
	if (bits >= HASH_BITS) return 1n;
	return 1n << BigInt(HASH_BITS - bits);
};

const hashToBigInt = (hash: Uint8Array): bigint => {
	let value = 0n;
	for (const byte of hash) {
		value = (value << 8n) | BigInt(byte);
	}
	return value;
};

export const hashMeetsDifficulty = (
	hash: Uint8Array,
	difficulty: number,
): boolean => hashToBigInt(hash) < targetForDifficulty(difficulty);

// Reused across every nonce attempt — allocating a fresh TextEncoder in the
// tight solve loop is pure overhead.
const textEncoder = new TextEncoder();

// Core per-nonce check shared by solvePoW and solvePoWOffset: hash `nonce + data`
// and test it against the precomputed difficulty target.
const nonceMeetsTarget = (
	nonce: number,
	data: string,
	target: bigint,
): boolean => hashToBigInt(sha256(textEncoder.encode(nonce + data))) < target;

export const solvePoW = async (
	data: string,
	difficulty: number,
): Promise<number> => {
	const target = targetForDifficulty(difficulty);
	let nonce = 0;

	while (true) {
		if (nonceMeetsTarget(nonce, data, target)) {
			return nonce;
		}

		nonce += 1;

		if (0 === nonce % BATCH_SIZE) {
			// browser handles UI rendering between Macrotasks
			await newMacrotask();
		}
	}
};

/**
 * Solve a PoW challenge while only trying a subset of the nonce space.
 *
 * Starting from `start`, only nonces `start, start + step, start + 2*step, ...`
 * are tried. This allows the work to be divided across multiple solvers (e.g.
 * web workers): with `step` workers, worker `i` uses `start = i` so that every
 * nonce is covered exactly once across the pool with no overlap.
 *
 * Unlike `solvePoW`, this is synchronous and never yields to the event loop: it
 * is intended to run inside a web worker, where blocking the (worker) thread
 * does not affect the page's UI responsiveness.
 *
 * @param data - the challenge data appended to the nonce before hashing
 * @param difficulty - the PoW difficulty (see `targetForDifficulty`)
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
	if (!Number.isFinite(difficulty) || difficulty < 0) {
		throw new Error(
			`solvePoWOffset: difficulty must be a non-negative number, got ${difficulty}`,
		);
	}

	const target = targetForDifficulty(difficulty);
	let nonce = start;

	while (true) {
		if (nonceMeetsTarget(nonce, data, target)) {
			return nonce;
		}

		nonce += step;
	}
};

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
