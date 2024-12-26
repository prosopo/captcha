import { describe, beforeEach, afterAll, it, expect } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { FindByUserIpV4Tests } from "./userAccessRules/findByUserIp/findByUserIpV4Tests.js";
import { FindByUserIpV6Tests } from "./userAccessRules/findByUserIp/findByUserIpV6Tests.js";
import type { TestsBase } from "../testsBase.js";
import { userAccessRuleSchema } from "@prosopo/types-database";
import { IpV4UniqueIndexTests } from "./userAccessRules/uniqueIndexes/ipV4UniqueIndexTests.js";
import { IpV6UniqueIndexTests } from "./userAccessRules/uniqueIndexes/ipV6UniqueIndexTests.js";

class MongoUserAccessRules {
	public async run(): Promise<void> {
		const mongoServer = await MongoMemoryServer.create();
		const mongoConnection = await mongoose.connect(mongoServer.getUri());
		const model = mongoConnection.model(
			"UserAccessRules",
			userAccessRuleSchema,
		);

		beforeEach(async () => {
			await model.deleteMany({});
		});

		afterAll(async () => {
			await mongoConnection.disconnect();
			await mongoServer.stop();
		});

		const testsList: TestsBase[] = [
			// fixme new FindByUserIpV4Tests(model),
			// fixme new FindByUserIpV6Tests(mongoConnection),
			new IpV4UniqueIndexTests(model),
			new IpV6UniqueIndexTests(model),
		];

		for (const testsClass of testsList) {
			describe(testsClass.getName(), async () => {
				await testsClass.runAll();
			});
		}
	}
}

await new MongoUserAccessRules().run();
