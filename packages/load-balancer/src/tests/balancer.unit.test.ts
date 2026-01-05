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

import { ProsopoEnvError } from "@prosopo/common";
import type { EnvironmentTypes } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type HardcodedProvider,
	convertHostedProvider,
	getLoadBalancerUrl,
	loadBalancer,
} from "../balancer.js";

describe("convertHostedProvider", () => {
	it("converts valid providers with weights", () => {
		const hostedProviders = {
			provider1: {
				address: "address1",
				url: "https://provider1.example.com",
				datasetId: "dataset1",
				weight: 5,
			},
			provider2: {
				address: "address2",
				url: "https://provider2.example.com",
				datasetId: "dataset2",
				weight: 10,
			},
		};

		const result = convertHostedProvider(hostedProviders);

		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			address: "address1",
			url: "https://provider1.example.com",
			datasetId: "dataset1",
			weight: 5,
		});
		expect(result[1]).toMatchObject({
			address: "address2",
			url: "https://provider2.example.com",
			datasetId: "dataset2",
			weight: 10,
		});
	});

	it("defaults weight to 1 when not provided", () => {
		const hostedProviders = {
			provider1: {
				address: "address1",
				url: "https://provider1.example.com",
				datasetId: "dataset1",
			},
		};

		const result = convertHostedProvider(hostedProviders);

		expect(result).toHaveLength(1);
		expect(result[0]?.weight).toBe(1);
	});

	it("coerces weight values less than 1 to 1", () => {
		const hostedProviders = {
			provider1: {
				address: "address1",
				url: "https://provider1.example.com",
				datasetId: "dataset1",
				weight: 0,
			},
			provider2: {
				address: "address2",
				url: "https://provider2.example.com",
				datasetId: "dataset2",
				weight: -5,
			},
		};

		const result = convertHostedProvider(hostedProviders);

		expect(result[0]?.weight).toBe(1);
		expect(result[1]?.weight).toBe(1);
	});

	it("coerces weight values greater than 100 to 100", () => {
		const hostedProviders = {
			provider1: {
				address: "address1",
				url: "https://provider1.example.com",
				datasetId: "dataset1",
				weight: 150,
			},
			provider2: {
				address: "address2",
				url: "https://provider2.example.com",
				datasetId: "dataset2",
				weight: 200,
			},
		};

		const result = convertHostedProvider(hostedProviders);

		expect(result[0]?.weight).toBe(100);
		expect(result[1]?.weight).toBe(100);
	});

	it("rounds decimal weight values", () => {
		const hostedProviders = {
			provider1: {
				address: "address1",
				url: "https://provider1.example.com",
				datasetId: "dataset1",
				weight: 5.4,
			},
			provider2: {
				address: "address2",
				url: "https://provider2.example.com",
				datasetId: "dataset2",
				weight: 5.6,
			},
		};

		const result = convertHostedProvider(hostedProviders);

		expect(result[0]?.weight).toBe(5);
		expect(result[1]?.weight).toBe(6);
	});

	it("sorts providers by URL", () => {
		const hostedProviders = {
			provider3: {
				address: "address3",
				url: "https://z.example.com",
				datasetId: "dataset3",
				weight: 1,
			},
			provider1: {
				address: "address1",
				url: "https://a.example.com",
				datasetId: "dataset1",
				weight: 1,
			},
			provider2: {
				address: "address2",
				url: "https://m.example.com",
				datasetId: "dataset2",
				weight: 1,
			},
		};

		const result = convertHostedProvider(hostedProviders);

		expect(result).toHaveLength(3);
		expect(result[0]?.url).toBe("https://a.example.com");
		expect(result[1]?.url).toBe("https://m.example.com");
		expect(result[2]?.url).toBe("https://z.example.com");
	});

	it("handles empty object", () => {
		const hostedProviders = {};

		const result = convertHostedProvider(hostedProviders);

		expect(result).toHaveLength(0);
		expect(result).toEqual([]);
	});

	it("handles single provider", () => {
		const hostedProviders = {
			provider1: {
				address: "address1",
				url: "https://provider1.example.com",
				datasetId: "dataset1",
				weight: 1,
			},
		};

		const result = convertHostedProvider(hostedProviders);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			address: "address1",
			url: "https://provider1.example.com",
			datasetId: "dataset1",
			weight: 1,
		});
	});

	it("handles weight at boundaries (1 and 100)", () => {
		const hostedProviders = {
			provider1: {
				address: "address1",
				url: "https://provider1.example.com",
				datasetId: "dataset1",
				weight: 1,
			},
			provider2: {
				address: "address2",
				url: "https://provider2.example.com",
				datasetId: "dataset2",
				weight: 100,
			},
		};

		const result = convertHostedProvider(hostedProviders);

		expect(result[0]?.weight).toBe(1);
		expect(result[1]?.weight).toBe(100);
	});

	it("throws error for invalid provider (missing required field)", () => {
		const hostedProviders = {
			provider1: {
				address: "address1",
				// missing url and datasetId
			},
		};

		expect(() => convertHostedProvider(hostedProviders)).toThrow();
	});

	it("throws error for invalid provider (wrong type)", () => {
		const hostedProviders = {
			provider1: {
				address: 123,
				url: "https://provider1.example.com",
				datasetId: "dataset1",
			},
		};

		expect(() => convertHostedProvider(hostedProviders)).toThrow();
	});

	it("handles providers with empty strings", () => {
		const hostedProviders = {
			provider1: {
				address: "",
				url: "",
				datasetId: "",
				weight: 1,
			},
		};

		const result = convertHostedProvider(hostedProviders);

		expect(result).toHaveLength(1);
		expect(result[0]?.address).toBe("");
		expect(result[0]?.url).toBe("");
		expect(result[0]?.datasetId).toBe("");
	});
});

