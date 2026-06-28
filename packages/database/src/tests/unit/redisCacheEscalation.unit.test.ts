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

import type { Logger } from "@prosopo/logger";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedisWriteQueue } from "../../redisCache.js";

// Minimal in-memory fake of the bits of `RedisClient` that
// `cacheSessionEscalation` / `getCachedSessionEscalation` /
// `invalidateCachedSessionEscalation` actually touch. This keeps the test
// deterministic (no network) and decouples it from the real Redis client.
const makeFakeClient = () => {
	const store = new Map<string, { value: string; expiresAt: number | null }>();
	return {
		store,
		set: vi.fn(async (key: string, value: string, opts?: { EX?: number }) => {
			store.set(key, {
				value,
				expiresAt: opts?.EX ? Date.now() + opts.EX * 1000 : null,
			});
			return "OK";
		}),
		get: vi.fn(async (key: string): Promise<string | null> => {
			const entry = store.get(key);
			if (!entry) return null;
			if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
				store.delete(key);
				return null;
			}
			return entry.value;
		}),
		del: vi.fn(async (key: string) => {
			const had = store.delete(key);
			return had ? 1 : 0;
		}),
	};
};

// A noop-ish logger that captures warnings so the tests can assert
// quietly on the error-path behavior.
const makeLogger = () => {
	const warn = vi.fn();
	return {
		debug: vi.fn(),
		info: vi.fn(),
		log: vi.fn(),
		trace: vi.fn(),
		warn,
		error: vi.fn(),
		fatal: vi.fn(),
		with: vi.fn(),
		level: "info" as const,
		warnSpy: warn,
	} as unknown as Logger & { warnSpy: ReturnType<typeof vi.fn> };
};

describe("RedisWriteQueue — session escalation mapping", () => {
	let queue: RedisWriteQueue;
	let fakeClient: ReturnType<typeof makeFakeClient>;
	let logger: Logger & { warnSpy: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		fakeClient = makeFakeClient();
		logger = makeLogger();
		// RedisWriteQueue takes (connection, logger). The connection is
		// only used inside getClient(), which we stub below — so a stand-in
		// sentinel value is fine here.
		// biome-ignore lint/suspicious/noExplicitAny: test-only stub
		queue = new RedisWriteQueue({} as any, logger);
		// RedisWriteQueue connects lazily through getClient(); short-circuit
		// that to our in-memory fake without dealing with the connection
		// state machine.
		(queue as unknown as { getClient: () => Promise<unknown> }).getClient =
			async () => fakeClient;
	});

	it("cacheSessionEscalation stores the mapping under the documented key", async () => {
		const ok = await queue.cacheSessionEscalation("origin-A", "escalation-B");
		expect(ok).toBe(true);
		expect(fakeClient.set).toHaveBeenCalledWith(
			"cache:session:escalation:origin-A",
			"escalation-B",
			{ EX: 600 },
		);
		// Round-trip through the fake store.
		expect(
			fakeClient.store.get("cache:session:escalation:origin-A")?.value,
		).toBe("escalation-B");
	});

	it("getCachedSessionEscalation returns the cached value when present", async () => {
		await queue.cacheSessionEscalation("origin-A", "escalation-B");
		const got = await queue.getCachedSessionEscalation("origin-A");
		expect(got).toBe("escalation-B");
	});

	it("getCachedSessionEscalation returns null when no mapping was recorded", async () => {
		const got = await queue.getCachedSessionEscalation("unknown-origin");
		expect(got).toBeNull();
	});

	it("invalidateCachedSessionEscalation drops the mapping", async () => {
		await queue.cacheSessionEscalation("origin-A", "escalation-B");
		await queue.invalidateCachedSessionEscalation("origin-A");
		expect(fakeClient.del).toHaveBeenCalledWith(
			"cache:session:escalation:origin-A",
		);
		const got = await queue.getCachedSessionEscalation("origin-A");
		expect(got).toBeNull();
	});

	it("invalidateCachedSessionEscalation is a no-op on missing keys (idempotent)", async () => {
		await queue.invalidateCachedSessionEscalation("never-cached");
		// Should not throw, nothing in the store, no warning logged.
		expect(logger.warnSpy).not.toHaveBeenCalled();
	});

	it("cacheSessionEscalation honours a custom TTL", async () => {
		await queue.cacheSessionEscalation("origin-A", "escalation-B", 30);
		expect(fakeClient.set).toHaveBeenCalledWith(
			"cache:session:escalation:origin-A",
			"escalation-B",
			{ EX: 30 },
		);
	});

	it("cacheSessionEscalation returns false and logs when Redis is unavailable", async () => {
		(queue as unknown as { getClient: () => Promise<null> }).getClient =
			async () => null;
		const ok = await queue.cacheSessionEscalation("origin-A", "escalation-B");
		expect(ok).toBe(false);
	});

	it("getCachedSessionEscalation returns null when Redis is unavailable", async () => {
		(queue as unknown as { getClient: () => Promise<null> }).getClient =
			async () => null;
		const got = await queue.getCachedSessionEscalation("origin-A");
		expect(got).toBeNull();
	});

	it("set failure surfaces as false + a logged warning, not a thrown error", async () => {
		fakeClient.set.mockRejectedValueOnce(new Error("REDIS_DOWN"));
		const ok = await queue.cacheSessionEscalation("origin-A", "escalation-B");
		expect(ok).toBe(false);
		expect(logger.warnSpy).toHaveBeenCalled();
	});

	it("get failure surfaces as null + a logged warning, not a thrown error", async () => {
		fakeClient.get.mockRejectedValueOnce(new Error("REDIS_DOWN"));
		const got = await queue.getCachedSessionEscalation("origin-A");
		expect(got).toBeNull();
		expect(logger.warnSpy).toHaveBeenCalled();
	});

	it("del failure surfaces as a logged warning, not a thrown error", async () => {
		fakeClient.del.mockRejectedValueOnce(new Error("REDIS_DOWN"));
		await expect(
			queue.invalidateCachedSessionEscalation("origin-A"),
		).resolves.toBeUndefined();
		expect(logger.warnSpy).toHaveBeenCalled();
	});

	it("entries respect TTL expiry", async () => {
		// Cache with 1s TTL, fast-forward virtual time past it.
		vi.useFakeTimers();
		try {
			await queue.cacheSessionEscalation("origin-A", "escalation-B", 1);
			expect(await queue.getCachedSessionEscalation("origin-A")).toBe(
				"escalation-B",
			);
			vi.advanceTimersByTime(2_000);
			expect(await queue.getCachedSessionEscalation("origin-A")).toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});
});
