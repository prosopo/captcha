import { describe } from "vitest";
import TestUserIdValidation from "./testUserIdValidation.js";
import testMongooseRuleModel from "../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../mongooseRulesStorage.js";

describe("MongooseUserIdValidation", async () => {
	const testModel = await testMongooseRuleModel();
	const storage = new MongooseRulesStorage(testModel);
	const tests = new TestUserIdValidation(storage);

	tests.runAll();
});
