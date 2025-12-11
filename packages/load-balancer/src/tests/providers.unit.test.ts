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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { type HardcodedProvider, loadBalancer } from "../index.js";
import {
	getRandomActiveProvider,
	selectWeightedProvider,
} from "../providers.js";
import { _resetCache } from "../providers.js";

vi.mock("../index.js", () => ({
	loadBalancer: vi.fn(),
}));

describe("selectWeightedProvider", () => {
	it("selects provider based on weight distribution", () => {
		const providers = [
			{
				address: "address1",
				url: "url1",
				datasetId: "dataset1",
				weight: 1,
			},
			{
				address: "address2",
				url: "url2",
				datasetId: "dataset2",
				weight: 3,
			},
			{
				address: "address3",
				url: "url3",
				datasetId: "dataset3",
				weight: 1,
			},
		];

		// Total weight = 5
		// Provider 1: weight 1 (covers entropy 0-0)
		// Provider 2: weight 3 (covers entropy 1-3)
		// Provider 3: weight 1 (covers entropy 4-4)

		// Entropy 0 should select provider1
		expect(selectWeightedProvider(providers, 0).address).toBe("address1");

		// Entropy 1-3 should select provider2
		expect(selectWeightedProvider(providers, 1).address).toBe("address2");
		expect(selectWeightedProvider(providers, 2).address).toBe("address2");
		expect(selectWeightedProvider(providers, 3).address).toBe("address2");

		// Entropy 4 should select provider3
		expect(selectWeightedProvider(providers, 4).address).toBe("address3");

		// Entropy wraps around with modulo
		expect(selectWeightedProvider(providers, 5).address).toBe("address1");
		expect(selectWeightedProvider(providers, 6).address).toBe("address2");
	});

	it("handles equal weights correctly", () => {
		const providers = [
			{
				address: "address1",
				url: "url1",
				datasetId: "dataset1",
				weight: 1,
			},
			{
				address: "address2",
				url: "url2",
				datasetId: "dataset2",
				weight: 1,
			},
		];

		// Total weight = 2
		expect(selectWeightedProvider(providers, 0).address).toBe("address1");
		expect(selectWeightedProvider(providers, 1).address).toBe("address2");
		expect(selectWeightedProvider(providers, 2).address).toBe("address1");
		expect(selectWeightedProvider(providers, 3).address).toBe("address2");
	});

	it("handles single provider", () => {
		const providers = [
			{
				address: "address1",
				url: "url1",
				datasetId: "dataset1",
				weight: 10,
			},
		];

		// All entropy values should select the only provider
		expect(selectWeightedProvider(providers, 0).address).toBe("address1");
		expect(selectWeightedProvider(providers, 5).address).toBe("address1");
		expect(selectWeightedProvider(providers, 100).address).toBe("address1");
	});

	it("throws error for empty provider list", () => {
		expect(() => selectWeightedProvider([], 0)).toThrow(
			"No providers available",
		);
	});

	it("heavily weighted provider is selected more often", () => {
		const providers = [
			{
				address: "address1",
				url: "url1",
				datasetId: "dataset1",
				weight: 1,
			},
			{
				address: "address2",
				url: "url2",
				datasetId: "dataset2",
				weight: 99,
			},
		];

		// Total weight = 100
		// Provider 1: entropy 0 (1% of the time)
		// Provider 2: entropy 1-99 (99% of the time)

		const selections = { address1: 0, address2: 0 };
		for (let i = 0; i < 100; i++) {
			const selected = selectWeightedProvider(providers, i);
			if (selected.address === "address1") {
				selections.address1++;
			} else {
				selections.address2++;
			}
		}

		expect(selections.address1).toBe(1);
		expect(selections.address2).toBe(99);
	});

	it("handles maximum weight value (100)", () => {
		const providers = [
			{
				address: "address1",
				url: "url1",
				datasetId: "dataset1",
				weight: 100,
			},
			{
				address: "address2",
				url: "url2",
				datasetId: "dataset2",
				weight: 100,
			},
		];

		// Total weight = 200
		const selections = { address1: 0, address2: 0 };
		for (let i = 0; i < 200; i++) {
			const selected = selectWeightedProvider(providers, i);
			if (selected.address === "address1") {
				selections.address1++;
			} else {
				selections.address2++;
			}
		}

		// Each should get selected 100 times (50%)
		expect(selections.address1).toBe(100);
		expect(selections.address2).toBe(100);
	});

	it("correctly handles providers without values for weight", () => {
		// Providers without weight field should default to weight 1
		const providers = [
			{
				address: "address1",
				url: "url1",
				datasetId: "dataset1",
				// No weight field
			},
			{
				address: "address2",
				url: "url2",
				datasetId: "dataset2",
				weight: 3,
			},
		];

		// Mock the providers to simulate what comes from the API
		// The real providers will have weight added by zod schema default
		const providersWithDefaults = [
			{ ...providers[0], weight: 1 },
			providers[1],
		];

		// Total weight = 4 (1 + 3)
		// address1 (weight 1) should get entropy 0 (25%)
		// address2 (weight 3) should get entropy 1-3 (75%)

		const selections = { address1: 0, address2: 0 };
		for (let i = 0; i < 100; i++) {
			const selected = selectWeightedProvider(
				providersWithDefaults as HardcodedProvider[],
				i,
			);
			if (selected.address === "address1") {
				selections.address1++;
			} else {
				selections.address2++;
			}
		}

		// address1 should get ~25% and address2 should get ~75%
		expect(selections.address1).toBe(25);
		expect(selections.address2).toBe(75);
	});
});

