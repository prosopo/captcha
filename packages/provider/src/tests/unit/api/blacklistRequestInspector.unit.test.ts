import { describe, expect, it } from "vitest";
import { BlacklistRequestInspector } from "../../../api/blacklistRequestInspector.js";
import type {
	RuleFilters,
	RuleFilterSettings,
	UserAccessRuleRecord,
	UserAccessRulesStorage,
} from "@prosopo/types-database";
import { ApiPrefix } from "@prosopo/types";

class BlacklistRequestInspectorTester {
	public test(): void {
		const tests = this.getTests();

		for (const test of tests) {
			it(test.name, async () => {
				await test.method();
			});
		}
	}

	protected getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return [
			{
				name: "abortsRequestWhenUserAccessRuleRecordContainsBlockedFlag",
				method: () =>
					this.abortsRequestWhenUserAccessRuleRecordContainsBlockedFlag(),
			},
			{
				name: "abortsRequestWhenAnyRuleFromUserAccessRuleRecordsContainsBlockedFlag",
				method: () =>
					this.abortsRequestWhenAnyRuleFromUserAccessRuleRecordsContainsBlockedFlag(),
			},
			{
				name: "continuesRequestWhenUserAccessRuleRecordsDoNotContainBlockedFlag",
				method: () =>
					this.continuesRequestWhenUserAccessRuleRecordsDoNotContainBlockedFlag(),
			},
			{
				name: "continuesRequestWhenUserAccessRuleRecordsMissing",
				method: () => this.continuesRequestWhenUserAccessRuleRecordsMissing(),
			},
		];
	}

	protected async abortsRequestWhenUserAccessRuleRecordContainsBlockedFlag(): Promise<void> {
		// given
		const apiRoute = `${ApiPrefix}/route`;
		const accessRuleRecord: UserAccessRuleRecord = {
			isUserBlocked: true,
			_id: "0",
		};

		// when
		const inspector = this.createInspector([accessRuleRecord]);

		const shouldAbortRequest = () =>
			inspector.shouldAbortRequest(apiRoute, "127.0.0.1", {}, {});

		// then
		expect(await shouldAbortRequest()).toBe(true);
	}

	protected async abortsRequestWhenAnyRuleFromUserAccessRuleRecordsContainsBlockedFlag(): Promise<void> {
		// todo
	}

	protected async continuesRequestWhenUserAccessRuleRecordsDoNotContainBlockedFlag(): Promise<void> {
		// todo
	}

	protected async continuesRequestWhenUserAccessRuleRecordsMissing(): Promise<void> {
		// todo
	}

	protected createInspector(
		userAccessRuleRecords: UserAccessRuleRecord[],
	): BlacklistRequestInspector {
		const userAccessRulesStorage = this.mockUserAccessRulesStorage(
			userAccessRuleRecords,
		);
		const environmentReadinessWaiter = () => Promise.resolve();
		const logger = null;

		return new BlacklistRequestInspector(
			userAccessRulesStorage,
			environmentReadinessWaiter,
			logger,
		);
	}

	protected mockUserAccessRulesStorage(
		userAccessRuleRecords: UserAccessRuleRecord[],
	): UserAccessRulesStorage {
		return {
			find(
				clientId: string | null,
				filters?: RuleFilters | null,
				filterSettings?: RuleFilterSettings | null,
			): Promise<UserAccessRuleRecord[]> {
				return Promise.resolve(userAccessRuleRecords);
			},
		};
	}
}

describe("BlacklistRequestInspector", () => {
	const tester = new BlacklistRequestInspectorTester();

	tester.test();
});
