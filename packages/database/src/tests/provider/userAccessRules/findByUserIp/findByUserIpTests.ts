import { expect } from "vitest";
import { UserAccessRuleTestsBase } from "../userAccessRuleTestsBase.js";
import type { UserIp } from "@prosopo/types-database";
import type { Address4, Address6 } from "ip-address";

abstract class FindByUserIpTests extends UserAccessRuleTestsBase {
	protected abstract getUserIpObject(): UserIp;

	protected abstract getUserIpAddress(): Address4 | Address6;

	protected abstract getAnotherUserIpAddress(): Address4 | Address6;

	protected abstract getUserIpObjectInAnotherVersion(): UserIp;

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
				name: "findsGlobalAndClientRecords",
				method: async () => this.findsGlobalAndClientRecords(),
			},
			{
				name: "ignoresGlobalRecordWithDifferentIp",
				method: async () => this.ignoresGlobalRecordWithDifferentIp(),
			},
			{
				name: "ignoresGlobalRecordWithSameIpInDifferentVersion",
				method: async () =>
					this.ignoresGlobalRecordWithSameIpInDifferentVersion(),
			},
			{
				name: "ignoresGlobalRecordWithSameIpInDifferentVersion",
				method: async () =>
					this.ignoresGlobalRecordWithSameIpInDifferentVersion(),
			},
			{
				name: "ignoresClientRecordWithDifferentIp",
				method: async () => this.ignoresClientRecordWithDifferentIp(),
			},
			{
				name: "ignoresDifferentClientRecordWithSameIp",
				method: async () => this.ignoresDifferentClientRecordWithSameIp(),
			},
			{
				name: "ignoresClientRecordWithSameIpInDifferentVersion",
				method: async () =>
					this.ignoresClientRecordWithSameIpInDifferentVersion(),
			},
		];
	}

	protected async findsGlobalRecord(): Promise<void> {
		// given
		const record = await this.model.create({
			isUserBlocked: true,
			userIp: this.getUserIpObject(),
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpAddress(),
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async findsClientRecord(): Promise<void> {
		// given
		const clientRecord = await this.model.create({
			isUserBlocked: true,
			userIp: this.getUserIpObject(),
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpAddress(),
			"client",
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(clientRecord.id);
	}

	protected async findsGlobalAndClientRecords(): Promise<void> {
		// given
		const clientRecord = await this.model.create({
			isUserBlocked: true,
			userIp: this.getUserIpObject(),
			clientAccountId: "client",
		});

		const globalRecord = await this.model.create({
			isUserBlocked: true,
			userIp: this.getUserIpObject(),
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpAddress(),
			"client",
		);

		// then
		expect(rules.length).toBe(2);
		expect(rules[0]?.id).toBe(clientRecord.id);
		expect(rules[1]?.id).toBe(globalRecord.id);
	}

	protected async ignoresGlobalRecordWithDifferentIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getUserIpObject(),
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getAnotherUserIpAddress(),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresGlobalRecordWithSameIpInDifferentVersion(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getUserIpObjectInAnotherVersion(),
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpAddress(),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithDifferentIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getUserIpObject(),
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getAnotherUserIpAddress(),
			"client",
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresDifferentClientRecordWithSameIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getUserIpObject(),
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpAddress(),
			"another",
		);

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
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpAddress(),
			"client",
		);

		// then
		expect(rules.length).toBe(0);
	}
}

export { FindByUserIpTests };
