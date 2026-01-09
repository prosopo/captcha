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

import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { MongoDBContainer, type StartedMongoDBContainer } from "testcontainers";
import { MongoDatabase } from "./mongo.js";
import { getLogger } from "@prosopo/common";

/**
 * Integration tests for MongoDatabase that use real MongoDB connections via testcontainers.
 * These tests verify actual database connectivity and operations.
 */
describe("MongoDatabase - Integration", () => {
	let mongoContainer: StartedMongoDBContainer;
	let db: MongoDatabase;
	const logger = getLogger("info", "mongo.integration.test");

	beforeAll(async () => {
		// Start MongoDB container for this test suite
		mongoContainer = await new MongoDBContainer("mongo:7.0")
			.withExposedPorts(27017)
			.start();
	}, 60000);

	afterAll(async () => {
		if (mongoContainer) {
			await mongoContainer.stop().catch(() => {
				// Ignore cleanup errors
			});
		}
	}, 30000);

	beforeEach(() => {
		// Use testcontainers MongoDB instance
		const mongoUrl = mongoContainer.getConnectionString();
		db = new MongoDatabase(mongoUrl, "testdb", undefined, logger);
	});

	afterEach(async () => {
		if (db) {
			await db.close().catch(() => {
				// Ignore cleanup errors
			});
		}
	});

	describe("connection lifecycle", () => {
		it("should successfully connect to MongoDB", async () => {
			// Test that connection is established without errors
			await expect(db.connect()).resolves.not.toThrow();
			expect(db.connected).toBe(true);
		});

		it("should maintain connection state correctly", async () => {
			// Initially not connected
			expect(db.connected).toBe(false);

			// Connect
			await db.connect();
			expect(db.connected).toBe(true);

			// Should not reconnect if already connected
			await db.connect();
			expect(db.connected).toBe(true);
		});

		it("should close connection successfully", async () => {
			await db.connect();
			expect(db.connected).toBe(true);

			await db.close();
			expect(db.connected).toBe(false);
		});

		it("should handle multiple close calls gracefully", async () => {
			await db.connect();
			await db.close();

			// Second close should not throw
			await expect(db.close()).resolves.not.toThrow();
		});
	});

	describe("connection properties", () => {
		it("should provide access to the connection object after connecting", async () => {
			await db.connect();
			const connection = db.getConnection();
			expect(connection).toBeDefined();
			expect(connection.readyState).toBeGreaterThan(0); // Connected state
		});

		it("should throw error when accessing connection before connecting", () => {
			expect(() => db.getConnection()).toThrow("DATABASE.CONNECTION_UNDEFINED");
		});

		it("should sanitize URL in safeURL getter", () => {
			const urlWithCredentials = "mongodb://user:password@localhost:27017/test";
			const dbWithCreds = new MongoDatabase(urlWithCredentials, "testdb", undefined, logger);

			expect(dbWithCreds.safeURL).toContain("<Credentials>");
			expect(dbWithCreds.safeURL).not.toContain("user:password");
		});
	});

	describe("URL construction", () => {
		it("should construct URL correctly with database name", () => {
			const baseUrl = "mongodb://localhost:27017";
			const dbname = "mydb";
			const dbInstance = new MongoDatabase(baseUrl, dbname, undefined, logger);

			expect(dbInstance.url).toBe(`${baseUrl}/${dbname}`);
		});

		it("should append authSource to URL when provided", () => {
			const baseUrl = "mongodb://localhost:27017";
			const authSource = "admin";
			const dbInstance = new MongoDatabase(baseUrl, "testdb", authSource, logger);

			expect(dbInstance.url).toContain("authSource=admin");
		});

		it("should extract database name from URL pathname when not provided separately", () => {
			const urlWithDb = "mongodb://localhost:27017/myapp";
			const dbInstance = new MongoDatabase(urlWithDb, undefined, undefined, logger);

			expect(dbInstance.dbname).toBe("myapp");
		});

		it("should handle URLs without database in pathname", () => {
			const urlWithoutDb = "mongodb://localhost:27017";
			const dbInstance = new MongoDatabase(urlWithoutDb, "explicitdb", undefined, logger);

			expect(dbInstance.dbname).toBe("explicitdb");
		});
	});

	describe("error handling", () => {
		it("should handle connection errors gracefully", async () => {
			// Use an invalid MongoDB URL to test error handling
			const invalidDb = new MongoDatabase("mongodb://invalid-host:27017", "testdb", undefined, logger);

			await expect(invalidDb.connect()).rejects.toThrow();
			expect(invalidDb.connected).toBe(false);
		});
	});

	describe("logger integration", () => {
		it("should use provided logger", () => {
			const customLogger = { debug: () => {}, error: () => {} } as any;
			const dbWithLogger = new MongoDatabase("mongodb://localhost:27017", "testdb", undefined, customLogger);

			expect(dbWithLogger.logger).toBe(customLogger);
		});

		it("should create default logger when none provided", () => {
			const dbWithoutLogger = new MongoDatabase("mongodb://localhost:27017", "testdb");
			expect(dbWithoutLogger.logger).toBeDefined();
		});
	});
});