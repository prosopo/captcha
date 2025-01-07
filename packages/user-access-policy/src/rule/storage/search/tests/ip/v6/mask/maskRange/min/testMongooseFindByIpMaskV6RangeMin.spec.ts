import { describe } from "vitest";
import testMongooseRuleModel from "../../../../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../../../../mongooseRulesStorage.js";
import TestFindByIpMaskV6RangeMin from "./testFindByIpMaskV6RangeMin.js";

describe("MongooseFindByIpMaskV6RangeMin", async () => {
	const testModel = await testMongooseRuleModel();
	const storage = new MongooseRulesStorage(testModel);
	const tests = new TestFindByIpMaskV6RangeMin(storage);

	tests.runAll();
});
