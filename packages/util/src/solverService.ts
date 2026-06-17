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

// `targetForDifficulty` is always a power of two (`1n << (256 - bits)`), so the
// comparison `hash < target` is equivalent to "the leading `bits` bits of the
// hash are all zero". That lets the hot loop test the raw bytes directly
// instead of allocating a 256-bit bigint per candidate hash.
interface DifficultyMask {
	// number of leading bytes that must be entirely zero
	zeroBytes: number;
	// exclusive upper bound for the byte after the zero run (1 when no partial
	// byte is required, i.e. the difficulty is a whole number of bytes)
	partialBound: number;
	// when true every hash satisfies the difficulty (bits <= 0)
	always: boolean;
	// when true only the all-zero hash satisfies the difficulty (bits >= 256)
	requireZeroHash: boolean;
}

const difficultyMask = (difficulty: number): DifficultyMask => {
	const bits = bitsRequired(difficulty);
	if (bits <= 0)
		return {
			zeroBytes: 0,
			partialBound: 1,
			always: true,
			requireZeroHash: false,
		};
	if (bits >= HASH_BITS)
		return {
			zeroBytes: 32,
			partialBound: 1,
			always: false,
			requireZeroHash: true,
		};
	const zeroBytes = bits >> 3;
	const remBits = bits & 7;
	return {
		zeroBytes,
		// remaining bits must be zero in the next byte: byte < 2^(8 - remBits)
		partialBound: remBits === 0 ? 1 : 1 << (8 - remBits),
		always: false,
		requireZeroHash: false,
	};
};

const hashMeetsMask = (hash: Uint8Array, mask: DifficultyMask): boolean => {
	if (mask.always) return true;
	for (let i = 0; i < mask.zeroBytes; i++) {
		if (hash[i] !== 0) return false;
	}
	if (mask.requireZeroHash) return true;
	if (mask.partialBound > 1) {
		// non-null: zeroBytes < 32 whenever a partial byte is required
		return (hash[mask.zeroBytes] as number) < mask.partialBound;
	}
	return true;
};

export const hashMeetsDifficulty = (
	hash: Uint8Array,
	difficulty: number,
): boolean => hashMeetsMask(hash, difficultyMask(difficulty));

export const solvePoW = async (
	data: string,
	difficulty: number,
): Promise<number> => {
	const mask = difficultyMask(difficulty);

	// Encode the constant suffix once and reuse a single message buffer, only
	// rewriting the nonce's decimal digits each iteration. The digit count only
	// grows at powers of ten, where the buffer is reallocated.
	const encoder = new TextEncoder();
	const dataBytes = encoder.encode(data);

	let nonce = 0;
	let digits = 1;
	let message = new Uint8Array(digits + dataBytes.length);
	message.set(dataBytes, digits);
	let rollover = 10;

	while (true) {
		if (nonce === rollover) {
			// the decimal representation gained a digit; grow the buffer
			digits += 1;
			rollover *= 10;
			message = new Uint8Array(digits + dataBytes.length);
			message.set(dataBytes, digits);
		}

		// write the nonce's decimal digits into the leading `digits` bytes
		let n = nonce;
		for (let i = digits - 1; i >= 0; i--) {
			message[i] = 48 + (n % 10); // 48 === '0'.charCodeAt(0)
			n = Math.floor(n / 10);
		}

		if (hashMeetsMask(sha256(message), mask)) {
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
