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
import type { Connection } from "mongoose";
import mongoose from "mongoose";
import { ProsopoDBError } from "@prosopo/common";
import { MongoDatabase } from "./mongo.js";

vi.mock("mongoose", () => {
	const mockConnection = {
		once: vi.fn(),
		on: vi.fn(),
		close: vi.fn(),
	};
	return {
		default: {
			createConnection: vi.fn(() => mockConnection),
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
		(mongoose.createConnection as ReturnType<typeof vi.fn>).mockReturnValue(
			mockConnection,
		);
	});

	afterEach(async () => {
		if (db) {
			await db.close().catch(() => {
				// Ignore errors during cleanup
			});
		}
	});

	describe("constructor", () => {
		it("should initialize with default URL when no URL provided", () => {
			db = new MongoDatabase("");
			expect(db.url).toBe("mongodb://127.0.0.1:27017/");
			expect(db.dbname).toBe("");
			expect(db.connected).toBe(false);
		});

		it("should initialize with provided URL", () => {
			const url = "mongodb://localhost:27017";
			db = new MongoDatabase(url);
			expect(db.url).toBe(`${url}/`);
			expect(db.connected).toBe(false);
		});

		it("should set dbname from parameter", () => {
			const dbname = "testdb";
			db = new MongoDatabase("mongodb://localhost:27017", dbname);
			expect(db.dbname).toBe(dbname);
			expect(db.url).toContain(dbname);
		});

		it("should set dbname from URL pathname when not provided", () => {
			const url = "mongodb://localhost:27017/mydb";
			db = new MongoDatabase(url);
			expect(db.dbname).toBe("mydb");
		});

		it("should add authSource to URL when provided", () => {
			const url = "mongodb://localhost:27017";
			const authSource = "admin";
			db = new MongoDatabase(url, undefined, authSource);
			expect(db.url).toContain("authSource=admin");
		});

		it("should sanitize URL in safeURL", () => {
			const url = "mongodb://user:pass@localhost:27017";
			db = new MongoDatabase(url);
			expect(db.safeURL).toContain("<Credentials>");
			expect(db.safeURL).not.toContain("user:pass");
		});

		it("should use provided logger or create default", () => {
			const logger = { debug: vi.fn(), error: vi.fn() } as any;
			db = new MongoDatabase("mongodb://localhost:27017", undefined, undefined, logger);
			expect(db.logger).toBe(logger);
		});
	});

	describe("getConnection", () => {
		it("should return connection when it exists", () => {
			db = new MongoDatabase("mongodb://localhost:27017");
			db.connection = mockConnection;
			expect(db.getConnection()).toBe(mockConnection);
		});

		it("should throw ProsopoDBError when connection is undefined", () => {
			db = new MongoDatabase("mongodb://localhost:27017");
			expect(() => db.getConnection()).toThrow(ProsopoDBError);
		});
	});

	describe("connect", () => {
		it("should return immediately if already connected", async () => {
			db = new MongoDatabase("mongodb://localhost:27017");
			db.connected = true;
			await db.connect();
			expect(mongoose.createConnection).not.toHaveBeenCalled();
		});

		it("should wait for existing connection attempt if in progress", async () => {
			db = new MongoDatabase("mongodb://localhost:27017");
			let resolveFirst: () => void;
			const firstPromise = new Promise<void>((resolve) => {
				resolveFirst = resolve;
			});
			(mockConnection.once as ReturnType<typeof vi.fn>).mockImplementation(
				(event: string, callback: () => void) => {
					if (event === "open") {
						setTimeout(() => {
							callback();
							resolveFirst();
						}, 10);
					}
				},
			);

			const connect1 = db.connect();
			const connect2 = db.connect();
			expect(connect1).toBe(connect2);
			await connect1;
			await connect2;
		});

		it("should create connection and set up event handlers", async () => {
			db = new MongoDatabase("mongodb://localhost:27017", "testdb");
			let openCallback: () => void;
			(mockConnection.once as ReturnType<typeof vi.fn>).mockImplementation(
				(event: string, callback: () => void) => {
					if (event === "open") {
						openCallback = callback;
					}
				},
			);

			const connectPromise = db.connect();
			expect(mongoose.createConnection).toHaveBeenCalledWith(
				expect.stringContaining("mongodb://"),
				expect.objectContaining({
					dbName: "testdb",
					serverApi: "1",
				}),
			);

			// Simulate connection opening
			setTimeout(() => {
				if (openCallback!) {
					openCallback();
				}
			}, 10);

			await connectPromise;
			expect(db.connected).toBe(true);
			expect(db.connection).toBe(mockConnection);
		});

		it("should handle connection errors", async () => {
			db = new MongoDatabase("mongodb://localhost:27017");
			const error = new Error("Connection failed");
			let errorCallback: (err: Error) => void;
			(mockConnection.once as ReturnType<typeof vi.fn>).mockImplementation(
				(event: string, callback: (err?: Error) => void) => {
					if (event === "error") {
						errorCallback = callback as (err: Error) => void;
					}
				},
			);

			const connectPromise = db.connect();
			setTimeout(() => {
				if (errorCallback!) {
					errorCallback(error);
				}
			}, 10);

			await expect(connectPromise).rejects.toThrow("Connection failed");
			expect(db.connected).toBe(false);
		});

		it("should set up disconnected event handler", async () => {
			db = new MongoDatabase("mongodb://localhost:27017");
			let openCallback: () => void;
			let disconnectedCallback: () => void;
			(mockConnection.once as ReturnType<typeof vi.fn>).mockImplementation(
				(event: string, callback: () => void) => {
					if (event === "open") {
						openCallback = callback;
					}
				},
			);
			(mockConnection.on as ReturnType<typeof vi.fn>).mockImplementation(
				(event: string, callback: () => void) => {
					if (event === "disconnected") {
						disconnectedCallback = callback;
					}
				},
			);

			const connectPromise = db.connect();
			setTimeout(() => {
				if (openCallback!) {
					openCallback();
				}
			}, 10);
			await connectPromise;

			if (disconnectedCallback!) {
				disconnectedCallback();
			}
			expect(db.connected).toBe(false);
		});

		it("should set up reconnected event handler", async () => {
			db = new MongoDatabase("mongodb://localhost:27017");
			let openCallback: () => void;
			let reconnectedCallback: () => void;
			(mockConnection.once as ReturnType<typeof vi.fn>).mockImplementation(
				(event: string, callback: () => void) => {
					if (event === "open") {
						openCallback = callback;
					}
				},
			);
			(mockConnection.on as ReturnType<typeof vi.fn>).mockImplementation(
				(event: string, callback: () => void) => {
					if (event === "reconnected") {
						reconnectedCallback = callback;
					}
				},
			);

			const connectPromise = db.connect();
			setTimeout(() => {
				if (openCallback!) {
					openCallback();
				}
			}, 10);
			await connectPromise;

			db.connected = false;
			if (reconnectedCallback!) {
				reconnectedCallback();
			}
			expect(db.connected).toBe(true);
		});

		it("should set up close event handler", async () => {
			db = new MongoDatabase("mongodb://localhost:27017");
			let openCallback: () => void;
			let closeCallback: () => void;
			(mockConnection.once as ReturnType<typeof vi.fn>).mockImplementation(
				(event: string, callback: () => void) => {
					if (event === "open") {
						openCallback = callback;
					}
				},
			);
			(mockConnection.on as ReturnType<typeof vi.fn>).mockImplementation(
				(event: string, callback: () => void) => {
					if (event === "close") {
						closeCallback = callback;
					}
				},
			);

			const connectPromise = db.connect();
			setTimeout(() => {
				if (openCallback!) {
					openCallback();
				}
			}, 10);
			await connectPromise;

			if (closeCallback!) {
				closeCallback();
			}
			expect(db.connected).toBe(false);
		});

		it("should set up fullsetup event handler", async () => {
			db = new MongoDatabase("mongodb://localhost:27017");
			let openCallback: () => void;
			let fullsetupCallback: () => void;
			(mockConnection.once as ReturnType<typeof vi.fn>).mockImplementation(
				(event: string, callback: () => void) => {
					if (event === "open") {
						openCallback = callback;
					}
				},
			);
			(mockConnection.on as ReturnType<typeof vi.fn>).mockImplementation(
				(event: string, callback: () => void) => {
					if (event === "fullsetup") {
						fullsetupCallback = callback;
					}
				},
			);

			const connectPromise = db.connect();
			setTimeout(() => {
				if (openCallback!) {
					openCallback();
				}
			}, 10);
			await connectPromise;

			if (fullsetupCallback!) {
				fullsetupCallback();
			}
			expect(db.connected).toBe(true);
		});
	});

	describe("close", () => {
		it("should close connection when it exists", async () => {
			db = new MongoDatabase("mongodb://localhost:27017");
			db.connection = mockConnection;
			await db.close();
			expect(mockConnection.close).toHaveBeenCalled();
		});

		it("should handle close when connection is undefined", async () => {
			db = new MongoDatabase("mongodb://localhost:27017");
			await expect(db.close()).resolves.not.toThrow();
		});
	});

	describe("url getter", () => {
		it("should return the internal URL", () => {
			const url = "mongodb://localhost:27017/test";
			db = new MongoDatabase(url);
			expect(db.url).toBe(`${url}/`);
		});
	});
});
