// Copyright 2021-2026 Prosopo (UK) Ltd.
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

import { CaptchaLabel, CaptchaLabelSchema } from "@prosopo/types";
import { PoWCaptchaStoredSchema, UserCommitmentSchema } from "@prosopo/types";
import {
	PoWCaptchaRecordSchema,
	UserCommitmentRecordSchema,
} from "@prosopo/types-database";
import type { Schema } from "mongoose";
import { describe, expect, it } from "vitest";

const recordSchemas: Schema[] = [
	PoWCaptchaRecordSchema,
	UserCommitmentRecordSchema,
];

describe("captcha labelling schema fields", () => {
	it("CaptchaLabelSchema accepts every CaptchaLabel value", () => {
		for (const value of Object.values(CaptchaLabel)) {
			expect(CaptchaLabelSchema.parse(value)).toBe(value);
		}
	});

	it("CaptchaLabelSchema rejects unknown labels", () => {
		expect(() => CaptchaLabelSchema.parse("definitely-not-a-label")).toThrow();
	});

	it("Zod record schemas expose the optional label fields", () => {
		for (const schema of [PoWCaptchaStoredSchema, UserCommitmentSchema]) {
			expect(schema.shape.label.isOptional()).toBe(true);
			expect(schema.shape.labelReason.isOptional()).toBe(true);
			expect(schema.shape.labelledBy.isOptional()).toBe(true);
			expect(schema.shape.labelledAt.isOptional()).toBe(true);
		}
	});

	it("Mongoose record schemas declare the label paths with correct types", () => {
		for (const schema of recordSchemas) {
			expect(schema.path("label").instance).toBe("String");
			expect(schema.path("labelReason").instance).toBe("String");
			expect(schema.path("labelledBy").instance).toBe("String");
			expect(schema.path("labelledAt").instance).toBe("Date");
		}
	});

	it("Mongoose label path is constrained to the CaptchaLabel enum", () => {
		for (const schema of recordSchemas) {
			const enumValues: string[] | undefined =
				schema.path("label").options.enum;
			expect(enumValues).toEqual(
				expect.arrayContaining(Object.values(CaptchaLabel)),
			);
		}
	});
});
