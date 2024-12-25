import { MongoUserAccessRules } from "../../../databases/provider/userAccessRules.js";
import {
	type UserAccessRule,
	type UserAccessRules,
	userAccessRuleSchema,
} from "@prosopo/types-database";

import type { Model, Mongoose } from "mongoose";
import { it } from "vitest";
import { Decimal128 } from "mongodb";
import { Address4 } from "ip-address";

abstract class MongoUserAccessRulesTest {
	protected model: Model<UserAccessRule>;
	protected userAccessRules: UserAccessRules;

	public constructor(mongoConnection: Mongoose) {
		this.model = mongoConnection.model("UserAccessRules", userAccessRuleSchema);

		this.userAccessRules = new MongoUserAccessRules(this.model);

		this.runAllTests();
	}

	protected getNumericPresentationForIpV4(ipV4: string): Decimal128 {
		const address = new Address4(ipV4);

		if (!address.isCorrect()) {
			throw new Error("Invalid IPv4 address");
		}

		return Decimal128.fromString(address.bigInt().toString());
	}

	protected abstract getTests(): {
		name: string;
		method: () => Promise<void>;
	}[];

	protected abstract getTestPrefixes(): string[];

	protected runAllTests(): void {
		const tests = this.getTests();

		const testPrefix = this.getTestPrefixes().join(" : ");

		for (const test of tests) {
			it(`test${testPrefix} : ${test.name}`, async () => {
				await test.method();
			});
		}
	}
}

export { MongoUserAccessRulesTest };
