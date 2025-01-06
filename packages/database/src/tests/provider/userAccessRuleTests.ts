import type { UserAccessRule } from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { type Model } from "mongoose";
// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { afterAll, beforeEach, describe } from "vitest";
import { getUserAccessRulesDbSchema } from "../../databases/provider/userAccessRules/dbSchema.js";
import type { TestsBase } from "../testsBase.js";
import { FindRuleByUserIpMaskV4Tests } from "./userAccessRules/find/byIp/v4/findRuleByUserIpMaskV4Tests.js";
import { FindRuleByUserIpV4Tests } from "./userAccessRules/find/byIp/v4/findRuleByUserIpV4Tests.js";
import { FindRuleByUserIpMaskV4RangeMaxTests } from "./userAccessRules/find/byIp/v4/maskRange/findRuleByUserIpMaskV4RangeMaxTests.js";
import { FindRuleByUserIpMaskV4RangeMinTests } from "./userAccessRules/find/byIp/v4/maskRange/findRuleByUserIpMaskV4RangeMinTests.js";
import { FindRuleByUserIpMaskV6Tests } from "./userAccessRules/find/byIp/v6/findRuleByUserIpMaskV6Tests.js";
import { FindRuleByUserIpV6Tests } from "./userAccessRules/find/byIp/v6/findRuleByUserIpV6Tests.js";
import { FindRuleByUserIpMaskV6RangeMaxTests } from "./userAccessRules/find/byIp/v6/maskRange/findRuleByUserIpMaskV6RangeMaxTests.js";
import { FindRuleByUserIpMaskV6RangeMinTests } from "./userAccessRules/find/byIp/v6/maskRange/findRuleByUserIpMaskV6RangeMinTests.js";
import { FindRuleByUserIpMaskV6ShortTests } from "./userAccessRules/find/byIp/v6Short/findRuleByUserIpMaskV6ShortTests.js";
import { FindRuleByUserIpV6ShortTests } from "./userAccessRules/find/byIp/v6Short/findRuleByUserIpV6ShortTests.js";
import { FindRuleByUserIpMaskV6ShortRangeMaxTests } from "./userAccessRules/find/byIp/v6Short/maskRange/findRuleByUserIpMaskV6ShortRangeMaxTests.js";
import { FindRuleByUserIpMaskV6ShortRangeMinTests } from "./userAccessRules/find/byIp/v6Short/maskRange/findRuleByUserIpMaskV6ShortRangeMinTests.js";
import { FindRuleByUserIdTests } from "./userAccessRules/find/findRuleByUserIdTests.js";
import { FindRuleTests } from "./userAccessRules/find/findRuleTests.js";
import { IpV6FormattingTests } from "./userAccessRules/insertFormatting/ipV6FormattingTests.js";
import { IpV6MaskFormattingTests } from "./userAccessRules/insertFormatting/ipV6MaskFormattingTests.js";
import { OptionalFieldTests } from "./userAccessRules/schemaValidation/optionalFieldTests.js";
import { UserIdRequiredValidationTests } from "./userAccessRules/schemaValidation/userIdRequiredValidationTests.js";
import { UserIpRequiredValidationTests } from "./userAccessRules/schemaValidation/userIpRequiredValidationTests.js";
import { UserIpVersionRequiredValidationTests } from "./userAccessRules/schemaValidation/userIpVersionRequiredValidationTests.js";
import { IpV4MaskUniqueIndexTest } from "./userAccessRules/uniqueIndexes/ipV4/ipV4MaskUniqueIndexTest.js";
import { IpV4UniqueIndexTests } from "./userAccessRules/uniqueIndexes/ipV4/ipV4UniqueIndexTests.js";
import { IpV6MaskUniqueIndexTest } from "./userAccessRules/uniqueIndexes/ipV6/ipV6MaskUniqueIndexTest.js";
import { IpV6UniqueIndexTests } from "./userAccessRules/uniqueIndexes/ipV6/ipV6UniqueIndexTests.js";

class UserAccessRuleTests {
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
			...this.getFindTests(model),
			...this.getInsertFormattingTests(model),
			...this.getSchemaValidationTests(model),
			...this.getUniqueIndexTests(model),
		];

		for (const testsClass of testsList) {
			describe(testsClass.getName(), async () => {
				await testsClass.runAll();
			});
		}
	}

	protected getSchemaValidationTests(
		model: Model<UserAccessRule>,
	): TestsBase[] {
		return [
			new OptionalFieldTests(model),
			new UserIpRequiredValidationTests(model),
			new UserIdRequiredValidationTests(model),
			new UserIpVersionRequiredValidationTests(model),
		];
	}

	protected getFindTests(model: Model<UserAccessRule>): TestsBase[] {
		return [
			new FindRuleTests(model),
			new FindRuleByUserIdTests(model),
			...this.getFindByIpTests(model),
		];
	}

	protected getFindByIpTests(model: Model<UserAccessRule>): TestsBase[] {
		return [
			...this.getFindByIpV4Tests(model),
			...this.getFindByIpV6Tests(model),
			...this.getFindByIpV6ShortTests(model),
		];
	}

	protected getInsertFormattingTests(
		model: Model<UserAccessRule>,
	): TestsBase[] {
		return [new IpV6FormattingTests(model), new IpV6MaskFormattingTests(model)];
	}

	protected getUniqueIndexTests(model: Model<UserAccessRule>): TestsBase[] {
		return [
			new IpV4UniqueIndexTests(model),
			new IpV4MaskUniqueIndexTest(model),
			new IpV6UniqueIndexTests(model),
			new IpV6MaskUniqueIndexTest(model),
		];
	}

	protected getFindByIpV4Tests(model: Model<UserAccessRule>): TestsBase[] {
		return [
			new FindRuleByUserIpV4Tests(model),
			new FindRuleByUserIpMaskV4Tests(model),
			new FindRuleByUserIpMaskV4RangeMinTests(model),
			new FindRuleByUserIpMaskV4RangeMaxTests(model),
		];
	}

	protected getFindByIpV6Tests(model: Model<UserAccessRule>): TestsBase[] {
		return [
			new FindRuleByUserIpV6Tests(model),
			new FindRuleByUserIpMaskV6Tests(model),
			new FindRuleByUserIpMaskV6RangeMinTests(model),
			new FindRuleByUserIpMaskV6RangeMaxTests(model),
		];
	}

	protected getFindByIpV6ShortTests(model: Model<UserAccessRule>): TestsBase[] {
		return [
			new FindRuleByUserIpV6ShortTests(model),
			new FindRuleByUserIpMaskV6ShortTests(model),
			new FindRuleByUserIpMaskV6ShortRangeMinTests(model),
			new FindRuleByUserIpMaskV6ShortRangeMaxTests(model),
		];
	}
}

await new UserAccessRuleTests().run();
