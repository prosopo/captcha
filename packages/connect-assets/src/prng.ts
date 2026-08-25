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

import { randomBytes } from "node:crypto";

/**
 * Deterministic PRNG for board layout and glyph synthesis.
 *
 * SECURITY: unlike the slider puzzle, the connect board is not a
 * hidden-information game — the client is handed the tiles and could compute
 * the winning move itself (see the note in `board.ts`). The seed therefore
 * protects a weaker property: that two challenges are visually unrelated, so
 * a solver can't learn a fixed sprite set across sessions and match on hashes.
 * It still must never leave the provider — not in the response, not in logs,
 * not on the session record.
 */
export interface Prng {
	/** Uniform in [0, 1). */
	next(): number;
	/** Uniform integer in [min, max]. */
	int(min: number, max: number): number;
	/** Uniform in [min, max). */
	range(min: number, max: number): number;
	/** Uniform element of a non-empty list. */
	pick<T>(items: readonly T[]): T;
	/** Fisher-Yates, returns a new array; the input is not mutated. */
	shuffle<T>(items: readonly T[]): T[];
}

export const SEED_BYTES = 16;

/** Fresh 128-bit seed from the system CSPRNG. */
export const createSeed = (): Buffer => randomBytes(SEED_BYTES);

/**
 * xoshiro128** — small, fast, and good enough for imagery and layout. Not a
 * CSPRNG: the secrecy of the output rests on the seed, which is.
 *
 * Deliberately a byte-for-byte twin of `@prosopo/puzzle-assets`'s generator
 * rather than a shared dependency: puzzle-assets pulls in `sharp` at module
 * scope, and connect-assets needs the PRNG in contexts (unit tests, the board
 * solver) where the native binding is dead weight.
 */
export const createPrng = (seed: Buffer): Prng => {
	if (seed.length < SEED_BYTES) {
		throw new Error(
			`connect-assets: seed must be at least ${SEED_BYTES} bytes, got ${seed.length}`,
		);
	}

	let s0 = seed.readUInt32LE(0);
	let s1 = seed.readUInt32LE(4);
	let s2 = seed.readUInt32LE(8);
	let s3 = seed.readUInt32LE(12);

	// An all-zero state is a fixed point for xoshiro; nudge it.
	if ((s0 | s1 | s2 | s3) === 0) {
		s0 = 1;
	}

	const rotl = (x: number, k: number): number =>
		((x << k) | (x >>> (32 - k))) >>> 0;

	const nextUint32 = (): number => {
		const result = (Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0) >>> 0;
		const t = (s1 << 9) >>> 0;
		s2 = (s2 ^ s0) >>> 0;
		s3 = (s3 ^ s1) >>> 0;
		s1 = (s1 ^ s2) >>> 0;
		s0 = (s0 ^ s3) >>> 0;
		s2 = (s2 ^ t) >>> 0;
		s3 = rotl(s3, 11);
		return result;
	};

	const next = (): number => nextUint32() / 4294967296;

	const prng: Prng = {
		next,
		int: (min: number, max: number): number =>
			min + Math.floor(next() * (max - min + 1)),
		range: (min: number, max: number): number => min + next() * (max - min),
		pick: <T>(items: readonly T[]): T => {
			const item = items[Math.floor(next() * items.length)];
			if (item === undefined) {
				throw new Error("connect-assets: cannot pick from an empty list");
			}
			return item;
		},
		shuffle: <T>(items: readonly T[]): T[] => {
			const out = [...items];
			for (let i = out.length - 1; i > 0; i--) {
				const j = Math.floor(next() * (i + 1));
				const a = out[i];
				const b = out[j];
				// Indices are in range by construction; the guard is for the
				// type-checker rather than for a reachable state.
				if (a !== undefined && b !== undefined) {
					out[i] = b;
					out[j] = a;
				}
			}
			return out;
		},
	};

	return prng;
};
