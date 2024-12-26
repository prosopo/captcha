import { expect } from "vitest";
import { MongoUserAccessRuleTests } from "../mongoUserAccessRuleTests.js";
import { Address6 } from "ip-address";

class FindByUserIpV6Tests extends MongoUserAccessRuleTests {
	protected getFirstUserIp(): string {
		return "2001:db8:3333:4444:5555:6666:7777:8888";
	}

	protected getSecondUserIp(): string {
		return "1002:db8:3333:4444:5555:6666:7777:8888";
	}

	protected convertUserIpToNumericString(userIp: string): string {
		const address = new Address6(userIp);

		if (!address.isCorrect()) {
			throw new Error(`Invalid IP: ${userIp}`);
		}

		return address.bigInt().toString();
	}

	protected getTestName(): string {
		return "FindByUserIpV6";
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
				name: "ignoresClientRecordWithDifferentIp",
				method: async () => this.ignoresClientRecordWithDifferentIp(),
			},
		];
	}

	protected async findsGlobalRecord(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();

		const record = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: this.convertUserIpToNumericString(userIp),
					asString: userIp,
				},
			},
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV6(
			this.convertUserIpToNumericString(userIp),
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
				v6: {
					asNumericString: this.convertUserIpToNumericString(userIp),
					asString: userIp,
				},
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV6(
			this.convertUserIpToNumericString(userIp),
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
				v6: {
					asNumericString: this.convertUserIpToNumericString(userIp),
					asString: userIp,
				},
			},
			clientAccountId: "client",
		});

		const globalRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: this.convertUserIpToNumericString(userIp),
					asString: userIp,
				},
			},
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV6(
			this.convertUserIpToNumericString(userIp),
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

		const secondUserIp = this.getSecondUserIp();

		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: this.convertUserIpToNumericString(firstUserIp),
					asString: firstUserIp,
				},
			},
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV6(
			this.convertUserIpToNumericString(secondUserIp),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithDifferentIp(): Promise<void> {
		// given
		const firstUserIp = this.getFirstUserIp();

		const secondUserIp = this.getSecondUserIp();

		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: this.convertUserIpToNumericString(firstUserIp),
					asString: firstUserIp,
				},
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.findByUserIpV6(
			this.convertUserIpToNumericString(secondUserIp),
			"client",
		);

		// then
		expect(rules.length).toBe(0);
	}
}

export { FindByUserIpV6Tests };
