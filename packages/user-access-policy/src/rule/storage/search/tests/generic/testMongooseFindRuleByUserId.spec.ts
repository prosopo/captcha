import {describe} from "vitest";
import testMongooseRuleModel from "../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../mongooseRulesStorage.js";
import TestFindRuleByUserId from "./testFindRuleByUserId.js";

describe("MongooseFindRuleByUserId", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestFindRuleByUserId(storage);

    tests.runAll();
});