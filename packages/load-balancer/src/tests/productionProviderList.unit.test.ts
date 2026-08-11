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

// End-to-end coverage that drives the *real* balancer parsing against the shape
// served by https://provider-list.prosopo.io/ — dual-stack pronode entries at
// the top level alongside `ipv4` / `ipv6` single-stack sub-lists. Deliberately
// does NOT mock `../balancer.js` (unlike providers.unit.test.ts) so the raw JSON
// flows through convertHostedProvider → loadBalancer → getProviders →
// getRandomProviderFromList exactly as it does in production, with only
// `fetch` stubbed.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	convertHostedProvider,
	getProviderHostname,
	loadBalancer,
} from "../balancer.js";
import {
	_resetPinCache,
	_resetProviderListCache,
	getRandomProviderFromList,
} from "../providers.js";

const DATASET_ID =
	"0x2e52a1e70f0e0c808972bc04e6fbc8f264b1fbb29c94041fdf01a839b000a40e";
const ADDRESS = "5FnBurrfqWgSLJFMsojjEP74mLX1vZZ9ASyNXKfA5YXu8FR2";

type ProviderEntry = { url: string; datasetId: string; address: string };

const entry = (host: string): ProviderEntry => ({
	url: `https://${host}.prosopo.io`,
	datasetId: DATASET_ID,
	address: ADDRESS,
});

// A trimmed but faithful copy of the production provider-list JSON: three
// pronodes, each present in the ipv4 sub-list, the ipv6 sub-list, and the
// top-level dual-stack list. Note pronode16 sorts before pronode6 and pronode7
// under a plain string compare ('1' < '6' < '7').
const productionJson: Record<string, unknown> = {
	ipv4: {
		pronode6: entry("ipv4.pronode6"),
		pronode7: entry("ipv4.pronode7"),
		pronode16: entry("ipv4.pronode16"),
	},
	ipv6: {
		pronode6: entry("ipv6.pronode6"),
		pronode7: entry("ipv6.pronode7"),
		pronode16: entry("ipv6.pronode16"),
	},
	pronode6: entry("pronode6"),
	pronode7: entry("pronode7"),
	pronode16: entry("pronode16"),
};

const originalFetch = globalThis.fetch;

const mockFetchReturning = (payload: unknown) => {
	const mocked = vi.fn(
		async () => new Response(JSON.stringify(payload), { status: 200 }),
	);
	globalThis.fetch = mocked as typeof fetch;
	return mocked;
};

beforeEach(() => {
	_resetPinCache();
	_resetProviderListCache();
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	vi.restoreAllMocks();
});

describe("convertHostedProvider (production.json shape)", () => {
	it("keeps only the dual-stack pronodes and drops the ipv4/ipv6 sub-lists", () => {
		const providers = convertHostedProvider(productionJson);
		expect(providers.map((p) => p.url)).toEqual([
			// sorted by url.localeCompare — pronode16 first ('1' < '6')
			"https://pronode16.prosopo.io",
			"https://pronode6.prosopo.io",
			"https://pronode7.prosopo.io",
		]);
		// Every entry defaults to weight 1 and carries the shared dataset/address.
		for (const provider of providers) {
			expect(provider.weight).toBe(1);
			expect(provider.datasetId).toBe(DATASET_ID);
			expect(provider.address).toBe(ADDRESS);
			expect(provider.url).not.toMatch(/ipv[46]\./);
		}
	});

	it("returns the ipv4 single-stack sub-list when ipMode=ipv4", () => {
		const providers = convertHostedProvider(productionJson, "ipv4");
		expect(providers.map((p) => p.url)).toEqual([
			"https://ipv4.pronode16.prosopo.io",
			"https://ipv4.pronode6.prosopo.io",
			"https://ipv4.pronode7.prosopo.io",
		]);
		// The label strips back to the bare pronode hostname for identity.
		expect(providers.map((p) => getProviderHostname(p))).toEqual([
			"pronode16.prosopo.io",
			"pronode6.prosopo.io",
			"pronode7.prosopo.io",
		]);
	});

	it("returns the ipv6 single-stack sub-list when ipMode=ipv6", () => {
		const providers = convertHostedProvider(productionJson, "ipv6");
		expect(providers.map((p) => p.url)).toEqual([
			"https://ipv6.pronode16.prosopo.io",
			"https://ipv6.pronode6.prosopo.io",
			"https://ipv6.pronode7.prosopo.io",
		]);
	});
});

