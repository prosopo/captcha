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

import type { RedisConnection } from "@prosopo/redis-client";
import type { RedisClientType } from "redis";
import { describe, expect, it, vi } from "vitest";
import { createRedisAccessRulesStorage } from "#policy/redis/redisRulesStorage.js";
import { loggerMockedInstance } from "../testLogger.js";

describe("createRedisAccessRulesStorage", () => {
	it("should create storage with dummy reader and writer initially", () => {
		const mockConnection = {
			getClient: vi.fn().mockReturnValue(new Promise(() => {})),
		} as unknown as RedisConnection;

		const storage = createRedisAccessRulesStorage(
			mockConnection,
			loggerMockedInstance,
		);

		expect(storage).toBeDefined();
		expect(storage.fetchRules).toBeTypeOf("function");
		expect(storage.getMissingRuleIds).toBeTypeOf("function");
		expect(storage.findRules).toBeTypeOf("function");
		expect(storage.findRuleIds).toBeTypeOf("function");
		expect(storage.fetchAllRuleIds).toBeTypeOf("function");
		expect(storage.insertRules).toBeTypeOf("function");
		expect(storage.deleteRules).toBeTypeOf("function");
		expect(storage.deleteAllRules).toBeTypeOf("function");
	});

	it("should replace dummy implementations when Redis client becomes available", async () => {
		const mockClient = {
			multi: vi.fn().mockReturnValue({
				exists: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			}),
			ft: {
				search: vi.fn(),
				aggregate: vi.fn(),
				aggregateWithCursor: vi.fn(),
			},
		} as unknown as RedisClientType;

		const clientPromise = Promise.resolve(mockClient);
		const mockConnection = {
			getClient: vi.fn().mockReturnValue(clientPromise),
		} as unknown as RedisConnection;

		const storage = createRedisAccessRulesStorage(
			mockConnection,
			loggerMockedInstance,
		);

		// Wait for the client to be ready
		await clientPromise;
		// Give time for the promise handler to execute
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Storage should still be usable
		expect(storage.fetchRules).toBeTypeOf("function");
		expect(storage.insertRules).toBeTypeOf("function");
	});

	it("should have reader methods bound correctly", () => {
		const mockConnection = {
			getClient: vi.fn().mockReturnValue(new Promise(() => {})),
		} as unknown as RedisConnection;

		const storage = createRedisAccessRulesStorage(
			mockConnection,
			loggerMockedInstance,
		);

		// All reader methods should be defined
		expect(storage.fetchRules).toBeDefined();
		expect(storage.getMissingRuleIds).toBeDefined();
		expect(storage.findRules).toBeDefined();
		expect(storage.findRuleIds).toBeDefined();
		expect(storage.fetchAllRuleIds).toBeDefined();
	});

	it("should have writer methods bound correctly", () => {
		const mockConnection = {
			getClient: vi.fn().mockReturnValue(new Promise(() => {})),
		} as unknown as RedisConnection;

		const storage = createRedisAccessRulesStorage(
			mockConnection,
			loggerMockedInstance,
		);

		// All writer methods should be defined
		expect(storage.insertRules).toBeDefined();
		expect(storage.deleteRules).toBeDefined();
		expect(storage.deleteAllRules).toBeDefined();
	});

	it("should request Redis client when created", () => {
		const getClientMock = vi.fn().mockReturnValue(new Promise(() => {}));
		const mockConnection = {
			getClient: getClientMock,
		} as unknown as RedisConnection;

		createRedisAccessRulesStorage(mockConnection, loggerMockedInstance);

		expect(getClientMock).toHaveBeenCalled();
	});

	it("should log when Redis client becomes ready", async () => {
		const mockClient = {
			multi: vi.fn(),
			ft: {
				search: vi.fn(),
			},
		} as unknown as RedisClientType;

		const clientPromise = Promise.resolve(mockClient);
		const mockConnection = {
			getClient: vi.fn().mockReturnValue(clientPromise),
		} as unknown as RedisConnection;

		const infoSpy = vi.spyOn(loggerMockedInstance, "info");

		createRedisAccessRulesStorage(mockConnection, loggerMockedInstance);

		// Wait for the client to be ready
		await clientPromise;
		// Give time for the promise handler to execute
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(infoSpy).toHaveBeenCalled();
	});
});
