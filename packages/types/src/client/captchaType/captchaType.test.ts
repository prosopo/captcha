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
import { CaptchaType, CaptchaTypeSchema } from "./captchaType.js";
import { CaptchaTypeSpec } from "./captchaTypeSpec.js";

describe("captchaType", () => {
	describe("CaptchaType enum", () => {
		it("has correct enum values", () => {
			expect(CaptchaType.image).toBe("image");
			expect(CaptchaType.pow).toBe("pow");
			expect(CaptchaType.frictionless).toBe("frictionless");
			expect(CaptchaType.invisible).toBe("invisible");
		});
	});

	describe("CaptchaTypeSchema", () => {
		it("validates image type", () => {
			expect(() => CaptchaTypeSchema.parse(CaptchaType.image)).not.toThrow();
		});

		it("validates pow type", () => {
			expect(() => CaptchaTypeSchema.parse(CaptchaType.pow)).not.toThrow();
		});

		it("validates frictionless type", () => {
			expect(() =>
				CaptchaTypeSchema.parse(CaptchaType.frictionless),
			).not.toThrow();
		});

		it("validates invisible type", () => {
			expect(() =>
				CaptchaTypeSchema.parse(CaptchaType.invisible),
			).not.toThrow();
		});

		it("rejects invalid type", () => {
			expect(() => CaptchaTypeSchema.parse("invalid")).toThrow();
		});

		it("rejects null", () => {
			expect(() => CaptchaTypeSchema.parse(null)).toThrow();
		});

		it("rejects undefined", () => {
			expect(() => CaptchaTypeSchema.parse(undefined)).toThrow();
		});
	});

	describe("CaptchaTypeSpec", () => {
		it("validates image type", () => {
			expect(() => CaptchaTypeSpec.parse(CaptchaType.image)).not.toThrow();
		});

		it("validates pow type", () => {
			expect(() => CaptchaTypeSpec.parse(CaptchaType.pow)).not.toThrow();
		});

		it("validates frictionless type", () => {
			expect(() =>
				CaptchaTypeSpec.parse(CaptchaType.frictionless),
			).not.toThrow();
		});

		it("validates invisible type", () => {
			expect(() => CaptchaTypeSpec.parse(CaptchaType.invisible)).not.toThrow();
		});

		it("rejects invalid type", () => {
			expect(() => CaptchaTypeSpec.parse("invalid")).toThrow();
		});
	});
});
