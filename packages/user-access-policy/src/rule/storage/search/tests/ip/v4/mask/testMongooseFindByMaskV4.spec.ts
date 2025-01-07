import {describe} from "vitest";
import testMongooseRuleModel from "../../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../../mongooseRulesStorage.js";
import TestFindByMaskV4 from "./testFindByMaskV4.js";

describe("MongooseFindByMaskV4", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestFindByMaskV4(storage);

    tests.runAll();
});