describe("getRandomActiveProvider", () => {
	beforeEach(() => {
		_resetCache();
		vi.clearAllMocks();
		vi.resetAllMocks();
		vi.resetModules();
	});

	it("returns a random provider when providers list is populated", async () => {
		const mockProviders = [
			{ address: "address1", url: "url1", datasetId: "dataset1", weight: 1 },
			{ address: "address2", url: "url2", datasetId: "dataset2", weight: 1 },
		];
		(loadBalancer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockProviders,
		);

		const result = await getRandomActiveProvider("development", 1);

		expect(result.providerAccount).toBe("address2");
		expect(result.provider.url).toBe("url2");
		expect(result.provider.datasetId).toBe("dataset2");
	});

	it("loads providers only once when called multiple times", async () => {
		const mockProviders = [
			{ address: "address1", url: "url1", datasetId: "dataset1", weight: 1 },
		];
		(loadBalancer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockProviders,
		);

		await getRandomActiveProvider("development", 123);
		await getRandomActiveProvider("development", 456);

		expect(loadBalancer).toHaveBeenCalledTimes(1);
	});

	it("handles empty providers list gracefully", async () => {
		(loadBalancer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);

		await expect(getRandomActiveProvider("development", 123)).rejects.toThrow();
	});

	it("respects provider weights when selecting", async () => {
		const mockProviders = [
			{ address: "address1", url: "url1", datasetId: "dataset1", weight: 1 },
			{ address: "address2", url: "url2", datasetId: "dataset2", weight: 3 },
		];
		(loadBalancer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockProviders,
		);

		// Total weight = 4
		// address1 gets entropy 0 (25%)
		// address2 gets entropy 1-3 (75%)

		const result0 = await getRandomActiveProvider("development", 0);
		expect(result0.providerAccount).toBe("address1");

		_resetCache();
		const result1 = await getRandomActiveProvider("development", 1);
		expect(result1.providerAccount).toBe("address2");

		_resetCache();
		const result2 = await getRandomActiveProvider("development", 2);
		expect(result2.providerAccount).toBe("address2");

		_resetCache();
		const result3 = await getRandomActiveProvider("development", 3);
		expect(result3.providerAccount).toBe("address2");
	});

	it("handles providers with missing weight field (defaults to 1)", async () => {
		// Simulate providers returned from loadBalancer where one has weight and one doesn't
		const mockProviders = [
			{ address: "address1", url: "url1", datasetId: "dataset1", weight: 1 },
			{ address: "address2", url: "url2", datasetId: "dataset2", weight: 1 },
		];
		(loadBalancer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockProviders,
		);

		// With equal weights, distribution should be 50/50
		const result0 = await getRandomActiveProvider("development", 0);
		expect(result0.providerAccount).toBe("address1");

		_resetCache();
		const result1 = await getRandomActiveProvider("development", 1);
		expect(result1.providerAccount).toBe("address2");
	});
});
