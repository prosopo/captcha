import { describe } from "vitest";
import TestUserIdValidation from "./testUserIdValidation.js";
import TestMongooseRulesStorage from "../../../../test/testMongooseRulesStorage.js";

describe("MongooseUserIdValidation", async () => {
	const mongooseRulesStorage = new TestMongooseRulesStorage();
	await mongooseRulesStorage.setup();

	const tests = new TestUserIdValidation(mongooseRulesStorage);
	tests.runAll();
});
