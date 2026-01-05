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
import type { ClientRecord } from "@prosopo/types-database";
import type { Connection, Model } from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientDatabase } from "./client.js";

vi.mock("../base/mongo.js", async () => {
	const actual =
		await vi.importActual<typeof import("../base/mongo.js")>(
			"../base/mongo.js",
		);
	return {
		...actual,
		MongoDatabase: class extends actual.MongoDatabase {
			connected = false;
			connection = undefined as Connection | undefined;
			private _preserveTables = false;
			setPreserveTables(value: boolean) {
				this._preserveTables = value;
			}
			override async connect(): Promise<void> {
				this.connected = true;
				if (!this._preserveTables) {
					this.connection = {
						model: vi.fn().mockReturnValue({
							find: vi.fn().mockReturnValue({
								lean: vi.fn(),
							}),
						}),
					} as unknown as Connection;
				}
			}
			override async close(): Promise<void> {
				this.connected = false;
			}
		},
	};
});

describe("ClientDatabase", () => {
	let db: ClientDatabase;
	const mockModel = {
		find: vi.fn().mockReturnValue({
			lean: vi.fn(),
		}),
	} as unknown as Model<unknown>;

	beforeEach(() => {
		vi.clearAllMocks();
		db = new ClientDatabase("mongodb://127.0.0.1:27017", "testdb");
	});

	afterEach(async () => {
		if (db.connected) {
			await db.close();
		}
	});

	describe("constructor", () => {
		it("should create instance with empty tables", () => {
			expect(db.tables).toEqual({});
		});

		it("should pass parameters to parent class", () => {
			const instance = new ClientDatabase(
				"mongodb://127.0.0.1:27017",
				"mydb",
				"admin",
			);
			expect(instance.dbname).toBe("mydb");
		});
	});

	describe("connect", () => {
		it("should call super.connect() and initialize tables", async () => {
			await db.connect();
			expect(db.connected).toBe(true);
			expect(db.connection).toBeDefined();
		});

		it("should create model for accounts table", async () => {
			await db.connect();
			expect(db.connection?.model).toHaveBeenCalledTimes(1);
		});
	});

	describe("getTables", () => {
		it("should return tables when they exist", () => {
			db.tables = { accounts: mockModel } as typeof db.tables;
			expect(db.getTables()).toBe(db.tables);
		});

		it("should throw error when tables are undefined", () => {
			// @ts-expect-error - testing error case
			db.tables = undefined;
			expect(() => db.getTables()).toThrow(ProsopoDBError);
		});
	});

	describe("getUpdatedClients", () => {
		it("should return client records updated after timestamp", async () => {
			const timestamp = 1000;
			const mockRecords = [
				{
					sites: {
						siteKey: "site1",
						settings: { setting1: "value1" },
						updatedAt: 2000,
					},
					tier: "tier1",
				},
			];
			const mockLean = vi.fn().mockResolvedValue(mockRecords);
			const mockFind = vi.fn().mockReturnValue({
				lean: mockLean,
			});
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				accounts: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			const result = await db.getUpdatedClients(timestamp);
			expect(result).toHaveLength(1);
			expect(result[0].account).toBe("site1");
			expect(result[0].settings).toEqual({ setting1: "value1" });
			expect(result[0].tier).toBe("tier1");
		});

		it("should filter by updatedAt timestamp", async () => {
			const timestamp = 1000;
			const mockLean = vi.fn().mockResolvedValue([]);
			const mockFind = vi.fn().mockReturnValue({
				lean: mockLean,
			});
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				accounts: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			await db.getUpdatedClients(timestamp);
			const filter = mockFind.mock.calls[0][0];
			expect(filter.$or).toBeDefined();
			expect(filter.$or[0]["sites.updatedAt"]).toEqual({ $gt: timestamp });
		});

		it("should include records with missing updatedAt", async () => {
			const timestamp = 1000;
			const mockLean = vi.fn().mockResolvedValue([]);
			const mockFind = vi.fn().mockReturnValue({
				lean: mockLean,
			});
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				accounts: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			await db.getUpdatedClients(timestamp);
			const filter = mockFind.mock.calls[0][0];
			expect(filter.$or[1]["sites.updatedAt"]).toEqual({ $exists: false });
		});

		it("should filter by active user status", async () => {
			const timestamp = 1000;
			const mockLean = vi.fn().mockResolvedValue([]);
			const mockFind = vi.fn().mockReturnValue({
				lean: mockLean,
			});
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				accounts: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			await db.getUpdatedClients(timestamp);
			const filter = mockFind.mock.calls[0][0];
			expect(filter["users.status"]).toBe("active");
		});

		it("should project only required fields", async () => {
			const timestamp = 1000;
			const mockLean = vi.fn().mockResolvedValue([]);
			const mockFind = vi.fn().mockReturnValue({
				lean: mockLean,
			});
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				accounts: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			await db.getUpdatedClients(timestamp);
			const projection = mockFind.mock.calls[0][1];
			expect(projection["sites.siteKey"]).toBe(1);
			expect(projection["sites.settings"]).toBe(1);
			expect(projection["sites.tier"]).toBe(1);
		});

		it("should return empty array when no records found", async () => {
			const mockLean = vi.fn().mockResolvedValue([]);
			const mockFind = vi.fn().mockReturnValue({
				lean: mockLean,
			});
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				accounts: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			const result = await db.getUpdatedClients(1000);
			expect(result).toEqual([]);
		});

		it("should close connection after query", async () => {
			const mockClose = vi.fn();
			db.close = mockClose;
			const mockLean = vi.fn().mockResolvedValue([]);
			const mockFind = vi.fn().mockReturnValue({
				lean: mockLean,
			});
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				accounts: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			await db.getUpdatedClients(1000);
			expect(mockClose).toHaveBeenCalled();
		});

		it("should transform records correctly", async () => {
			const mockRecords = [
				{
					sites: {
						siteKey: "site1",
						settings: { setting1: "value1" },
						updatedAt: 2000,
					},
					tier: "tier1",
				},
				{
					sites: {
						siteKey: "site2",
						settings: { setting2: "value2" },
						updatedAt: 3000,
					},
					tier: "tier2",
				},
			];
			const mockLean = vi.fn().mockResolvedValue(mockRecords);
			const mockFind = vi.fn().mockReturnValue({
				lean: mockLean,
			});
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				accounts: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			const result = await db.getUpdatedClients(1000);
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				account: "site1",
				settings: { setting1: "value1" },
				tier: "tier1",
			} as ClientRecord);
			expect(result[1]).toEqual({
				account: "site2",
				settings: { setting2: "value2" },
				tier: "tier2",
			} as ClientRecord);
		});
	});
});
