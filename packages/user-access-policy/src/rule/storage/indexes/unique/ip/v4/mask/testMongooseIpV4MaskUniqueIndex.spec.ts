import {describe} from "vitest";
import TestIpV4MaskUniqueIndex from "./testIpV4MaskUniqueIndex.js";
import testMongooseRuleModel from "../../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../../mongooseRulesStorage.js";

describe("MongooseIpV4MaskUniqueIndex", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestIpV4MaskUniqueIndex(storage);

    tests.runAll();
});