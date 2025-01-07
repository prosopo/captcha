import { describe } from "vitest";
import TestIpV6MaskFormatting from "./testIpV6MaskFormatting.js";
import testMongooseRuleModel from "../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../mongooseRulesStorage.js";

describe("MongooseIpV6MaskFormatting", async () => {
	const testModel = await testMongooseRuleModel();
	const storage = new MongooseRulesStorage(testModel);
	const tests = new TestIpV6MaskFormatting(storage);

	tests.runAll();
});
