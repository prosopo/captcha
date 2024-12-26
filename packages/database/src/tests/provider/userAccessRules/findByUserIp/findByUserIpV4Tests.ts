import { expect } from "vitest";
import { MongoUserAccessRuleTests } from "../mongoUserAccessRuleTests.js";
import { Address4 } from "ip-address";
import { Int32 } from "mongodb";

class FindByUserIpV4Tests extends MongoUserAccessRuleTests {
	protected getFirstUserIp(): string {
		return "192.168.1.1";
	}

	protected getSecondUserIp(): string {
		return "127.0.0.1";
	}

	protected convertUserIpToNumeric(userIp: string): Int32 {
		const address = new Address4(userIp);

		if (!address.isCorrect()) {
			throw new Error(`Invalid IP: ${userIp}`);
		}

		return Int32.fromString(address.bigInt().toString());
	}

	protected getTestPrefixes(): string[] {
		return ["findByUserIpV4"];
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
				name: "ignoresGlobalRecordWithWrongIp",
				method: async () => this.ignoresGlobalRecordWithWrongIp(),
			},
			{
				name: "ignoresClientRecordWithWrongIp",
				method: async () => this.ignoresClientRecordWithWrongIp(),
			},
		];
	}

	protected async findsGlobalRecord(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();

		const record = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.convertUserIpToNumeric(userIp),
					asString: userIp,
				},
			},
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV4(
			this.convertUserIpToNumeric(userIp),
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async findsClientRecord(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();

		const clientRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.convertUserIpToNumeric(userIp),
					asString: userIp,
				},
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV4(
			this.convertUserIpToNumeric(userIp),
			"client",
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(clientRecord.id);
	}

	protected async findsGlobalAndClientRecords(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();

		const clientRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.convertUserIpToNumeric(userIp),
					asString: userIp,
				},
			},
			clientAccountId: "client",
		});

		const globalRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.convertUserIpToNumeric(userIp),
					asString: userIp,
				},
			},
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV4(
			this.convertUserIpToNumeric(userIp),
			"client",
		);

		// then
		expect(rules.length).toBe(2);
		expect(rules[0]?.id).toBe(clientRecord.id);
		expect(rules[1]?.id).toBe(globalRecord.id);
	}

	protected async ignoresGlobalRecordWithWrongIp(): Promise<void> {
		// given
		const firstUserIp = this.getFirstUserIp();

		const secondUserIp = this.getSecondUserIp();

		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.convertUserIpToNumeric(firstUserIp),
					asString: firstUserIp,
				},
			},
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV4(
			this.convertUserIpToNumeric(secondUserIp),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithWrongIp(): Promise<void> {
		// given
		const firstUserIp = this.getFirstUserIp();

		const secondUserIp = this.getSecondUserIp();

		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.convertUserIpToNumeric(firstUserIp),
					asString: firstUserIp,
				},
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV4(
			this.convertUserIpToNumeric(secondUserIp),
			"client",
		);

		// then
		expect(rules.length).toBe(0);
	}
}

export { FindByUserIpV4Tests };
