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
import type { BunnyRecord, WeightUpdate } from "./types.js";

// Bunny DNS constraints: a record's routing Weight is an integer in [0, 100]
// (see https://docs.bunny.net/dns/records — "Routing Weight ... between 0-100").
export const MAX_WEIGHT = 100;
// A weight of 0 would starve a node of traffic, so the effective minimum we
// ever assign is 1. Bunny's hard minimum is 0.
export const MIN_WEIGHT = 1;

// Equal weighting across a pool uses the maximum weight.
export const DEFAULT_WEIGHT = MAX_WEIGHT;

/** Clamp a weight to Bunny's supported integer range [MIN_WEIGHT, MAX_WEIGHT]. */
export function clampWeight(weight: number): number {
	return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.ceil(weight)));
}

/**
 * Group records that form a single load-balanced pool (same Name + Type).
 * Returns a map keyed by `${Name} ${Type}`.
 */
export function groupPools(
	records: readonly BunnyRecord[],
): Map<string, BunnyRecord[]> {
	const pools = new Map<string, BunnyRecord[]>();
	for (const record of records) {
		const key = `${record.Name} ${record.Type}`;
		const existing = pools.get(key);
		if (existing) {
			existing.push(record);
		} else {
			pools.set(key, [record]);
		}
	}
	return pools;
}

/**
 * Assign an identical weight to every record in a pool.
 */
export function equalWeights(
	records: readonly BunnyRecord[],
	weight: number = DEFAULT_WEIGHT,
): WeightUpdate[] {
	assertWeight(weight);
	return records.map((record) => ({ recordId: record.Id, weight }));
}

/**
 * Distribute total weight across records proportionally to the supplied
 * per-record shares. Shares need not sum to anything in particular; they are
 * normalised. The resulting integer weights sum to `total`, with any rounding
 * remainder assigned to the largest shares first so the total is exact.
 */
export function proportionalWeights(
	shares: ReadonlyArray<{ recordId: number; share: number }>,
	total: number = DEFAULT_WEIGHT * shares.length,
): WeightUpdate[] {
	assertWeight(total);
	if (shares.length === 0) {
		return [];
	}
	for (const { share } of shares) {
		if (!Number.isFinite(share) || share < 0) {
			throw new Error(`Invalid share: ${share}`);
		}
	}
	const sum = shares.reduce((acc, { share }) => acc + share, 0);
	if (sum <= 0) {
		return equalWeights(
			shares.map(({ recordId }) => ({ Id: recordId }) as BunnyRecord),
			Math.floor(total / shares.length),
		);
	}
	const raw = shares.map(({ recordId, share }) => ({
		recordId,
		exact: (share / sum) * total,
	}));
	const updates: WeightUpdate[] = raw.map(({ recordId, exact }) => ({
		recordId,
		weight: Math.floor(exact),
	}));
	let remainder = total - updates.reduce((acc, u) => acc + u.weight, 0);
	// hand out the remainder to the largest fractional parts first
	const order = raw
		.map(({ exact }, index) => ({ index, frac: exact - Math.floor(exact) }))
		.sort((a, b) => b.frac - a.frac);
	for (const { index } of order) {
		if (remainder <= 0) {
			break;
		}
		const update = updates[index];
		if (update) {
			update.weight += 1;
			remainder -= 1;
		}
	}
	return updates;
}

/**
 * Only keep updates whose weight differs from the record's current weight, to
 * avoid redundant writes.
 */
export function changedUpdates(
	records: readonly BunnyRecord[],
	updates: readonly WeightUpdate[],
): WeightUpdate[] {
	const current = new Map<number, number>(
		records.map((record) => [record.Id, record.Weight]),
	);
	return updates.filter((update) => current.get(update.recordId) !== update.weight);
}

/**
 * Turn a set of "cost" metric values (e.g. CPU usage, where lower is better)
 * into integer weights where a lower metric yields a higher weight.
 *
 * Steps, matching the intended inverse-weighting scheme:
 *  1. negate each value so lower cost becomes a larger number;
 *  2. shift every value up by the minimum negated value (i.e. subtract the min)
 *     so the smallest becomes 0 and all are non-negative;
 *  3. add 1 so no node ends up with weight 0 (which would starve it of traffic);
 *  4. scale proportionally so the largest weight fits Bunny's max (100),
 *     preserving the ratio between nodes;
 *  5. ceil + clamp so weights are integers within Bunny's [1, 100] range.
 *
 * An empty input yields an empty result.
 */
export function inverseWeights(values: readonly number[]): number[] {
	if (values.length === 0) {
		return [];
	}
	for (const value of values) {
		if (!Number.isFinite(value)) {
			throw new Error(`Metric value must be finite, got ${value}`);
		}
	}
	const negated = values.map((value) => -value);
	const minNegated = Math.min(...negated);
	const raw = negated.map((value) => value - minNegated + 1); // floats >= 1
	// Scale down proportionally if the largest would exceed Bunny's max weight,
	// so ratios between nodes are preserved rather than flattened by clamping.
	const maxRaw = Math.max(...raw);
	const factor = maxRaw > MAX_WEIGHT ? MAX_WEIGHT / maxRaw : 1;
	return raw.map((value) => clampWeight(value * factor));
}

// Result of classifying a pool's weights for upward spikes.
export interface WeightSpike {
	index: number;
	weight: number;
	// how many standard deviations above the mean this weight is
	sigma: 1 | 2;
}

export interface SpikeReport {
	mean: number;
	stddev: number;
	spikes: WeightSpike[];
}

/** Population mean and standard deviation of a list of numbers. */
export function meanStddev(values: readonly number[]): {
	mean: number;
	stddev: number;
} {
	if (values.length === 0) {
		return { mean: 0, stddev: 0 };
	}
	const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
	const variance =
		values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
	return { mean, stddev: Math.sqrt(variance) };
}

/**
 * Flag weights that spike upward relative to the pool mean:
 *  - `> mean + 2·stddev` is reported at sigma 2 (the more severe tier);
 *  - `> mean + 1·stddev` (but not 2σ) is reported at sigma 1.
 * Only the max side is considered. Pools with fewer than 2 members or zero
 * variance produce no spikes.
 */
export function detectWeightSpikes(weights: readonly number[]): SpikeReport {
	const { mean, stddev } = meanStddev(weights);
	if (weights.length < 2 || stddev === 0) {
		return { mean, stddev, spikes: [] };
	}
	const oneSigma = mean + stddev;
	const twoSigma = mean + 2 * stddev;
	const spikes: WeightSpike[] = [];
	weights.forEach((weight, index) => {
		if (weight > twoSigma) {
			spikes.push({ index, weight, sigma: 2 });
		} else if (weight > oneSigma) {
			spikes.push({ index, weight, sigma: 1 });
		}
	});
	return { mean, stddev, spikes };
}

function assertWeight(weight: number): void {
	if (!Number.isInteger(weight) || weight < 0) {
		throw new Error(`Weight must be a non-negative integer, got ${weight}`);
	}
}
