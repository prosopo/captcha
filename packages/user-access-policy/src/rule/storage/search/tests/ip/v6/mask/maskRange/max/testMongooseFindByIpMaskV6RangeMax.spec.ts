import {describe} from "vitest";
import testMongooseRuleModel from "../../../../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../../../../mongooseRulesStorage.js";
import TestFindByIpMaskV6RangeMax from "./testFindByIpMaskV6RangeMax.js";

describe("MongooseFindByIpMaskV6RangeMax", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestFindByIpMaskV6RangeMax(storage);

    tests.runAll();
});