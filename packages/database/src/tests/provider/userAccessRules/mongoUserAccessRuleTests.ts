import { MongoUserAccessRules } from "../../../databases/provider/userAccessRules.js";
import {
	type UserAccessRule,
	type UserAccessRules,
	userAccessRuleSchema,
	UserIpVersion,
} from "@prosopo/types-database";

import type { Model, Mongoose } from "mongoose";
import { it } from "vitest";
import { Decimal128 } from "mongodb";
import { Address4, Address6 } from "ip-address";

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

	protected abstract getTestPrefixes(): string[];

	protected getNumericPresentationForUserIp(
		userIp: string,
		userIpVersion: UserIpVersion,
	): Decimal128 {
		const address =
			userIpVersion === UserIpVersion.v4
				? new Address4(userIp)
				: new Address6(userIp);

		if (!address.isCorrect()) {
			throw new Error(
				`Invalid IP address: ${userIp}, version: ${userIpVersion}`,
			);
		}

		return Decimal128.fromString(address.bigInt().toString());
	}

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

export { MongoUserAccessRuleTests };
