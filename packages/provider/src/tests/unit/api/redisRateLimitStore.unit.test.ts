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

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Logger } from "@prosopo/logger";
import type { RedisConnection } from "@prosopo/redis-client";
import express from "express";
import rateLimit, { type Options } from "express-rate-limit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedisRateLimitStore } from "../../../api/redisRateLimitStore.js";

type RedisClient = Awaited<ReturnType<RedisConnection["getClient"]>>;

interface FakeRedis {
	eval: (
		script: string,
		options: { keys: string[]; arguments?: string[] },
	) => Promise<unknown>;
	del: (key: string) => Promise<number>;
}

const buildLogger = (): Logger =>
	({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}) as unknown as Logger;

const buildFakeRedis = (): FakeRedis & { counts: Map<string, number> } => {
	const counts = new Map<string, number>();
	return {
		counts,
		eval: async (script, { keys }): Promise<unknown> => {
			const key = keys[0] as string;
			if (script.includes("INCR")) {
				const hits = (counts.get(key) ?? 0) + 1;
				counts.set(key, hits);
				return [hits, 60_000];
			}
			const current = counts.get(key);
			if (current === undefined) {
				return 0;
			}
			counts.set(key, current - 1);
			return current - 1;
		},
		del: async (key): Promise<number> => (counts.delete(key) ? 1 : 0),
	};
};

const buildConnection = (client: FakeRedis, ready = true): RedisConnection =>
	({
		isReady: () => ready,
		getClient: async () => client as unknown as RedisClient,
		getAwaitingTimeMs: () => 0,
	}) as RedisConnection;

const startApp = async (
	store: RedisRateLimitStore,
	limit: number,
): Promise<{ server: Server; url: string }> => {
	const app = express();
	app.use(rateLimit({ windowMs: 60_000, limit, store }));
	app.get("/", (_req, res) => {
		res.sendStatus(200);
	});
	const server = app.listen(0, "127.0.0.1");
	await new Promise<void>((resolve) => server.once("listening", resolve));
	const address: AddressInfo | string | null = server.address();
	if (address === null || typeof address === "string")
		throw new Error("test server has no TCP address");
	return { server, url: `http://127.0.0.1:${address.port}/` };
};

const closeServer = (server: Server): Promise<void> =>
	new Promise<void>((resolve) => server.close(() => resolve()));

const initOptions = { windowMs: 60_000 } as Options;

describe("RedisRateLimitStore", () => {
	let logger: Logger;

	beforeEach(() => {
		logger = buildLogger();
	});

	it("shares one count between two stores backed by the same Redis", async () => {
		const redis = buildFakeRedis();
		const connection = buildConnection(redis);
		const containerA = await startApp(
			new RedisRateLimitStore(() => connection, logger, "/path"),
			2,
		);
		const containerB = await startApp(
			new RedisRateLimitStore(() => connection, logger, "/path"),
			2,
		);
		try {
			const statuses: number[] = [];
			for (const { url } of [containerA, containerB, containerA, containerB]) {
				statuses.push((await fetch(url)).status);
			}
			expect(statuses).toEqual([200, 200, 429, 429]);
		} finally {
			await closeServer(containerA.server);
			await closeServer(containerB.server);
		}
	});

	it("prefixes keys with the limiter path", async () => {
		const redis = buildFakeRedis();
		const store = new RedisRateLimitStore(
			() => buildConnection(redis),
			logger,
			"/v1/a",
		);
		store.init(initOptions);

		const info = await store.increment("1.2.3.4");

		expect(info.totalHits).toBe(1);
		expect(info.resetTime).toBeInstanceOf(Date);
		expect([...redis.counts.keys()]).toEqual(["rl:/v1/a:1.2.3.4"]);
	});

	it("passes the window to Redis as the key expiry", async () => {
		const redis = buildFakeRedis();
		const evalSpy = vi.spyOn(redis, "eval");
		const store = new RedisRateLimitStore(
			() => buildConnection(redis),
			logger,
			"/p",
		);
		store.init({ windowMs: 15_000 } as Options);

		await store.increment("k");

		expect(evalSpy).toHaveBeenCalledWith(expect.stringContaining("PEXPIRE"), {
			keys: ["rl:/p:k"],
			arguments: ["15000"],
		});
	});

	it("decrements and resets keys in Redis", async () => {
		const redis = buildFakeRedis();
		const store = new RedisRateLimitStore(
			() => buildConnection(redis),
			logger,
			"/p",
		);
		store.init(initOptions);

		await store.increment("k");
		await store.increment("k");
		await store.decrement("k");
		expect(redis.counts.get("rl:/p:k")).toBe(1);

		await store.resetKey("k");
		expect(redis.counts.has("rl:/p:k")).toBe(false);
	});

	it("counts in memory when no Redis connection is available", async () => {
		const store = new RedisRateLimitStore(() => undefined, logger, "/p");
		store.init(initOptions);

		expect((await store.increment("k")).totalHits).toBe(1);
		expect((await store.increment("k")).totalHits).toBe(2);
	});

	it("counts in memory while Redis is not ready", async () => {
		const redis = buildFakeRedis();
		const store = new RedisRateLimitStore(
			() => buildConnection(redis, false),
			logger,
			"/p",
		);
		store.init(initOptions);

		expect((await store.increment("k")).totalHits).toBe(1);
		expect(redis.counts.size).toBe(0);
	});

	it("falls back to memory and logs when Redis errors", async () => {
		const redis = buildFakeRedis();
		redis.eval = async (): Promise<unknown> => {
			throw new Error("connection reset");
		};
		const store = new RedisRateLimitStore(
			() => buildConnection(redis),
			logger,
			"/p",
		);
		store.init(initOptions);

		expect((await store.increment("k")).totalHits).toBe(1);
		expect(logger.warn).toHaveBeenCalled();
	});

	it("falls back to memory when Redis does not answer in time", async () => {
		const redis = buildFakeRedis();
		redis.eval = (): Promise<unknown> => new Promise<unknown>(() => {});
		const store = new RedisRateLimitStore(
			() => buildConnection(redis),
			logger,
			"/p",
			5,
		);
		store.init(initOptions);

		expect((await store.increment("k")).totalHits).toBe(1);
		expect(logger.warn).toHaveBeenCalled();
	});

	it("falls back to memory on a malformed Redis reply", async () => {
		const redis = buildFakeRedis();
		redis.eval = async (): Promise<unknown> => "OK";
		const store = new RedisRateLimitStore(
			() => buildConnection(redis),
			logger,
			"/p",
		);
		store.init(initOptions);

		expect((await store.increment("k")).totalHits).toBe(1);
	});
});
