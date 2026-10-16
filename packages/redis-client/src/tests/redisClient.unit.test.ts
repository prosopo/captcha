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

import {
	type LogObject,
	type LogRecordFn,
	type Logger,
	getLogger,
} from "@prosopo/logger";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type RedisConnection,
	connectToRedis,
	redactRedisUrl,
	setupRedisIndex,
} from "../redisClient.js";

// The real client would retry forever against an unreachable server; the fake
// lets each test decide how the first connect settles.
const fakeRedis = vi.hoisted(() => ({
	connect: (): Promise<unknown> => new Promise<unknown>(() => undefined),
}));

vi.mock("redis", () => ({
	createClient: () => ({
		on: () => undefined,
		connect: () => fakeRedis.connect(),
	}),
}));

// Plain redis without the search module answers FT._LIST with an error, which
// is what index setup hits first.
vi.mock("../redisIndex.js", () => ({
	createRedisIndex: (): Promise<void> =>
		Promise.reject(new Error("ERR unknown command 'FT._LIST'")),
}));

type Recorded = {
	bindings: LogObject[];
	errors: string[];
};

const recordingLogger = (): { logger: Logger; recorded: Recorded } => {
	const recorded: Recorded = { bindings: [], errors: [] };
	const logger = getLogger("error", "redis-client-test");
	vi.spyOn(logger, "with").mockImplementation((bindings: LogObject): Logger => {
		recorded.bindings.push(bindings);
		return logger;
	});
	vi.spyOn(logger, "error").mockImplementation((fn: LogRecordFn): void => {
		recorded.errors.push(fn().msg ?? "");
	});
	vi.spyOn(logger, "info").mockImplementation((): void => undefined);
	return { logger, recorded };
};

const unhandled: unknown[] = [];
const onUnhandled = (reason: unknown): void => {
	unhandled.push(reason);
};

// Let a rejected promise with no handler reach the process-level event.
const settle = (): Promise<void> =>
	new Promise<void>((resolve) => setTimeout(resolve, 50));

beforeEach(() => {
	unhandled.length = 0;
	process.on("unhandledRejection", onUnhandled);
});

afterEach(() => {
	process.off("unhandledRejection", onUnhandled);
	fakeRedis.connect = (): Promise<unknown> =>
		new Promise<unknown>(() => undefined);
	vi.restoreAllMocks();
});

describe("redactRedisUrl", () => {
	it.each([
		[
			"redis://default:hunter2@redis.internal:6379",
			"redis://redacted:redacted@redis.internal:6379",
		],
		[
			"rediss://:hunter2@redis.internal:6380/2",
			"rediss://:redacted@redis.internal:6380/2",
		],
		["redis://redis.internal:6379", "redis://redis.internal:6379"],
		["redis://localhost", "redis://localhost"],
	])("%s -> %s", (input: string, expected: string) => {
		expect(redactRedisUrl(input)).toBe(expected);
	});

	it("does not echo a URL it cannot parse", () => {
		expect(redactRedisUrl("not a url with hunter2")).toBe(
			"[unparseable redis url]",
		);
	});

	it("passes undefined through", () => {
		expect(redactRedisUrl(undefined)).toBeUndefined();
	});
});

describe("connectToRedis", () => {
	it("never binds the password to the logger", () => {
		const { logger, recorded } = recordingLogger();
		connectToRedis({
			url: "redis://default:hunter2@redis.internal:6379",
			logger,
		});
		expect(JSON.stringify(recorded.bindings)).not.toContain("hunter2");
		expect(recorded.bindings).toContainEqual({
			url: "redis://redacted:redacted@redis.internal:6379",
		});
	});

	it("does not leave a failed first connect as an unhandled rejection", async () => {
		fakeRedis.connect = (): Promise<unknown> =>
			Promise.reject(new Error("ECONNREFUSED"));
		const { logger, recorded } = recordingLogger();

		const connection = connectToRedis({ url: "redis://localhost", logger });
		await settle();

		expect(unhandled).toEqual([]);
		expect(recorded.errors).toContain("Redis connection failed");
		// Callers asking for the client still see the failure.
		await expect(connection.getClient()).rejects.toThrow("ECONNREFUSED");
		expect(connection.isReady()).toBe(false);
	});
});

describe("setupRedisIndex", () => {
	it("does not leave a failed index setup as an unhandled rejection", async () => {
		fakeRedis.connect = (): Promise<unknown> => Promise.resolve({});
		const { logger, recorded } = recordingLogger();
		const connection: RedisConnection = connectToRedis({
			url: "redis://localhost",
			logger,
		});

		const indexed = setupRedisIndex(
			connection,
			{ name: "probe", schema: {}, options: {} },
			logger,
		);
		await settle();

		expect(unhandled).toEqual([]);
		expect(recorded.errors).toContain("Redis index setup failed");
		await expect(indexed.getClient()).rejects.toThrow("FT._LIST");
		expect(indexed.isReady()).toBe(false);
	});
});
