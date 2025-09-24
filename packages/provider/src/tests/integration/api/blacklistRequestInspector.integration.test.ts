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

import { ProviderEnvironment } from "@prosopo/env";
import { generateMnemonic } from "@prosopo/keyring";
import { DatabaseTypes, ProsopoConfigSchema } from "@prosopo/types";
import {
	AccessPolicyType,
	type AccessRulesStorage,
	ScopeMatch,
	accessRuleSchema,
	userScopeSchema,
} from "@prosopo/user-access-policy";
import { getIPAddressFromBigInt } from "@prosopo/util";
import { randomAsHex } from "@prosopo/util-crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getPrioritisedAccessRule } from "../../../api/blacklistRequestInspector.js";

describe("blacklistRequestInspector Integration Tests", () => {
	describe("getPrioritisedAccessRule", () => {
		let env: ProviderEnvironment;
		let accessRulesStorage: AccessRulesStorage;
		const userAgent1 = "testuseragent1";
		const userAgent2 = "testuseragent2";
		const userAgent3 = "testuseragent3";
		const ja4Hash1 = "t13d1516h2_8daaf6152771_8eba31f8906f";
		const ja4Hash2 = "t13d1516h2_8daaf6152771_8eba31f8906g";
		let siteKey: string;
		let siteKeyMnemonic: string;

		beforeAll(async () => {
			const config = ProsopoConfigSchema.parse({
				defaultEnvironment: "development",
				host: "http://localhost:9229",
				account: {
					secret:
						process.env.PROVIDER_MNEMONIC ||
						"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
				},
				authAccount: {
					secret:
						process.env.ADMIN_MNEMONIC ||
						"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
				},
				database: {
					development: {
						type: DatabaseTypes.enum.provider,
						endpoint: "mongodb://127.0.0.1:27017",
						dbname: process.env.PROSOPO_DATABASE_NAME || "prosopo_test",
						authSource: process.env.PROSOPO_DATABASE_AUTH_SOURCE,
					},
				},
				ipApi: {
					baseUrl: "https://dummyUrl.com",
					apiKey: "dummyKey",
				},
			});
			// ensure no crossover issues with the index name and other tests
			config.redisConnection.indexName = randomAsHex(16);
			env = new ProviderEnvironment(config);
			await env.isReady();

			const db = env.getDb();

			// wait until Redis is ready
			await db.getRedisAccessRulesConnection().getClient();

			accessRulesStorage = env.getDb().getUserAccessRulesStorage();
		});

		beforeEach(async () => {
			[siteKeyMnemonic, siteKey] = await generateMnemonic();

			// Clear the access rules storage before each test
			await accessRulesStorage.deleteAllRules();
		});

		it("should return a rule when a JA4-UserAgent rule exists and the user matches the User Agent and the JA4", async () => {
			const accessRule = accessRuleSchema.parse({
				type: AccessPolicyType.Restrict,
				clientId: siteKey,
				ja4Hash: ja4Hash1,
				userAgent: userAgent1,
			});
			await accessRulesStorage.insertRule(accessRule);
			const spy = vi.spyOn(accessRulesStorage, "findRules");

			const result = await getPrioritisedAccessRule(
				accessRulesStorage,
				{
					ja4Hash: ja4Hash1,
					userAgent: userAgent1,
				},
				siteKey,
			);

			expect(spy).toHaveBeenCalledTimes(6);
			expect(spy).toHaveBeenCalledWith(
				{
					policyScope: {
						clientId: siteKey,
					},
					policyScopeMatch: ScopeMatch.Exact,
					userScope: userScopeSchema.parse({
						ja4Hash: ja4Hash1,
						userAgent: userAgent1,
					}),
					userScopeMatch: ScopeMatch.Exact,
				},
				true,
				true,
			);
			expect(spy).toHaveBeenCalledWith(
				{
					policyScope: {
						clientId: siteKey,
					},
					policyScopeMatch: ScopeMatch.Exact,
					userScope: userScopeSchema.parse({
						userAgent: userAgent1,
					}),
					userScopeMatch: ScopeMatch.Exact,
				},
				true,
				true,
			);
			expect(spy).toHaveBeenCalledWith(
				{
					policyScope: {
						clientId: siteKey,
					},
					policyScopeMatch: ScopeMatch.Exact,
					userScope: userScopeSchema.parse({
						ja4Hash: ja4Hash1,
					}),
					userScopeMatch: ScopeMatch.Exact,
				},
				true,
				true,
			);
			expect(spy).toHaveBeenCalledWith(
				{
					policyScopeMatch: ScopeMatch.Exact,
					userScope: userScopeSchema.parse({
						ja4Hash: ja4Hash1,
						userAgent: userAgent1,
					}),
					userScopeMatch: ScopeMatch.Exact,
				},
				true,
				true,
			);
			expect(spy).toHaveBeenCalledWith(
				{
					policyScopeMatch: ScopeMatch.Exact,
					userScope: userScopeSchema.parse({
						userAgent: userAgent1,
					}),
					userScopeMatch: ScopeMatch.Exact,
				},
				true,
				true,
			);
			expect(spy).toHaveBeenCalledWith(
				{
					policyScopeMatch: ScopeMatch.Exact,
					userScope: userScopeSchema.parse({
						ja4Hash: ja4Hash1,
					}),
					userScopeMatch: ScopeMatch.Exact,
				},
				true,
				true,
			);

			expect(result).toHaveLength(1);
		});

		it("should not return a rule when a JA4-UserAgent rule exists and the user matches the the JA4 but not the user agent", async () => {
			const accessRule = accessRuleSchema.parse({
				type: AccessPolicyType.Restrict,
				clientId: siteKey,
				ja4Hash: ja4Hash1,
				userAgent: userAgent2,
			});
			await accessRulesStorage.insertRule(accessRule);
			const spy = vi.spyOn(accessRulesStorage, "findRules");

			const result = await getPrioritisedAccessRule(
				accessRulesStorage,
				{
					ja4Hash: ja4Hash1,
					userAgent: userAgent1,
				},
				siteKey,
			);

			expect(spy).toHaveBeenCalledTimes(6);

			expect(spy).toHaveBeenCalledWith(
				{
					policyScopeMatch: ScopeMatch.Exact,
					userScope: userScopeSchema.parse({
						ja4Hash: ja4Hash1,
						userAgent: userAgent1,
					}),
					userScopeMatch: ScopeMatch.Exact,
				},
				true,
				true,
			);
			expect(spy).toHaveBeenCalledWith(
				{
					policyScopeMatch: ScopeMatch.Exact,
					userScope: userScopeSchema.parse({
						userAgent: userAgent1,
					}),
					userScopeMatch: ScopeMatch.Exact,
				},
				true,
				true,
			);
			expect(spy).toHaveBeenCalledWith(
				{
					policyScopeMatch: ScopeMatch.Exact,
					userScope: userScopeSchema.parse({
						ja4Hash: ja4Hash1,
					}),
					userScopeMatch: ScopeMatch.Exact,
				},
				true,
				true,
			);
			expect(spy).toHaveBeenCalledWith(
				{
					policyScope: {
						clientId: siteKey,
					},
					policyScopeMatch: ScopeMatch.Exact,
					userScope: userScopeSchema.parse({
						ja4Hash: ja4Hash1,
						userAgent: userAgent1,
					}),
					userScopeMatch: ScopeMatch.Exact,
				},
				true,
				true,
			);
			expect(spy).toHaveBeenCalledWith(
				{
					policyScope: {
						clientId: siteKey,
					},
					policyScopeMatch: ScopeMatch.Exact,
					userScope: userScopeSchema.parse({
						userAgent: userAgent1,
					}),
					userScopeMatch: ScopeMatch.Exact,
				},
				true,
				true,
			);
			expect(spy).toHaveBeenCalledWith(
				{
					policyScope: {
						clientId: siteKey,
					},
					policyScopeMatch: ScopeMatch.Exact,
					userScope: userScopeSchema.parse({
						ja4Hash: ja4Hash1,
					}),
					userScopeMatch: ScopeMatch.Exact,
				},
				true,
				true,
			);
			expect(result).toHaveLength(1);
		});

		it("should return multiple matching rules", async () => {
			const accessRule1 = accessRuleSchema.parse({
				type: AccessPolicyType.Restrict,
				clientId: siteKey,
				ja4Hash: ja4Hash2,
			});
			const accessRule2 = accessRuleSchema.parse({
				type: AccessPolicyType.Restrict,
				clientId: siteKey,
				numericIp: BigInt(16843009),
			});
			await accessRulesStorage.insertRule(accessRule1);
			await accessRulesStorage.insertRule(accessRule2);
			const spy = vi.spyOn(accessRulesStorage, "findRules");

			const result = await getPrioritisedAccessRule(
				accessRulesStorage,
				{
					ja4Hash: ja4Hash2,
					numericIp: BigInt(16843009),
				},
				siteKey,
			);

			expect(spy).toHaveBeenCalledTimes(6);

			expect(result.length).toBe(2);
		});

		it("should return multiple matching rules in order of specificity", async () => {
			const accessRule1 = accessRuleSchema.parse({
				type: AccessPolicyType.Restrict,
				clientId: siteKey,
				ja4Hash: ja4Hash2,
				numericIp: BigInt(16843009),
			});
			const accessRule2 = accessRuleSchema.parse({
				type: AccessPolicyType.Restrict,
				clientId: siteKey,
				numericIp: BigInt(16843009),
			});
			await accessRulesStorage.insertRule(accessRule1);
			await accessRulesStorage.insertRule(accessRule2);
			const spy = vi.spyOn(accessRulesStorage, "findRules");

			const result = await getPrioritisedAccessRule(
				accessRulesStorage,
				{
					ja4Hash: ja4Hash2,
					numericIp: BigInt(16843009),
				},
				siteKey,
			);

			expect(spy).toHaveBeenCalledTimes(6);

			expect(result.length).toBe(2);
			expect(result).toStrictEqual([accessRule1, accessRule2]);

			// check non-client result
			const nonClientResult = await getPrioritisedAccessRule(
				accessRulesStorage,
				{
					ja4Hash: ja4Hash2,
					numericIp: BigInt(16843009),
				},
			);
			expect(nonClientResult.length).toBe(0);
		});

		it("should not return a match for a different IP", async () => {
			const accessRule1 = accessRuleSchema.parse({
				type: AccessPolicyType.Restrict,
				clientId: siteKey,
				ja4Hash: ja4Hash2,
				userAgent: userAgent1,
				numericIp: BigInt(16843009),
			});

			await accessRulesStorage.insertRule(accessRule1);

			const result = await getPrioritisedAccessRule(
				accessRulesStorage,
				{
					ja4Hash: ja4Hash2,
					userAgent: userAgent1,
					numericIp: BigInt(17843009),
				},
				siteKey,
			);

			expect(result.length).toBe(0);
		});

		it("should return a match for the same IP", async () => {
			const numericIp = BigInt(16843009);
			const accessRule1 = accessRuleSchema.parse({
				type: AccessPolicyType.Restrict,
				clientId: siteKey,
				ja4Hash: ja4Hash2,
				userAgent: userAgent1,
				numericIp: numericIp,
			});

			await accessRulesStorage.insertRule(accessRule1);

			const result = await getPrioritisedAccessRule(
				accessRulesStorage,
				{
					ja4Hash: ja4Hash2,
					userAgent: userAgent1,
					ip: getIPAddressFromBigInt(numericIp).address,
				},
				siteKey,
			);

			expect(result.length).toBe(1);
		});

		it("should not return a match for a different IP", async () => {
			const accessRule1 = accessRuleSchema.parse({
				type: AccessPolicyType.Restrict,
				clientId: siteKey,
				ja4Hash: ja4Hash2,
				userAgent: userAgent1,
				numericIp: BigInt(16843009),
			});

			await accessRulesStorage.insertRule(accessRule1);

			const result = await getPrioritisedAccessRule(
				accessRulesStorage,
				{
					ja4Hash: ja4Hash2,
					userAgent: userAgent1,
					ip: "1.1.1.2",
				},
				siteKey,
			);
			expect(result).toEqual([]);
			expect(result.length).toBe(0);
		});

		it("should not return a match for a different IP 2", async () => {
			const accessRule1 = accessRuleSchema.parse({
				type: AccessPolicyType.Restrict,
				clientId: siteKey,
				ja4Hash: ja4Hash2,
				userAgent: userAgent1,
				numericIp: BigInt(16843009),
			});

			await accessRulesStorage.insertRule(accessRule1);

			const result = await getPrioritisedAccessRule(
				accessRulesStorage,
				{
					ja4Hash: ja4Hash2,
					userAgent: userAgent1,
					numericIp: BigInt(16843010),
				},
				siteKey,
			);
			expect(result.length).toBe(0);
		});

		it("should not return a match for a different IP 3", async () => {
			const accessRule1 = accessRuleSchema.parse({
				type: AccessPolicyType.Restrict,
				clientId: siteKey,
				ja4Hash: ja4Hash2,
				userAgent: userAgent1,
				numericIp: BigInt(16843009),
			});

			await accessRulesStorage.insertRule(accessRule1);

			const result = await getPrioritisedAccessRule(
				accessRulesStorage,
				{
					ja4Hash: ja4Hash2,
					userAgent: userAgent1,
					numericIpMaskMin: BigInt(16843010),
					numericIpMaskMax: BigInt(16843010),
				},
				siteKey,
			);
			expect(result.length).toBe(0);
		});
	});
});