describe("loadBalancer (production.json shape)", () => {
	it("fetches the production list and returns the dual-stack pronodes", async () => {
		const mocked = mockFetchReturning(productionJson);
		const providers = await loadBalancer("production");
		expect(mocked).toHaveBeenCalledWith(
			"https://provider-list.prosopo.io/",
			expect.objectContaining({ method: "GET" }),
		);
		expect(providers.map((p) => p.url)).toEqual([
			"https://pronode16.prosopo.io",
			"https://pronode6.prosopo.io",
			"https://pronode7.prosopo.io",
		]);
	});
});

describe("getRandomProviderFromList (production.json end-to-end)", () => {
	const dualStackUrls = [
		"https://pronode16.prosopo.io",
		"https://pronode6.prosopo.io",
		"https://pronode7.prosopo.io",
	];

	it("picks a dual-stack pronode from the fetched production list", async () => {
		mockFetchReturning(productionJson);
		const result = await getRandomProviderFromList(
			"production",
			undefined,
			undefined,
			() => 0,
		);
		// random=0 selects the first entry after the url sort.
		expect(result.provider.url).toBe("https://pronode16.prosopo.io");
		expect(result.providerAccount).toBe(ADDRESS);
	});

	it("labels the chosen pronode with ipv4 when ipMode=ipv4", async () => {
		mockFetchReturning(productionJson);
		const result = await getRandomProviderFromList(
			"production",
			"ipv4",
			undefined,
			() => 0,
		);
		// Matches the url found under the production `ipv4` sub-list.
		expect(result.provider.url).toBe("https://ipv4.pronode16.prosopo.io");
	});

	it("labels the chosen pronode with ipv6 when ipMode=ipv6", async () => {
		mockFetchReturning(productionJson);
		const result = await getRandomProviderFromList(
			"production",
			"ipv6",
			undefined,
			() => 0.99,
		);
		// random≈1 selects the last entry (pronode7) after the sort.
		expect(result.provider.url).toBe("https://ipv6.pronode7.prosopo.io");
	});

	it("excludes the pronode that just failed and picks a different one", async () => {
		mockFetchReturning(productionJson);
		const result = await getRandomProviderFromList(
			"production",
			undefined,
			"https://pronode16.prosopo.io",
			() => 0,
		);
		expect(result.provider.url).not.toBe("https://pronode16.prosopo.io");
		expect(dualStackUrls).toContain(result.provider.url);
		// With pronode16 removed the sorted pool starts at pronode6.
		expect(result.provider.url).toBe("https://pronode6.prosopo.io");
	});

	it("excludes by ipv4-labelled url, matching what the widget actually used", async () => {
		mockFetchReturning(productionJson);
		// The widget's previous attempt used the ipv4-labelled url; exclusion must
		// still match the underlying pronode so it is dropped from the pool.
		const result = await getRandomProviderFromList(
			"production",
			"ipv4",
			"https://ipv4.pronode16.prosopo.io",
			() => 0,
		);
		expect(result.provider.url).not.toBe("https://ipv4.pronode16.prosopo.io");
		expect(result.provider.url).toBe("https://ipv4.pronode6.prosopo.io");
	});

	it("serves the cached list across repeat selections (one fetch)", async () => {
		const mocked = mockFetchReturning(productionJson);
		await getRandomProviderFromList(
			"production",
			undefined,
			undefined,
			() => 0,
		);
		await getRandomProviderFromList("production", "ipv4", undefined, () => 0);
		await getRandomProviderFromList("production", "ipv6", undefined, () => 0);
		expect(mocked).toHaveBeenCalledTimes(1);
	});
});
