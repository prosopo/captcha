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
import { describe, expect, it } from "vitest";
import {
	type BunnyRecord,
	BunnyRecordType,
	SmartRoutingType,
} from "../types.js";
import {
	changedUpdates,
	equalWeights,
	groupPools,
	proportionalWeights,
} from "../weights.js";

const record = (
	Id: number,
	Name: string,
	Type: BunnyRecordType,
	Weight: number,
): BunnyRecord => ({
	Id,
	Name,
	Type,
	Value: `10.0.0.${Id}`,
	Weight,
	Ttl: 15,
	SmartRoutingType: SmartRoutingType.Latency,
});

describe("groupPools", () => {
	it("groups records by Name + Type", () => {
		const records: BunnyRecord[] = [
			record(1, "pronode", BunnyRecordType.A, 100),
			record(2, "pronode", BunnyRecordType.A, 100),
			record(3, "pronode", BunnyRecordType.AAAA, 100),
		];
		const pools = groupPools(records);
		expect(pools.size).toBe(2);
		expect(pools.get(`pronode ${BunnyRecordType.A}`)?.length).toBe(2);
		expect(pools.get(`pronode ${BunnyRecordType.AAAA}`)?.length).toBe(1);
	});
});

describe("equalWeights", () => {
	it("assigns the same weight to every record", () => {
		const records: BunnyRecord[] = [
			record(1, "pronode", BunnyRecordType.A, 50),
			record(2, "pronode", BunnyRecordType.A, 70),
		];
		expect(equalWeights(records, 100)).toEqual([
			{ recordId: 1, weight: 100 },
			{ recordId: 2, weight: 100 },
		]);
	});

	it("rejects a negative weight", () => {
		expect(() => equalWeights([], -1)).toThrow();
	});
});

describe("proportionalWeights", () => {
	it("distributes weight proportionally to shares", () => {
		const updates = proportionalWeights(
			[
				{ recordId: 1, share: 1 },
				{ recordId: 2, share: 3 },
			],
			100,
		);
		expect(updates).toEqual([
			{ recordId: 1, weight: 25 },
			{ recordId: 2, weight: 75 },
		]);
	});

	it("assigns rounding remainder so the total is exact", () => {
		const updates = proportionalWeights(
			[
				{ recordId: 1, share: 1 },
				{ recordId: 2, share: 1 },
				{ recordId: 3, share: 1 },
			],
			100,
		);
		const total = updates.reduce((acc, u) => acc + u.weight, 0);
		expect(total).toBe(100);
	});

	it("falls back to equal split when all shares are zero", () => {
		const updates = proportionalWeights(
			[
				{ recordId: 1, share: 0 },
				{ recordId: 2, share: 0 },
			],
			100,
		);
		expect(updates).toEqual([
			{ recordId: 1, weight: 50 },
			{ recordId: 2, weight: 50 },
		]);
	});

	it("rejects a negative share", () => {
		expect(() =>
			proportionalWeights([{ recordId: 1, share: -1 }], 100),
		).toThrow();
	});
});

describe("changedUpdates", () => {
	it("keeps only updates that change a record's weight", () => {
		const records: BunnyRecord[] = [
			record(1, "pronode", BunnyRecordType.A, 100),
			record(2, "pronode", BunnyRecordType.A, 50),
		];
		const updates = changedUpdates(records, [
			{ recordId: 1, weight: 100 },
			{ recordId: 2, weight: 75 },
		]);
		expect(updates).toEqual([{ recordId: 2, weight: 75 }]);
	});
});
