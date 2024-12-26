import {
	type UserAccessRule,
	type UserAccessRules,
	userAccessRuleSchema,
} from "@prosopo/types-database";
import type { Model, Mongoose } from "mongoose";
import { it } from "vitest";
import { MongoUserAccessRules } from "../../../databases/provider/mongoUserAccessRules.js";

abstract class MongoUserAccessRuleTests {
	protected model: Model<UserAccessRule>;
	protected userAccessRules: UserAccessRules;

	public constructor(mongoConnection: Mongoose) {
		this.model = mongoConnection.model("UserAccessRules", userAccessRuleSchema);

		this.userAccessRules = new MongoUserAccessRules(this.model);

		this.runAllTests();
	}

	protected abstract getTests(): {
		name: string;
		method: () => Promise<void>;
	}[];

	protected abstract getTestName(): string;

	protected runAllTests(): void {
		const tests = this.getTests();

		const testName = this.getTestName();

		for (const test of tests) {
			it(`test${testName} : ${test.name}`, async () => {
				await test.method();
			});
		}
	}
}

export { MongoUserAccessRuleTests };
