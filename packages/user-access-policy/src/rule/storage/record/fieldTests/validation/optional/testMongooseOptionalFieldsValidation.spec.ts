import { describe } from "vitest";
import TestOptionalFieldsValidation from "./testOptionalFieldsValidation.js";
import MongooseRulesStorage from "../../../../mongooseRulesStorage.js";
import testMongooseRuleModel from "../../../../test/testMongooseRuleModel.js";

describe("MongooseOptionalFieldsValidation", async () => {
	const testModel = await testMongooseRuleModel();
	const storage = new MongooseRulesStorage(testModel);
	const tests = new TestOptionalFieldsValidation(storage);

	tests.runAll();
});
