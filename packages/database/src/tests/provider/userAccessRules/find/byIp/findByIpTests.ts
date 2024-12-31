import { expect } from "vitest";
import type {
	RuleFilters,
	UserAccessRule,
	UserIp,
} from "@prosopo/types-database";
import type { Address4, Address6 } from "ip-address";
import { FindByTests } from "../findByTests.js";

abstract class FindByIpTests extends FindByTests {
	protected abstract getUserIpObject(): UserIp;

	protected abstract getUserIpAddress(): Address4 | Address6;

	protected abstract getAnotherUserIpAddress(): Address4 | Address6;

	protected abstract getUserIpObjectInAnotherVersion(): UserIp;

	protected override getRecord(): Partial<UserAccessRule> {
		return {
			isUserBlocked: false,
			userIp: this.getUserIpObject(),
		};
	}

	protected override getRecordFilters(): RuleFilters {
		return {
			userIpAddress: this.getUserIpAddress(),
		};
	}

	protected override getOtherRecordFilters(): RuleFilters {
		return {
			userIpAddress: this.getAnotherUserIpAddress(),
		};
	}

	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return super.getTests().concat([
			{
				name: "ignoresGlobalRecordWithSameIpInDifferentVersion",
				method: async () =>
					this.ignoresGlobalRecordWithSameIpInDifferentVersion(),
			},
			{
				name: "ignoresClientRecordWithSameIpInDifferentVersion",
				method: async () =>
					this.ignoresClientRecordWithSameIpInDifferentVersion(),
			},
		]);
	}

	protected async ignoresGlobalRecordWithSameIpInDifferentVersion(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getUserIpObjectInAnotherVersion(),
		});

		// when
		const rules = await this.userAccessRules.find(null, {
			userIpAddress: this.getUserIpAddress(),
		});

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithSameIpInDifferentVersion(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getUserIpObjectInAnotherVersion(),
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.find("client", {
			userIpAddress: this.getUserIpAddress(),
		});

		// then
		expect(rules.length).toBe(0);
	}
}

export { FindByIpTests };
