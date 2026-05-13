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
import { type RedisConnection, connectToRedis } from "@prosopo/redis-client";
import {
	CaptchaType,
	type CounterSpec,
	encodeCounterKey,
} from "@prosopo/types";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	UsageCounters,
	buildAllWindowIncrements,
} from "../../util/usageCounters.js";

const REDIS_URL = process.env.REDIS_CONNECTION_URL ?? "redis://localhost:6379";
const REDIS_PASSWORD = process.env.REDIS_CONNECTION_PASSWORD ?? "root";

const mockLogger: Logger = {
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
} as unknown as Logger;

const DAPP = `test-${process.pid}-${Date.now()}`;
const IP = "1.2.3.4";
const USER = "0xtestuser";

describe("UsageCounters integration (live Redis)", () => {
	let connection: RedisConnection;
	let counters: UsageCounters;
	let writtenKeys: string[] = [];

	beforeAll(async () => {
		connection = connectToRedis({
			url: REDIS_URL,
			password: REDIS_PASSWORD,
			logger: mockLogger,
		});
		await connection.getClient();
		counters = new UsageCounters(connection, mockLogger);
	});

	afterEach(async () => {
		if (writtenKeys.length > 0) {
			const client = await connection.getClient();
			await client.del(writtenKeys);
			writtenKeys = [];
		}
	});

	afterAll(async () => {
		const client = await connection.getClient();
		await client.quit();
	});

	const trackKey = (spec: CounterSpec, value: string): string => {
		const key = encodeCounterKey(DAPP, spec, value);
		writtenKeys.push(key);
		return key;
	};

	const SPEC: CounterSpec = {
		kind: "served",
		captchaType: CaptchaType.pow,
		dimension: "ip",
		window: "1m",
	};

	it("incr writes a counter and sets TTL only on first transition", async () => {
		const key = trackKey(SPEC, IP);
		const first = await counters.incr(DAPP, SPEC, IP);
		expect(first).toBe(1);

		const client = await connection.getClient();
		const ttlAfterFirst = await client.ttl(key);
		expect(ttlAfterFirst).toBeGreaterThan(0);
		expect(ttlAfterFirst).toBeLessThanOrEqual(60);

		// Pin the TTL down by setting it to a low value, then verify
		// the second incr does NOT refresh it.
		await client.expire(key, 5);
		const ttlBeforeSecond = await client.ttl(key);
		expect(ttlBeforeSecond).toBeLessThanOrEqual(5);

		const second = await counters.incr(DAPP, SPEC, IP);
		expect(second).toBe(2);
		const ttlAfterSecond = await client.ttl(key);
		expect(ttlAfterSecond).toBeLessThanOrEqual(5);
	});

	it("batchGet returns 0 for missing keys and the actual value for present ones", async () => {
		const presentSpec = SPEC;
		const missingSpec: CounterSpec = { ...SPEC, window: "10m" };

		// Seed the present spec once
		await counters.incr(DAPP, presentSpec, IP);
		trackKey(presentSpec, IP);

		const result = await counters.batchGet(DAPP, [
			{ spec: presentSpec, value: IP },
			{ spec: missingSpec, value: IP },
		]);
		expect(result).not.toBeNull();
		const presentKey = encodeCounterKey(DAPP, presentSpec, IP);
		const missingKey = encodeCounterKey(DAPP, missingSpec, IP);
		expect(result?.[presentKey]).toBe(1);
		expect(result?.[missingKey]).toBe(0);
	});

	it("incrManyAsync writes all increments", async () => {
		const increments = buildAllWindowIncrements(
			"served",
			CaptchaType.pow,
			IP,
			USER,
		);
		counters.incrManyAsync(DAPP, increments);
		// Allow Promise queue to flush
		await new Promise((r) => setTimeout(r, 200));
		const reads = increments.map((i) => ({ spec: i.spec, value: i.value }));
		// Track keys for cleanup
		for (const r of reads) {
			writtenKeys.push(encodeCounterKey(DAPP, r.spec, r.value));
		}
		const result = await counters.batchGet(DAPP, reads);
		expect(result).not.toBeNull();
		const values = Object.values(result ?? {});
		expect(values).toHaveLength(reads.length);
		for (const v of values) {
			expect(v).toBeGreaterThanOrEqual(1);
		}
	});

	it("batchGet returns {} for empty input without touching Redis", async () => {
		const result = await counters.batchGet(DAPP, []);
		expect(result).toEqual({});
	});
});
