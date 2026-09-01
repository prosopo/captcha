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

import { randomBytes, randomInt } from "node:crypto";

/**
 * Stratified, interleaved sampling over a numeric range.
 *
 * Generalised out of the piece-size draw in `puzzleRenderer`, which needed
 * more than `Math.random()`: a plain uniform draw permits runs that cluster
 * at one end of the range purely by chance, and a clustered run is exactly
 * what an automated solver calibrates against. Splitting the range into
 * buckets and visiting every bucket once per cycle bounds how unrepresentative
 * any window of N consecutive draws can be.
 *
 * Each caller holds its OWN sampler instance. Sharing one cursor across
 * several knobs would make those knobs advance in lockstep, so a solver that
 * observed one knob could infer the others — and, with a difficulty ladder in
 * play, infer the difficulty level from a single render. Independent cursors
 * with independent shuffles keep the knobs uncorrelated.
 */

/**
 * Buckets per cycle. Must be even — `buildOrder` interleaves the low and high
 * halves, which requires them to be the same size.
 */
export const STRATIFIED_BUCKETS = 8;

/**
 * Uniform float in [0, 1), from the CSPRNG rather than `Math.random()`.
 *
 * V8 implements `Math.random()` as xorshift128+, whose internal state is
 * recoverable from a short run of consecutive outputs. That matters here
 * specifically: the point of sampling these knobs is that an automated solver
 * cannot calibrate against a known render, and a predictable stream gives it
 * exactly that — observe a few challenges, recover the state, and every
 * subsequent draw is known in advance. The unpredictability IS the security
 * property, so it has to come from a source built for it.
 *
 * 48 bits (6 bytes) is the most a float64 can hold without rounding, so the
 * result is uniform with no modulo bias.
 */
const RANDOM_BYTES = 6;
const RANDOM_DENOMINATOR = 2 ** (RANDOM_BYTES * 8);

const secureUnitFloat = (): number =>
	Number(randomBytes(RANDOM_BYTES).readUIntBE(0, RANDOM_BYTES)) /
	RANDOM_DENOMINATOR;

const shuffleArray = <T>(input: T[]): T[] => {
	const out = [...input];
	for (let i = out.length - 1; i > 0; i--) {
		// randomInt's upper bound is exclusive, giving an unbiased index in
		// [0, i] — the correct Fisher-Yates range.
		const j = randomInt(0, i + 1);
		const tmp = out[i] as T;
		out[i] = out[j] as T;
		out[j] = tmp;
	}
	return out;
};

export interface StratifiedSampler {
	/**
	 * Draw a value in [min, max]. Returns `min` when the range is degenerate
	 * (min >= max) without consuming a bucket, so a pinned knob does not skew
	 * the cycle for the rest of the range.
	 */
	sample(min: number, max: number): number;
	/**
	 * Draw and round to an integer. Convenience for the int-typed knobs
	 * (decoyCount, tolerance, decoyEdgeDarkness).
	 */
	sampleInt(min: number, max: number): number;
}

export const createStratifiedSampler = (
	buckets: number = STRATIFIED_BUCKETS,
): StratifiedSampler => {
	// Even bucket count is required by the interleave below; fall back to the
	// default rather than silently producing an unbalanced cycle.
	const bucketCount = buckets > 0 && buckets % 2 === 0 ? buckets : 8;
	let order: number[] = [];
	let cursor = 0;

	// Rebuilt at each cycle so consecutive draws strictly alternate between the
	// low half (buckets 0..N/2-1) and the high half (buckets N/2..N-1). A pure
	// shuffle still permits runs of adjacent buckets ("three high in a row" by
	// chance); interleaving forbids that by construction.
	const buildOrder = (): number[] => {
		const half = bucketCount >> 1;
		const lowHalf = shuffleArray(Array.from({ length: half }, (_, i) => i));
		const highHalf = shuffleArray(
			Array.from({ length: half }, (_, i) => i + half),
		);
		// Randomise which half opens the cycle so the pattern is not always
		// low-then-high across cycle boundaries.
		const [first, second] =
			randomInt(0, 2) === 0 ? [lowHalf, highHalf] : [highHalf, lowHalf];
		const next: number[] = [];
		for (let i = 0; i < half; i++) {
			next.push(first[i] as number);
			next.push(second[i] as number);
		}
		return next;
	};

	const sample = (min: number, max: number): number => {
		if (!(max > min)) return min;
		if (cursor >= order.length) {
			order = buildOrder();
			cursor = 0;
		}
		const bucket = order[cursor] as number;
		cursor++;
		// Uniform within the bucket → uniform overall across the range, with a
		// guaranteed spread across any N consecutive samples where N >= buckets.
		const u = (bucket + secureUnitFloat()) / bucketCount;
		return min + u * (max - min);
	};

	return {
		sample,
		sampleInt: (min: number, max: number): number =>
			Math.round(sample(min, max)),
	};
};
