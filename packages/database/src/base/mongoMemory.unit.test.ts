// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoMemoryDatabase } from "./mongoMemory.js";
import { MongoDatabase } from "./mongo.js";

vi.mock("mongodb-memory-server", () => {
	const mockServer = {
		getUri: vi.fn(() => "mongodb://memory:27017"),
		stop: vi.fn().mockResolvedValue(undefined),
	};
	return {
		MongoMemoryServer: {
			create: vi.fn().mockResolvedValue(mockServer),
		},
	};
});

vi.mock("./mongo.js", () => {
	return {
		MongoDatabase: vi.fn().mockImplementation(() => ({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			url: "",
			dbname: "testdb",
			logger: { debug: vi.fn(), error: vi.fn() },
			connected: false,
		})),
	};
});

describe("MongoMemoryDatabase", () => {
	let db: MongoMemoryDatabase;
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	} as any;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(async () => {
		if (db) {
			await db.close().catch(() => {
				// Ignore errors during cleanup
			});
		}
	});

	describe("constructor", () => {
		it("should initialize with empty URL and call super constructor", () => {
			db = new MongoMemoryDatabase("unused", "testdb", mockLogger);
			expect(MongoDatabase).toHaveBeenCalledWith(
				"",
				"testdb",
				undefined,
				mockLogger,
			);
			expect(db.url).toBe("");
		});

		it("should pass authSource to super constructor", () => {
			const authSource = "admin";
			db = new MongoMemoryDatabase("unused", "testdb", mockLogger, authSource);
			expect(MongoDatabase).toHaveBeenCalledWith(
				"",
				"testdb",
				authSource,
				mockLogger,
			);
		});
	});

	describe("connect", () => {
		it("should create MongoMemoryServer and set URL before connecting", async () => {
			db = new MongoMemoryDatabase("unused", "testdb", mockLogger);
			const mockServer = {
				getUri: vi.fn(() => "mongodb://memory:27017"),
				stop: vi.fn().mockResolvedValue(undefined),
			};
			(MongoMemoryServer.create as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockServer,
			);

			await db.connect();

			expect(MongoMemoryServer.create).toHaveBeenCalled();
			expect(mockServer.getUri).toHaveBeenCalled();
			expect(MongoDatabase.prototype.connect).toHaveBeenCalled();
		});

		it("should reuse existing MongoMemoryServer on subsequent connects", async () => {
			db = new MongoMemoryDatabase("unused", "testdb", mockLogger);
			const mockServer = {
				getUri: vi.fn(() => "mongodb://memory:27017"),
				stop: vi.fn().mockResolvedValue(undefined),
			};
			(MongoMemoryServer.create as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockServer,
			);

			await db.connect();
			await db.connect();

			expect(MongoMemoryServer.create).toHaveBeenCalledTimes(1);
		});
	});

	describe("close", () => {
		it("should close parent connection and stop MongoMemoryServer", async () => {
			db = new MongoMemoryDatabase("unused", "testdb", mockLogger);
			const mockServer = {
				getUri: vi.fn(() => "mongodb://memory:27017"),
				stop: vi.fn().mockResolvedValue(undefined),
			};
			(MongoMemoryServer.create as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockServer,
			);

			await db.connect();
			await db.close();

			expect(MongoDatabase.prototype.close).toHaveBeenCalled();
			expect(mockServer.stop).toHaveBeenCalled();
		});

		it("should handle close when MongoMemoryServer is undefined", async () => {
			db = new MongoMemoryDatabase("unused", "testdb", mockLogger);
			await expect(db.close()).resolves.not.toThrow();
		});

		it("should clear mongod reference after stopping", async () => {
			db = new MongoMemoryDatabase("unused", "testdb", mockLogger);
			const mockServer = {
				getUri: vi.fn(() => "mongodb://memory:27017"),
				stop: vi.fn().mockResolvedValue(undefined),
			};
			(MongoMemoryServer.create as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockServer,
			);

			await db.connect();
			await db.close();

			// After close, mongod should be undefined, so another close should not call stop
			mockServer.stop.mockClear();
			await db.close();
			expect(mockServer.stop).not.toHaveBeenCalled();
		});
	});
});
