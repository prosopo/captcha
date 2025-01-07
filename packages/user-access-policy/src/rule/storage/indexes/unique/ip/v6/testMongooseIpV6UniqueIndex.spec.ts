import { describe } from "vitest";
import TestIpV6UniqueIndex from "./testIpV6UniqueIndex.js";
import testMongooseRuleModel from "../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../mongooseRulesStorage.js";

describe("MongooseIpV6UniqueIndex", async () => {
	const testModel = await testMongooseRuleModel();
	const storage = new MongooseRulesStorage(testModel);
	const tests = new TestIpV6UniqueIndex(storage);

	tests.runAll();
});
