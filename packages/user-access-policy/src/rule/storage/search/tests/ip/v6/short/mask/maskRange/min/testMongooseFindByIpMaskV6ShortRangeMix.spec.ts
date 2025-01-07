import {describe} from "vitest";
import testMongooseRuleModel from "../../../../../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../../../../../mongooseRulesStorage.js";
import TestFindByIpMaskV6ShortRangeMin from "./testFindByIpMaskV6ShortRangeMin.js";

describe("MongooseFindByIpMaskV6ShortRangeMin", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestFindByIpMaskV6ShortRangeMin(storage);

    tests.runAll();
});