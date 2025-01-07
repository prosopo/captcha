import {describe} from "vitest";
import testMongooseRuleModel from "../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../mongooseRulesStorage.js";
import TestFindByIpV4 from "./testFindByIpV4.js";

describe("MongooseFindByIpV4", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestFindByIpV4(storage);

    tests.runAll();
});