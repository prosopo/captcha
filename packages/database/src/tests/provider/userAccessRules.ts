import { describe, beforeEach, afterAll, it, expect } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { FindByUserIpV4Tests } from "./userAccessRules/findByUserIp/findByUserIpV4Tests.js";
import { FindByUserIpV6Tests } from "./userAccessRules/findByUserIp/findByUserIpV6Tests.js";
import type { TestsBase } from "../testsBase.js";
import { RuleUniqueRestrictionTests } from "./userAccessRules/ruleUniqueRestrictionTests.js";
import { userAccessRuleSchema } from "@prosopo/types-database";

describe("MongoUserAccessRules", async () => {
	const mongoServer = await MongoMemoryServer.create();
	const mongoConnection = await mongoose.connect(mongoServer.getUri());
	const model = mongoConnection.model("UserAccessRules", userAccessRuleSchema);

	// applies indexes.
	await model.init();

	beforeEach(async () => {
		await mongoConnection.connection.dropDatabase();
	});

	afterAll(async () => {
		await mongoConnection.disconnect();
		await mongoServer.stop();
	});

	const testsList: TestsBase[] = [
		// fixme new FindByUserIpV4Tests(mongoConnection),
		// fixme new FindByUserIpV6Tests(mongoConnection),
		new RuleUniqueRestrictionTests(model),
	];

	for (const testsClass of testsList) {
		await testsClass.runAll();
	}
});
