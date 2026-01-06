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

import { CaptchaType } from "@prosopo/types";
import { describe, expectTypeOf, test } from "vitest";
import type { getAccessRuleRedisKey } from "#policy/redis/redisRuleIndex.js";
import type { getRedisRuleValue } from "#policy/redis/redisRulesWriter.js";
import type {
	AccessPolicy,
	AccessRule,
	PolicyScope,
	UserAttributes,
	UserIp,
	UserScope,
} from "#policy/rule.js";
import { AccessPolicyType } from "#policy/rule.js";
import type {
	AccessRuleInput,
	AccessRulesFilterInput,
	UserAttributesInput,
	UserIpInput,
	UserScopeInput,
	getAccessRuleFiltersFromInput,
} from "#policy/ruleInput/.export.js";
import type {
	AccessRuleRecord,
	UserAttributesRecord,
	UserIpRecord,
	UserScopeRecord,
	UserScopeRecordField,
	getUserScopeRecordFromAccessRuleRecord,
} from "#policy/ruleRecord.js";
import {
	type AccessRuleEntry,
	type AccessRulesFilter,
	type AccessRulesReader,
	type AccessRulesStorage,
	type AccessRulesWriter,
	FilterScopeMatch,
} from "#policy/rulesStorage.js";
import type { makeAccessRuleHash } from "#policy/transformRule.js";

