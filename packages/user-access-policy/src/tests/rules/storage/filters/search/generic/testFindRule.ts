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
import { Address4 } from "ip-address";
import { expect } from "vitest";
import {TestFindRuleBase} from "@tests/rules/storage/filters/search/testFindRuleBase.js";
import type {Rule} from "@rules/rule/rule.js";
import type {SearchRuleFilters} from "@rules/storage/filters/search/searchRuleFilters.js";

class TestFindRule extends TestFindRuleBase {
	private readonly userIp: Address4 = new Address4("192.168.1.1");
	private readonly otherUserIp: Address4 = new Address4("192.168.1.2");
	private readonly userId: string = "userId";
	private readonly otherUserId: string = "otherUserId";

	protected getClientId(): string | undefined {
		return "client";
	}

	protected getOtherClientId(): string | undefined {
		return "other";
	}

	protected getRule(): Rule {
		const clientId = this.getClientId();

		const record: Rule = {
			isUserBlocked: false,
			userId: this.userId,
			userIp: {
				v4: {
					asNumeric: this.userIp.bigInt(),
					asString: this.userIp.bigInt().toString(),
				},
			},
		};

		if (null !== clientId) {
			record.clientId = clientId;
		}

		return record;
	}

	protected getRecordFilters(): SearchRuleFilters {
		return {
			userId: this.userId,
			userIpAddress: this.userIp,
		};
	}

	protected getOtherRecordFilters(): SearchRuleFilters {
		return {
			userId: this.otherUserId,
		};
	}

	protected getPartialMatchRecordFilters(): SearchRuleFilters {
		return {
			userId: this.userId,
			userIpAddress: this.otherUserIp,
		};
	}

	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return super.getTests().concat([
			{
				name: "ignoresPartialFilterMatchesWhenFlagIsNotSet",
				method: () => this.ignoresPartialFilterMatchesWhenFlagIsNotSet(),
			},
			{
				name: "includesPartialFilterMatchesWhenFlagIsSet",
				method: () => this.includesPartialFilterMatchesWhenFlagIsSet(),
			},
			{
				name: "ignoresRecordsWithoutClientIdWhenFlagIsNotSet",
				method: () => this.ignoresRecordsWithoutClientIdWhenFlagIsNotSet(),
			},
			{
				name: "includesRecordsWithoutClientIdWhenFlagIsSet",
				method: () => this.includesRecordsWithoutClientIdWhenFlagIsSet(),
			},
		]);
	}

	protected async ignoresPartialFilterMatchesWhenFlagIsNotSet(): Promise<void> {
		// given
		await this.rulesStorage.insert(this.getRule());

		// when
		const rules = await this.rulesStorage.find({
			clientId: this.getClientId(),
			...this.getPartialMatchRecordFilters(),
		});

		// then
		expect(rules.length).toBe(0);
	}

	protected async includesPartialFilterMatchesWhenFlagIsSet(): Promise<void> {
		// given
		const record = await this.rulesStorage.insert(this.getRule());

		// when
		const rules = await this.rulesStorage.find(
			{
				clientId: this.getClientId(),
				...this.getPartialMatchRecordFilters(),
			},
			{
				includeRecordsWithPartialFilterMatches: true,
			},
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?._id).toBe(record._id);
	}

	protected async ignoresRecordsWithoutClientIdWhenFlagIsNotSet(): Promise<void> {
		// given
		await this.rulesStorage.insert({
			...this.getRule(),
			clientId: undefined,
		});

		// when
		const rules = await this.rulesStorage.find({
			clientId: this.getClientId(),
		});

		// then
		expect(rules.length).toBe(0);
	}

	protected async includesRecordsWithoutClientIdWhenFlagIsSet(): Promise<void> {
		// given
		const recordData = this.getRule();

		const { clientId, ...recordDataWithoutClientId } = recordData;

		const recordWithoutClientId = await this.rulesStorage.insert(
			recordDataWithoutClientId,
		);

		// when
		const rules = await this.rulesStorage.find(
			{
				clientId: this.getClientId(),
			},
			{
				includeRecordsWithoutClientId: true,
			},
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?._id).toBe(recordWithoutClientId._id);
	}
}

export { TestFindRule };
