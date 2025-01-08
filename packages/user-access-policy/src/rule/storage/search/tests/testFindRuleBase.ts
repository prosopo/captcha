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
import { expect } from "vitest";
import type {Rule} from "../../../rule.js";
import {TestRulesStorageBase} from "../../test/testRulesStorageBase.js";
import type {SearchRuleFilters} from "../searchRuleFilters.js";

abstract class TestFindRuleBase extends TestRulesStorageBase {
	protected abstract getClientId(): string | undefined;

	protected abstract getOtherClientId(): string | undefined;

	protected abstract getRule(): Rule;

	protected abstract getRecordFilters(): SearchRuleFilters;

	protected abstract getOtherRecordFilters(): SearchRuleFilters;

	protected getTests(): { name: string; method: () => Promise<void> }[] {
		return [
			{
				name: "findsRecord",
				method: () => this.findsRecord(),
			},
			{
				name: "ignoresRecordWithDifferentClientId",
				method: () => this.ignoresRecordWithDifferentClientId(),
			},
			{
				name: "findsRecordByFilters",
				method: () => this.findsRecordByFilters(),
			},
			{
				name: "ignoresRecordWithDifferentValues",
				method: () => this.ignoresRecordWithDifferentValues(),
			},
		];
	}

	protected async findsRecord(): Promise<void> {
		// given
		const record = await this.rulesStorage.insert(this.getRule());

		// when
		const rules = await this.rulesStorage.find({
			clientId: this.getClientId(),
		});

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?._id.toString()).toBe(record._id.toString());
	}

	protected async ignoresRecordWithDifferentClientId(): Promise<void> {
		// given
		await this.rulesStorage.insert(this.getRule());

		// when
		const rules = await this.rulesStorage.find({
			clientId: this.getOtherClientId(),
		});

		// then
		expect(rules.length).toBe(0);
	}

	protected async findsRecordByFilters(): Promise<void> {
		// given
		const record = await this.rulesStorage.insert(this.getRule());

		// when
		const rules = await this.rulesStorage.find({
			clientId: this.getClientId(),
			...this.getRecordFilters(),
		});

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?._id.toString()).toBe(record._id.toString());
	}

	protected async ignoresRecordWithDifferentValues(): Promise<void> {
		// given
		await this.rulesStorage.insert(this.getRule());

		// when
		const rules = await this.rulesStorage.find({
			clientId: this.getClientId(),
			...this.getOtherRecordFilters(),
		});

		// then
		expect(rules.length).toBe(0);
	}
}

export { TestFindRuleBase};
