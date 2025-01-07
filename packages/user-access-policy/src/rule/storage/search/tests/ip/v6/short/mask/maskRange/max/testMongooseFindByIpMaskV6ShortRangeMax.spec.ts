import {describe} from "vitest";
import testMongooseRuleModel from "../../../../../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../../../../../mongooseRulesStorage.js";
import {TestFindByIpMaskV6ShortRangeMax} from "./testFindByIpMaskV6ShortRangeMax.js";

describe("MongooseFindByIpV6MaskV6ShortRangeMax", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestFindByIpMaskV6ShortRangeMax(storage);

    tests.runAll();
});