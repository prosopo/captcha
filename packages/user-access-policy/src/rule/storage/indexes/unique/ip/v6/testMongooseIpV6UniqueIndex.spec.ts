import { describe } from "vitest";
import TestMongooseRulesStorage from "../../../../test/testMongooseRulesStorage.js";
import TestIpV6UniqueIndex from "./testIpV6UniqueIndex.js";

describe("MongooseIpV6UniqueIndex", async () => {
	const mongooseRulesStorage = new TestMongooseRulesStorage();
	const tests = new TestIpV6UniqueIndex(mongooseRulesStorage);

	await mongooseRulesStorage.setup();

	tests.runAll();
});
