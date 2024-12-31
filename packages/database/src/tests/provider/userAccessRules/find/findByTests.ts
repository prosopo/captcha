import { expect } from "vitest";
import { UserAccessRuleTestsBase } from "../userAccessRuleTestsBase.js";
import type { RuleFilters, UserAccessRule } from "@prosopo/types-database";

abstract class FindByTests extends UserAccessRuleTestsBase {
	protected abstract getRecord(): Partial<UserAccessRule>;

	protected abstract getRecordFilters(): RuleFilters;

	protected abstract getOtherRecordFilters(): RuleFilters;

	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return [
			{
				name: "findsGlobalRecord",
				method: async () => this.findsGlobalRecord(),
			},
			{
				name: "findsClientRecord",
				method: async () => this.findsClientRecord(),
			},
			{
				name: "findsClientRecordWithoutGlobalRecordWhenFlagIsNotSet",
				method: async () =>
					this.findsClientRecordWithoutGlobalRecordWhenFlagIsNotSet(),
			},
			{
				name: "findsClientAndGlobalRecordsWhenFlagIsSet",
				method: async () => this.findsClientAndGlobalRecordsWhenFlagIsSet(),
			},
			{
				name: "ignoresGlobalRecordWithDifferentValue",
				method: async () => this.ignoresGlobalRecordWithDifferentValue(),
			},
			{
				name: "ignoresClientRecordWithDifferentValue",
				method: async () => this.ignoresClientRecordWithDifferentValue(),
			},
			{
				name: "ignoresDifferentClientRecordWithSameValue",
				method: async () => this.ignoresDifferentClientRecordWithSameValue(),
			},
			{
				name: "ignoresClientRecordWithSameValueWhenGlobalIsRequested",
				method: async () =>
					this.ignoresClientRecordWithSameValueWhenGlobalIsRequested(),
			},
		];
	}

	protected async findsGlobalRecord(): Promise<void> {
		// given
		const record = await this.model.create(this.getRecord());

		// when
		const rules = await this.userAccessRules.find(
			null,
			this.getRecordFilters(),
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async findsClientRecord(): Promise<void> {
		// given
		const clientRecord = await this.model.create({
			clientAccountId: "client",
			...this.getRecord(),
		});

		// when
		const rules = await this.userAccessRules.find(
			"client",
			this.getRecordFilters(),
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(clientRecord.id);
	}

	protected async findsClientRecordWithoutGlobalRecordWhenFlagIsNotSet(): Promise<void> {
		// given
		const clientRecord = await this.model.create({
			clientAccountId: "client",
			...this.getRecord(),
		});

		await this.model.create(this.getRecord());

		// when
		const rules = await this.userAccessRules.find(
			"client",
			this.getRecordFilters(),
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(clientRecord.id);
	}

	protected async findsClientAndGlobalRecordsWhenFlagIsSet(): Promise<void> {
		// given
		const clientRecord = await this.model.create({
			clientAccountId: "client",
			...this.getRecord(),
		});

		const globalRecord = await this.model.create(this.getRecord());

		// when
		const rules = await this.userAccessRules.find(
			"client",
			this.getRecordFilters(),
			{
				includeWithoutClientId: true,
			},
		);

		// then
		expect(rules.length).toBe(2);
		expect(rules[0]?.id).toBe(clientRecord.id);
		expect(rules[1]?.id).toBe(globalRecord.id);
	}

	protected async ignoresGlobalRecordWithDifferentValue(): Promise<void> {
		// given
		await this.model.create(this.getRecord());

		// when
		const rules = await this.userAccessRules.find(
			null,
			this.getOtherRecordFilters(),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithDifferentValue(): Promise<void> {
		// given
		await this.model.create({
			clientAccountId: "client",
			...this.getRecord(),
		});

		// when
		const rules = await this.userAccessRules.find(
			"client",
			this.getOtherRecordFilters(),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresDifferentClientRecordWithSameValue(): Promise<void> {
		// given
		await this.model.create({
			clientAccountId: "client",
			...this.getRecord(),
		});

		// when
		const rules = await this.userAccessRules.find(
			"another",
			this.getRecordFilters(),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithSameValueWhenGlobalIsRequested(): Promise<void> {
		// given
		await this.model.create({
			clientAccountId: "client",
			...this.getRecord(),
		});

		// when
		const rules = await this.userAccessRules.find(
			null,
			this.getRecordFilters(),
		);

		// then
		expect(rules.length).toBe(0);
	}
}

export { FindByTests };