describe("getLoadBalancerUrl", () => {
	it("returns production URL for production environment", () => {
		const result = getLoadBalancerUrl("production");

		expect(result).toBe("https://provider-list.prosopo.io/");
	});

	it("returns staging URL for staging environment", () => {
		const result = getLoadBalancerUrl("staging");

		expect(result).toBe("https://provider-list.prosopo.io/staging.json");
	});

	it("throws error for development environment", () => {
		expect(() => getLoadBalancerUrl("development")).toThrow(ProsopoEnvError);
		expect(() => getLoadBalancerUrl("development")).toThrow(
			"CONFIG.UNKNOWN_ENVIRONMENT",
		);
	});

	it("throws error for unknown environment", () => {
		expect(() => getLoadBalancerUrl("unknown" as EnvironmentTypes)).toThrow(
			ProsopoEnvError,
		);
		expect(() => getLoadBalancerUrl("unknown" as EnvironmentTypes)).toThrow(
			"CONFIG.UNKNOWN_ENVIRONMENT",
		);
	});
});

describe("loadBalancer", () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		global.fetch = originalFetch;
		vi.clearAllMocks();
	});

	it("returns hardcoded provider for development environment", async () => {
		const result = await loadBalancer("development");

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			address: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
			url: "http://localhost:9229",
			datasetId:
				"0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef25",
			weight: 1,
		});
	});

	it("fetches and converts providers for production environment", async () => {
		const mockProviders = {
			provider1: {
				address: "address1",
				url: "https://provider1.example.com",
				datasetId: "dataset1",
				weight: 5,
			},
			provider2: {
				address: "address2",
				url: "https://provider2.example.com",
				datasetId: "dataset2",
				weight: 10,
			},
		};

		global.fetch = vi.fn().mockResolvedValue({
			json: vi.fn().mockResolvedValue(mockProviders),
		});

		const result = await loadBalancer("production");

		expect(global.fetch).toHaveBeenCalledWith(
			"https://provider-list.prosopo.io/",
			{
				method: "GET",
				mode: "cors",
			},
		);
		expect(result).toHaveLength(2);
		expect(result[0]?.address).toBe("address1");
		expect(result[1]?.address).toBe("address2");
	});

	it("fetches and converts providers for staging environment", async () => {
		const mockProviders = {
			provider1: {
				address: "address1",
				url: "https://provider1.example.com",
				datasetId: "dataset1",
				weight: 1,
			},
		};

		global.fetch = vi.fn().mockResolvedValue({
			json: vi.fn().mockResolvedValue(mockProviders),
		});

		const result = await loadBalancer("staging");

		expect(global.fetch).toHaveBeenCalledWith(
			"https://provider-list.prosopo.io/staging.json",
			{
				method: "GET",
				mode: "cors",
			},
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.address).toBe("address1");
	});

	it("sorts providers by URL when fetching from API", async () => {
		const mockProviders = {
			provider3: {
				address: "address3",
				url: "https://z.example.com",
				datasetId: "dataset3",
				weight: 1,
			},
			provider1: {
				address: "address1",
				url: "https://a.example.com",
				datasetId: "dataset1",
				weight: 1,
			},
			provider2: {
				address: "address2",
				url: "https://m.example.com",
				datasetId: "dataset2",
				weight: 1,
			},
		};

		global.fetch = vi.fn().mockResolvedValue({
			json: vi.fn().mockResolvedValue(mockProviders),
		});

		const result = await loadBalancer("production");

		expect(result[0]?.url).toBe("https://a.example.com");
		expect(result[1]?.url).toBe("https://m.example.com");
		expect(result[2]?.url).toBe("https://z.example.com");
	});

	it("handles fetch errors", async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		await expect(loadBalancer("production")).rejects.toThrow("Network error");
	});

	it("handles invalid JSON response", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
		});

		await expect(loadBalancer("production")).rejects.toThrow("Invalid JSON");
	});

	it("handles empty providers from API", async () => {
		global.fetch = vi.fn().mockResolvedValue({
			json: vi.fn().mockResolvedValue({}),
		});

		const result = await loadBalancer("production");

		expect(result).toHaveLength(0);
		expect(result).toEqual([]);
	});

	it("applies weight coercion when fetching from API", async () => {
		const mockProviders = {
			provider1: {
				address: "address1",
				url: "https://provider1.example.com",
				datasetId: "dataset1",
				weight: 150,
			},
			provider2: {
				address: "address2",
				url: "https://provider2.example.com",
				datasetId: "dataset2",
				weight: 0.5,
			},
		};

		global.fetch = vi.fn().mockResolvedValue({
			json: vi.fn().mockResolvedValue(mockProviders),
		});

		const result = await loadBalancer("production");

		expect(result[0]?.weight).toBe(100);
		expect(result[1]?.weight).toBe(1);
	});

	it("handles providers without weight from API", async () => {
		const mockProviders = {
			provider1: {
				address: "address1",
				url: "https://provider1.example.com",
				datasetId: "dataset1",
			},
		};

		global.fetch = vi.fn().mockResolvedValue({
			json: vi.fn().mockResolvedValue(mockProviders),
		});

		const result = await loadBalancer("production");

		expect(result[0]?.weight).toBe(1);
	});
});

describe("HardcodedProvider type", () => {
	it("types", () => {
		// Test that HardcodedProvider type is correctly inferred
		const provider1: HardcodedProvider = {
			address: "address1",
			url: "https://provider1.example.com",
			datasetId: "dataset1",
			weight: 5,
		};

		const provider2: HardcodedProvider = {
			address: "address2",
			url: "https://provider2.example.com",
			datasetId: "dataset2",
			// weight is optional and defaults to 1
		};

		// Test return type of convertHostedProvider
		const hostedProviders = {
			provider1: {
				address: "address1",
				url: "https://provider1.example.com",
				datasetId: "dataset1",
				weight: 1,
			},
		};
		const result: HardcodedProvider[] = convertHostedProvider(hostedProviders);

		// Test return type of loadBalancer
		const loadBalancerResult: Promise<HardcodedProvider[]> =
			loadBalancer("development");

		expect(provider1).toBeDefined();
		expect(provider2).toBeDefined();
		expect(result).toBeDefined();
		expect(loadBalancerResult).toBeDefined();
	});
});
