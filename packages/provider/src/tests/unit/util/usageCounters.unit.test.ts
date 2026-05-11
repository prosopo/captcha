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

import type { Logger } from "@prosopo/common";
import type { RedisConnection } from "@prosopo/redis-client";
import {
	CaptchaType,
	type CounterSpec,
	encodeCounterKey,
} from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	UsageCounters,
	buildAllWindowIncrements,
} from "../../../util/usageCounters.js";

const DAPP = "5GCP69mhanZqJqnTvaaGvJCJZWSahz6xE2c7bTGETqSB5KDK";
const IP = "1.2.3.4";
const USER = "0xdeadbeef";

const buildLogger = (): Logger =>
	({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}) as unknown as Logger;

interface MockClient {
	scriptLoad: ReturnType<typeof vi.fn>;
	evalSha: ReturnType<typeof vi.fn>;
	mGet: ReturnType<typeof vi.fn>;
}

const buildClient = (): MockClient => ({
	scriptLoad: vi.fn().mockResolvedValue("script-sha-123"),
	evalSha: vi.fn().mockResolvedValue(1),
	mGet: vi.fn().mockResolvedValue([]),
});

const buildConnection = (client: MockClient, ready = true): RedisConnection =>
	({
		isReady: vi.fn().mockReturnValue(ready),
		getClient: vi.fn().mockResolvedValue(client),
		getAwaitingTimeMs: vi.fn().mockReturnValue(0),
	}) as unknown as RedisConnection;

const sampleSpec = (
	overrides: Partial<CounterSpec> = {},
): CounterSpec => ({
	kind: "served",
	captchaType: CaptchaType.pow,
	dimension: "ip",
	window: "10m",
	...overrides,
});

describe("UsageCounters", () => {
	let logger: Logger;
	let client: MockClient;
	let connection: RedisConnection;
	let counters: UsageCounters;

	beforeEach(() => {
		logger = buildLogger();
		client = buildClient();
		connection = buildConnection(client);
		counters = new UsageCounters(connection, logger);
	});

	describe("incr", () => {
		it("loads the script once, returns the post-increment value", async () => {
			client.evalSha.mockResolvedValueOnce(1);
			const result = await counters.incr(DAPP, sampleSpec(), IP);
			expect(result).toBe(1);
			expect(client.scriptLoad).toHaveBeenCalledTimes(1);
			expect(client.evalSha).toHaveBeenCalledWith("script-sha-123", {
				keys: [encodeCounterKey(DAPP, sampleSpec(), IP)],
				arguments: ["600"],
			});
		});

		it("reuses the cached script SHA across calls", async () => {
			await counters.incr(DAPP, sampleSpec(), IP);
			await counters.incr(DAPP, sampleSpec(), IP);
			expect(client.scriptLoad).toHaveBeenCalledTimes(1);
			expect(client.evalSha).toHaveBeenCalledTimes(2);
		});

		it("returns null and logs when Redis is not ready", async () => {
			connection = buildConnection(client, false);
			counters = new UsageCounters(connection, logger);
			expect(await counters.incr(DAPP, sampleSpec(), IP)).toBeNull();
			expect(client.evalSha).not.toHaveBeenCalled();
		});

		it("returns null and logs on script failure", async () => {
			client.evalSha.mockRejectedValueOnce(new Error("redis down"));
			expect(await counters.incr(DAPP, sampleSpec(), IP)).toBeNull();
			expect(logger.warn).toHaveBeenCalled();
		});

		it("passes the correct TTL for each window", async () => {
			await counters.incr(DAPP, sampleSpec({ window: "1m" }), IP);
			await counters.incr(DAPP, sampleSpec({ window: "24h" }), IP);
			const calls = client.evalSha.mock.calls as Array<
				[string, { keys: string[]; arguments: string[] }]
			>;
			const first = calls[0];
			const second = calls[1];
			if (!first || !second) throw new Error("expected two calls");
			expect(first[1].arguments).toEqual(["60"]);
			expect(second[1].arguments).toEqual(["86400"]);
		});
	});

	describe("incrAsync", () => {
		it("does not throw on Redis failure", async () => {
			client.evalSha.mockRejectedValue(new Error("boom"));
			expect(() =>
				counters.incrAsync(DAPP, sampleSpec(), IP),
			).not.toThrow();
			await new Promise((r) => setImmediate(r));
			expect(logger.warn).toHaveBeenCalled();
		});
	});

	describe("incrManyAsync", () => {
		it("fires increments for each entry", async () => {
			counters.incrManyAsync(DAPP, [
				{ spec: sampleSpec(), value: IP },
				{ spec: sampleSpec({ dimension: "userAccount" }), value: USER },
			]);
			await new Promise((r) => setImmediate(r));
			expect(client.evalSha).toHaveBeenCalledTimes(2);
		});
	});

	describe("batchGet", () => {
		it("returns empty record for empty input without touching Redis", async () => {
			const result = await counters.batchGet(DAPP, []);
			expect(result).toEqual({});
			expect(client.mGet).not.toHaveBeenCalled();
		});

		it("returns null when Redis is unavailable", async () => {
			connection = buildConnection(client, false);
			counters = new UsageCounters(connection, logger);
			const result = await counters.batchGet(DAPP, [
				{ spec: sampleSpec(), value: IP },
			]);
			expect(result).toBeNull();
		});

		it("maps populated and missing keys; missing → 0", async () => {
			client.mGet.mockResolvedValueOnce(["3", null]);
			const reads = [
				{ spec: sampleSpec(), value: IP },
				{ spec: sampleSpec({ window: "1h" }), value: IP },
			];
			const result = await counters.batchGet(DAPP, reads);
			expect(result).toEqual({
				[encodeCounterKey(DAPP, sampleSpec(), IP)]: 3,
				[encodeCounterKey(DAPP, sampleSpec({ window: "1h" }), IP)]: 0,
			});
		});

		it("returns null on Redis error", async () => {
			client.mGet.mockRejectedValueOnce(new Error("redis broken"));
			const result = await counters.batchGet(DAPP, [
				{ spec: sampleSpec(), value: IP },
			]);
			expect(result).toBeNull();
			expect(logger.warn).toHaveBeenCalled();
		});
	});
});

