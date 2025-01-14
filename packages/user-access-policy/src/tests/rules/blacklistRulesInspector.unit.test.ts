// Copyright 2021-2024 Prosopo (UK) Ltd.
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

import { BlacklistRulesInspector } from "@rules/blacklistRulesInspector.js";
import type { RuleRecord } from "@rules/storage/ruleRecord.js";
import { TestRulesStorage } from "@tests/rules/storage/testRulesStorage.js";
import { Address4 } from "ip-address";
import { describe, expect, it } from "vitest";
import type { BlacklistInspector } from "../../blacklistInspector.js";

describe("BlacklistRulesInspector", () => {
	function createInspector(ruleRecords: RuleRecord[]): BlacklistInspector {
		const userAccessRulesStorage = new TestRulesStorage(ruleRecords);
		return new BlacklistRulesInspector(userAccessRulesStorage);
	}

	it("blacklistedWhenRuleRecordContainsBlockedFlag", async () => {
		// given
		const accessRuleRecord: RuleRecord = {
			isUserBlocked: true,
			_id: "0",
		};
		const inspector = createInspector([accessRuleRecord]);

		// when
		const shouldAbortRequest = () =>
			inspector.isUserBlacklisted("", new Address4("127.0.0.1"), "");

		// then
		expect(await shouldAbortRequest()).toBe(true);
	});

	it("blacklistedWhenAnyRuleFromRuleRecordsContainsBlockedFlag", async () => {
		// given
		const accessRuleRecordWithoutBlock: RuleRecord = {
			isUserBlocked: false,
			_id: "0",
		};
		const accessRuleRecordWithBlock: RuleRecord = {
			isUserBlocked: true,
			_id: "1",
		};
		const inspector = createInspector([
			accessRuleRecordWithoutBlock,
			accessRuleRecordWithBlock,
		]);

		// when
		const shouldAbortRequest = () =>
			inspector.isUserBlacklisted("", new Address4("127.0.0.1"), "");

		// then
		expect(await shouldAbortRequest()).toBe(true);
	});

	it("notBlacklistedWhenRuleRecordsDoNotContainBlockedFlag", async () => {
		// given
		const accessRuleRecordWithoutBlock: RuleRecord = {
			isUserBlocked: false,
			_id: "0",
		};
		const accessRuleRecordWithBlock: RuleRecord = {
			isUserBlocked: false,
			_id: "1",
		};
		const inspector = createInspector([
			accessRuleRecordWithoutBlock,
			accessRuleRecordWithBlock,
		]);

		// when
		const shouldAbortRequest = () =>
			inspector.isUserBlacklisted("", new Address4("127.0.0.1"), "");

		// then
		expect(await shouldAbortRequest()).toBe(false);
	});

	it("otBlacklistedWhenRuleRecordsMissing", async () => {
		// given
		const inspector = createInspector([]);

		// when
		const shouldAbortRequest = () =>
			inspector.isUserBlacklisted("", new Address4("127.0.0.1"), "");

		// then
		expect(await shouldAbortRequest()).toBe(false);
	});
});
