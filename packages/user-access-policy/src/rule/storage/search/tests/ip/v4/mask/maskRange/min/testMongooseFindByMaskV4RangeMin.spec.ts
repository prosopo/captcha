import {describe} from "vitest";
import testMongooseRuleModel from "../../../../../../../test/testMongooseRuleModel.js";
import MongooseRulesStorage from "../../../../../../../mongooseRulesStorage.js";
import TestFindByMaskV4RangeMin from "./testFindByMaskV4RangeMin.js";

describe("MongooseFindByMaskV4RangeMin", async () => {
    const testModel = await testMongooseRuleModel();
    const storage = new MongooseRulesStorage(testModel);
    const tests = new TestFindByMaskV4RangeMin(storage);

    tests.runAll();
});