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
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getRandomActiveProvider, _resetCache } from "../providers.js";
import { loadBalancer } from "../balancer.js";

/**
 * Integration test that tests the loadBalancer function with real HTTP requests
 * using a mock HTTP server instead of mocking dependencies
 */
describe("loadBalancer integration", () => {
	let mockServer: Server;
	let serverUrl: string;

	beforeAll(async () => {
		// Create mock provider list server that returns realistic data
		mockServer = createServer((req, res) => {
			if (req.url === "/") {
				// Production endpoint
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({
					provider1: {
						address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
						url: "https://provider1.example.com",
						datasetId: "0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef27",
						weight: 10,
					},
					provider2: {
						address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
						url: "https://provider2.example.com",
						datasetId: "0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef28",
						weight: 5,
					},
				}));
			} else if (req.url === "/staging.json") {
				// Staging endpoint
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({
					stagingProvider1: {
						address: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
						url: "http://localhost:9229",
						datasetId: "0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef25",
						weight: 8,
					},
				}));
			} else {
				res.writeHead(404);
				res.end("Not found");
			}
		});

		await new Promise<void>((resolve) => {
			mockServer.listen(0, "localhost", () => {
				const address = mockServer.address() as AddressInfo;
				serverUrl = `http://localhost:${address.port}`;
				resolve();
			});
		});
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => {
			mockServer.close(() => resolve());
		});
	});

	beforeEach(() => {
		// Save original fetch
		const originalFetch = global.fetch;

		// Mock fetch to redirect provider-list.prosopo.io requests to our test server
		global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = typeof input === 'string' ? input :
				input instanceof URL ? input.href :
				input instanceof Request ? input.url : String(input);

			if (url.includes('provider-list.prosopo.io')) {
				// Redirect to our test server
				const testUrl = url.includes('/staging.json') ?
					serverUrl + '/staging.json' :
					serverUrl + '/';
				return originalFetch(testUrl, init);
			}

			// Use original fetch for everything else
			return originalFetch(input, init);
		}) as typeof fetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("successfully fetches and converts providers from production environment", async () => {
		// Test that loadBalancer makes real HTTP request and processes the response
		const providers = await loadBalancer("production");

		expect(providers).toHaveLength(2);
		expect(providers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
					url: "https://provider1.example.com",
					datasetId: "0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef27",
					weight: 10,
				}),
				expect.objectContaining({
					address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
					url: "https://provider2.example.com",
					datasetId: "0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef28",
					weight: 5,
				}),
			])
		);
	});

	it("successfully fetches and converts providers from staging environment", async () => {
		// Test that loadBalancer works with staging endpoint
		const providers = await loadBalancer("staging");

		expect(providers).toHaveLength(1);
		expect(providers[0]).toMatchObject({
			address: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
			url: "http://localhost:9229",
			datasetId: "0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef25",
			weight: 8,
		});
	});

	it("sorts providers by URL after fetching from API", async () => {
		// Test that providers are sorted by URL as implemented in convertHostedProvider
		const providers = await loadBalancer("production");

		// Should be sorted alphabetically by URL
		expect(providers[0]?.url).toBe("https://provider1.example.com");
		expect(providers[1]?.url).toBe("https://provider2.example.com");
	});

	it("handles network errors gracefully", async () => {
		// Mock fetch to simulate network error
		const originalFetch = global.fetch;
		global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

		await expect(loadBalancer("production")).rejects.toThrow("Network error");

		// Restore original fetch
		global.fetch = originalFetch;
	});

	it("handles invalid JSON response", async () => {
		// Mock fetch to return invalid JSON
		const originalFetch = global.fetch;
		global.fetch = vi.fn().mockResolvedValue({
			json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
		});

		await expect(loadBalancer("production")).rejects.toThrow("Invalid JSON");

		// Restore original fetch
		global.fetch = originalFetch;
	});

	it("handles empty provider list from API", async () => {
		// Mock fetch to return empty object
		const originalFetch = global.fetch;
		global.fetch = vi.fn().mockResolvedValue({
			json: vi.fn().mockResolvedValue({}),
		});

		const providers = await loadBalancer("production");
		expect(providers).toHaveLength(0);
		expect(providers).toEqual([]);

		// Restore original fetch
		global.fetch = originalFetch;
	});
});

/**
 * Integration test that tests getRandomActiveProvider with real loadBalancer calls
 */
describe("getRandomActiveProvider integration", () => {
	let mockServer: Server;
	let serverUrl: string;

	beforeAll(async () => {
		// Create mock provider list server
		mockServer = createServer((req, res) => {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				testProvider1: {
					address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
					url: "https://test-provider1.example.com",
					datasetId: "0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef27",
					weight: 7,
				},
				testProvider2: {
					address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
					url: "https://test-provider2.example.com",
					datasetId: "0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef28",
					weight: 3,
				},
			}));
		});

		await new Promise<void>((resolve) => {
			mockServer.listen(0, "localhost", () => {
				const address = mockServer.address() as AddressInfo;
				serverUrl = `http://localhost:${address.port}`;
				resolve();
			});
		});
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => {
			mockServer.close(() => resolve());
		});
	});

	beforeEach(() => {
		_resetCache(); // Clear provider cache between tests

		// Save original fetch
		const originalFetch = global.fetch;

		// Mock fetch to redirect provider-list.prosopo.io requests to our test server
		global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = typeof input === 'string' ? input :
				input instanceof URL ? input.href :
				input instanceof Request ? input.url : String(input);

			if (url.includes('provider-list.prosopo.io')) {
				// Redirect to our test server
				return originalFetch(serverUrl + '/', init);
			}

			// Use original fetch for everything else
			return originalFetch(input, init);
		}) as typeof fetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("fetches providers and selects one based on entropy", async () => {
		// Test the complete integration flow
		const result = await getRandomActiveProvider("production", 0);

		// Verify result structure
		expect(result).toHaveProperty("providerAccount");
		expect(result).toHaveProperty("provider");
		expect(result.provider).toHaveProperty("url");
		expect(result.provider).toHaveProperty("datasetId");

		// Verify the selected provider is one of our test providers
		expect(["5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"]).toContain(result.providerAccount);
		expect(["https://test-provider1.example.com", "https://test-provider2.example.com"]).toContain(result.provider.url);
	});

	it("respects provider weights when selecting", async () => {
		// Test with different entropy values to verify weight distribution
		// Total weight = 7 + 3 = 10
		// provider1 gets entropy 0-6 (70%), provider2 gets entropy 7-9 (30%)

		const results = [];
		for (let i = 0; i < 10; i++) {
			const result = await getRandomActiveProvider("production", i);
			results.push(result.providerAccount);
		}

		// Should have selected provider1 more often (70% of the time)
		const provider1Count = results.filter(addr => addr === "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY").length;
		const provider2Count = results.filter(addr => addr === "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty").length;

		expect(provider1Count).toBe(7); // Should get 7 selections
		expect(provider2Count).toBe(3); // Should get 3 selections
	});

	it("caches provider data across multiple calls", async () => {
		// Reset cache and spy on fetch
		_resetCache();
		const fetchSpy = vi.fn(global.fetch);

		// First call should fetch from network
		global.fetch = fetchSpy;
		await getRandomActiveProvider("production", 0);

		// Verify first call made HTTP request
		expect(fetchSpy).toHaveBeenCalled();

		// Reset spy and make subsequent calls
		fetchSpy.mockClear();

		// Subsequent calls should use cache and not make HTTP requests
		await getRandomActiveProvider("production", 1);
		await getRandomActiveProvider("production", 2);

		// Should not have made additional HTTP requests
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});