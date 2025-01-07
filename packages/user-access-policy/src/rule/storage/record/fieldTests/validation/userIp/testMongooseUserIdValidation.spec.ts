import { describe } from "vitest";
import TestUserIpValidation from "./testUserIpValidation.js";
import testMongooseRuleModel from "../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../mongooseRulesStorage.js";

describe("MongooseUserIPValidation", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestUserIpValidation(storage);

    tests.runAll();
});