describe("Type definitions", () => {
	describe("AccessPolicyType enum", () => {
		test("should have correct enum values", () => {
			expectTypeOf<AccessPolicyType.Block>().toMatchTypeOf<"block">();
			expectTypeOf<AccessPolicyType.Restrict>().toMatchTypeOf<"restrict">();
		});

		test("should be assignable to string", () => {
			const block: AccessPolicyType = AccessPolicyType.Block;
			const restrict: AccessPolicyType = AccessPolicyType.Restrict;
			expectTypeOf(block).toMatchTypeOf<string>();
			expectTypeOf(restrict).toMatchTypeOf<string>();
		});
	});

	describe("FilterScopeMatch enum", () => {
		test("should have correct enum values", () => {
			expectTypeOf<FilterScopeMatch.Exact>().toMatchTypeOf<"exact">();
			expectTypeOf<FilterScopeMatch.Greedy>().toMatchTypeOf<"greedy">();
		});

		test("should be assignable to string", () => {
			const exact: FilterScopeMatch = FilterScopeMatch.Exact;
			const greedy: FilterScopeMatch = FilterScopeMatch.Greedy;
			expectTypeOf(exact).toMatchTypeOf<string>();
			expectTypeOf(greedy).toMatchTypeOf<string>();
		});
	});

	describe("AccessPolicy type", () => {
		test("should have required type property", () => {
			type TestPolicy = AccessPolicy;
			expectTypeOf<TestPolicy["type"]>().toMatchTypeOf<AccessPolicyType>();
			expectTypeOf<TestPolicy["type"]>().not.toBeAny();
		});

		test("should have optional properties", () => {
			type TestPolicy = AccessPolicy;
			expectTypeOf<TestPolicy["captchaType"]>().toMatchTypeOf<
				CaptchaType | undefined
			>();
			expectTypeOf<TestPolicy["description"]>().toMatchTypeOf<
				string | undefined
			>();
			expectTypeOf<TestPolicy["solvedImagesCount"]>().toMatchTypeOf<
				number | undefined
			>();
			expectTypeOf<TestPolicy["imageThreshold"]>().toMatchTypeOf<
				number | undefined
			>();
			expectTypeOf<TestPolicy["powDifficulty"]>().toMatchTypeOf<
				number | undefined
			>();
			expectTypeOf<TestPolicy["unsolvedImagesCount"]>().toMatchTypeOf<
				number | undefined
			>();
			expectTypeOf<TestPolicy["frictionlessScore"]>().toMatchTypeOf<
				number | undefined
			>();
		});
	});

	describe("PolicyScope type", () => {
		test("should have optional clientId", () => {
			type TestScope = PolicyScope;
			expectTypeOf<TestScope["clientId"]>().toMatchTypeOf<string | undefined>();
		});
	});

	describe("UserIp type", () => {
		test("should have optional numeric IP properties", () => {
			type TestUserIp = UserIp;
			expectTypeOf<TestUserIp["numericIp"]>().toMatchTypeOf<
				bigint | undefined
			>();
			expectTypeOf<TestUserIp["numericIpMaskMin"]>().toMatchTypeOf<
				bigint | undefined
			>();
			expectTypeOf<TestUserIp["numericIpMaskMax"]>().toMatchTypeOf<
				bigint | undefined
			>();
		});
	});

	describe("UserAttributes type", () => {
		test("should have optional user attribute properties", () => {
			type TestAttributes = UserAttributes;
			expectTypeOf<TestAttributes["userId"]>().toMatchTypeOf<
				string | undefined
			>();
			expectTypeOf<TestAttributes["ja4Hash"]>().toMatchTypeOf<
				string | undefined
			>();
			expectTypeOf<TestAttributes["headersHash"]>().toMatchTypeOf<
				string | undefined
			>();
			expectTypeOf<TestAttributes["userAgentHash"]>().toMatchTypeOf<
				string | undefined
			>();
			expectTypeOf<TestAttributes["headHash"]>().toMatchTypeOf<
				string | undefined
			>();
			expectTypeOf<TestAttributes["coords"]>().toMatchTypeOf<
				string | undefined
			>();
		});
	});

	describe("UserScope type", () => {
		test("should extend UserAttributes and UserIp", () => {
			expectTypeOf<UserScope>().toMatchTypeOf<UserAttributes & UserIp>();
		});

		test("should have all UserAttributes properties", () => {
			type TestScope = UserScope;
			expectTypeOf<TestScope["userId"]>().toMatchTypeOf<string | undefined>();
			expectTypeOf<TestScope["ja4Hash"]>().toMatchTypeOf<string | undefined>();
			expectTypeOf<TestScope["numericIp"]>().toMatchTypeOf<
				bigint | undefined
			>();
		});
	});

	describe("AccessRule type", () => {
		test("should extend AccessPolicy, PolicyScope, and UserScope", () => {
			expectTypeOf<AccessRule>().toMatchTypeOf<
				AccessPolicy & PolicyScope & UserScope
			>();
		});

		test("should have optional groupId", () => {
			type TestRule = AccessRule;
			expectTypeOf<TestRule["groupId"]>().toMatchTypeOf<string | undefined>();
		});

		test("should have all required properties from AccessPolicy", () => {
			type TestRule = AccessRule;
			expectTypeOf<TestRule["type"]>().toMatchTypeOf<AccessPolicyType>();
		});
	});

	describe("UserAttributesRecord type", () => {
		test("should omit userAgentHash and add userAgent", () => {
			type TestRecord = UserAttributesRecord;
			expectTypeOf<TestRecord["userAgent"]>().toMatchTypeOf<
				string | undefined
			>();
			// userAgentHash should not exist in UserAttributesRecord
			type UserAgentHashType = TestRecord["userAgentHash"];
			expectTypeOf<UserAgentHashType>().toBeNever();
		});

		test("should have other UserAttributes properties", () => {
			type TestRecord = UserAttributesRecord;
			expectTypeOf<TestRecord["userId"]>().toMatchTypeOf<string | undefined>();
			expectTypeOf<TestRecord["ja4Hash"]>().toMatchTypeOf<string | undefined>();
		});
	});

	describe("UserIpRecord type", () => {
		test("should have string IP properties", () => {
			type TestRecord = UserIpRecord;
			expectTypeOf<TestRecord["ip"]>().toMatchTypeOf<string | undefined>();
			expectTypeOf<TestRecord["ipMask"]>().toMatchTypeOf<string | undefined>();
		});
	});

	describe("UserScopeRecord type", () => {
		test("should extend UserAttributesRecord and UserIpRecord", () => {
			expectTypeOf<UserScopeRecord>().toMatchTypeOf<
				UserAttributesRecord & UserIpRecord
			>();
		});
	});

	describe("AccessRuleRecord type", () => {
		test("should extend AccessPolicy, PolicyScope, and UserScopeRecord", () => {
			expectTypeOf<AccessRuleRecord>().toMatchTypeOf<
				AccessPolicy & PolicyScope & UserScopeRecord
			>();
		});

		test("should have ruleGroupId instead of groupId", () => {
			type TestRecord = AccessRuleRecord;
			expectTypeOf<TestRecord["ruleGroupId"]>().toMatchTypeOf<
				string | undefined
			>();
		});
	});

	describe("UserScopeRecordField type", () => {
		test("should be a string literal union", () => {
			expectTypeOf<UserScopeRecordField>().toMatchTypeOf<string>();
		});
	});

	describe("AccessRuleEntry type", () => {
		test("should have rule and optional expiresUnixTimestamp", () => {
			type TestEntry = AccessRuleEntry;
			expectTypeOf<TestEntry["rule"]>().toMatchTypeOf<AccessRule>();
			expectTypeOf<TestEntry["expiresUnixTimestamp"]>().toMatchTypeOf<
				number | undefined
			>();
		});
	});

	describe("AccessRulesFilter type", () => {
		test("should have optional filter properties", () => {
			type TestFilter = AccessRulesFilter;
			expectTypeOf<TestFilter["policyScope"]>().toMatchTypeOf<
				PolicyScope | undefined
			>();
			expectTypeOf<TestFilter["policyScopeMatch"]>().toMatchTypeOf<
				FilterScopeMatch | undefined
			>();
			expectTypeOf<TestFilter["userScope"]>().toMatchTypeOf<
				UserScope | undefined
			>();
			expectTypeOf<TestFilter["userScopeMatch"]>().toMatchTypeOf<
				FilterScopeMatch | undefined
			>();
			expectTypeOf<TestFilter["groupId"]>().toMatchTypeOf<string | undefined>();
		});
	});

	describe("AccessRulesReader interface", () => {
		test("should have correct method signatures", () => {
			type TestReader = AccessRulesReader;
			expectTypeOf<TestReader["fetchRules"]>().toMatchTypeOf<
				(ruleIds: string[]) => Promise<AccessRuleEntry[]>
			>();
			expectTypeOf<TestReader["getMissingRuleIds"]>().toMatchTypeOf<
				(ruleIds: string[]) => Promise<string[]>
			>();
			expectTypeOf<TestReader["findRules"]>().toMatchTypeOf<
				(
					filter: AccessRulesFilter,
					matchingFieldsOnly?: boolean,
					skipEmptyUserScopes?: boolean,
				) => Promise<AccessRule[]>
			>();
			expectTypeOf<TestReader["findRuleIds"]>().toMatchTypeOf<
				(
					filter: AccessRulesFilter,
					matchingFieldsOnly?: boolean,
				) => Promise<string[]>
			>();
			expectTypeOf<TestReader["fetchAllRuleIds"]>().toMatchTypeOf<
				(batchHandler: (ruleIds: string[]) => Promise<void>) => Promise<void>
			>();
		});
	});

	describe("AccessRulesWriter interface", () => {
		test("should have correct method signatures", () => {
			type TestWriter = AccessRulesWriter;
			expectTypeOf<TestWriter["insertRules"]>().toMatchTypeOf<
				(ruleEntries: AccessRuleEntry[]) => Promise<string[]>
			>();
			expectTypeOf<TestWriter["deleteRules"]>().toMatchTypeOf<
				(ruleIds: string[]) => Promise<void>
			>();
			expectTypeOf<TestWriter["deleteAllRules"]>().toMatchTypeOf<
				() => Promise<number>
			>();
		});
	});

	describe("AccessRulesStorage interface", () => {
		test("should extend both AccessRulesReader and AccessRulesWriter", () => {
			expectTypeOf<AccessRulesStorage>().toMatchTypeOf<
				AccessRulesReader & AccessRulesWriter
			>();
		});

		test("should have all reader methods", () => {
			type TestStorage = AccessRulesStorage;
			expectTypeOf<TestStorage["fetchRules"]>().toMatchTypeOf<
				AccessRulesReader["fetchRules"]
			>();
			expectTypeOf<TestStorage["findRules"]>().toMatchTypeOf<
				AccessRulesReader["findRules"]
			>();
		});

		test("should have all writer methods", () => {
			type TestStorage = AccessRulesStorage;
			expectTypeOf<TestStorage["insertRules"]>().toMatchTypeOf<
				AccessRulesWriter["insertRules"]
			>();
			expectTypeOf<TestStorage["deleteRules"]>().toMatchTypeOf<
				AccessRulesWriter["deleteRules"]
			>();
		});
	});

	describe("UserScopeInput type", () => {
		test("should extend UserAttributesInput and UserIpInput", () => {
			expectTypeOf<UserScopeInput>().toMatchTypeOf<
				UserAttributesInput & UserIpInput
			>();
		});
	});

	describe("UserAttributesInput type", () => {
		test("should extend UserAttributes and UserAttributesRecord", () => {
			expectTypeOf<UserAttributesInput>().toMatchTypeOf<
				UserAttributes & UserAttributesRecord
			>();
		});
	});

	describe("UserIpInput type", () => {
		test("should extend UserIp and UserIpRecord", () => {
			expectTypeOf<UserIpInput>().toMatchTypeOf<UserIp & UserIpRecord>();
		});
	});

	describe("AccessRuleInput type", () => {
		test("should extend AccessPolicy, PolicyScope, and UserScopeInput", () => {
			expectTypeOf<AccessRuleInput>().toMatchTypeOf<
				AccessPolicy & PolicyScope & UserScopeInput
			>();
		});
	});

	describe("AccessRulesFilterInput type", () => {
		test("should extend AccessRulesFilter", () => {
			expectTypeOf<AccessRulesFilterInput>().toMatchTypeOf<AccessRulesFilter>();
		});

		test("should have optional policyScopes array", () => {
			type TestFilter = AccessRulesFilterInput;
			expectTypeOf<TestFilter["policyScopes"]>().toMatchTypeOf<
				PolicyScope[] | undefined
			>();
		});

		test("should have userScope as UserScopeInput", () => {
			type TestFilter = AccessRulesFilterInput;
			expectTypeOf<TestFilter["userScope"]>().toMatchTypeOf<
				UserScopeInput | undefined
			>();
		});
	});

	describe("Type compatibility", () => {
		test("AccessRule should be compatible with AccessPolicy", () => {
			const rule: AccessRule = {
				type: AccessPolicyType.Block,
			};
			expectTypeOf(rule).toMatchTypeOf<AccessPolicy>();
		});

		test("AccessRule should be compatible with PolicyScope", () => {
			const rule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: "client1",
			};
			expectTypeOf(rule).toMatchTypeOf<PolicyScope>();
		});

		test("AccessRule should be compatible with UserScope", () => {
			const rule: AccessRule = {
				type: AccessPolicyType.Block,
				numericIp: BigInt(100),
			};
			expectTypeOf(rule).toMatchTypeOf<UserScope>();
		});

		test("AccessRuleRecord should be compatible with AccessPolicy", () => {
			const record: AccessRuleRecord = {
				type: AccessPolicyType.Block,
			};
			expectTypeOf(record).toMatchTypeOf<AccessPolicy>();
		});

		test("UserScopeRecord should be compatible with UserAttributesRecord", () => {
			const record: UserScopeRecord = {
				userId: "user1",
			};
			expectTypeOf(record).toMatchTypeOf<UserAttributesRecord>();
		});
	});

	describe("Type transformations", () => {
		test("AccessRule should transform to AccessRuleRecord", () => {
			// This tests that the transformation types are correct
			const rule: AccessRule = {
				type: AccessPolicyType.Block,
				groupId: "group1",
				numericIp: BigInt(100),
			};
			// After transformation, groupId becomes ruleGroupId
			// and numericIp becomes ip
			expectTypeOf(rule).toMatchTypeOf<AccessRule>();
		});

		test("AccessRuleRecord should transform to AccessRule", () => {
			const record: AccessRuleRecord = {
				type: AccessPolicyType.Block,
				ruleGroupId: "group1",
				ip: "127.0.0.1",
			};
			// After transformation, ruleGroupId becomes groupId
			// and ip becomes numericIp
			expectTypeOf(record).toMatchTypeOf<AccessRuleRecord>();
		});
	});

	describe("Runtime type assignments", () => {
		test("types compile correctly with valid assignments", () => {
			// Test that types compile correctly by assigning values
			const policy: AccessPolicy = {
				type: AccessPolicyType.Block,
				captchaType: CaptchaType.frictionless,
				description: "test",
			};

			const scope: PolicyScope = {
				clientId: "client1",
			};

			const userIp: UserIp = {
				numericIp: BigInt(100),
				numericIpMaskMin: BigInt(0),
				numericIpMaskMax: BigInt(255),
			};

			const userAttributes: UserAttributes = {
				userId: "user1",
				ja4Hash: "hash",
				headersHash: "headers",
				userAgentHash: "agent",
				headHash: "head",
				coords: "[[[100,200]]]",
			};

			const userScope: UserScope = {
				...userIp,
				...userAttributes,
			};

			const rule: AccessRule = {
				...policy,
				...scope,
				...userScope,
				groupId: "group1",
			};

			const record: AccessRuleRecord = {
				type: AccessPolicyType.Restrict,
				clientId: "client1",
				ip: "127.0.0.1",
				ipMask: "127.0.0.0/24",
				userAgent: "agent",
				ruleGroupId: "group1",
			};

			const entry: AccessRuleEntry = {
				rule: rule,
				expiresUnixTimestamp: Date.now(),
			};

			const filter: AccessRulesFilter = {
				policyScope: scope,
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: userScope,
				userScopeMatch: FilterScopeMatch.Greedy,
				groupId: "group1",
			};

			// All assignments should compile without errors
			expectTypeOf(policy).toMatchTypeOf<AccessPolicy>();
			expectTypeOf(scope).toMatchTypeOf<PolicyScope>();
			expectTypeOf(userIp).toMatchTypeOf<UserIp>();
			expectTypeOf(userAttributes).toMatchTypeOf<UserAttributes>();
			expectTypeOf(userScope).toMatchTypeOf<UserScope>();
			expectTypeOf(rule).toMatchTypeOf<AccessRule>();
			expectTypeOf(record).toMatchTypeOf<AccessRuleRecord>();
			expectTypeOf(entry).toMatchTypeOf<AccessRuleEntry>();
			expectTypeOf(filter).toMatchTypeOf<AccessRulesFilter>();
		});

		test("input types compile correctly", () => {
			const userScopeInput: UserScopeInput = {
				ip: "127.0.0.1",
				ipMask: "127.0.0.0/24",
				userAgent: "Mozilla/5.0",
				userId: "user1",
			};

			const accessRuleInput: AccessRuleInput = {
				type: AccessPolicyType.Block,
				clientId: "client1",
				...userScopeInput,
				groupId: "group1",
			};

			const filterInput: AccessRulesFilterInput = {
				policyScope: { clientId: "client1" },
				policyScopes: [{ clientId: "client2" }],
				userScope: userScopeInput,
				groupId: "group1",
			};

			expectTypeOf(userScopeInput).toMatchTypeOf<UserScopeInput>();
			expectTypeOf(accessRuleInput).toMatchTypeOf<AccessRuleInput>();
			expectTypeOf(filterInput).toMatchTypeOf<AccessRulesFilterInput>();
		});
	});

	describe("Function parameter and return types", () => {
		test("getAccessRuleFiltersFromInput parameter type", () => {
			expectTypeOf<
				Parameters<typeof getAccessRuleFiltersFromInput>[0]
			>().toMatchTypeOf<AccessRulesFilterInput>();
		});

		test("getAccessRuleFiltersFromInput return type", () => {
			expectTypeOf<
				ReturnType<typeof getAccessRuleFiltersFromInput>
			>().toMatchTypeOf<AccessRulesFilter[]>();
		});

		test("getRedisRuleValue parameter type", () => {
			expectTypeOf<
				Parameters<typeof getRedisRuleValue>[0]
			>().toMatchTypeOf<AccessRule>();
		});

		test("getRedisRuleValue return type", () => {
			expectTypeOf<ReturnType<typeof getRedisRuleValue>>().toMatchTypeOf<
				Record<string, string>
			>();
		});

		test("getAccessRuleRedisKey parameter type", () => {
			expectTypeOf<
				Parameters<typeof getAccessRuleRedisKey>[0]
			>().toMatchTypeOf<AccessRule>();
		});

		test("getAccessRuleRedisKey return type", () => {
			expectTypeOf<
				ReturnType<typeof getAccessRuleRedisKey>
			>().toMatchTypeOf<string>();
		});

		test("makeAccessRuleHash parameter type", () => {
			expectTypeOf<
				Parameters<typeof makeAccessRuleHash>[0]
			>().toMatchTypeOf<AccessRule>();
		});

		test("makeAccessRuleHash return type", () => {
			expectTypeOf<
				ReturnType<typeof makeAccessRuleHash>
			>().toMatchTypeOf<string>();
		});

		test("getUserScopeRecordFromAccessRuleRecord parameter type", () => {
			expectTypeOf<
				Parameters<typeof getUserScopeRecordFromAccessRuleRecord>[0]
			>().toMatchTypeOf<AccessRuleRecord>();
		});

		test("getUserScopeRecordFromAccessRuleRecord return type", () => {
			expectTypeOf<
				ReturnType<typeof getUserScopeRecordFromAccessRuleRecord>
			>().toMatchTypeOf<UserScopeRecord>();
		});
	});
});
