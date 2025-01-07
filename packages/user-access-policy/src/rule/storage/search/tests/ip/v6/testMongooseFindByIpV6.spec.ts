import {describe} from "vitest";
import testMongooseRuleModel from "../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../mongooseRulesStorage.js";
import TestFindByIpV6 from "./testFindByIpV6.js";

describe("MongooseFindByIpV6", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestFindByIpV6(storage);

    tests.runAll();
});