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

import { LogLevel, getLogger } from "@prosopo/logger";
import type { RedisConnection, connectToRedis } from "@prosopo/redis-client";
import { describe, expect, it, vi } from "vitest";
import { ProviderDatabase } from "../../../databases/provider.js";

vi.mock("@prosopo/redis-client", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/redis-client")>();
	return {
		...actual,
		connectToRedis: (
			_options: Parameters<typeof connectToRedis>[0],
		): RedisConnection => ({
			isReady: () => false,
			getClient: () => new Promise(() => {}),
			getAwaitingTimeMs: () => 0,
		}),
		setupRedisIndex: (connection: RedisConnection): RedisConnection =>
			connection,
	};
});

const logger = getLogger(LogLevel.enum.error, "providerRedisConnection.test");

const unconnectedProviderDatabase = (): ProviderDatabase =>
	new ProviderDatabase({
		mongo: { url: "mongodb://127.0.0.1:27017", dbname: "prosopo" },
		logger,
	});

class RedisOnlyProviderDatabase extends ProviderDatabase {
	async connectRedisOnly(): Promise<void> {
		await this.setupRedis();
	}
}

const redisOnlyProviderDatabase = (
	redisMemUrl?: string,
): RedisOnlyProviderDatabase =>
	new RedisOnlyProviderDatabase({
		mongo: { url: "mongodb://127.0.0.1:27017", dbname: "prosopo" },
		redis: { url: "redis://redis-disk:6379", password: "" },
		redisMem: redisMemUrl ? { url: redisMemUrl, password: "" } : undefined,
		logger,
	});

describe("ProviderDatabase Redis connection getters", () => {
	it("names the general connection when it is missing", () => {
		expect(() => unconnectedProviderDatabase().getRedisConnection()).toThrow(
			"Redis connection undefined",
		);
	});

	it("names the access rules connection when it is missing", () => {
		expect(() =>
			unconnectedProviderDatabase().getRedisAccessRulesConnection(),
		).toThrow("Redis access rules connection undefined");
	});

	it("names the mem connection when it is missing", () => {
		expect(() => unconnectedProviderDatabase().getRedisMemConnection()).toThrow(
			"Redis mem connection undefined",
		);
	});

	it("uses the general connection as the mem one when none is configured", async () => {
		const db = redisOnlyProviderDatabase();
		await db.connectRedisOnly();

		expect(db.getRedisMemConnection()).toBe(db.getRedisConnection());
	});

	it("opens a separate mem connection when one is configured", async () => {
		const db = redisOnlyProviderDatabase("redis://redis-mem:6379");
		await db.connectRedisOnly();

		expect(db.getRedisMemConnection()).not.toBe(db.getRedisConnection());
	});
});
