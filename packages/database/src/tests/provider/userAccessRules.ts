import { describe, beforeEach, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import type { MongoUserAccessRuleTests } from "./userAccessRules/mongoUserAccessRuleTests.js";
import { WithIpV4 } from "./userAccessRules/getByUserIp/withIpV4.js";
import { WithIpV6 } from "./userAccessRules/getByUserIp/withIpV6.js";
import { WithIpV4AndClientAccountId } from "./userAccessRules/getByUserIp/withIpV4AndClientAccountId.js";
import { WithIpV6AndClientAccountId } from "./userAccessRules/getByUserIp/withIpV6AndClientAccountId.js";

describe("MongoUserAccessRules", async () => {
	const mongoServer = await MongoMemoryServer.create();
	const mongoConnection = await mongoose.connect(mongoServer.getUri());

	beforeEach(async () => {
		await mongoConnection.connection.dropDatabase();
	});

	afterAll(async () => {
		await mongoConnection.disconnect();
		await mongoServer.stop();
	});

	const testClasses: Array<
		new (
			connection: typeof mongoose,
		) => MongoUserAccessRuleTests
	> = [
		//WithIpV4,
		WithIpV6, // fixme ipv6 can't be stored as Decimal128 cause it supports only 34 significant digits, while IPV6 is 38.
		// fixme https://www.mongodb.com/docs/manual/reference/bson-types/
		// fixme idea - store as string, and add leading zeros (39 is a total). https://character.construction/numbers
		//WithIpV4AndClientAccountId,
	//	WithIpV6AndClientAccountId,
	];

	for (const testClass of testClasses) {
		new testClass(mongoConnection);
	}
});
