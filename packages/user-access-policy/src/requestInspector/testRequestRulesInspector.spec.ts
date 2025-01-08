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
import { describe, expect } from "vitest";
import type {Rule} from "../rule/rule.js";
import type {DeleteRuleFilters} from "../rule/storage/delete/deleteRuleFilters.js";
import type {RuleRecord} from "../rule/storage/record/ruleRecord.js";
import type {RulesStorage} from "../rule/storage/rulesStorage.js";
import type {SearchRuleFilterSettings} from "../rule/storage/search/searchRuleFilterSettings.js";
import type {SearchRuleFilters} from "../rule/storage/search/searchRuleFilters.js";
import { TestsBase } from "../testsBase.js";
import { RequestRulesInspector } from "./requestRulesInspector.js";
import { Address4 } from "ip-address";

class TestRequestRulesInspector extends TestsBase {
	protected getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return [
			{
				name: "shouldAbortRequestWhenRuleRecordContainsBlockedFlag",
				method: () =>
					this.shouldAbortRequestWhenRuleRecordContainsBlockedFlag(),
			},
			{
				name: "shouldAbortRequestWhenAnyRuleFromRuleRecordsContainsBlockedFlag",
				method: () =>
					this.shouldAbortRequestWhenAnyRuleFromRuleRecordsContainsBlockedFlag(),
			},
			{
				name: "shouldNotAbortRequestWhenRuleRecordsDoNotContainBlockedFlag",
				method: () =>
					this.shouldNotAbortRequestWhenRuleRecordsDoNotContainBlockedFlag(),
			},
			{
				name: "shouldNotAbortRequestWhenRuleRecordsMissing",
				method: () => this.shouldNotAbortRequestWhenRuleRecordsMissing(),
			},
		];
	}

	protected async shouldAbortRequestWhenRuleRecordContainsBlockedFlag(): Promise<void> {
		// given
		const accessRuleRecord: RuleRecord = {
			isUserBlocked: true,
			_id: "0",
		};
		const inspector = this.createInspector([accessRuleRecord]);

		// when
		const shouldAbortRequest = () =>
			inspector.shouldAbortRequest(new Address4("127.0.0.1"), {}, {});

		// then
		expect(await shouldAbortRequest()).toBe(true);
	}

	protected async shouldAbortRequestWhenAnyRuleFromRuleRecordsContainsBlockedFlag(): Promise<void> {
		// given
		const accessRuleRecordWithoutBlock: RuleRecord = {
			isUserBlocked: false,
			_id: "0",
		};
		const accessRuleRecordWithBlock: RuleRecord = {
			isUserBlocked: true,
			_id: "1",
		};
		const inspector = this.createInspector([
			accessRuleRecordWithoutBlock,
			accessRuleRecordWithBlock,
		]);

		// when
		const shouldAbortRequest = () =>
			inspector.shouldAbortRequest(new Address4("127.0.0.1"), {}, {});

		// then
		expect(await shouldAbortRequest()).toBe(true);
	}

	protected async shouldNotAbortRequestWhenRuleRecordsDoNotContainBlockedFlag(): Promise<void> {
		// given
		const accessRuleRecordWithoutBlock: RuleRecord = {
			isUserBlocked: false,
			_id: "0",
		};
		const accessRuleRecordWithBlock: RuleRecord = {
			isUserBlocked: false,
			_id: "1",
		};
		const inspector = this.createInspector([
			accessRuleRecordWithoutBlock,
			accessRuleRecordWithBlock,
		]);

		// when
		const shouldAbortRequest = () =>
			inspector.shouldAbortRequest(new Address4("127.0.0.1"), {}, {});

		// then
		expect(await shouldAbortRequest()).toBe(false);
	}

	protected async shouldNotAbortRequestWhenRuleRecordsMissing(): Promise<void> {
		// given
		const inspector = this.createInspector([]);

		// when
		const shouldAbortRequest = () =>
			inspector.shouldAbortRequest(new Address4("127.0.0.1"), {}, {});

		// then
		expect(await shouldAbortRequest()).toBe(false);
	}

	protected createInspector(ruleRecords: RuleRecord[]): RequestRulesInspector {
		const userAccessRulesStorage = this.mockRulesStorage(ruleRecords);

		return new RequestRulesInspector(userAccessRulesStorage);
	}

	protected mockRulesStorage(ruleRecords: RuleRecord[]): RulesStorage {
		return {
			async insert(record: Rule): Promise<RuleRecord> {
				return Promise.resolve({
					isUserBlocked: false,
					_id: "none",
				});
			},

			async insertMany(records: Rule[]): Promise<RuleRecord[]> {
				return Promise.resolve(ruleRecords);
			},

			async find(
				filters: SearchRuleFilters,
				filterSettings?: SearchRuleFilterSettings,
			): Promise<RuleRecord[]> {
				return Promise.resolve(ruleRecords);
			},

			async deleteMany(recordFilters: DeleteRuleFilters[]): Promise<void> {
				return Promise.resolve();
			},

			async countRecords(): Promise<number> {
				return Promise.resolve(ruleRecords.length);
			},
		};
	}
}

describe("RequestRulesInspector", () => {
	const tests = new TestRequestRulesInspector();

	tests.runAll();
});
