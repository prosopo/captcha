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
import type { Connection, Model } from "mongoose";
import { ProsopoDBError } from "@prosopo/common";
import { ClientDatabase } from "./client.js";
import { MongoDatabase } from "../base/mongo.js";
import type { ClientRecord } from "@prosopo/types-database";
import type { Timestamp } from "@prosopo/types";

vi.mock("../base/mongo.js", () => {
	return {
		MongoDatabase: vi.fn().mockImplementation(() => ({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			url: "mongodb://localhost:27017",
			dbname: "testdb",
			logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
			connected: false,
			connection: undefined,
		})),
	};
});

describe("ClientDatabase", () => {
	let db: ClientDatabase;
	let mockConnection: Connection;
	let mockAccountModel: Model<any>;
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	} as any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockAccountModel = {
			find: vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue([]),
			}),
		} as any;

		mockConnection = {
			model: vi.fn((modelName: string) => {
				if (modelName === "Account") return mockAccountModel;
				return null;
			}),
		} as any;

		(MongoDatabase as any).mockImplementation(() => ({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			url: "mongodb://localhost:27017",
			dbname: "testdb",
			logger: mockLogger,
			connected: true,
			connection: mockConnection,
		}));

		db = new ClientDatabase("mongodb://localhost:27017", "testdb", undefined, mockLogger);
	});

	afterEach(async () => {
		if (db) {
			await db.close().catch(() => {
				// Ignore errors during cleanup
			});
		}
	});

	describe("constructor", () => {
		it("should initialize with empty tables object", () => {
			expect(db.tables).toEqual({});
		});

		it("should call super constructor with correct parameters", () => {
			const url = "mongodb://localhost:27017";
			const dbname = "testdb";
			const authSource = "admin";
			const logger = mockLogger;
			new ClientDatabase(url, dbname, authSource, logger);
			expect(MongoDatabase).toHaveBeenCalledWith(url, dbname, authSource, logger);
		});
	});

	describe("connect", () => {
		it("should call super connect and load tables", async () => {
			await db.connect();
			expect(MongoDatabase.prototype.connect).toHaveBeenCalled();
			expect(mockConnection.model).toHaveBeenCalledWith("Account", expect.anything());
			expect(db.tables.accounts).toBe(mockAccountModel);
		});

		it("should not load tables if connection is undefined", async () => {
			(MongoDatabase as any).mockImplementationOnce(() => ({
				connect: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockResolvedValue(undefined),
				url: "mongodb://localhost:27017",
				dbname: "testdb",
				logger: mockLogger,
				connected: true,
				connection: undefined,
			}));
			const testDb = new ClientDatabase(
				"mongodb://localhost:27017",
				"testdb",
				undefined,
				mockLogger,
			);
			await testDb.connect();
			expect(testDb.tables).toEqual({});
		});
	});

	describe("getTables", () => {
		it("should return tables when they exist", () => {
			db.tables = {
				accounts: mockAccountModel,
			} as any;
			expect(db.getTables()).toBe(db.tables);
		});

		it("should throw ProsopoDBError when tables are undefined", () => {
			db.tables = undefined as any;
			expect(() => db.getTables()).toThrow(ProsopoDBError);
		});
	});

	describe("getUpdatedClients", () => {
		it("should return updated client records", async () => {
			const timestamp: Timestamp = 1000;
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

			mockAccountModel.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(mockRecords),
			});

			const result = await db.getUpdatedClients(timestamp);

			expect(result).toEqual([
				{
					account: "site1",
					settings: { setting1: "value1" },
					tier: "tier1",
				},
			]);
			expect(mockAccountModel.find).toHaveBeenCalledWith(
				{
					$or: [
						{ "sites.updatedAt": { $gt: timestamp } },
						{ "sites.updatedAt": { $exists: false } },
					],
					"users.status": "active",
				},
				{ "sites.siteKey": 1, "sites.settings": 1, "sites.tier": 1 },
			);
		});

		it("should return empty array when no records found", async () => {
			const timestamp: Timestamp = 1000;
			mockAccountModel.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue([]),
			});

			const result = await db.getUpdatedClients(timestamp);

			expect(result).toEqual([]);
		});

		it("should handle records with missing updatedAt", async () => {
			const timestamp: Timestamp = 1000;
			const mockRecords = [
				{
					sites: {
						siteKey: "site1",
						settings: { setting1: "value1" },
					},
					tier: "tier1",
				},
			];

			mockAccountModel.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(mockRecords),
			});

			const result = await db.getUpdatedClients(timestamp);

			expect(result).toEqual([
				{
					account: "site1",
					settings: { setting1: "value1" },
					tier: "tier1",
				},
			]);
		});

		it("should close connection after query", async () => {
			const timestamp: Timestamp = 1000;
			mockAccountModel.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue([]),
			});

			await db.getUpdatedClients(timestamp);

			expect(MongoDatabase.prototype.close).toHaveBeenCalled();
		});
	});
});
