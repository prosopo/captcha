import type { Address4, Address6 } from "ip-address";
import { expect } from "vitest";
import TestFindRuleBase from "../testFindRuleBase.js";
import type Ip from "../../../../../ip/ip.js";
import type Rule from "../../../../rule.js";
import type SearchRuleFilters from "../../searchRuleFilters.js";

abstract class TestFindByIpBase extends TestFindRuleBase {
	protected abstract getUserIpObject(): Ip;

	protected abstract getUserIpAddress(): Address4 | Address6;

	protected abstract getOtherUserIpAddress(): Address4 | Address6;

	protected abstract getUserIpObjectInOtherVersion(): Ip;

	protected override getClientId(): string | undefined {
		return "client";
	}

	protected override getOtherClientId(): string | undefined {
		return "otherClient";
	}

	protected override getRule(): Rule {
		const clientId = this.getClientId();

		const record: Rule = {
			isUserBlocked: false,
			userIp: this.getUserIpObject(),
		};

		if (null !== clientId) {
			record.clientId = clientId;
		}

		return record;
	}

	protected override getRecordFilters(): SearchRuleFilters {
		return {
			userIpAddress: this.getUserIpAddress(),
		};
	}

	protected override getOtherRecordFilters(): SearchRuleFilters {
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
		await this.rulesStorage.insert({
			...this.getRule(),
			userIp: this.getUserIpObjectInOtherVersion(),
		});

		// when
		const rules = await this.rulesStorage.find({
			clientId: this.getClientId(),
			...this.getRecordFilters(),
		});

		// then
		expect(rules.length).toBe(0);
	}
}

export { TestFindByIpBase };
