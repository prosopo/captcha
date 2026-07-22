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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HardcodedProvider } from "../balancer.js";
import {
	_resetPinCache,
	_resetProviderListCache,
	getProviders,
	getRandomActiveProvider,
	getRandomProviderFromList,
} from "../providers.js";

// Mock the underlying load balancer so getProviders' caching/failure semantics
// can be exercised without real network calls. getRandomActiveProvider tests
// don't use loadBalancer, so this mock leaves them unaffected.
const loadBalancer = vi.fn();
vi.mock("../balancer.js", () => ({
	loadBalancer: (...args: unknown[]) => loadBalancer(...args),
}));

const originalFetch = globalThis.fetch;

const mockHealthzFetch = (host: string, ok = true, status = 200) => {
	const mocked = vi.fn(async () => ({
		ok,
		status,
		json: async () => ({ ok: true, host }),
	}));
	// biome-ignore lint/suspicious/noExplicitAny: minimal Response stub for the unit test
	globalThis.fetch = mocked as any;
	return mocked;
};

beforeEach(() => {
	_resetPinCache();
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("getRandomActiveProvider (dual stack)", () => {
	it("uses the local URL directly in development (no healthz round-trip)", async () => {
		const mocked = mockHealthzFetch("ignored");
		const result = await getRandomActiveProvider("development");
		expect(result.provider.url).toBe("https://localhost:9229");
		expect(mocked).not.toHaveBeenCalled();
	});

	it("pins to the host returned by /healthz in production", async () => {
		mockHealthzFetch("pronode7.prosopo.io");
		const result = await getRandomActiveProvider("production");
		expect(result.provider.url).toBe("https://pronode7.prosopo.io");
	});

	it("pins to the host returned by /healthz in staging", async () => {
		mockHealthzFetch("staging-pronode2.prosopo.io");
		const result = await getRandomActiveProvider("staging");
		expect(result.provider.url).toBe("https://staging-pronode2.prosopo.io");
	});

	it("caches the pinned URL for repeat callers in the same env + ipMode", async () => {
		const mocked = mockHealthzFetch("pronode3.prosopo.io");
		await getRandomActiveProvider("production");
		await getRandomActiveProvider("production");
		await getRandomActiveProvider("production");
		expect(mocked).toHaveBeenCalledTimes(1);
	});

	it("falls back to the dual-stack base URL when /healthz responds non-OK", async () => {
		mockHealthzFetch("ignored", false, 503);
		const result = await getRandomActiveProvider("production");
		expect(result.provider.url).toBe("https://pronode.prosopo.io");
	});

	it("falls back to the dual-stack base URL when /healthz body is malformed", async () => {
		const mocked = vi.fn(async () => ({
			ok: true,
			status: 200,
			json: async () => ({ ok: true }),
		}));
		// biome-ignore lint/suspicious/noExplicitAny: minimal Response stub for the unit test
		globalThis.fetch = mocked as any;
		const result = await getRandomActiveProvider("production");
		expect(result.provider.url).toBe("https://pronode.prosopo.io");
	});
});

describe("getRandomActiveProvider (single stack ipMode)", () => {
	it("hits ipv4.pronode.prosopo.io/healthz and pins to ipv4.pronodeN", async () => {
		const mocked = mockHealthzFetch("pronode4.prosopo.io");
		const result = await getRandomActiveProvider("production", "ipv4");
		expect(result.provider.url).toBe("https://ipv4.pronode4.prosopo.io");
		expect(mocked).toHaveBeenCalledWith(
			"https://ipv4.pronode.prosopo.io/healthz",
			expect.any(Object),
		);
	});

	it("hits ipv6 staging /healthz and pins to ipv6.staging-pronodeN", async () => {
		const mocked = mockHealthzFetch("staging-pronode2.prosopo.io");
		const result = await getRandomActiveProvider("staging", "ipv6");
		expect(result.provider.url).toBe(
			"https://ipv6.staging-pronode2.prosopo.io",
		);
		expect(mocked).toHaveBeenCalledWith(
			"https://ipv6.staging.pronode.prosopo.io/healthz",
			expect.any(Object),
		);
	});

	it("falls back to the ipv4-labelled global URL when ipv4 /healthz fails", async () => {
		mockHealthzFetch("ignored", false, 500);
		const result = await getRandomActiveProvider("production", "ipv4");
		expect(result.provider.url).toBe("https://ipv4.pronode.prosopo.io");
	});

	it("keeps the dual-stack cache and the ipv4 cache separate", async () => {
		const mocked = mockHealthzFetch("pronode9.prosopo.io");
		await getRandomActiveProvider("production");
		await getRandomActiveProvider("production", "ipv4");
		await getRandomActiveProvider("production");
		await getRandomActiveProvider("production", "ipv4");
		// One healthz per (env, ipMode) combination.
		expect(mocked).toHaveBeenCalledTimes(2);
	});
});

describe("getProviders", () => {
	beforeEach(() => {
		_resetProviderListCache();
		loadBalancer.mockReset();
	});

	it("loads the provider list once and serves repeat callers from cache", async () => {
		const providers = [
			{ address: "5xyz", url: "https://p1", datasetId: "0x0" },
		];
		loadBalancer.mockResolvedValue(providers);

		const first = await getProviders("production");
		const second = await getProviders("production");

		expect(first).toBe(providers);
		expect(second).toBe(providers);
		expect(loadBalancer).toHaveBeenCalledTimes(1);
	});

	it("dedupes concurrent in-flight loads into a single call", async () => {
		const providers = [
			{ address: "5xyz", url: "https://p1", datasetId: "0x0" },
		];
		loadBalancer.mockResolvedValue(providers);

		const [a, b] = await Promise.all([
			getProviders("production"),
			getProviders("production"),
		]);

		expect(a).toBe(providers);
		expect(b).toBe(providers);
		expect(loadBalancer).toHaveBeenCalledTimes(1);
	});

	it("does not cache failures — a rejected load is retried on the next call", async () => {
		const providers = [
			{ address: "5xyz", url: "https://p1", datasetId: "0x0" },
		];
		loadBalancer
			.mockRejectedValueOnce(new Error("transient"))
			.mockResolvedValueOnce(providers);

		await expect(getProviders("production")).rejects.toThrow("transient");
		// The failure must have cleared the cache, so the next call retries.
		const retry = await getProviders("production");
		expect(retry).toBe(providers);
		expect(loadBalancer).toHaveBeenCalledTimes(2);
	});
});

describe("getRandomProviderFromList", () => {
	const providerList: HardcodedProvider[] = [
		{
			address: "5A",
			url: "https://provider-a.io",
			datasetId: "0x0",
			weight: 1,
		},
		{
			address: "5B",
			url: "https://provider-b.io",
			datasetId: "0x0",
			weight: 1,
		},
		{
			address: "5C",
			url: "https://provider-c.io",
			datasetId: "0x0",
			weight: 1,
		},
	];

	beforeEach(() => {
		_resetProviderListCache();
		_resetPinCache();
		loadBalancer.mockReset();
	});

	it("picks a provider from the list (not the DNS-routed endpoint)", async () => {
		loadBalancer.mockResolvedValue(providerList);
		// random just above 1/3 lands in the second bucket (uniform weights).
		const result = await getRandomProviderFromList(
			"production",
			undefined,
			undefined,
			() => 0.4,
		);
		expect(result.provider.url).toBe("https://provider-b.io");
		expect(result.providerAccount).toBe("5B");
	});

	it("excludes the provider that just failed when others remain", async () => {
		loadBalancer.mockResolvedValue(providerList);
		// random=0 would normally pick the first entry; excluding provider-a
		// shifts the pool so index 0 is provider-b.
		const result = await getRandomProviderFromList(
			"production",
			undefined,
			"https://provider-a.io",
			() => 0,
		);
		expect(result.provider.url).not.toBe("https://provider-a.io");
		expect(result.provider.url).toBe("https://provider-b.io");
	});

	it("ignores a trailing slash when matching the excluded url", async () => {
		loadBalancer.mockResolvedValue(providerList);
		const result = await getRandomProviderFromList(
			"production",
			undefined,
			"https://provider-a.io/",
			() => 0,
		);
		expect(result.provider.url).toBe("https://provider-b.io");
	});

	it("still returns the only provider in development even if it is excluded", async () => {
		const single: HardcodedProvider[] = [
			{
				address: "5Local",
				url: "https://localhost:9229",
				datasetId: "0x0",
				weight: 1,
			},
		];
		loadBalancer.mockResolvedValue(single);
		const result = await getRandomProviderFromList(
			"development",
			undefined,
			"https://localhost:9229",
			() => 0,
		);
		expect(result.provider.url).toBe("https://localhost:9229");
	});

	it("applies the ipv4 label to the chosen provider url", async () => {
		loadBalancer.mockResolvedValue(providerList);
		const result = await getRandomProviderFromList(
			"production",
			"ipv4",
			undefined,
			() => 0,
		);
		expect(result.provider.url).toBe("https://ipv4.provider-a.io");
	});

	it("weights the pick by provider weight", async () => {
		const weighted: HardcodedProvider[] = [
			{ address: "5A", url: "https://a.io", datasetId: "0x0", weight: 1 },
			{ address: "5B", url: "https://b.io", datasetId: "0x0", weight: 99 },
		];
		loadBalancer.mockResolvedValue(weighted);
		// threshold = 0.5 * 100 = 50 → after subtracting weight 1 (still 49),
		// lands on the heavy second provider.
		const result = await getRandomProviderFromList(
			"production",
			undefined,
			undefined,
			() => 0.5,
		);
		expect(result.provider.url).toBe("https://b.io");
	});

	it("falls back to the DNS-routed endpoint when the list is empty", async () => {
		loadBalancer.mockResolvedValue([]);
		const result = await getRandomProviderFromList(
			"development",
			undefined,
			undefined,
			() => 0,
		);
		// Development resolves the local URL without a healthz round-trip.
		expect(result.provider.url).toBe("https://localhost:9229");
		expect(result.providerAccount).toBe("dns-routed");
	});
});
