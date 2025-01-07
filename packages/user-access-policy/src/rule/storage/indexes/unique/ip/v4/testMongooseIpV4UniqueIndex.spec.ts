import { describe } from "vitest";
import TestIpV4UniqueIndex from "./testIpV4UniqueIndex.js";
import testMongooseRuleModel from "../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../mongooseRulesStorage.js";

describe("MongooseIpV4UniqueIndex", async () => {
	const testModel = await testMongooseRuleModel();
	const storage = new MongooseRulesStorage(testModel);
	const tests = new TestIpV4UniqueIndex(storage);

	tests.runAll();
});
