import { FindRuleTestsBase } from "./findRuleTestsBase.js";
import type { RuleFilters, UserAccessRule } from "@prosopo/types-database";
import { Address4 } from "ip-address";
import { expect } from "vitest";

class FindRuleTests extends FindRuleTestsBase {
	private readonly userIp: Address4 = new Address4("192.168.1.1");
	private readonly otherUserIp: Address4 = new Address4("192.168.1.2");
	private readonly userId: string = "userId";
	private readonly otherUserId: string = "otherUserId";

	getName(): string {
		return "FindRuleTests";
	}

	protected getClientAccountId(): string | null {
		return "client";
	}

	protected getOtherClientAccountId(): string | null {
		return "other";
	}

	protected getRecord(): Partial<UserAccessRule> {
		const clientAccountId = this.getClientAccountId();

		const record: Partial<UserAccessRule> = {
			isUserBlocked: false,
			userId: this.userId,
			userIp: {
				v4: {
					asNumeric: this.userIp.bigInt(),
					asString: this.userIp.bigInt().toString(),
				},
			},
		};

		if (null !== clientAccountId) {
			record.clientAccountId = clientAccountId;
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
		]);
	}

	protected async ignoresPartialFilterMatchesWhenFlagIsNotSet(): Promise<void> {
		// given
		await this.model.create(this.getRecord());

		// when
		const rules = await this.userAccessRules.find(
			this.getClientAccountId(),
			this.getPartialMatchRecordFilters(),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async includesPartialFilterMatchesWhenFlagIsSet(): Promise<void> {
		// given
		const record = await this.model.create(this.getRecord());

		// when
		const rules = await this.userAccessRules.find(
			this.getClientAccountId(),
			this.getPartialMatchRecordFilters(),
			{
				includePartialFilterMatches: true,
			},
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}
}

export { FindRuleTests };
