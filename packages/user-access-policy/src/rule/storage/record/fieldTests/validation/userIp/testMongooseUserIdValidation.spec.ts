import { describe } from "vitest";
import TestMongooseRulesStorage from "../../../../test/testMongooseRulesStorage.js";
import TestUserIpValidation from "./testUserIpValidation.js";

describe("MongooseUserIPValidation", async () => {
    const mongooseRulesStorage = new TestMongooseRulesStorage();
    await mongooseRulesStorage.setup();

    const tests = new TestUserIpValidation(mongooseRulesStorage);
    tests.runAll();
});
