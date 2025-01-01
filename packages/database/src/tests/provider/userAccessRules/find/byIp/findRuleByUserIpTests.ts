import { expect } from "vitest";
import type {
	RuleFilters,
	UserAccessRule,
	UserIp,
} from "@prosopo/types-database";
import type { Address4, Address6 } from "ip-address";
import { FindRuleByFilterTestsBase } from "../findRuleByFilterTestsBase.js";

abstract class FindRuleByUserIpTests extends FindRuleByFilterTestsBase {
	protected abstract getUserIpObject(): UserIp;

	protected abstract getUserIpAddress(): Address4 | Address6;

	protected abstract getOtherUserIpAddress(): Address4 | Address6;

	protected abstract getUserIpObjectInOtherVersion(): UserIp;

	protected override getClientId(): string | null {
		return "client";
	}

	protected override getOtherClientId(): string | null {
		return "otherClient";
	}

	protected override getRule(): UserAccessRule {
		const clientId = this.getClientId();

		const record: UserAccessRule = {
			isUserBlocked: false,
			userIp: this.getUserIpObject(),
		};

		if (null !== clientId) {
			record.clientId = clientId;
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
			...this.getRule(),
			userIp: this.getUserIpObjectInOtherVersion(),
		});

		// when
		const rules = await this.userAccessRules.find(
			this.getClientId(),
			this.getRecordFilters(),
		);

		// then
		expect(rules.length).toBe(0);
	}
}

export { FindRuleByUserIpTests };
