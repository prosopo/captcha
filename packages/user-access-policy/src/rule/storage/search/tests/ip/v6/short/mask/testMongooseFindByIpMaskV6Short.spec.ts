import {describe} from "vitest";
import testMongooseRuleModel from "../../../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../../../mongooseRulesStorage.js";
import TestFindByIpMaskV6Short from "./testFindByIpMaskV6Short.js";

describe("MongooseFindByIpMaskV6Short", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestFindByIpMaskV6Short(storage);

    tests.runAll();
});