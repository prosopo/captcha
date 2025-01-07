import { describe } from "vitest";
import TestMongooseRulesStorage from "../../../../../test/testMongooseRulesStorage.js";
import { TestIpV6MaskUniqueIndex } from "./testIpV6MaskUniqueIndex.js";

describe("MongooseIpV6MaskUniqueIndex", async () => {
	const mongooseRulesStorage = new TestMongooseRulesStorage();
	const tests = new TestIpV6MaskUniqueIndex(mongooseRulesStorage);

	await mongooseRulesStorage.setup();

	tests.runAll();
});
