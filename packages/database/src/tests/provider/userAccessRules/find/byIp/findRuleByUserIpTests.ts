import { expect } from "vitest";
import type {
	RuleFilters,
	UserAccessRule,
	UserIp,
} from "@prosopo/types-database";
import type { Address4, Address6 } from "ip-address";
import { FindRuleTestsBase } from "../findRuleTestsBase.js";

abstract class FindRuleByUserIpTests extends FindRuleTestsBase {
	protected abstract getUserIpObject(): UserIp;

	protected abstract getUserIpAddress(): Address4 | Address6;

	protected abstract getOtherUserIpAddress(): Address4 | Address6;

	protected abstract getUserIpObjectInOtherVersion(): UserIp;

	protected override getClientAccountId(): string | null {
		return "client";
	}

	protected override getOtherClientAccountId(): string | null {
		return "otherClient";
	}

	protected override getRecord(): Partial<UserAccessRule> {
		const clientAccountId = this.getClientAccountId();

		const record: Partial<UserAccessRule> = {
			isUserBlocked: false,
			userIp: this.getUserIpObject(),
		};

		if (null !== clientAccountId) {
			record.clientAccountId = clientAccountId;
		}

		return record;
	}

	protected override getRecordFilters(): RuleFilters {
		return {
			userIpAddress: this.getUserIpAddress(),
		};
	}

	protected override getOtherRecordFilters(): RuleFilters {
		return {
			userIpAddress: this.getOtherUserIpAddress(),
		};
	}

	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return super.getTests().concat([
			{
				name: "ignoresRecordWithSameIpInDifferentVersion",
				method: async () => this.ignoresRecordWithSameIpInDifferentVersion(),
			},
		]);
	}

	protected async ignoresRecordWithSameIpInDifferentVersion(): Promise<void> {
		// given
		await this.model.create({
			...this.getRecord(),
			userIp: this.getUserIpObjectInOtherVersion(),
		});

		// when
		const rules = await this.userAccessRules.find(
			this.getClientAccountId(),
			this.getRecordFilters(),
		);

		// then
		expect(rules.length).toBe(0);
	}
}

export { FindRuleByUserIpTests };
