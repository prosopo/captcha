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

import type { IPInfoError, IPInfoResponse, IPInfoResult } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IpInfoService } from "../IpInfoService.js";
import type { IpapiBackend } from "../backends/ipapi.js";
import { LookupCache } from "../lookupCache.js";

const valid = (ip: string): IPInfoResult => ({
	isValid: true,
	ip,
	isVPN: false,
	isTor: false,
	isProxy: false,
	isDatacenter: false,
	isAbuser: false,
	isMobile: false,
	isSatellite: false,
	isCrawler: false,
});

const failed = (ip: string): IPInfoError => ({
	isValid: false,
	error: "Request timed out after 700ms",
	ip,
});

type Lookup = (ip: string) => Promise<IPInfoResponse>;

describe("LookupCache", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("answers a repeat lookup from the cache", async () => {
		const cache = new LookupCache({ ttlMs: 1000, maxEntries: 10 });
		const lookup = vi.fn<Lookup>((ip) => Promise.resolve(valid(ip)));

		await cache.getOrLookup("8.8.8.8", lookup);
		const second = await cache.getOrLookup("8.8.8.8", lookup);

		expect(second).toEqual(valid("8.8.8.8"));
		expect(lookup).toHaveBeenCalledTimes(1);
	});

	it("shares one call between concurrent lookups of the same address", async () => {
		const cache = new LookupCache({ ttlMs: 1000, maxEntries: 10 });
		const lookup = vi.fn<Lookup>((ip) => Promise.resolve(valid(ip)));

		await Promise.all([
			cache.getOrLookup("8.8.8.8", lookup),
			cache.getOrLookup("8.8.8.8", lookup),
			cache.getOrLookup("8.8.8.8", lookup),
		]);

		expect(lookup).toHaveBeenCalledTimes(1);
	});

	it("looks up again once the entry has expired", async () => {
		const cache = new LookupCache({ ttlMs: 1000, maxEntries: 10 });
		const lookup = vi.fn<Lookup>((ip) => Promise.resolve(valid(ip)));

		await cache.getOrLookup("8.8.8.8", lookup);
		vi.advanceTimersByTime(1001);
		await cache.getOrLookup("8.8.8.8", lookup);

		expect(lookup).toHaveBeenCalledTimes(2);
	});

	it("does not remember a failed lookup", async () => {
		const cache = new LookupCache({ ttlMs: 1000, maxEntries: 10 });
		const lookup = vi
			.fn<Lookup>()
			.mockResolvedValueOnce(failed("8.8.8.8"))
			.mockResolvedValueOnce(valid("8.8.8.8"));

		const first = await cache.getOrLookup("8.8.8.8", lookup);
		const second = await cache.getOrLookup("8.8.8.8", lookup);

		expect(first.isValid).toBe(false);
		expect(second.isValid).toBe(true);
		expect(lookup).toHaveBeenCalledTimes(2);
	});

	it("evicts the least recently used address when full", async () => {
		const cache = new LookupCache({ ttlMs: 1000, maxEntries: 2 });
		const lookup = vi.fn<Lookup>((ip) => Promise.resolve(valid(ip)));

		await cache.getOrLookup("1.1.1.1", lookup);
		await cache.getOrLookup("2.2.2.2", lookup);
		await cache.getOrLookup("1.1.1.1", lookup);
		await cache.getOrLookup("3.3.3.3", lookup);
		lookup.mockClear();

		await cache.getOrLookup("1.1.1.1", lookup);
		await cache.getOrLookup("2.2.2.2", lookup);

		expect(lookup.mock.calls).toEqual([["2.2.2.2"]]);
	});
});

describe("IpInfoService lookup cache", () => {
	const ipapiReturning = (lookup: Lookup): IpapiBackend =>
		({
			isAvailable: () => true,
			lookup,
		}) as unknown as IpapiBackend;

	it("asks the sidecar once for an address looked up twice", async () => {
		const lookup = vi.fn<Lookup>((ip) => Promise.resolve(valid(ip)));
		const service = new IpInfoService(
			{ lookupCache: { ttlMs: 60_000, maxEntries: 10 } },
			{ ipapi: ipapiReturning(lookup) },
		);

		await service.lookup("8.8.8.8");
		await service.lookup("8.8.8.8");

		expect(lookup).toHaveBeenCalledTimes(1);
	});

	it("asks the sidecar every time when no cache is configured", async () => {
		const lookup = vi.fn<Lookup>((ip) => Promise.resolve(valid(ip)));
		const service = new IpInfoService({}, { ipapi: ipapiReturning(lookup) });

		await service.lookup("8.8.8.8");
		await service.lookup("8.8.8.8");

		expect(lookup).toHaveBeenCalledTimes(2);
	});
});
