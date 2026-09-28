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

import { afterEach, describe, expect, it, vi } from "vitest";
import { getProviderListOverride, loadBalancer } from "../balancer.js";
import { readProviderListOverride } from "../providerUrlOverride.js";

const ENV_KEY = "PROSOPO_PROVIDER_LIST";
const original: string | undefined = process.env[ENV_KEY];
const originalFetch = globalThis.fetch;

afterEach(() => {
	if (original === undefined) delete process.env[ENV_KEY];
	else process.env[ENV_KEY] = original;
	globalThis.fetch = originalFetch;
});

const PROVIDER_LIST_JSON = JSON.stringify({
	one: {
		address: "5Provider1",
		url: "https://one.example.com/",
		datasetId: "0xabc",
		weight: 3,
	},
	two: {
		address: "5Provider2",
		url: "https://two.example.com",
		datasetId: "0xdef",
	},
});

describe("reading the override", () => {
	it("returns undefined when unset", () => {
		delete process.env[ENV_KEY];
		expect(readProviderListOverride()).toBeUndefined();
	});

	it("returns the raw value when set", () => {
		process.env[ENV_KEY] = "https://captcha.example.com";
		expect(readProviderListOverride()).toBe("https://captcha.example.com");
	});
});

describe("parsing the override", () => {
	it("is empty when unset or blank, so normal discovery is untouched", () => {
		expect(getProviderListOverride(undefined)).toEqual([]);
		expect(getProviderListOverride("")).toEqual([]);
		expect(getProviderListOverride("   ")).toEqual([]);
	});

	it("accepts a single bare url", () => {
		expect(getProviderListOverride("https://captcha.example.com")).toEqual([
			{
				address: "self-hosted",
				url: "https://captcha.example.com",
				datasetId: "",
				weight: 1,
			},
		]);
	});

	it("accepts several comma-separated urls", () => {
		const providers = getProviderListOverride(
			"https://one.example.com, https://two.example.com",
		);
		expect(providers.map((p) => p.url)).toEqual([
			"https://one.example.com",
			"https://two.example.com",
		]);
	});

	it("strips trailing slashes from both forms", () => {
		// A token embeds the provider url it was minted against and the verifier
		// matches it by exact string, so the two spellings must normalise.
		expect(
			getProviderListOverride("https://captcha.example.com/")[0]?.url,
		).toBe("https://captcha.example.com");
		const fromJson = getProviderListOverride(PROVIDER_LIST_JSON);
		expect(fromJson.map((p) => p.url)).toEqual([
			"https://one.example.com",
			"https://two.example.com",
		]);
	});

	it("accepts the hosted provider-list JSON, preserving address and weight", () => {
		const providers = getProviderListOverride(PROVIDER_LIST_JSON);
		expect(providers).toEqual([
			{
				address: "5Provider1",
				url: "https://one.example.com",
				datasetId: "0xabc",
				weight: 3,
			},
			{
				address: "5Provider2",
				url: "https://two.example.com",
				datasetId: "0xdef",
				weight: 1,
			},
		]);
	});

	it("reads the ipv4 / ipv6 sub-lists when the JSON carries them", () => {
		const raw = JSON.stringify({
			dual: {
				address: "5Dual",
				url: "https://dual.example.com",
				datasetId: "0x1",
			},
			ipv4: {
				four: {
					address: "5Four",
					url: "https://v4.example.com",
					datasetId: "0x2",
				},
			},
		});
		expect(getProviderListOverride(raw, "ipv4").map((p) => p.url)).toEqual([
			"https://v4.example.com",
		]);
		expect(getProviderListOverride(raw).map((p) => p.url)).toEqual([
			"https://dual.example.com",
		]);
	});

	it("falls back to normal discovery rather than throwing on malformed JSON", () => {
		// A deployment-time typo must not take down every captcha on the page.
		expect(getProviderListOverride("{not json")).toEqual([]);
		expect(
			getProviderListOverride('{"one":{"url":"missing-other-fields"}}'),
		).toEqual([]);
	});
});

describe("loadBalancer with an override", () => {
	it("returns the override without fetching the hosted list", async () => {
		process.env[ENV_KEY] = "https://captcha.example.com/";
		const fetchSpy = vi.fn();
		// biome-ignore lint/suspicious/noExplicitAny: asserting the fetch never happens
		globalThis.fetch = fetchSpy as any;

		await expect(loadBalancer("production")).resolves.toEqual([
			{
				address: "self-hosted",
				url: "https://captcha.example.com",
				datasetId: "",
				weight: 1,
			},
		]);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("applies in every environment, not just development", async () => {
		process.env[ENV_KEY] = "https://captcha.example.com";
		for (const env of ["development", "staging", "production"] as const) {
			const providers = await loadBalancer(env);
			expect(providers.map((p) => p.url)).toEqual([
				"https://captcha.example.com",
			]);
		}
	});

	it("does not prefix ipv4/ipv6 labels onto a bare-url override", async () => {
		// Those labels only resolve inside our own fleet's DNS.
		process.env[ENV_KEY] = "https://captcha.example.com";
		const providers = await loadBalancer("production", "ipv4");
		expect(providers.map((p) => p.url)).toEqual([
			"https://captcha.example.com",
		]);
	});
});
