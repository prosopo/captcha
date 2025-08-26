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
import { loadBalancer } from "../index.js";
import { getRandomActiveProvider } from "../providers.js";
import { _resetCache } from "../providers.js";

vi.mock("../index.js", () => ({
	loadBalancer: vi.fn(),
}));

describe("getRandomActiveProvider", () => {
	beforeEach(() => {
		_resetCache();
		vi.clearAllMocks();
		vi.resetAllMocks();
		vi.resetModules();
	});

	it("returns a random provider when providers list is populated", async () => {
		const mockProviders = [
			{ address: "address1", url: "url1", datasetId: "dataset1" },
			{ address: "address2", url: "url2", datasetId: "dataset2" },
		];
		(loadBalancer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockProviders,
		);

		const result = await getRandomActiveProvider("development", 123);

		expect(result.providerAccount).toBe("address2");
		expect(result.provider.url).toBe("url2");
		expect(result.provider.datasetId).toBe("dataset2");
	});

	it("loads providers only once when called multiple times", async () => {
		const mockProviders = [
			{ address: "address1", url: "url1", datasetId: "dataset1" },
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

		expect(getRandomActiveProvider("development", 123)).rejects.toThrow();
	});

	it("handles entropy values correctly when providers list is populated 1", async () => {
		const mockProviders = [
			{ address: "address1", url: "url1", datasetId: "dataset1" },
			{ address: "address2", url: "url2", datasetId: "dataset2" },
		];
		(loadBalancer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockProviders,
		);

		const result = await getRandomActiveProvider("development", 1);

		expect(result.providerAccount).toBe("address2");
		expect(result.provider.url).toBe("url2");
		expect(result.provider.datasetId).toBe("dataset2");
	});

	it("handles entropy values correctly when providers list is populated 2", async () => {
		const mockProviders = [
			{ address: "address1", url: "url1", datasetId: "dataset1" },
			{ address: "address2", url: "url2", datasetId: "dataset2" },
		];
		(loadBalancer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockProviders,
		);

		const result = await getRandomActiveProvider("development", 2);

		expect(result.providerAccount).toBe("address1");
		expect(result.provider.url).toBe("url1");
		expect(result.provider.datasetId).toBe("dataset1");
	});
});
