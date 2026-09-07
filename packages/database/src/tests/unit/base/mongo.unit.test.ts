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

import { EventEmitter } from "node:events";
import type { Logger } from "@prosopo/logger";
import mongoose, { type Connection } from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MongoDatabase } from "../../../base/mongo.js";

const createMockLogger = (): Logger => {
	// `with` returns a child logger and MongoDatabase's constructor logs
	// through the result, so the stub has to hand back something loggable.
	const logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		trace: vi.fn(),
		fatal: vi.fn(),
		log: vi.fn(),
		with: vi.fn(() => logger),
	};
	return logger as unknown as Logger;
};

/**
 * Stands in for the object `mongoose.createConnection` hands back. Only the
 * surface `MongoDatabase.connect` touches is modelled: the lifecycle events it
 * subscribes to, and `destroy`, which is the call under test.
 *
 * `destroy` resolves rather than doing anything, so a test can assert on
 * whether it was reached without a real client existing.
 */
class FakeConnection extends EventEmitter {
	readonly destroy = vi.fn(
		(_force?: boolean): Promise<void> => Promise.resolve(),
	);
	readonly close = vi.fn(
		(_force?: boolean): Promise<void> => Promise.resolve(),
	);
}

const asConnection = (fake: FakeConnection): Connection =>
	fake as unknown as Connection;

const flush = (): Promise<void> =>
	new Promise<void>((resolve) => setTimeout(resolve, 10));

describe("MongoDatabase.connect", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	/**
	 * The leak this guards against: `this.connection` is only assigned once the
	 * connection opens, so a connection that fails to open is unreachable from
	 * the instance and `close()` can never reach it — while mongoose keeps its
	 * topology monitor, its `minPoolSize` pool and its `mongoose.connections`
	 * entry alive and retrying forever. On a host whose connects routinely time
	 * out that leaks a pool per attempt until the driver's DNS lookups starve
	 * libuv's threadpool and every outbound lookup in the process backs up.
	 */
	it("destroys a connection that failed to open", async () => {
		const fake = new FakeConnection();
		vi.spyOn(mongoose, "createConnection").mockReturnValue(asConnection(fake));

		const db = new MongoDatabase(
			"mongodb://user:pass@example.com:27017/db",
			"db",
			undefined,
			createMockLogger(),
		);

		const connecting = db.connect();
		// Mongoose sets readyState to `disconnected` before emitting, then emits
		// on a later tick; emitting asynchronously here mirrors that ordering.
		await flush();
		fake.emit("error", new Error("connect ETIMEDOUT"));

		await expect(connecting).rejects.toThrow("connect ETIMEDOUT");
		expect(fake.destroy).toHaveBeenCalledTimes(1);
		expect(db.connected).toBe(false);
		expect(db.connection).toBeUndefined();
	});

	/**
	 * The counterpart risk: the `error` listener stays registered after `open`
	 * (removing it would let a runtime `error` take the process down), so a
	 * later error on a healthy connection must not be mistaken for a failed
	 * connect and tear down a working pool.
	 */
	it("does not destroy a connection that already opened", async () => {
		const fake = new FakeConnection();
		vi.spyOn(mongoose, "createConnection").mockReturnValue(asConnection(fake));

		const db = new MongoDatabase(
			"mongodb://user:pass@example.com:27017/db",
			"db",
			undefined,
			createMockLogger(),
		);

		const connecting = db.connect();
		await flush();
		fake.emit("open");
		await connecting;

		expect(db.connected).toBe(true);
		expect(db.connection).toBe(asConnection(fake));

		// A runtime error arriving after a successful open.
		fake.emit("error", new Error("transient topology error"));
		await flush();

		expect(fake.destroy).not.toHaveBeenCalled();
	});
});
