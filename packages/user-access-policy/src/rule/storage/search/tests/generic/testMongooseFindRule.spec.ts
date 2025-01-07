import {describe} from "vitest";
import testMongooseRuleModel from "../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../mongooseRulesStorage.js";
import TestFindRule from "./testFindRule.js";

describe("MongooseFindRule", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestFindRule(storage);

    tests.runAll();
});
