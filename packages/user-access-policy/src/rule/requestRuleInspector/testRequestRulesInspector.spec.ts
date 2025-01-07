import { describe, expect } from "vitest";
import { TestsBase } from "../../testsBase.js";
import RequestRulesInspector from "./requestRulesInspector.js";
import type RulesStorage from "../storage/rulesStorage.js";
import type Rule from "../rule.js";
import { Address4 } from "ip-address";
import type RuleRecord from "../storage/record/ruleRecord.js";
import type SearchRuleFilters from "../storage/search/searchRuleFilters.js";
import type SearchRuleFilterSettings from "../storage/search/searchRuleFilterSettings.js";
import type DeleteRuleFilters from "../storage/delete/deleteRuleFilters.js";

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
		};
	}
}

describe("RequestRulesInspector", () => {
	const tests = new TestRequestRulesInspector();

	tests.runAll();
});
