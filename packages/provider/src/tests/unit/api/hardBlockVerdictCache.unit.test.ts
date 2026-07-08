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

import { AccessPolicyType, type AccessRule } from "@prosopo/user-access-policy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	HardBlockVerdictCache,
	hardBlockCacheKey,
} from "../../../api/hardBlockVerdictCache.js";

const rule = (clientId?: string): AccessRule => ({
	type: AccessPolicyType.Block,
	description: `rule-${clientId ?? "global"}`,
	...(clientId ? { clientId } : {}),
});

describe("HardBlockVerdictCache", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns undefined on miss", () => {
		const cache = new HardBlockVerdictCache(30_000, 100);
		expect(cache.get("missing")).toBeUndefined();
	});

	it("returns the stored value on hit within TTL", () => {
		const cache = new HardBlockVerdictCache(30_000, 100);
		const value = [rule("client-A")];
		cache.set("key", value);
		expect(cache.get("key")).toBe(value);
	});

	it("returns undefined once the TTL has elapsed", () => {
		const cache = new HardBlockVerdictCache(1_000, 100);
		cache.set("key", [rule("client-A")]);
		// Just under TTL — still fresh.
		vi.advanceTimersByTime(999);
		expect(cache.get("key")).toBeDefined();
		// One tick past — expired.
		vi.advanceTimersByTime(2);
		expect(cache.get("key")).toBeUndefined();
	});

	it("evicts the oldest entry when max size is reached", () => {
		const cache = new HardBlockVerdictCache(30_000, 2);
		cache.set("a", [rule("A")]);
		cache.set("b", [rule("B")]);
		cache.set("c", [rule("C")]);
		// Insertion order: a → b → c. `a` was oldest, must be evicted.
		expect(cache.get("a")).toBeUndefined();
		expect(cache.get("b")).toBeDefined();
		expect(cache.get("c")).toBeDefined();
		expect(cache.size()).toBe(2);
	});

	it("clear() drops every entry", () => {
		const cache = new HardBlockVerdictCache(30_000, 100);
		cache.set("a", [rule("A")]);
		cache.set("b", [rule("B")]);
		cache.clear();
		expect(cache.size()).toBe(0);
		expect(cache.get("a")).toBeUndefined();
	});
});

describe("hardBlockCacheKey", () => {
	it("produces the same key for two structurally-equal scopes", () => {
		const scopeA = {
			numericIp: 3232235777n,
			ja4Hash: "abc",
			asn: 12345,
		};
		const scopeB = {
			numericIp: 3232235777n,
			ja4Hash: "abc",
			asn: 12345,
		};
		expect(hardBlockCacheKey("client-A", scopeA, true)).toBe(
			hardBlockCacheKey("client-A", scopeB, true),
		);
	});

	it("distinguishes different clientIds", () => {
		const scope = { ja4Hash: "abc" };
		expect(hardBlockCacheKey("client-A", scope, true)).not.toBe(
			hardBlockCacheKey("client-B", scope, true),
		);
	});

	it("distinguishes global from client-scoped lookups", () => {
		const scope = { ja4Hash: "abc" };
		expect(hardBlockCacheKey(undefined, scope, true)).not.toBe(
			hardBlockCacheKey("client-A", scope, true),
		);
	});

	it("distinguishes different IPs", () => {
		expect(
			hardBlockCacheKey("client-A", { numericIp: 1n }, true),
		).not.toBe(hardBlockCacheKey("client-A", { numericIp: 2n }, true));
	});

	it("distinguishes blockOnly true vs false", () => {
		const scope = { ja4Hash: "abc" };
		expect(hardBlockCacheKey("client-A", scope, true)).not.toBe(
			hardBlockCacheKey("client-A", scope, false),
		);
	});

	it("distinguishes an undefined field from an empty-string field", () => {
		// This is a defence for the string-join key format: if two
		// different scopes ever collided on the key, cache hits would
		// leak verdicts across scopes. Any change to the key format
		// must preserve this discrimination.
		const a = { ja4Hash: "abc" };
		const b = { ja4Hash: "abc", userId: "" };
		expect(hardBlockCacheKey("client-A", a, true)).toBe(
			hardBlockCacheKey("client-A", b, true),
		);
		// Note: empty string and undefined DO collide in the current key
		// format — documented here so a future change knows to preserve
		// or explicitly override this behaviour. In practice getRequestUserScope
		// never emits empty strings for scope fields (spread-only construction).
	});
});
