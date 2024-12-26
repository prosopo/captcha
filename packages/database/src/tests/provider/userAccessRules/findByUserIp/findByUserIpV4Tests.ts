import { expect } from "vitest";
import { MongoUserAccessRuleTests } from "../mongoUserAccessRuleTests.js";
import { Address4 } from "ip-address";
import { Int32, Long } from "mongodb";

class FindByUserIpV4Tests extends MongoUserAccessRuleTests {
	protected getFirstUserIp(): string {
		return "192.168.1.1";
	}

	protected getSecondUserIp(): string {
		return "127.0.0.1";
	}

	protected convertUserIpToNumeric(userIp: string): bigint {
		const address = new Address4(userIp);

		if (!address.isCorrect()) {
			throw new Error(`Invalid IP: ${userIp}`);
		}

		return address.bigInt();
	}

	protected getTestName(): string {
		return "FindByUserIpV4";
	}

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
		const userIp = this.getFirstUserIp();
		const userIpAsNumeric = this.convertUserIpToNumeric(userIp);

		const record = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: userIpAsNumeric,
					asString: userIp,
				},
			},
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV4(userIpAsNumeric);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async findsClientRecord(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();
		const userIpAsNumeric = this.convertUserIpToNumeric(userIp);

		const clientRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: userIpAsNumeric,
					asString: userIp,
				},
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV4(
			userIpAsNumeric,
			"client",
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(clientRecord.id);
	}

	protected async findsGlobalAndClientRecords(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();
		const userIpAsNumeric = this.convertUserIpToNumeric(userIp);

		const clientRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: userIpAsNumeric,
					asString: userIp,
				},
			},
			clientAccountId: "client",
		});

		const globalRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: userIpAsNumeric,
					asString: userIp,
				},
			},
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV4(
			userIpAsNumeric,
			"client",
		);

		// then
		expect(rules.length).toBe(2);
		expect(rules[0]?.id).toBe(clientRecord.id);
		expect(rules[1]?.id).toBe(globalRecord.id);
	}

	protected async ignoresGlobalRecordWithDifferentIp(): Promise<void> {
		// given
		const firstUserIp = this.getFirstUserIp();
		const firstUserIpAsNumeric = this.convertUserIpToNumeric(firstUserIp);

		const secondUserIp = this.getSecondUserIp();
		const secondUserIpAsNumeric = this.convertUserIpToNumeric(secondUserIp);

		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: firstUserIpAsNumeric,
					asString: firstUserIp,
				},
			},
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV4(
			secondUserIpAsNumeric,
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresGlobalRecordWithSameIpInDifferentVersion(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();
		const userIpAsNumeric = this.convertUserIpToNumeric(userIp);

		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: userIpAsNumeric.toString(),
					asString: userIp,
				},
			},
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV4(userIpAsNumeric);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithDifferentIp(): Promise<void> {
		// given
		const firstUserIp = this.getFirstUserIp();
		const firstUserIpAsNumeric = this.convertUserIpToNumeric(firstUserIp);

		const secondUserIp = this.getSecondUserIp();
		const secondUserIpAsNumeric = this.convertUserIpToNumeric(secondUserIp);

		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: firstUserIpAsNumeric,
					asString: firstUserIp,
				},
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV4(
			secondUserIpAsNumeric,
			"client",
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresDifferentClientRecordWithSameIp(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();
		const userIpAsNumeric = this.convertUserIpToNumeric(userIp);

		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: userIpAsNumeric,
					asString: userIp,
				},
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV4(
			userIpAsNumeric,
			"another",
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithSameIpInDifferentVersion(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();
		const userIpAsNumeric = this.convertUserIpToNumeric(userIp);

		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: userIpAsNumeric.toString(),
					asString: userIp,
				},
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV4(
			userIpAsNumeric,
			"client",
		);

		// then
		expect(rules.length).toBe(0);
	}
}

export { FindByUserIpV4Tests };
