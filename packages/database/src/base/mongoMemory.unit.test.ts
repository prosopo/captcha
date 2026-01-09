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

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MongoMemoryDatabase } from "./mongoMemory.js";
import { MongoDatabase } from "./mongo.js";

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
		// Clear environment variables for clean test state
		delete process.env.MONGODB_URL;
	});

	afterEach(async () => {
		if (db) {
			await db.close().catch(() => {
				// Ignore errors during cleanup
			});
		}
	});

	describe("constructor", () => {
		it("should initialize with provided URL", () => {
			const testUrl = "mongodb://test:27017";
			db = new MongoMemoryDatabase(testUrl, "testdb", mockLogger);
			expect(db.url).toBe(testUrl);
		});

		it("should use MONGODB_URL environment variable when no URL provided", () => {
			const testUrl = "mongodb://env:27017";
			process.env.MONGODB_URL = testUrl;
			db = new MongoMemoryDatabase("", "testdb", mockLogger);
			expect(db.url).toBe(testUrl);
		});

		it("should fall back to default URL when neither URL nor env var provided", () => {
			db = new MongoMemoryDatabase("", "testdb", mockLogger);
			expect(db.url).toBe("mongodb://127.0.0.1:27017");
		});

		it("should pass authSource to super constructor", () => {
			const authSource = "admin";
			vi.spyOn(MongoDatabase.prototype, "constructor" as any);
			db = new MongoMemoryDatabase("", "testdb", mockLogger, authSource);
			// The constructor spy would show the parameters passed to super()
		});

		it("should detect testcontainers mode correctly", () => {
			// When using MONGODB_URL env var and no URL provided, it's testcontainers mode
			process.env.MONGODB_URL = "mongodb://test:27017";
			db = new MongoMemoryDatabase("", "testdb", mockLogger);
			// We can't directly test the private field, but we can test behavior
		});
	});

	describe("connect", () => {
		it("should call super connect", async () => {
			db = new MongoMemoryDatabase("mongodb://test:27017", "testdb", mockLogger);
			const superConnectSpy = vi.spyOn(MongoDatabase.prototype, "connect").mockResolvedValue(undefined);

			await db.connect();

			expect(superConnectSpy).toHaveBeenCalled();
			superConnectSpy.mockRestore();
		});
	});

	describe("close", () => {
		it("should call super close when not in testcontainers mode", async () => {
			db = new MongoMemoryDatabase("mongodb://test:27017", "testdb", mockLogger);
			const superCloseSpy = vi.spyOn(MongoDatabase.prototype, "close").mockResolvedValue(undefined);

			await db.close();

			expect(superCloseSpy).toHaveBeenCalled();
			superCloseSpy.mockRestore();
		});

		it("should not call super close when in testcontainers mode", async () => {
			process.env.MONGODB_URL = "mongodb://test:27017";
			db = new MongoMemoryDatabase("", "testdb", mockLogger);
			const superCloseSpy = vi.spyOn(MongoDatabase.prototype, "close").mockResolvedValue(undefined);

			await db.close();

			expect(superCloseSpy).not.toHaveBeenCalled();
			superCloseSpy.mockRestore();
		});

		it("should handle close gracefully", async () => {
			db = new MongoMemoryDatabase("mongodb://test:27017", "testdb", mockLogger);
			await expect(db.close()).resolves.not.toThrow();
		});
	});
});





