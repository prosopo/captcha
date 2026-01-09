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
import { CaptchaType } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { AccessPolicyType } from "#policy/rule.js";
import { sanitizeAccessPolicy } from "#policy/ruleInput/policyInput.js";

describe("sanitizeAccessPolicy", () => {
	describe("block policies", () => {
		it("should remove captchaType from block policies", () => {
			const input = {
				type: AccessPolicyType.Block,
				captchaType: CaptchaType.image,
				description: "test block policy",
			};

			const result = sanitizeAccessPolicy(input);

			expect(result).toEqual({
				type: AccessPolicyType.Block,
				description: "test block policy",
			});
			expect(result.captchaType).toBeUndefined();
		});

		it("should remove solvedImagesCount from block policies", () => {
			const input = {
				type: AccessPolicyType.Block,
				solvedImagesCount: 5,
				description: "test block policy",
			};

			const result = sanitizeAccessPolicy(input);

			expect(result).toEqual({
				type: AccessPolicyType.Block,
				description: "test block policy",
			});
			expect(result.solvedImagesCount).toBeUndefined();
		});

		it("should remove both captchaType and solvedImagesCount from block policies", () => {
			const input = {
				type: AccessPolicyType.Block,
				captchaType: CaptchaType.image,
				solvedImagesCount: 5,
				description: "test block policy",
			};

			const result = sanitizeAccessPolicy(input);

			expect(result).toEqual({
				type: AccessPolicyType.Block,
				description: "test block policy",
			});
			expect(result.captchaType).toBeUndefined();
			expect(result.solvedImagesCount).toBeUndefined();
		});

		it("should keep other fields in block policies", () => {
			const input = {
				type: AccessPolicyType.Block,
				captchaType: CaptchaType.image,
				solvedImagesCount: 5,
				description: "test block policy",
				imageThreshold: 0.5,
				powDifficulty: 10,
				unsolvedImagesCount: 3,
				frictionlessScore: 100,
			};

			const result = sanitizeAccessPolicy(input);

			expect(result).toEqual({
				type: AccessPolicyType.Block,
				description: "test block policy",
				imageThreshold: 0.5,
				powDifficulty: 10,
				unsolvedImagesCount: 3,
				frictionlessScore: 100,
			});
			expect(result.captchaType).toBeUndefined();
			expect(result.solvedImagesCount).toBeUndefined();
		});
	});

	describe("restrict policies", () => {
		it("should keep captchaType in restrict policies", () => {
			const input = {
				type: AccessPolicyType.Restrict,
				captchaType: CaptchaType.image,
				description: "test restrict policy",
			};

			const result = sanitizeAccessPolicy(input);

			expect(result).toEqual({
				type: AccessPolicyType.Restrict,
				captchaType: CaptchaType.image,
				description: "test restrict policy",
			});
		});

		it("should keep solvedImagesCount in restrict policies", () => {
			const input = {
				type: AccessPolicyType.Restrict,
				solvedImagesCount: 5,
				description: "test restrict policy",
			};

			const result = sanitizeAccessPolicy(input);

			expect(result).toEqual({
				type: AccessPolicyType.Restrict,
				solvedImagesCount: 5,
				description: "test restrict policy",
			});
		});

		it("should keep both captchaType and solvedImagesCount in restrict policies", () => {
			const input = {
				type: AccessPolicyType.Restrict,
				captchaType: CaptchaType.image,
				solvedImagesCount: 5,
				description: "test restrict policy",
			};

			const result = sanitizeAccessPolicy(input);

			expect(result).toEqual({
				type: AccessPolicyType.Restrict,
				captchaType: CaptchaType.image,
				solvedImagesCount: 5,
				description: "test restrict policy",
			});
		});
	});
});
