import { describe, beforeEach, afterAll, it, expect } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import type { MongoUserAccessRuleTests } from "./userAccessRules/mongoUserAccessRuleTests.js";
import { FindByUserIpV4Tests } from "./userAccessRules/findByUserIp/findByUserIpV4Tests.js";
import { FindByUserIpV6Tests } from "./userAccessRules/findByUserIp/findByUserIpV6Tests.js";

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
	> = [FindByUserIpV4Tests, FindByUserIpV6Tests];

	for (const testClass of testClasses) {
		new testClass(mongoConnection);
	}
});
