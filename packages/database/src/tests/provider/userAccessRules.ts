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

	protected ipV4ToDecimal128(ipV4: string): Decimal128 {
		const address = new Address4(ipV4);

		if (!address.isCorrect()) {
			throw new Error("Invalid IPv4 address");
		}

		return Decimal128.fromString(address.bigInt().toString());
	}

	public testGetByUserIpForSingleIpV4(): void {
		it("testGetByUserIpForSingleIpV4", async () => {
			// given
			const ip = "127.0.0.1";
			const ipNumeric = this.ipV4ToDecimal128(ip);
			const insertedRecord = await this.model.create({
				isUserBlocked: true,
				userIp: {
					numeric: ipNumeric,
					string: ip,
					version: UserIpVersion.v4,
				},
			});

			// when

			// then
			expect(insertedRecord.userIp.string).toBe(ip);
			// fixme this.userAccessRules.getByUserIp();
		});
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

	const userAccessRules = new UserAccessRulesTest(mongoConnection);

	userAccessRules.testGetByUserIpForSingleIpV4();
});
