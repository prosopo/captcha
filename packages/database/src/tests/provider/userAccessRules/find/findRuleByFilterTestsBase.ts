import { UserAccessRuleTestsBase } from "../userAccessRuleTestsBase.js";
import { expect } from "vitest";
import { Address4 } from "ip-address";
import type { RuleFilters, UserAccessRule } from "@prosopo/types-database";

abstract class FindRuleByFilterTestsBase extends UserAccessRuleTestsBase {
	protected abstract getClientAccountId(): string | null;

	protected abstract getOtherClientAccountId(): string | null;

	protected abstract getRecord(): Partial<UserAccessRule>;

	protected abstract getRecordFilters(): RuleFilters;

	protected abstract getOtherRecordFilters(): RuleFilters;

	protected getTests(): { name: string; method: () => Promise<void> }[] {
		return [
			{
				name: "findsRecord",
				method: () => this.findsRecord(),
			},
			{
				name: "ignoresRecordWithDifferentClientAccountId",
				method: () => this.ignoresRecordWithDifferentClientAccountId(),
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
		const record = await this.model.create(this.getRecord());

		// when
		const rules = await this.userAccessRules.find(this.getClientAccountId());

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async ignoresRecordWithDifferentClientAccountId(): Promise<void> {
		// given
		await this.model.create(this.getRecord());

		// when
		const rules = await this.userAccessRules.find(
			this.getOtherClientAccountId(),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async findsRecordByFilters(): Promise<void> {
		// given
		const record = await this.model.create(this.getRecord());

		// when
		const rules = await this.userAccessRules.find(
			this.getClientAccountId(),
			this.getRecordFilters(),
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async ignoresRecordWithDifferentValues(): Promise<void> {
		// given
		await this.model.create(this.getRecord());

		// when
		const rules = await this.userAccessRules.find(
			this.getClientAccountId(),
			this.getOtherRecordFilters(),
		);

		// then
		expect(rules.length).toBe(0);
	}
}

export { FindRuleByFilterTestsBase };
