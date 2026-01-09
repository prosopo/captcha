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

import { LogLevel, getLogger } from "@prosopo/common";
import { ApiEndpointResponseStatus } from "@prosopo/api-route";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AccessRulesWriter } from "#policy/rulesStorage.js";
import { InsertRulesEndpoint } from "#policy/api/write/insertRules.js";
import { AccessPolicyType } from "#policy/rule.js";

describe("InsertRulesEndpoint", () => {
    let mockAccessRulesWriter: AccessRulesWriter;
    let mockLogger: ReturnType<typeof getLogger>;
    let endpoint: InsertRulesEndpoint;

    beforeEach(() => {
        mockAccessRulesWriter = {
            insertRules: vi.fn(),
            deleteRules: vi.fn(),
            deleteAllRules: vi.fn(),
            fetchRules: vi.fn(),
            findRules: vi.fn(),
            findRuleIds: vi.fn(),
            fetchAllRuleIds: vi.fn(),
            getMissingRuleIds: vi.fn(),
        };

        mockLogger = {
            info: vi.fn(),
            debug: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            getLogLevel: vi.fn().mockReturnValue(LogLevel.enum.info),
        } as any;

        endpoint = new InsertRulesEndpoint(mockAccessRulesWriter, mockLogger);
    });

    describe("getRequestArgsSchema", () => {
        it("should return a valid Zod schema for insert rules groups", () => {
            // Test that the schema is returned
            const schema = endpoint.getRequestArgsSchema();
            expect(schema).toBeDefined();
            expect(typeof schema.parse).toBe("function");
        });

        it("should validate correct insert rules group structure", () => {
            const schema = endpoint.getRequestArgsSchema();

            const validInput = [
                {
                    accessPolicy: {
                        type: AccessPolicyType.Block,
                    },
                    userScopes: [
                        {
                            userId: "user1",
                        },
                    ],
                },
            ];

            expect(() => schema.parse(validInput)).not.toThrow();
        });

        it("should reject invalid insert rules group structure", () => {
            const schema = endpoint.getRequestArgsSchema();

            const invalidInput = [
                {
                    // Missing required accessPolicy
                    userScopes: [],
                },
            ];

            expect(() => schema.parse(invalidInput)).toThrow();
        });
    });

    describe("processRequest", () => {
        it("should successfully process valid rule groups and return success status", async () => {
            const mockInsertedIds = ["rule1", "rule2", "rule3"];
            mockAccessRulesWriter.insertRules.mockResolvedValue(mockInsertedIds);

            const input: any[] = [
                {
                    accessPolicy: {
                        type: AccessPolicyType.Block,
                    },
                    userScopes: [
                        { userId: "user1" },
                        { userId: "user2" },
                    ],
                    policyScopes: [{ clientId: "client1" }],
                },
            ];

            const result = await endpoint.processRequest(input);

            expect(result).toEqual({
                status: ApiEndpointResponseStatus.SUCCESS,
            });

            expect(mockAccessRulesWriter.insertRules).toHaveBeenCalledWith([
                {
                    rule: {
                        type: AccessPolicyType.Block,
                        userId: "user1",
                        clientId: "client1",
                    },
                    expiresUnixTimestamp: undefined,
                },
                {
                    rule: {
                        type: AccessPolicyType.Block,
                        userId: "user2",
                        clientId: "client1",
                    },
                    expiresUnixTimestamp: undefined,
                },
            ]);

            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.any(Function), // Logger uses function for lazy evaluation
            );
        });

        it("should handle multiple policy scopes correctly", async () => {
            const mockInsertedIds = ["rule1", "rule2"];
            mockAccessRulesWriter.insertRules.mockResolvedValue(mockInsertedIds);

            const input: any[] = [
                {
                    accessPolicy: {
                        type: AccessPolicyType.Restrict,
                    },
                    userScopes: [{ userId: "user1" }],
                    policyScopes: [
                        { clientId: "client1" },
                        { clientId: "client2" },
                    ],
                },
            ];

            await endpoint.processRequest(input);

            expect(mockAccessRulesWriter.insertRules).toHaveBeenCalledWith([
                {
                    rule: {
                        type: AccessPolicyType.Restrict,
                        userId: "user1",
                        clientId: "client1",
                    },
                    expiresUnixTimestamp: undefined,
                },
                {
                    rule: {
                        type: AccessPolicyType.Restrict,
                        userId: "user1",
                        clientId: "client2",
                    },
                    expiresUnixTimestamp: undefined,
                },
            ]);
        });

        it("should handle rules without policy scopes", async () => {
            const mockInsertedIds = ["rule1"];
            mockAccessRulesWriter.insertRules.mockResolvedValue(mockInsertedIds);

            const input: any[] = [
                {
                    accessPolicy: {
                        type: AccessPolicyType.Block,
                    },
                    userScopes: [{ userId: "user1" }],
                    // No policyScopes
                },
            ];

            await endpoint.processRequest(input);

            expect(mockAccessRulesWriter.insertRules).toHaveBeenCalledWith([
                {
                    rule: {
                        type: AccessPolicyType.Block,
                        userId: "user1",
                    },
                    expiresUnixTimestamp: undefined,
                },
            ]);
        });

        it("should include groupId and expiresUnixTimestamp when provided", async () => {
            const mockInsertedIds = ["rule1"];
            mockAccessRulesWriter.insertRules.mockResolvedValue(mockInsertedIds);

            const input: any[] = [
                {
                    accessPolicy: {
                        type: AccessPolicyType.Block,
                    },
                    userScopes: [{ userId: "user1" }],
                    groupId: "group123",
                    expiresUnixTimestamp: 1234567890,
                },
            ];

            await endpoint.processRequest(input);

            expect(mockAccessRulesWriter.insertRules).toHaveBeenCalledWith([
                {
                    rule: {
                        type: AccessPolicyType.Block,
                        userId: "user1",
                        groupId: "group123",
                    },
                    expiresUnixTimestamp: 1234567890,
                },
            ]);
        });

        it("should return fail status when insertRules throws an error", async () => {
            mockAccessRulesWriter.insertRules.mockRejectedValue(new Error("Database error"));

            const input: any[] = [
                {
                    accessPolicy: {
                        type: AccessPolicyType.Block,
                    },
                    userScopes: [{ userId: "user1" }],
                },
            ];

            const result = await endpoint.processRequest(input);

            expect(result).toEqual({
                status: ApiEndpointResponseStatus.FAIL,
            });

            // Error logging only happens at debug level
            expect(mockLogger.error).not.toHaveBeenCalled();
        });

        it("should return processing status when request takes longer than 5 seconds", async () => {
            // Mock a slow insertRules operation
            mockAccessRulesWriter.insertRules.mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve(["rule1"]), 6000))
            );

            const input: any[] = [
                {
                    accessPolicy: {
                        type: AccessPolicyType.Block,
                    },
                    userScopes: [{ userId: "user1" }],
                },
            ];

            const result = await endpoint.processRequest(input);

            expect(result).toEqual({
                status: ApiEndpointResponseStatus.PROCESSING,
            });
        }, 10000); // Increase timeout for this test

        it("should log detailed error information when log level is debug", async () => {
            mockLogger.getLogLevel.mockReturnValue(LogLevel.enum.debug);
            mockAccessRulesWriter.insertRules.mockRejectedValue(new Error("Database error"));

            const input: any[] = [
                {
                    accessPolicy: {
                        type: AccessPolicyType.Block,
                    },
                    userScopes: [{ userId: "user1" }],
                },
            ];

            await endpoint.processRequest(input);

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.any(Function), // Should include error details
            );
        });
    });

    describe("createRuleGroups", () => {
        it("should process multiple rule groups and flatten results", async () => {
            mockAccessRulesWriter.insertRules
                .mockResolvedValueOnce(["group1-rule1", "group1-rule2"])
                .mockResolvedValueOnce(["group2-rule1"]);

            const groups: any[] = [
                {
                    accessPolicy: { type: AccessPolicyType.Block },
                    userScopes: [{ userId: "user1" }],
                },
                {
                    accessPolicy: { type: AccessPolicyType.Restrict },
                    userScopes: [{ userId: "user2" }],
                },
            ];

            const result = await (endpoint as any).createRuleGroups(groups);

            expect(result).toEqual(["group1-rule1", "group1-rule2", "group2-rule1"]);
            expect(mockAccessRulesWriter.insertRules).toHaveBeenCalledTimes(2);
        });
    });

    describe("createRulesGroup", () => {
        it("should create rules for single group with multiple user scopes and policy scopes", async () => {
            mockAccessRulesWriter.insertRules.mockResolvedValue(["rule1", "rule2"]);

            const group: any = {
                accessPolicy: {
                    type: AccessPolicyType.Block,
                    description: "Block rule",
                },
                userScopes: [
                    { userId: "user1", userAgentHash: "hash1" },
                    { userId: "user2", userAgentHash: "hash2" },
                ],
                policyScopes: [
                    { clientId: "client1" },
                    { clientId: "client2" },
                ],
                groupId: "group123",
                expiresUnixTimestamp: 1234567890,
            };

            const result = await (endpoint as any).createRulesGroup(group);

            expect(result).toEqual(["rule1", "rule2"]);

            expect(mockAccessRulesWriter.insertRules).toHaveBeenCalledWith([
                {
                    rule: {
                        type: AccessPolicyType.Block,
                        description: "Block rule", // description is kept for Block policies
                        userId: "user1",
                        userAgentHash: "hash1",
                        clientId: "client1",
                        groupId: "group123",
                    },
                    expiresUnixTimestamp: 1234567890,
                },
                {
                    rule: {
                        type: AccessPolicyType.Block,
                        description: "Block rule",
                        userId: "user1",
                        userAgentHash: "hash1",
                        clientId: "client2",
                        groupId: "group123",
                    },
                    expiresUnixTimestamp: 1234567890,
                },
                {
                    rule: {
                        type: AccessPolicyType.Block,
                        description: "Block rule",
                        userId: "user2",
                        userAgentHash: "hash2",
                        clientId: "client1",
                        groupId: "group123",
                    },
                    expiresUnixTimestamp: 1234567890,
                },
                {
                    rule: {
                        type: AccessPolicyType.Block,
                        description: "Block rule",
                        userId: "user2",
                        userAgentHash: "hash2",
                        clientId: "client2",
                        groupId: "group123",
                    },
                    expiresUnixTimestamp: 1234567890,
                },
            ]);
        });

        it("should handle group with no policy scopes", async () => {
            mockAccessRulesWriter.insertRules.mockResolvedValue(["rule1"]);

            const group: any = {
                accessPolicy: { type: AccessPolicyType.Restrict },
                userScopes: [{ userId: "user1" }],
                // No policyScopes
            };

            const result = await (endpoint as any).createRulesGroup(group);

            expect(mockAccessRulesWriter.insertRules).toHaveBeenCalledWith([
                {
                    rule: {
                        type: AccessPolicyType.Restrict,
                        userId: "user1",
                    },
                    expiresUnixTimestamp: undefined,
                },
            ]);
        });
    });
});