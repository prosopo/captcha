import { describe } from "vitest";
import TestUserIpVersionValidation from "./testUserIpVersionValidation.js";
import testMongooseRuleModel from "../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../mongooseRulesStorage.js";

describe("MongooseUserIpVersionValidation", async () => {
	const testModel = await testMongooseRuleModel();
	const storage = new MongooseRulesStorage(testModel);
	const tests = new TestUserIpVersionValidation(storage);

	tests.runAll();
});
