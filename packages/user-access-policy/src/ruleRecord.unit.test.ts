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

import { describe, expect, it } from "vitest";
import { AccessPolicyType } from "#policy/rule.js";
import {
	getUserScopeRecordFromAccessRuleRecord,
	userAttributesRecordFields,
	userIpRecordFields,
	userScopeRecordFields,
} from "#policy/ruleRecord.js";
import type { AccessRuleRecord } from "#policy/ruleRecord.js";

describe("getUserScopeRecordFromAccessRuleRecord", () => {
	it("should extract user scope record with all fields", () => {
		const ruleRecord: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			clientId: "client1",
			userId: "user1",
			ja4Hash: "ja4hash",
			headersHash: "headershash",
			userAgent: "useragent",
			ip: "127.0.0.1",
			ipMask: "127.0.0.0/24",
			headHash: "headhash",
			coords: "[[[100,200]]]",
		};

		const userScope = getUserScopeRecordFromAccessRuleRecord(ruleRecord);

		expect(userScope.userId).toBe("user1");
		expect(userScope.ja4Hash).toBe("ja4hash");
		expect(userScope.headersHash).toBe("headershash");
		expect(userScope.userAgent).toBe("useragent");
		expect(userScope.ip).toBe("127.0.0.1");
		expect(userScope.ipMask).toBe("127.0.0.0/24");
		expect(userScope.headHash).toBe("headhash");
		expect(userScope.coords).toBe("[[[100,200]]]");
	});

	it("should exclude undefined fields", () => {
		const ruleRecord: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			userId: "user1",
		};

		const userScope = getUserScopeRecordFromAccessRuleRecord(ruleRecord);

		expect(userScope.userId).toBe("user1");
		expect(userScope.ja4Hash).toBeUndefined();
		expect(userScope.headersHash).toBeUndefined();
		expect(userScope.userAgent).toBeUndefined();
		expect(userScope.ip).toBeUndefined();
		expect(userScope.ipMask).toBeUndefined();
	});

	it("should exclude non-user-scope fields", () => {
		const ruleRecord: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			clientId: "client1",
			userId: "user1",
		};

		const userScope = getUserScopeRecordFromAccessRuleRecord(ruleRecord);

		expect(userScope.userId).toBe("user1");
		expect((userScope as unknown as AccessRuleRecord).type).toBeUndefined();
		expect((userScope as unknown as AccessRuleRecord).clientId).toBeUndefined();
	});
});

describe("userScopeRecordFields", () => {
	it("should include all user attributes record fields", () => {
		for (const field of userAttributesRecordFields) {
			expect(userScopeRecordFields).toContain(field);
		}
	});

	it("should include all user IP record fields", () => {
		for (const field of userIpRecordFields) {
			expect(userScopeRecordFields).toContain(field);
		}
	});

	it("should have correct field names", () => {
		expect(userAttributesRecordFields).toContain("userId");
		expect(userAttributesRecordFields).toContain("ja4Hash");
		expect(userAttributesRecordFields).toContain("headersHash");
		expect(userAttributesRecordFields).toContain("userAgent");
		expect(userAttributesRecordFields).toContain("headHash");
		expect(userAttributesRecordFields).toContain("coords");

		expect(userIpRecordFields).toContain("ip");
		expect(userIpRecordFields).toContain("ipMask");
	});
});
