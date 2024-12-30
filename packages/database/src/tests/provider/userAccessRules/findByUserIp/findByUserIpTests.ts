import { expect } from "vitest";
import { MongoUserAccessRuleTests } from "../mongoUserAccessRuleTests.js";
import type { UserIp, UserIpVersion } from "@prosopo/types-database";

abstract class FindByUserIpTests extends MongoUserAccessRuleTests {
	protected abstract getUserIpVersion(): UserIpVersion;

	protected abstract getUserIpObject(): UserIp;

	protected abstract getUserIp(): bigint | string;

	protected abstract getAnotherUserIp(): bigint | string;

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
			this.getUserIpVersion(),
			this.getUserIp(),
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
			this.getUserIpVersion(),
			this.getUserIp(),
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
			this.getUserIpVersion(),
			this.getUserIp(),
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
			this.getUserIpVersion(),
			this.getAnotherUserIp(),
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
			this.getUserIpVersion(),
			this.getUserIp(),
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
			this.getUserIpVersion(),
			this.getAnotherUserIp(),
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
			this.getUserIpVersion(),
			this.getUserIp(),
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
			this.getUserIpVersion(),
			this.getUserIp(),
			"client",
		);

		// then
		expect(rules.length).toBe(0);
	}
}

export { FindByUserIpTests };
