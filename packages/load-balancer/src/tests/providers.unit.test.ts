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

	it("returns localhost for development environment", async () => {
		const result = await getRandomActiveProvider("development");

		expect(result.providerAccount).toBe(
			"5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
		);
		expect(result.provider.url).toBe("http://localhost:9229");
		expect(result.provider).not.toHaveProperty("datasetId");
	});

	it("returns DNS-based URL for staging environment", async () => {
		const mockProviders = [
			{
				address: "address1",
				url: "https://pronode1.prosopo.io",
				datasetId: "dataset1",
				weight: 1,
			},
		];
		(loadBalancer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockProviders,
		);

		const result = await getRandomActiveProvider("staging");

		expect(result.providerAccount).toBe("address1");
		expect(result.provider.url).toBe("https://staging.pronode.prosopo.io");
		expect(result.provider).not.toHaveProperty("datasetId");
	});

	it("returns DNS-based URL for production environment", async () => {
		const mockProviders = [
			{
				address: "address1",
				url: "https://pronode1.prosopo.io",
				datasetId: "dataset1",
				weight: 1,
			},
		];
		(loadBalancer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockProviders,
		);

		const result = await getRandomActiveProvider("production");

		expect(result.providerAccount).toBe("address1");
		expect(result.provider.url).toBe("https://pronode.prosopo.io");
		expect(result.provider).not.toHaveProperty("datasetId");
	});

	it("loads providers only once when called multiple times", async () => {
		const mockProviders = [
			{
				address: "address1",
				url: "https://pronode1.prosopo.io",
				datasetId: "dataset1",
				weight: 1,
			},
		];
		(loadBalancer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockProviders,
		);

		await getRandomActiveProvider("staging");
		await getRandomActiveProvider("staging");

		expect(loadBalancer).toHaveBeenCalledTimes(1);
	});

	it("handles empty providers list gracefully", async () => {
		(loadBalancer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);

		await expect(getRandomActiveProvider("staging")).rejects.toThrow(
			"No providers available",
		);
	});


	it("uses account info from first provider in the list", async () => {
		const mockProviders = [
			{
				address: "mainAccount",
				url: "https://pronode1.prosopo.io",
				datasetId: "mainDataset",
				weight: 1,
			},
			{
				address: "otherAccount",
				url: "https://pronode2.prosopo.io",
				datasetId: "otherDataset",
				weight: 1,
			},
		];
		(loadBalancer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			mockProviders,
		);

		const result = await getRandomActiveProvider("production");

		// Should use the first provider's account info
		expect(result.providerAccount).toBe("mainAccount");
		// URL should be DNS-based
		expect(result.provider.url).toBe("https://pronode.prosopo.io");
		// datasetId should not be included
		expect(result.provider).not.toHaveProperty("datasetId");
	});
});
