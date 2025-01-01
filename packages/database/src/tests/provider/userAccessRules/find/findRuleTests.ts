import { FindRuleByFilterTestsBase } from "./findRuleByFilterTestsBase.js";
import type { RuleFilters, UserAccessRule } from "@prosopo/types-database";
import { Address4 } from "ip-address";
import { expect } from "vitest";

class FindRuleTests extends FindRuleByFilterTestsBase {
	private readonly userIp: Address4 = new Address4("192.168.1.1");
	private readonly otherUserIp: Address4 = new Address4("192.168.1.2");
	private readonly userId: string = "userId";
	private readonly otherUserId: string = "otherUserId";

	getName(): string {
		return "FindRuleTests";
	}

	protected getClientId(): string | null {
		return "client";
	}

	protected getOtherClientId(): string | null {
		return "other";
	}

	protected getRule(): UserAccessRule {
		const clientId = this.getClientId();

		const record: UserAccessRule = {
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

	protected getRecordFilters(): RuleFilters {
		return {
			userId: this.userId,
			userIpAddress: this.userIp,
		};
	}

	protected getOtherRecordFilters(): RuleFilters {
		return {
			userId: this.otherUserId,
		};
	}

	protected getPartialMatchRecordFilters(): RuleFilters {
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
		await this.model.create(this.getRule());

		// when
		const rules = await this.userAccessRules.find(
			this.getClientId(),
			this.getPartialMatchRecordFilters(),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async includesPartialFilterMatchesWhenFlagIsSet(): Promise<void> {
		// given
		const record = await this.model.create(this.getRule());

		// when
		const rules = await this.userAccessRules.find(
			this.getClientId(),
			this.getPartialMatchRecordFilters(),
			{
				includeRecordsWithPartialFilterMatches: true,
			},
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async ignoresRecordsWithoutClientIdWhenFlagIsNotSet(): Promise<void> {
		// given
		await this.model.create({
			...this.getRule(),
			clientId: null,
		});

		// when
		const rules = await this.userAccessRules.find(this.getClientId());

		// then
		expect(rules.length).toBe(0);
	}

	protected async includesRecordsWithoutClientIdWhenFlagIsSet(): Promise<void> {
		// given
		const recordData = this.getRule();

		const { clientId, ...recordDataWithoutClientId } = recordData;

		const recordWithoutClientId = await this.model.create(recordDataWithoutClientId);

		// when
		const rules = await this.userAccessRules.find(this.getClientId(), null, {
			includeRecordsWithoutClientId: true,
		});

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(recordWithoutClientId.id);
	}
}

export { FindRuleTests };
