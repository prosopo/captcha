import { describe } from "vitest";
import { TestIpV6MaskUniqueIndex } from "./testIpV6MaskUniqueIndex.js";
import testMongooseRuleModel from "../../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../../mongooseRulesStorage.js";

describe("MongooseIpV6MaskUniqueIndex", async () => {
	const testModel = await testMongooseRuleModel();
	const storage = new MongooseRulesStorage(testModel);

	const tests = new TestIpV6MaskUniqueIndex(storage);
	tests.runAll();
});
