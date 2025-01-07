import {describe} from "vitest";
import testMongooseRuleModel from "../../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../../mongooseRulesStorage.js";
import TestFindByIpMaskV6 from "./testFindByIpMaskV6.js";

describe("MongooseFindByIpMaskV6", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestFindByIpMaskV6(storage);

    tests.runAll();
});