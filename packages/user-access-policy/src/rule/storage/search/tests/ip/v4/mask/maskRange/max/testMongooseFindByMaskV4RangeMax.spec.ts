import {describe} from "vitest";
import testMongooseRuleModel from "../../../../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../../../../mongooseRulesStorage.js";
import TestFindByMaskV4RangeMax from "./testFindByMaskV4RangeMax.js";

describe("MongooseFindByMaskV4RangeMax", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestFindByMaskV4RangeMax(storage);

    tests.runAll();
});