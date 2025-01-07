import { expect } from "vitest";
import TestRulesStorageBase from "../../test/testRulesStorageBase.js";
import type Rule from "../../../rule.js";
import type SearchRuleFilters from "../searchRuleFilters.js";

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

export default TestFindRuleBase;