describe("encodeCounterKey", () => {
	it("round-trips dimensions, kinds, types, windows into a deterministic key", () => {
		const spec: CounterSpec = {
			kind: "solved",
			captchaType: CaptchaType.image,
			dimension: "userAccount",
			window: "3h",
		};
		expect(encodeCounterKey(DAPP, spec, USER)).toBe(
			`cnt:${DAPP}:solved:image:userAccount:${USER}:3h`,
		);
	});

	it("supports the 'any' captcha-type sentinel", () => {
		const spec: CounterSpec = {
			kind: "served",
			captchaType: "any",
			dimension: "ip",
			window: "6h",
		};
		expect(encodeCounterKey(DAPP, spec, IP)).toBe(
			`cnt:${DAPP}:served:any:ip:${IP}:6h`,
		);
	});
});

describe("buildAllWindowIncrements", () => {
	it("emits 24 increments for a concrete captcha type (6 windows × 2 dims × {type, any})", () => {
		const result = buildAllWindowIncrements("served", CaptchaType.pow, IP, USER);
		expect(result).toHaveLength(24);
		const windows = new Set(result.map((r) => r.spec.window));
		expect(windows).toEqual(new Set(["1m", "10m", "1h", "3h", "6h", "24h"]));
		const types = new Set(result.map((r) => r.spec.captchaType));
		expect(types).toEqual(new Set([CaptchaType.pow, "any"]));
		const dims = new Set(result.map((r) => r.spec.dimension));
		expect(dims).toEqual(new Set(["ip", "userAccount"]));
	});

	it("emits 12 increments for 'any' captcha type (no duplication of any-into-any)", () => {
		const result = buildAllWindowIncrements("solved", "any", IP, USER);
		expect(result).toHaveLength(12);
		const types = new Set(result.map((r) => r.spec.captchaType));
		expect(types).toEqual(new Set(["any"]));
	});
});
