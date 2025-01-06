import { ApiPrefix } from "@prosopo/types";
import type {
	DeleteRuleFilters,
	SearchRuleFilterSettings,
	SearchRuleFilters,
	UserAccessRule,
	UserAccessRuleRecord,
	UserAccessRulesStorage,
} from "@prosopo/types-database";
import { Types } from "mongoose";
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
import { describe, expect, it } from "vitest";
import { BlacklistRequestInspector } from "../../../api/blacklistRequestInspector.js";

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
			insertMany(records: UserAccessRule[]): Promise<UserAccessRuleRecord[]> {
				return Promise.resolve(userAccessRuleRecords);
			},
			find(
				filters?: SearchRuleFilters | null,
				filterSettings?: SearchRuleFilterSettings | null,
			): Promise<UserAccessRuleRecord[]> {
				return Promise.resolve(userAccessRuleRecords);
			},
			deleteMany(recordFilters: DeleteRuleFilters[]): Promise<void> {
				return Promise.resolve();
			},
		};
	}
}

describe("BlacklistRequestInspector", () => {
	const tester = new BlacklistRequestInspectorTester();

	tester.test();
});
