import { describe } from "vitest";
import TestIpV6MaskFormatting from "./testIpV6MaskFormatting.js";
import TestMongooseRulesStorage from "../../../../test/testMongooseRulesStorage.js";

describe("MongooseIpV6MaskFormatting", async () => {
	const mongooseRulesStorage = new TestMongooseRulesStorage();
	await mongooseRulesStorage.setup();

	const tests = new TestIpV6MaskFormatting(mongooseRulesStorage);
	tests.runAll();
});
