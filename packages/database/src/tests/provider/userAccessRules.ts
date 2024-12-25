import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { MongoUserAccessRules } from "../../databases/provider/userAccessRules.js";
import {
	type UserAccessRule,
	type UserAccessRules,
	userAccessRuleSchema,
	UserIpVersion,
} from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { type Model, type Mongoose } from "mongoose";
import { Address4 } from "ip-address";
import { Decimal128 } from "mongodb";

class UserAccessRulesTest {
	private model: Model<UserAccessRule>;
	private userAccessRules: UserAccessRules;

	public constructor(mongoConnection: Mongoose) {
		this.model = mongoConnection.model("UserAccessRules", userAccessRuleSchema);

		this.userAccessRules = new MongoUserAccessRules(this.model);
	}

	protected getNumericPresentationForIpV4(ipV4: string): Decimal128 {
		const address = new Address4(ipV4);

		if (!address.isCorrect()) {
			throw new Error("Invalid IPv4 address");
		}

		return Decimal128.fromString(address.bigInt().toString());
	}

	//// restrictions

	// todo uniqness rules are respected

	//// finds by ip

	protected async testGetByUserIpFindsGlobalRecordByIpV4(): Promise<void> {
		// given
		const record = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.1"),
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async testGetByUserIpFindsClientRecordByIpV4(): Promise<void> {
		// given
		const clientRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.1"),
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(clientRecord.id);
	}

	protected async testGetByUserIpFindsGlobalAndClientRecordsByIpV4(): Promise<void> {
		// given
		const clientRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
			clientAccountId: "client",
		});
		const globalRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.1"),
		);

		// then
		expect(rules.length).toBe(2);
		expect(rules[0]?.id).toBe(clientRecord.id);
		expect(rules[1]?.id).toBe(globalRecord.id);
	}

	protected async testGetByUserIpIgnoresGlobalRecordWithWrongIpV4(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.3"),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async testGetByUserIpIgnoresClientRecordWithWrongIpV4(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.2",
				version: UserIpVersion.v4,
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.3"),
		);

		// then
		expect(rules.length).toBe(0);
	}

	//// finds by ip and clientAccountId

	protected async testGetByUserIpFindsClientRecordByIpV4AndClientAccountId(): Promise<void> {
		// given
		const record = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.1"),
			"client",
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async testGetByUserIpFindsGlobalRecordByIpV4AndClientAccountId(): Promise<void> {
		// given
		const record = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.1"),
			"client",
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	// todo finds both

	protected async testGetByUserIpIgnoresClientRecordWithWrongIpV4AndRightClientAccountId(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.2"),
			"client",
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async testGetByUserIpIgnoresClientRecordWithRightIpV4AndWrongClientAccountId(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.1"),
			"another",
		);

		// then
		expect(rules.length).toBe(0);
	}

	//// finds by mask

	// todo

	//// finds by mask and clientAccountId

	/// todo

	////

	public async test(): Promise<void> {
		const tests = [
			//// finds by ip
			{
				name: "testGetByUserIpFindsGlobalRecordByIpV4",
				method: async () => this.testGetByUserIpFindsGlobalRecordByIpV4(),
			},
			{
				name: "testGetByUserIpFindsClientRecordByIpV4",
				method: async () => this.testGetByUserIpFindsClientRecordByIpV4(),
			},
			{
				name: "testGetByUserIpFindsGlobalAndClientRecordsByIpV4",
				method: async () =>
					this.testGetByUserIpFindsGlobalAndClientRecordsByIpV4(),
			},
			{
				name: "testGetByUserIpIgnoresGlobalRecordWithWrongIpV4",
				method: async () => this.testGetByUserIpIgnoresGlobalRecordWithWrongIpV4(),
			},
			{
				name: "testGetByUserIpIgnoresClientRecordWithWrongIpV4",
				method: async () => this.testGetByUserIpIgnoresClientRecordWithWrongIpV4(),
			},
			//// finds by ip and clientAccountId
			{
				name: "testGetByUserIpFindsClientRecordByIpV4AndClientAccountId",
				method: async () =>
					this.testGetByUserIpFindsClientRecordByIpV4AndClientAccountId(),
			},
			{
				name: "testGetByUserIpFindsGlobalRecordByIpV4AndClientAccountId",
				method: async () =>
					this.testGetByUserIpFindsGlobalRecordByIpV4AndClientAccountId(),
			},
			{
				name: "testGetByUserIpIgnoresClientRecordWithWrongIpV4AndRightClientAccountId",
				method: async () =>
					this.testGetByUserIpIgnoresClientRecordWithWrongIpV4AndRightClientAccountId(),
			},
			{
				name: "testGetByUserIpIgnoresClientRecordWithRightIpV4AndWrongClientAccountId",
				method: async () =>
					this.testGetByUserIpIgnoresClientRecordWithRightIpV4AndWrongClientAccountId(),
			},
		];

		for (const test of tests) {
			it(test.name, async () => {
				await test.method();
			});
		}
	}
}

describe("UserAccessRules", async () => {
	const mongoServer = await MongoMemoryServer.create();
	const mongoConnection = await mongoose.connect(mongoServer.getUri());

	beforeEach(async () => {
		await mongoConnection.connection.dropDatabase();
	});

	afterAll(async () => {
		await mongoConnection.disconnect();
		await mongoServer.stop();
	});

	const userAccessRulesTest = new UserAccessRulesTest(mongoConnection);

	await userAccessRulesTest.test();
});
