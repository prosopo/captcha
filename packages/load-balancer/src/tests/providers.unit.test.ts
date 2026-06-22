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
import { _resetPinCache, getRandomActiveProvider } from "../providers.js";

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
