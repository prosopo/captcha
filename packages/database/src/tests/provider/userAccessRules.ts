import { describe, beforeEach, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { type Model } from "mongoose";
import { FindByUserIpV4Tests } from "./userAccessRules/findByUserIp/v4/findByUserIpV4Tests.js";
import { FindByUserIpV6Tests } from "./userAccessRules/findByUserIp/v6/findByUserIpV6Tests.js";
import type { TestsBase } from "../testsBase.js";
import { IpV4UniqueIndexTests } from "./userAccessRules/uniqueIndexes/ipV4/ipV4UniqueIndexTests.js";
import { IpV6UniqueIndexTests } from "./userAccessRules/uniqueIndexes/ipV6/ipV6UniqueIndexTests.js";
import { getUserAccessRulesDbSchema } from "../../databases/provider/userAccessRules/dbSchema.js";
import { IpV4MaskUniqueIndexTest } from "./userAccessRules/uniqueIndexes/ipV4/ipV4MaskUniqueIndexTest.js";
import { IpV6MaskUniqueIndexTest } from "./userAccessRules/uniqueIndexes/ipV6/ipV6MaskUniqueIndexTest.js";
import { IpV6FormattingTests } from "./userAccessRules/ipV6Formatting/ipV6FormattingTests.js";
import { IpV6MaskFormattingTests } from "./userAccessRules/ipV6Formatting/ipV6MaskFormattingTests.js";
import { FindByShortUserIpV6Tests } from "./userAccessRules/findByUserIp/v6/short/findByShortUserIpV6Tests.js";
import type { UserAccessRule } from "@prosopo/types-database";
import { FindByUserIpMaskV4Tests } from "./userAccessRules/findByUserIp/v4/findByUserIpMaskV4Tests.js";
import { FindByUserIpMaskV4RangeMinTests } from "./userAccessRules/findByUserIp/v4/maskRange/findByUserIpMaskV4RangeMinTests.js";
import { FindByUserIpMaskV4RangeMaxTests } from "./userAccessRules/findByUserIp/v4/maskRange/findByUserIpMaskV4RangeMaxTests.js";
import { FindByUserIpMaskV6Tests } from "./userAccessRules/findByUserIp/v6/findByUserIpMaskV6Tests.js";
import { FindByUserIpMaskV6RangeMinTests } from "./userAccessRules/findByUserIp/v6/maskRange/findByUserIpMaskV6RangeMinTests.js";
import { FindByUserIpMaskV6RangeMaxTests } from "./userAccessRules/findByUserIp/v6/maskRange/findByUserIpMaskV6RangeMaxTests.js";
import { FindByShortUserIpMaskV6Tests } from "./userAccessRules/findByUserIp/v6/short/findByShortUserIpMaskV6Tests.js";
import { FindByShortUserIpMaskV6RangeMinTests } from "./userAccessRules/findByUserIp/v6/maskRange/short/findByShortUserIpMaskV6RangeMinTests.js";
import { FindByShortUserIpMaskV6RangeMaxTests } from "./userAccessRules/findByUserIp/v6/maskRange/short/findByShortUserIpMaskV6RangeMaxTests.js";

class MongoUserAccessRules {
	public async run(): Promise<void> {
		const mongoServer = await MongoMemoryServer.create();
		const mongoConnection = await mongoose.connect(mongoServer.getUri());
		const model = mongoConnection.model(
			"UserAccessRules",
			getUserAccessRulesDbSchema(),
		);

		beforeEach(async () => {
			await model.deleteMany({});
		});

		afterAll(async () => {
			await mongoConnection.disconnect();
			await mongoServer.stop();
		});

		const testsList: TestsBase[] = [
			...this.getIpV4Tests(model),
			...this.getIpV6Tests(model),
			...this.getShortIpV6Tests(model),
		];

		for (const testsClass of testsList) {
			describe(testsClass.getName(), async () => {
				await testsClass.runAll();
			});
		}
	}

	protected getIpV4Tests(model: Model<UserAccessRule>): TestsBase[] {
		return [
			new FindByUserIpV4Tests(model),
			new FindByUserIpMaskV4Tests(model),
			new FindByUserIpMaskV4RangeMinTests(model),
			new FindByUserIpMaskV4RangeMaxTests(model),
			new IpV4UniqueIndexTests(model),
			new IpV4MaskUniqueIndexTest(model),
		];
	}

	protected getIpV6Tests(model: Model<UserAccessRule>): TestsBase[] {
		return [
			new FindByUserIpV6Tests(model),
			new FindByUserIpMaskV6Tests(model),
			new FindByUserIpMaskV6RangeMinTests(model),
			new FindByUserIpMaskV6RangeMaxTests(model),
			new IpV6UniqueIndexTests(model),
			new IpV6MaskUniqueIndexTest(model),
			new IpV6FormattingTests(model),
			new IpV6MaskFormattingTests(model),
		];
	}

	protected getShortIpV6Tests(model: Model<UserAccessRule>): TestsBase[] {
		return [
			new FindByShortUserIpV6Tests(model),
			new FindByShortUserIpMaskV6Tests(model),
			new FindByShortUserIpMaskV6RangeMinTests(model),
			new FindByShortUserIpMaskV6RangeMaxTests(model),
		];
	}
}

await new MongoUserAccessRules().run();
