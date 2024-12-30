import { expect } from "vitest";
import { MongoUserAccessRuleTests } from "../mongoUserAccessRuleTests.js";
import type { UserIp, UserIpVersion } from "@prosopo/types-database";

abstract class FindByUserIpTests extends MongoUserAccessRuleTests {
	protected abstract getUserIpVersion(): UserIpVersion;

	protected abstract getFirstUserIpObject(): UserIp;

	protected abstract getFirstUserIp(): bigint | string;

	protected abstract getSecondUserIp(): bigint | string;

	protected abstract getFirstUserIpObjectInAnotherVersion(): UserIp;

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
			userIp: this.getFirstUserIpObject(),
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpVersion(),
			this.getFirstUserIp(),
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async findsClientRecord(): Promise<void> {
		// given
		const clientRecord = await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpVersion(),
			this.getFirstUserIp(),
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
			userIp: this.getFirstUserIpObject(),
			clientAccountId: "client",
		});

		const globalRecord = await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpVersion(),
			this.getFirstUserIp(),
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
			userIp: this.getFirstUserIpObject(),
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpVersion(),
			this.getSecondUserIp(),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresGlobalRecordWithSameIpInDifferentVersion(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObjectInAnotherVersion(),
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpVersion(),
			this.getFirstUserIp(),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithDifferentIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpVersion(),
			this.getSecondUserIp(),
			"client",
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresDifferentClientRecordWithSameIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpVersion(),
			this.getFirstUserIp(),
			"another",
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithSameIpInDifferentVersion(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObjectInAnotherVersion(),
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIp(
			this.getUserIpVersion(),
			this.getFirstUserIp(),
			"client",
		);

		// then
		expect(rules.length).toBe(0);
	}
}

export { FindByUserIpTests };
