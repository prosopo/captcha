import { describe } from "vitest";
import TestMongooseRulesStorage from "../../../test/testMongooseRulesStorage.js";
import TestIpV6Formatting from "./testIpV6Formatting.js";

describe("MongooseIpV6Formatting", async () => {
	const mongooseRulesStorage = new TestMongooseRulesStorage();
	await mongooseRulesStorage.setup();

	const tests = new TestIpV6Formatting(mongooseRulesStorage);
	tests.runAll();
});
