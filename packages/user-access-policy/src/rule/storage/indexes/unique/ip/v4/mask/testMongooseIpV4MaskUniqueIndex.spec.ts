import {describe} from "vitest";
import TestMongooseRulesStorage from "../../../../../test/testMongooseRulesStorage.js";
import TestIpV4MaskUniqueIndex from "./testIpV4MaskUniqueIndex.js";

describe("MongooseIpV4MaskUniqueIndex", async () => {
    const mongooseRulesStorage = new TestMongooseRulesStorage();
    await mongooseRulesStorage.setup();

    const tests = new TestIpV4MaskUniqueIndex(mongooseRulesStorage);
    tests.runAll();
});