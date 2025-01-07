import { describe } from "vitest";
import TestIpV6Formatting from "./testIpV6Formatting.js";
import testMongooseRuleModel from "../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../mongooseRulesStorage.js";

describe("MongooseIpV6Formatting", async () => {
	const testModel = await testMongooseRuleModel();
	const storage = new MongooseRulesStorage(testModel);
	const tests = new TestIpV6Formatting(storage);

	tests.runAll();
});
