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

// Bunny stores weights as integers; equal weighting across a pool uses 100.
export const DEFAULT_WEIGHT = 100;

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

function assertWeight(weight: number): void {
	if (!Number.isInteger(weight) || weight < 0) {
		throw new Error(`Weight must be a non-negative integer, got ${weight}`);
	}
}
