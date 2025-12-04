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

import { ApiEndpointResponseStatus } from "@prosopo/api-route";
import { LogLevel, getLogger } from "@prosopo/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { InsertRulesEndpoint } from "#policy/api/write/insertRules.js";
import { AccessPolicyType } from "#policy/rule.js";
import type { AccessRulesWriter } from "#policy/rulesStorage.js";
import { loggerMockedInstance } from "../../testLogger.js";

describe("InsertRulesEndpoint", () => {
	const mockLogger = loggerMockedInstance;
	let mockWriter: AccessRulesWriter;

	beforeEach(() => {
		mockWriter = {
			insertRules: vi.fn().mockResolvedValue(["id1", "id2"]),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};
	});

	it("should return success when rules are inserted", async () => {
		const endpoint = new InsertRulesEndpoint(mockWriter, mockLogger);
		const response = await endpoint.processRequest([
			{
				accessPolicy: {
					type: AccessPolicyType.Block,
				},
				userScopes: [
					{
						numericIp: BigInt(100),
					},
				],
			},
		]);

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(mockWriter.insertRules).toHaveBeenCalled();
	});

	it("should create rules for multiple user scopes", async () => {
		const endpoint = new InsertRulesEndpoint(mockWriter, mockLogger);
		await endpoint.processRequest([
			{
				accessPolicy: {
					type: AccessPolicyType.Block,
				},
				userScopes: [
					{
						numericIp: BigInt(100),
					},
					{
						numericIp: BigInt(200),
					},
				],
			},
		]);

		expect(mockWriter.insertRules).toHaveBeenCalled();
		const callArgs = mockWriter.insertRules as ReturnType<typeof vi.fn>;
		const insertedRules = callArgs.mock.calls[0][0];
		expect(insertedRules).toHaveLength(2);
	});

	it("should create rules for multiple policy scopes", async () => {
		const endpoint = new InsertRulesEndpoint(mockWriter, mockLogger);
		await endpoint.processRequest([
			{
				accessPolicy: {
					type: AccessPolicyType.Block,
				},
				policyScopes: [
					{ clientId: "client1" },
					{ clientId: "client2" },
				],
				userScopes: [
					{
						numericIp: BigInt(100),
					},
				],
			},
		]);

		expect(mockWriter.insertRules).toHaveBeenCalled();
		const callArgs = mockWriter.insertRules as ReturnType<typeof vi.fn>;
		const insertedRules = callArgs.mock.calls[0][0];
		expect(insertedRules).toHaveLength(2);
		expect(insertedRules[0].rule.clientId).toBe("client1");
		expect(insertedRules[1].rule.clientId).toBe("client2");
	});

	it("should handle groupId correctly", async () => {
		const endpoint = new InsertRulesEndpoint(mockWriter, mockLogger);
		await endpoint.processRequest([
			{
				accessPolicy: {
					type: AccessPolicyType.Block,
				},
				groupId: "group1",
				userScopes: [
					{
						numericIp: BigInt(100),
					},
				],
			},
		]);

		expect(mockWriter.insertRules).toHaveBeenCalled();
		const callArgs = mockWriter.insertRules as ReturnType<typeof vi.fn>;
		const insertedRules = callArgs.mock.calls[0][0];
		expect(insertedRules[0].rule.groupId).toBe("group1");
	});

	it("should handle expiration timestamp", async () => {
		const expirationTimestamp = Date.now() + 3600000;
		const endpoint = new InsertRulesEndpoint(mockWriter, mockLogger);
		await endpoint.processRequest([
			{
				accessPolicy: {
					type: AccessPolicyType.Block,
				},
				userScopes: [
					{
						numericIp: BigInt(100),
					},
				],
				expiresUnixTimestamp: expirationTimestamp,
			},
		]);

		expect(mockWriter.insertRules).toHaveBeenCalled();
		const callArgs = mockWriter.insertRules as ReturnType<typeof vi.fn>;
		const insertedRules = callArgs.mock.calls[0][0];
		expect(insertedRules[0].expiresUnixTimestamp).toBe(expirationTimestamp);
	});

	it("should return processing status after timeout", async () => {
		vi.useFakeTimers();
		const endpoint = new InsertRulesEndpoint(mockWriter, mockLogger);
		const promise = endpoint.processRequest([
			{
				accessPolicy: {
					type: AccessPolicyType.Block,
				},
				userScopes: [
					{
						numericIp: BigInt(100),
					},
				],
			},
		]);

		vi.advanceTimersByTime(5000);

		const response = await promise;
		expect(response.status).toBe(ApiEndpointResponseStatus.PROCESSING);

		vi.useRealTimers();
	});

	it("should return fail status on error", async () => {
		const errorWriter: AccessRulesWriter = {
			insertRules: vi.fn().mockRejectedValue(new Error("Insert failed")),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};

		const logger = getLogger(LogLevel.enum.debug, "test");
		const endpoint = new InsertRulesEndpoint(errorWriter, logger);
		const response = await endpoint.processRequest([
			{
				accessPolicy: {
					type: AccessPolicyType.Block,
				},
				userScopes: [
					{
						numericIp: BigInt(100),
					},
				],
			},
		]);

		expect(response.status).toBe(ApiEndpointResponseStatus.FAIL);
	});

	it("should validate request schema correctly", () => {
		const endpoint = new InsertRulesEndpoint(mockWriter, mockLogger);
		const schema = endpoint.getRequestArgsSchema();

		expect(
			schema.parse([
				{
					accessPolicy: {
						type: AccessPolicyType.Block,
					},
					userScopes: [
						{
							numericIp: BigInt(100),
						},
					],
				},
			]),
		).toBeDefined();

		expect(() =>
			schema.parse([
				{
					accessPolicy: {
						type: "invalid",
					},
					userScopes: [],
				},
			]),
		).toThrow();
	});

	it("should log information when inserting rules", async () => {
		const logger = getLogger(LogLevel.enum.info, "test");
		const infoSpy = vi.spyOn(logger, "info");
		const debugSpy = vi.spyOn(logger, "debug");

		const endpoint = new InsertRulesEndpoint(mockWriter, logger);
		await endpoint.processRequest([
			{
				accessPolicy: {
					type: AccessPolicyType.Block,
				},
				userScopes: [
					{
						numericIp: BigInt(100),
					},
				],
			},
		]);

		// Wait for async operations
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(infoSpy).toHaveBeenCalled();
		expect(debugSpy).toHaveBeenCalled();
	});
});

