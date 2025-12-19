// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { describe, expect, it } from "vitest";
import { accessRuleMongooseSchema } from "#policy/mongoose/mongooseRuleSchema.js";

describe("accessRuleMongooseSchema", () => {
	it("should define all access policy fields", () => {
		expect(accessRuleMongooseSchema.type).toBeDefined();
		expect(accessRuleMongooseSchema.captchaType).toBeDefined();
		expect(accessRuleMongooseSchema.description).toBeDefined();
		expect(accessRuleMongooseSchema.solvedImagesCount).toBeDefined();
		expect(accessRuleMongooseSchema.imageThreshold).toBeDefined();
		expect(accessRuleMongooseSchema.powDifficulty).toBeDefined();
		expect(accessRuleMongooseSchema.unsolvedImagesCount).toBeDefined();
		expect(accessRuleMongooseSchema.frictionlessScore).toBeDefined();
	});

	it("should define all policy scope fields", () => {
		expect(accessRuleMongooseSchema.clientId).toBeDefined();
	});

	it("should define all user attributes fields", () => {
		expect(accessRuleMongooseSchema.userId).toBeDefined();
		expect(accessRuleMongooseSchema.ja4Hash).toBeDefined();
		expect(accessRuleMongooseSchema.userAgent).toBeDefined();
		expect(accessRuleMongooseSchema.headersHash).toBeDefined();
		expect(accessRuleMongooseSchema.headHash).toBeDefined();
		expect(accessRuleMongooseSchema.coords).toBeDefined();
	});

	it("should define all user IP fields", () => {
		expect(accessRuleMongooseSchema.ip).toBeDefined();
		expect(accessRuleMongooseSchema.ipMask).toBeDefined();
	});

	it("should define ruleGroupId field", () => {
		expect(accessRuleMongooseSchema.ruleGroupId).toBeDefined();
	});

	it("should have type as required field", () => {
		expect(accessRuleMongooseSchema.type?.required).toBe(true);
	});

	it("should have all other fields as optional", () => {
		const optionalFields = [
			"captchaType",
			"description",
			"solvedImagesCount",
			"imageThreshold",
			"powDifficulty",
			"unsolvedImagesCount",
			"frictionlessScore",
			"clientId",
			"userId",
			"ja4Hash",
			"userAgent",
			"headersHash",
			"headHash",
			"coords",
			"ip",
			"ipMask",
			"ruleGroupId",
		];

		for (const field of optionalFields) {
			const fieldSchema = accessRuleMongooseSchema[
				field as keyof typeof accessRuleMongooseSchema
			] as { required?: boolean };
			expect(fieldSchema.required).toBe(false);
		}
	});

	it("should have correct field types", () => {
		expect(accessRuleMongooseSchema.type?.type).toBe(String);
		expect(accessRuleMongooseSchema.captchaType?.type).toBe(String);
		expect(accessRuleMongooseSchema.description?.type).toBe(String);
		expect(accessRuleMongooseSchema.solvedImagesCount?.type).toBe(Number);
		expect(accessRuleMongooseSchema.imageThreshold?.type).toBe(Number);
		expect(accessRuleMongooseSchema.powDifficulty?.type).toBe(Number);
		expect(accessRuleMongooseSchema.unsolvedImagesCount?.type).toBe(Number);
		expect(accessRuleMongooseSchema.frictionlessScore?.type).toBe(Number);
		expect(accessRuleMongooseSchema.clientId?.type).toBe(String);
		expect(accessRuleMongooseSchema.userId?.type).toBe(String);
		expect(accessRuleMongooseSchema.ja4Hash?.type).toBe(String);
		expect(accessRuleMongooseSchema.userAgent?.type).toBe(String);
		expect(accessRuleMongooseSchema.headersHash?.type).toBe(String);
		expect(accessRuleMongooseSchema.headHash?.type).toBe(String);
		expect(accessRuleMongooseSchema.coords?.type).toBe(String);
		expect(accessRuleMongooseSchema.ip?.type).toBe(String);
		expect(accessRuleMongooseSchema.ipMask?.type).toBe(String);
		expect(accessRuleMongooseSchema.ruleGroupId?.type).toBe(String);
	});
});
