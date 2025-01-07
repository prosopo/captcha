import {describe} from "vitest";
import TestOptionalFieldsValidation from "./testOptionalFieldsValidation.js";
import TestMongooseRulesStorage from "../../../../test/testMongooseRulesStorage.js";

describe("MongooseOptionalFieldsValidation", async () => {
    const mongooseRulesStorage = new TestMongooseRulesStorage();
    await mongooseRulesStorage.setup();

    const tests = new TestOptionalFieldsValidation(mongooseRulesStorage);
    tests.runAll();
});
