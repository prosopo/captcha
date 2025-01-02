import { describe, expect, it } from "vitest";
import { BlacklistRequestInspector } from "../../../api/blacklistRequestInspector.js";
import type {
	RuleFilters,
	RuleFilterSettings,
	UserAccessRuleRecord,
	UserAccessRulesStorage,
} from "@prosopo/types-database";
import { ApiPrefix } from "@prosopo/types";
import { Types } from "mongoose";

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
				name: "shouldAbortRequestWhenUserAccessRuleRecordContainsBlockedFlag",
				method: () =>
					this.shouldAbortRequestWhenUserAccessRuleRecordContainsBlockedFlag(),
			},
			{
				name: "shouldAbortRequestWhenAnyRuleFromUserAccessRuleRecordsContainsBlockedFlag",
				method: () =>
					this.shouldAbortRequestWhenAnyRuleFromUserAccessRuleRecordsContainsBlockedFlag(),
			},
			{
				name: "shouldNotAbortRequestWhenUserAccessRuleRecordsDoNotContainBlockedFlag",
				method: () =>
					this.shouldNotAbortRequestWhenUserAccessRuleRecordsDoNotContainBlockedFlag(),
			},
			{
				name: "shouldNotAbortRequestWhenUserAccessRuleRecordsMissing",
				method: () =>
					this.shouldNotAbortRequestWhenUserAccessRuleRecordsMissing(),
			},
		];
	}

	protected async shouldAbortRequestWhenUserAccessRuleRecordContainsBlockedFlag(): Promise<void> {
		// given
		const apiRoute = `${ApiPrefix}/route`;
		const accessRuleRecord: UserAccessRuleRecord = {
			isUserBlocked: true,
			_id: new Types.ObjectId(0),
		};

		// when
		const inspector = this.createInspector([accessRuleRecord]);

		const shouldAbortRequest = () =>
			inspector.shouldAbortRequest(apiRoute, "127.0.0.1", {}, {});

		// then
		expect(await shouldAbortRequest()).toBe(true);
	}

	protected async shouldAbortRequestWhenAnyRuleFromUserAccessRuleRecordsContainsBlockedFlag(): Promise<void> {
		// given
		const apiRoute = `${ApiPrefix}/route`;
		const accessRuleRecordWithoutBlock: UserAccessRuleRecord = {
			isUserBlocked: false,
			_id: new Types.ObjectId(0),
		};
		const accessRuleRecordWithBlock: UserAccessRuleRecord = {
			isUserBlocked: true,
			_id: new Types.ObjectId(1),
		};

		// when
		const inspector = this.createInspector([
			accessRuleRecordWithoutBlock,
			accessRuleRecordWithBlock,
		]);

		const shouldAbortRequest = () =>
			inspector.shouldAbortRequest(apiRoute, "127.0.0.1", {}, {});

		// then
		expect(await shouldAbortRequest()).toBe(true);
	}

	protected async shouldNotAbortRequestWhenUserAccessRuleRecordsDoNotContainBlockedFlag(): Promise<void> {
		// given
		const apiRoute = `${ApiPrefix}/route`;
		const accessRuleRecordWithoutBlock: UserAccessRuleRecord = {
			isUserBlocked: false,
			_id: new Types.ObjectId(0),
		};
		const accessRuleRecordWithBlock: UserAccessRuleRecord = {
			isUserBlocked: false,
			_id: new Types.ObjectId(1),
		};

		// when
		const inspector = this.createInspector([
			accessRuleRecordWithoutBlock,
			accessRuleRecordWithBlock,
		]);

		const shouldAbortRequest = () =>
			inspector.shouldAbortRequest(apiRoute, "127.0.0.1", {}, {});

		// then
		expect(await shouldAbortRequest()).toBe(false);
	}

	protected async shouldNotAbortRequestWhenUserAccessRuleRecordsMissing(): Promise<void> {
		// given
		const apiRoute = `${ApiPrefix}/route`;

		// when
		const inspector = this.createInspector([]);

		const shouldAbortRequest = () =>
			inspector.shouldAbortRequest(apiRoute, "127.0.0.1", {}, {});

		// then
		expect(await shouldAbortRequest()).toBe(false);
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
