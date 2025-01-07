import {describe} from "vitest";
import TestFindByIpV6Short from "./testFindByIpV6Short.js";
import testMongooseRuleModel from "../../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../../mongooseRulesStorage.js";

describe("MongooseFindByIpV6Short", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestFindByIpV6Short(storage);

    tests.runAll();
});