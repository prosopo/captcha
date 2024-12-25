import { describe, beforeEach, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { WithIpV4Test } from "./userAccessRules/getByUserIp/withIpV4Test.js";
import { WithIpV4AndClientAccountIdTest } from "./userAccessRules/getByUserIp/withIpV4AndClientAccountIdTest.js";
import type { MongoUserAccessRulesTest } from "./userAccessRules/mongoUserAccessRulesTest.js";

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
		) => MongoUserAccessRulesTest
	> = [WithIpV4Test, WithIpV4AndClientAccountIdTest];

	for (const testClass of testClasses) {
		new testClass(mongoConnection);
	}
});
