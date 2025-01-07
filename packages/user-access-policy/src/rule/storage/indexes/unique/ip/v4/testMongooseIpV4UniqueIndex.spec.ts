import { describe } from "vitest";
import TestIpV4UniqueIndex from "./testIpV4UniqueIndex.js";
import TestMongooseRulesStorage from "../../../../test/testMongooseRulesStorage.js";

describe("MongooseIpV4UniqueIndex", async () => {
	const mongooseRulesStorage = new TestMongooseRulesStorage();
	const tests = new TestIpV4UniqueIndex(mongooseRulesStorage);

	await mongooseRulesStorage.setup();

	tests.runAll();
});
