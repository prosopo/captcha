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

import { LogLevel, type Logger, getLogger } from "@prosopo/logger";
import { type RedisConnection, connectToRedis } from "@prosopo/redis-client";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { RedisWriteQueue } from "../../redisCache.js";

const REDIS_URL = process.env.REDIS_CONNECTION_URL ?? "redis://localhost:6379";
const REDIS_PASSWORD = process.env.REDIS_CONNECTION_PASSWORD ?? "root";

const logger: Logger = getLogger(LogLevel.enum.error, "redisCacheSessionPatch");

type RedisClient = Awaited<ReturnType<RedisConnection["getClient"]>>;

const SESSION_ID = `patch-race-${process.pid}-${Date.now()}`;
const KEY = `cache:session:${SESSION_ID}`;

describe("RedisWriteQueue session patches (live Redis)", () => {
	let connection: RedisConnection;
	let client: RedisClient;
	let queue: RedisWriteQueue;

	// Runs `interleave` on a second connection after the patch has read the
	// cached session but before it writes the merged value back.
	const interleaveAfterFirstRead = (
		interleave: () => Promise<unknown>,
	): void => {
		const originalGet = client.get.bind(client);
		let fired = false;
		vi.spyOn(client, "get").mockImplementation(async (key) => {
			const value = await originalGet(key);
			if (!fired) {
				fired = true;
				await interleave();
			}
			return value;
		});
	};

	beforeAll(async () => {
		connection = connectToRedis({
			url: REDIS_URL,
			password: REDIS_PASSWORD,
			logger: logger,
		});
		client = await connection.getClient();
		queue = new RedisWriteQueue(connection, logger);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await client.del(KEY);
	});

	afterAll(async () => {
		await client.quit();
	});

	it("patchCachedSession does not recreate a session invalidated mid-patch", async () => {
		await queue.cacheSession(SESSION_ID, { score: 0.5 }, 60);
		const other = client.duplicate();
		await other.connect();
		interleaveAfterFirstRead(() => other.del(KEY));

		const patched = await queue.patchCachedSession(SESSION_ID, {
			score: 0.9,
		});
		await other.quit();

		expect(patched).toBe(false);
		expect(await client.exists(KEY)).toBe(0);
	});

	it("patchCachedSimdReadingsIfAbsent does not recreate a session invalidated mid-patch", async () => {
		await queue.cacheSession(SESSION_ID, { score: 0.5 }, 60);
		const other = client.duplicate();
		await other.connect();
		interleaveAfterFirstRead(() => other.del(KEY));

		const patched = await queue.patchCachedSimdReadingsIfAbsent(
			SESSION_ID,
			{ a: 1 },
			"load",
		);
		await other.quit();

		expect(patched).toBe(false);
		expect(await client.exists(KEY)).toBe(0);
	});

	it("patchCachedSession keeps a field written by a concurrent patch", async () => {
		await queue.cacheSession(SESSION_ID, { score: 0.5 }, 60);
		const concurrent = new RedisWriteQueue(connection, logger);
		interleaveAfterFirstRead(() =>
			concurrent.patchCachedSession(SESSION_ID, { token: "abc" }),
		);

		const patched = await queue.patchCachedSession(SESSION_ID, {
			score: 0.9,
		});

		expect(patched).toBe(true);
		const stored = await queue.getCachedSession(SESSION_ID);
		expect(stored?.score).toBe(0.9);
		expect(stored?.token).toBe("abc");
	});

	it("patchCachedSimdReadingsIfAbsent keeps the first readings when a concurrent hop wins", async () => {
		await queue.cacheSession(SESSION_ID, { score: 0.5 }, 60);
		const concurrent = new RedisWriteQueue(connection, logger);
		interleaveAfterFirstRead(() =>
			concurrent.patchCachedSimdReadingsIfAbsent(
				SESSION_ID,
				{ first: 1 },
				"load",
			),
		);

		const patched = await queue.patchCachedSimdReadingsIfAbsent(
			SESSION_ID,
			{ second: 2 },
			"submit",
		);

		expect(patched).toBe(false);
		const stored = await queue.getCachedSession(SESSION_ID);
		expect(stored?.simdReadings).toEqual({ first: 1 });
		expect(stored?.simdReadingsStage).toBe("load");
	});

	it("patchCachedSession merges updates and refreshes the TTL on a live session", async () => {
		await queue.cacheSession(SESSION_ID, { score: 0.5, bigint: 7n }, 60);

		const patched = await queue.patchCachedSession(
			SESSION_ID,
			{ score: 0.9 },
			120,
		);

		expect(patched).toBe(true);
		const stored = await queue.getCachedSession(SESSION_ID);
		expect(stored?.score).toBe(0.9);
		expect(stored?.bigint).toBe(7n);
		expect(await client.ttl(KEY)).toBeGreaterThan(60);
	});

	it("patchCachedSession is a no-op on a cache miss", async () => {
		expect(await queue.patchCachedSession(SESSION_ID, { score: 1 })).toBe(
			false,
		);
		expect(await client.exists(KEY)).toBe(0);
	});
});
