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
	userScopeInputSchema,
} from "@prosopo/user-access-policy";
import {
	accessRuleSchema,
	accessRuleSchemaExtended,
} from "@prosopo/user-access-policy";
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
			});
			// ensure no crossover issues with the index name and other tests
			config.redisConnection.indexName = randomAsHex(16);
			env = new ProviderEnvironment(config);
			await env.isReady();
			accessRulesStorage = env.getDb().getUserAccessRulesStorage();
		});

		beforeEach(async () => {
			[siteKeyMnemonic, siteKey] = await generateMnemonic();

			// Clear the access rules storage before each test
			await accessRulesStorage.deleteAllRules();
		});

		it("should return a rule when a JA4-UserAgent rule exists and the user matches the User Agent and the JA4", async () => {
			const accessRule = accessRuleSchemaExtended.parse({
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

			expect(spy).toHaveBeenCalledWith({
				policyScopeMatch: ScopeMatch.Exact,
				userScope: userScopeInputSchema.parse({
					ja4Hash: ja4Hash1,
					userAgent: userAgent1,
				}),
				userScopeMatch: ScopeMatch.Exact,
			});
			expect(spy).toHaveBeenCalledWith({
				policyScopeMatch: ScopeMatch.Exact,
				userScope: userScopeInputSchema.parse({
					userAgent: userAgent1,
				}),
				userScopeMatch: ScopeMatch.Exact,
			});
			expect(spy).toHaveBeenCalledWith({
				policyScopeMatch: ScopeMatch.Exact,
				userScope: userScopeInputSchema.parse({
					ja4Hash: ja4Hash1,
				}),
				userScopeMatch: ScopeMatch.Exact,
			});
			expect(spy).toHaveBeenCalledWith({
				policyScope: {
					clientId: siteKey,
				},
				policyScopeMatch: ScopeMatch.Exact,
				userScope: userScopeInputSchema.parse({
					ja4Hash: ja4Hash1,
					userAgent: userAgent1,
				}),
				userScopeMatch: ScopeMatch.Exact,
			});
			expect(spy).toHaveBeenCalledWith({
				policyScope: {
					clientId: siteKey,
				},
				policyScopeMatch: ScopeMatch.Exact,
				userScope: userScopeInputSchema.parse({
					userAgent: userAgent1,
				}),
				userScopeMatch: ScopeMatch.Exact,
			});
			expect(spy).toHaveBeenCalledWith({
				policyScope: {
					clientId: siteKey,
				},
				policyScopeMatch: ScopeMatch.Exact,
				userScope: userScopeInputSchema.parse({
					ja4Hash: ja4Hash1,
				}),
				userScopeMatch: ScopeMatch.Exact,
			});
			expect(result).toHaveLength(1);
		});
		it("should not return a rule when a JA4-UserAgent rule exists and the user matches the the JA4 but not the user agent", async () => {
			const accessRule = accessRuleSchemaExtended.parse({
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

			expect(spy).toHaveBeenCalledWith({
				policyScopeMatch: ScopeMatch.Exact,
				userScope: userScopeInputSchema.parse({
					ja4Hash: ja4Hash1,
					userAgent: userAgent1,
				}),
				userScopeMatch: ScopeMatch.Exact,
			});
			expect(spy).toHaveBeenCalledWith({
				policyScopeMatch: ScopeMatch.Exact,
				userScope: userScopeInputSchema.parse({
					userAgent: userAgent1,
				}),
				userScopeMatch: ScopeMatch.Exact,
			});
			expect(spy).toHaveBeenCalledWith({
				policyScopeMatch: ScopeMatch.Exact,
				userScope: userScopeInputSchema.parse({
					ja4Hash: ja4Hash1,
				}),
				userScopeMatch: ScopeMatch.Exact,
			});
			expect(spy).toHaveBeenCalledWith({
				policyScope: {
					clientId: siteKey,
				},
				policyScopeMatch: ScopeMatch.Exact,
				userScope: userScopeInputSchema.parse({
					ja4Hash: ja4Hash1,
					userAgent: userAgent1,
				}),
				userScopeMatch: ScopeMatch.Exact,
			});
			expect(spy).toHaveBeenCalledWith({
				policyScope: {
					clientId: siteKey,
				},
				policyScopeMatch: ScopeMatch.Exact,
				userScope: userScopeInputSchema.parse({
					userAgent: userAgent1,
				}),
				userScopeMatch: ScopeMatch.Exact,
			});
			expect(spy).toHaveBeenCalledWith({
				policyScope: {
					clientId: siteKey,
				},
				policyScopeMatch: ScopeMatch.Exact,
				userScope: userScopeInputSchema.parse({
					ja4Hash: ja4Hash1,
				}),
				userScopeMatch: ScopeMatch.Exact,
			});
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
		it("should return multiple matching rules in order of specficity", async () => {
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
	});
});
