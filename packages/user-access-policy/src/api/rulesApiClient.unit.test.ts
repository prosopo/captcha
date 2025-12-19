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
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accessRuleApiPaths } from "#policy/api/ruleApiRoutes.js";
import { AccessRulesApiClient } from "#policy/api/rulesApiClient.js";
import { AccessPolicyType } from "#policy/rule.js";

describe("AccessRulesApiClient", () => {
	let client: AccessRulesApiClient;
	const mockAccount = "test-account";
	const mockApiUrl = "https://api.test.com";
	const mockTimestamp = "1234567890";
	const mockSignature = "test-signature";

	beforeEach(() => {
		// ApiClient constructor takes baseUrl first, then account
		client = new AccessRulesApiClient(mockApiUrl, mockAccount);
	});

	describe("deleteMany", () => {
		it("should call post with correct path and auth headers", async () => {
			const postSpy = vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
			});

			const filters = [{ policyScope: { clientId: "client1" } }];
			await client.deleteMany(filters, mockTimestamp, mockSignature);

			expect(postSpy).toHaveBeenCalledWith(
				accessRuleApiPaths.DELETE_MANY,
				filters,
				{
					headers: {
						"Prosopo-Site-Key": mockAccount,
						timestamp: mockTimestamp,
						signature: mockSignature,
					},
				},
			);
		});

		it("should return response from post", async () => {
			const mockResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
			};
			vi.spyOn(client, "post").mockResolvedValue(mockResponse);

			const result = await client.deleteMany([], mockTimestamp, mockSignature);

			expect(result).toEqual(mockResponse);
		});
	});

	describe("deleteGroups", () => {
		it("should call post with correct path and auth headers", async () => {
			const postSpy = vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
			});

			const siteGroups = [{ clientIds: ["client1"], groupId: "group1" }];
			await client.deleteGroups(siteGroups, mockTimestamp, mockSignature);

			expect(postSpy).toHaveBeenCalledWith(
				accessRuleApiPaths.DELETE_GROUPS,
				siteGroups,
				{
					headers: {
						"Prosopo-Site-Key": mockAccount,
						timestamp: mockTimestamp,
						signature: mockSignature,
					},
				},
			);
		});

		it("should return response from post", async () => {
			const mockResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
			};
			vi.spyOn(client, "post").mockResolvedValue(mockResponse);

			const result = await client.deleteGroups(
				[],
				mockTimestamp,
				mockSignature,
			);

			expect(result).toEqual(mockResponse);
		});
	});

	describe("deleteAll", () => {
		it("should call post with correct path and auth headers", async () => {
			const postSpy = vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
			});

			await client.deleteAll(mockTimestamp, mockSignature);

			expect(postSpy).toHaveBeenCalledWith(
				accessRuleApiPaths.DELETE_ALL,
				{},
				{
					headers: {
						"Prosopo-Site-Key": mockAccount,
						timestamp: mockTimestamp,
						signature: mockSignature,
					},
				},
			);
		});

		it("should send empty body", async () => {
			const postSpy = vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
			});

			await client.deleteAll(mockTimestamp, mockSignature);

			expect(postSpy).toHaveBeenCalledWith(
				expect.any(String),
				{},
				expect.any(Object),
			);
		});
	});

	describe("getMissingIds", () => {
		it("should call post and parse response data", async () => {
			const mockMissingIds = ["id1", "id2"];
			const postSpy = vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { ids: mockMissingIds },
			});

			const idsToCheck = { ids: ["id1", "id2", "id3"] };
			const result = await client.getMissingIds(
				idsToCheck,
				mockTimestamp,
				mockSignature,
			);

			expect(postSpy).toHaveBeenCalledWith(
				accessRuleApiPaths.GET_MISSING_IDS,
				idsToCheck,
				expect.any(Object),
			);
			expect(result.data?.ids).toEqual(mockMissingIds);
		});

		it("should handle invalid response data gracefully", async () => {
			vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { invalidField: "invalid" },
			});

			const result = await client.getMissingIds(
				{ ids: ["id1"] },
				mockTimestamp,
				mockSignature,
			);

			expect(result.data).toBeUndefined();
		});
	});

	describe("fetchMany", () => {
		it("should call post and parse response data", async () => {
			const mockRuleEntries = [
				{
					rule: {
						type: AccessPolicyType.Block,
						clientId: "client1",
					},
				},
			];
			const postSpy = vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { ruleEntries: mockRuleEntries },
			});

			const fetchOptions = { ids: ["id1"] };
			const result = await client.fetchMany(
				fetchOptions,
				mockTimestamp,
				mockSignature,
			);

			expect(postSpy).toHaveBeenCalledWith(
				accessRuleApiPaths.FETCH_MANY,
				fetchOptions,
				expect.any(Object),
			);
			expect(result.data?.ruleEntries).toEqual(mockRuleEntries);
		});

		it("should handle invalid response data gracefully", async () => {
			vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { invalidField: "invalid" },
			});

			const result = await client.fetchMany(
				{ ids: ["id1"] },
				mockTimestamp,
				mockSignature,
			);

			expect(result.data).toBeUndefined();
		});
	});

	describe("findIds", () => {
		it("should call post and parse response data", async () => {
			const mockRuleIds = ["id1", "id2"];
			const postSpy = vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { ruleIds: mockRuleIds },
			});

			const filters = [{ policyScope: { clientId: "client1" } }];
			const result = await client.findIds(
				filters,
				mockTimestamp,
				mockSignature,
			);

			expect(postSpy).toHaveBeenCalledWith(
				accessRuleApiPaths.FIND_IDS,
				filters,
				expect.any(Object),
			);
			expect(result.data?.ruleIds).toEqual(mockRuleIds);
		});

		it("should handle invalid response data gracefully", async () => {
			vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: { invalidField: "invalid" },
			});

			const result = await client.findIds([], mockTimestamp, mockSignature);

			expect(result.data).toBeUndefined();
		});
	});

	describe("rehashAll", () => {
		it("should call post with correct path and auth headers", async () => {
			const postSpy = vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
			});

			await client.rehashAll(mockTimestamp, mockSignature);

			expect(postSpy).toHaveBeenCalledWith(
				accessRuleApiPaths.REHASH_ALL,
				{},
				{
					headers: {
						"Prosopo-Site-Key": mockAccount,
						timestamp: mockTimestamp,
						signature: mockSignature,
					},
				},
			);
		});

		it("should send empty body", async () => {
			const postSpy = vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
			});

			await client.rehashAll(mockTimestamp, mockSignature);

			expect(postSpy).toHaveBeenCalledWith(
				expect.any(String),
				{},
				expect.any(Object),
			);
		});
	});

	describe("insertMany", () => {
		it("should call post with correct path and auth headers", async () => {
			const postSpy = vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
			});

			const ruleGroups = [
				{
					clientIds: ["client1"],
					groupId: "group1",
					accessPolicies: [
						{
							policy: { type: AccessPolicyType.Block },
							expiresUnixTimestamp: 1234567890,
						},
					],
				},
			];
			await client.insertMany(ruleGroups, mockTimestamp, mockSignature);

			expect(postSpy).toHaveBeenCalledWith(
				accessRuleApiPaths.INSERT_MANY,
				ruleGroups,
				{
					headers: {
						"Prosopo-Site-Key": mockAccount,
						timestamp: mockTimestamp,
						signature: mockSignature,
					},
				},
			);
		});

		it("should return response from post", async () => {
			const mockResponse = {
				status: ApiEndpointResponseStatus.SUCCESS,
			};
			vi.spyOn(client, "post").mockResolvedValue(mockResponse);

			const result = await client.insertMany([], mockTimestamp, mockSignature);

			expect(result).toEqual(mockResponse);
		});
	});

	describe("getAuthHeaders", () => {
		it("should include site key, timestamp, and signature in headers", async () => {
			const postSpy = vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
			});

			await client.deleteAll(mockTimestamp, mockSignature);

			const callHeaders = postSpy.mock.calls[0][2];
			expect(callHeaders).toEqual({
				headers: {
					"Prosopo-Site-Key": mockAccount,
					timestamp: mockTimestamp,
					signature: mockSignature,
				},
			});
		});

		it("should use account as site key", async () => {
			const postSpy = vi.spyOn(client, "post").mockResolvedValue({
				status: ApiEndpointResponseStatus.SUCCESS,
			});

			await client.deleteAll(mockTimestamp, mockSignature);

			const callHeaders = postSpy.mock.calls[0][2];
			expect(callHeaders?.headers?.["Prosopo-Site-Key"]).toBe(mockAccount);
		});
	});
});
