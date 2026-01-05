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

import { MongoMemoryServer } from "mongodb-memory-server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MongoMemoryDatabase } from "./mongoMemory.js";

vi.mock("mongodb-memory-server", () => {
	const mockServer = {
		getUri: vi.fn().mockReturnValue("mongodb://memory:27017"),
		stop: vi.fn().mockResolvedValue(undefined),
	};
	return {
		MongoMemoryServer: {
			create: vi.fn().mockResolvedValue(mockServer),
		},
	};
});

vi.mock("./mongo.js", async () => {
	const actual =
		await vi.importActual<typeof import("./mongo.js")>("./mongo.js");
	return {
		...actual,
		MongoDatabase: class extends actual.MongoDatabase {
			override async connect(): Promise<void> {
				this.connected = true;
				this.connection = {} as typeof this.connection;
			}
			override async close(): Promise<void> {
				this.connected = false;
			}
		},
	};
});

describe("MongoMemoryDatabase", () => {
	let db: MongoMemoryDatabase;
	const mockLogger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		db = new MongoMemoryDatabase("", "testdb", mockLogger);
	});

	afterEach(async () => {
		if (db.connected) {
			await db.close();
		}
	});

	describe("constructor", () => {
		it("should create instance with empty URL initially", () => {
			const instance = new MongoMemoryDatabase("", "testdb", mockLogger);
			expect(instance.url).toBe("");
		});

		it("should accept unused url parameter for compatibility", () => {
			const instance = new MongoMemoryDatabase(
				"mongodb://127.0.0.1:27017",
				"testdb",
				mockLogger,
			);
			expect(instance.dbname).toBe("testdb");
		});

		it("should accept authSource parameter", () => {
			const instance = new MongoMemoryDatabase(
				"",
				"testdb",
				mockLogger,
				"admin",
			);
			expect(instance).toBeDefined();
		});
	});

	describe("connect", () => {
		it("should create MongoMemoryServer and set URL", async () => {
			await db.connect();
			expect(MongoMemoryServer.create).toHaveBeenCalled();
			expect(db.url).toBe("mongodb://memory:27017");
		});

		it("should not create new server if one already exists", async () => {
			await db.connect();
			vi.clearAllMocks();
			await db.connect();
			expect(MongoMemoryServer.create).not.toHaveBeenCalled();
		});

		it("should call super.connect()", async () => {
			await db.connect();
			expect(db.connected).toBe(true);
		});
	});

	describe("close", () => {
		it("should stop MongoMemoryServer and call super.close()", async () => {
			await db.connect();
			const mockServer = await MongoMemoryServer.create();
			await db.close();
			expect(mockServer.stop).toHaveBeenCalled();
			expect(db.connected).toBe(false);
		});

		it("should handle case when mongod is undefined", async () => {
			await expect(db.close()).resolves.not.toThrow();
		});
	});
});
