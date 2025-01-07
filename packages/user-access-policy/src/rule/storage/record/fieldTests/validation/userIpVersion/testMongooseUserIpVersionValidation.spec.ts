import { describe } from "vitest";
import TestUserIpVersionValidation from "./testUserIpVersionValidation.js";
import TestMongooseRulesStorage from "../../../../test/testMongooseRulesStorage.js";

describe("MongooseUserIpVersionValidation", async () => {
	const mongooseRulesStorage = new TestMongooseRulesStorage();
	await mongooseRulesStorage.setup();

	const tests = new TestUserIpVersionValidation(mongooseRulesStorage);
	tests.runAll();
});
