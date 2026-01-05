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

import { ProsopoDBError } from "@prosopo/common";
import type { Connection } from "mongoose";
import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MongoDatabase } from "./mongo.js";

vi.mock("mongoose", () => {
	const mockConnection = {
		once: vi.fn(),
		on: vi.fn(),
		close: vi.fn().mockResolvedValue(undefined),
	};
	return {
		default: {
			createConnection: vi.fn().mockReturnValue(mockConnection),
			set: vi.fn(),
		},
		ServerApiVersion: {
			v1: "1",
		},
	};
});

describe("MongoDatabase", () => {
	let db: MongoDatabase;
	const mockConnection = {
		once: vi.fn(),
		on: vi.fn(),
		close: vi.fn().mockResolvedValue(undefined),
	} as unknown as Connection;

	beforeEach(() => {
		vi.clearAllMocks();
		db = new MongoDatabase("mongodb://127.0.0.1:27017", "testdb");
	});

	afterEach(async () => {
		if (db.connected) {
			await db.close();
		}
	});

	describe("constructor", () => {
		it("should create instance with default URL when url is empty", () => {
			const instance = new MongoDatabase("");
			expect(instance.url).toContain("mongodb://127.0.0.1:27017");
			expect(instance.dbname).toBe("");
		});

		it("should create instance with provided URL", () => {
			const url = "mongodb://localhost:27017";
			const instance = new MongoDatabase(url);
			expect(instance.url).toContain("mongodb://localhost:27017");
		});

		it("should set dbname from parameter", () => {
			const instance = new MongoDatabase("mongodb://127.0.0.1:27017", "mydb");
			expect(instance.dbname).toBe("mydb");
		});

		it("should set dbname from URL pathname when not provided", () => {
			const instance = new MongoDatabase("mongodb://127.0.0.1:27017/mydb");
			expect(instance.dbname).toBe("mydb");
		});

		it("should add authSource to URL when provided", () => {
			const instance = new MongoDatabase(
				"mongodb://127.0.0.1:27017",
				"mydb",
				"admin",
			);
			expect(instance.url).toContain("authSource=admin");
		});

		it("should mask credentials in safeURL", () => {
			const instance = new MongoDatabase("mongodb://user:pass@127.0.0.1:27017");
			expect(instance.safeURL).toContain("<Credentials>");
			expect(instance.safeURL).not.toContain("user");
			expect(instance.safeURL).not.toContain("pass");
		});

		it("should use provided logger", () => {
			const mockLogger = {
				debug: vi.fn(),
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
			};
			const instance = new MongoDatabase(
				"mongodb://127.0.0.1:27017",
				undefined,
				undefined,
				mockLogger,
			);
			expect(instance.logger).toBe(mockLogger);
		});
	});

	describe("url getter", () => {
		it("should return the internal URL", () => {
			const url = "mongodb://127.0.0.1:27017";
			const instance = new MongoDatabase(url);
			expect(instance.url).toBeDefined();
		});
	});

	describe("getConnection", () => {
		it("should throw error when connection is undefined", () => {
			expect(() => db.getConnection()).toThrow(ProsopoDBError);
		});

		it("should return connection when it exists", () => {
			db.connection = mockConnection;
			expect(db.getConnection()).toBe(mockConnection);
		});
	});

	describe("connect", () => {
		it("should return early if already connected", async () => {
			db.connected = true;
			await db.connect();
			expect(mongoose.createConnection).not.toHaveBeenCalled();
		});

		it("should wait for existing connection if one is in progress", () => {
			// Mock the connection
			const mockConnection = {
				once: vi.fn(),
				on: vi.fn(),
				close: vi.fn().mockResolvedValue(undefined),
			};
			(mongoose.createConnection as ReturnType<typeof vi.fn>).mockReturnValue(
				mockConnection,
			);

			// Start first connection - this creates and assigns this.connecting
			db.connect();
			// Verify connecting is set
			expect(db.connecting).toBeDefined();
			// Store the connecting promise reference before second call
			const connectingBeforeSecondCall = db.connecting;
			// Verify mongoose.createConnection was called once
			expect(mongoose.createConnection).toHaveBeenCalledTimes(1);
			// Start second connection - should return the same promise that's stored in connecting
			db.connect();
			// Verify connecting hasn't changed (same promise reference)
			expect(db.connecting).toBe(connectingBeforeSecondCall);
			// Verify mongoose.createConnection was not called again
			expect(mongoose.createConnection).toHaveBeenCalledTimes(1);
			// Clean up
			db.connecting = undefined;
			db.connected = false;
		});

		it("should create connection and set up event handlers", async () => {
			const mockConnection = {
				once: vi.fn((event, handler) => {
					if (event === "open") {
						setTimeout(() => handler(), 0);
					}
					if (event === "error") {
						// Store error handler but don't call it
					}
				}),
				on: vi.fn(),
				close: vi.fn().mockResolvedValue(undefined),
			};
			(mongoose.createConnection as ReturnType<typeof vi.fn>).mockReturnValue(
				mockConnection,
			);

			const connectPromise = db.connect();
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(mongoose.createConnection).toHaveBeenCalled();
			// Clean up
			if (db.connected) {
				await db.close();
			}
		});

		it("should handle connection errors", async () => {
			const error = new Error("Connection failed");
			(mongoose.createConnection as ReturnType<typeof vi.fn>).mockReturnValue({
				once: vi.fn((event, handler) => {
					if (event === "error") {
						setTimeout(() => handler(error), 0);
					}
				}),
				on: vi.fn(),
			});

			await expect(db.connect()).rejects.toThrow();
		});

		it("should set connected to true on successful connection", async () => {
			const mockConnection = {
				once: vi.fn((event, handler) => {
					if (event === "open") {
						setTimeout(() => handler(), 0);
					}
				}),
				on: vi.fn(),
				close: vi.fn().mockResolvedValue(undefined),
			};
			(mongoose.createConnection as ReturnType<typeof vi.fn>).mockReturnValue(
				mockConnection,
			);

			const connectPromise = db.connect();
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(db.connected).toBe(true);
			// Clean up
			if (db.connected) {
				await db.close();
			}
		});
	});

	describe("close", () => {
		it("should close connection if it exists", async () => {
			const mockClose = vi.fn().mockResolvedValue(undefined);
			db.connection = {
				close: mockClose,
			} as unknown as Connection;
			await db.close();
			expect(mockClose).toHaveBeenCalled();
		});

		it("should not throw if connection is undefined", async () => {
			db.connection = undefined;
			await expect(db.close()).resolves.not.toThrow();
		});
	});
});
