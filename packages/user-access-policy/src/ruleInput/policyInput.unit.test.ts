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
import {
	accessPolicyInput,
	policyScopeInput,
} from "#policy/ruleInput/policyInput.js";

describe("accessPolicyInput", () => {
	it("should parse valid access policy", () => {
		const result = accessPolicyInput.parse({
			type: AccessPolicyType.Block,
		});

		expect(result.type).toBe(AccessPolicyType.Block);
	});

	it("should parse access policy with all optional fields", () => {
		const result = accessPolicyInput.parse({
			type: AccessPolicyType.Restrict,
			captchaType: CaptchaType.frictionless,
			description: "Test description",
			solvedImagesCount: 5,
			imageThreshold: 0.8,
			powDifficulty: 10,
			unsolvedImagesCount: 3,
			frictionlessScore: 0.9,
		});

		expect(result.type).toBe(AccessPolicyType.Restrict);
		expect(result.captchaType).toBe(CaptchaType.frictionless);
		expect(result.description).toBe("Test description");
		expect(result.solvedImagesCount).toBe(5);
		expect(result.imageThreshold).toBe(0.8);
		expect(result.powDifficulty).toBe(10);
		expect(result.unsolvedImagesCount).toBe(3);
		expect(result.frictionlessScore).toBe(0.9);
	});

	it("should coerce string numbers to numbers", () => {
		const result = accessPolicyInput.parse({
			type: AccessPolicyType.Block,
			solvedImagesCount: "5",
			imageThreshold: "0.8",
			powDifficulty: "10",
			unsolvedImagesCount: "3",
			frictionlessScore: "0.9",
		});

		expect(result.solvedImagesCount).toBe(5);
		expect(result.imageThreshold).toBe(0.8);
		expect(result.powDifficulty).toBe(10);
		expect(result.unsolvedImagesCount).toBe(3);
		expect(result.frictionlessScore).toBe(0.9);
	});

	it("should coerce description to string", () => {
		const result = accessPolicyInput.parse({
			type: AccessPolicyType.Block,
			description: 123,
		});

		expect(result.description).toBe("123");
	});

	it("should reject invalid access policy type", () => {
		expect(() =>
			accessPolicyInput.parse({
				type: "invalid",
			}),
		).toThrow();
	});

	it("should reject missing required type field", () => {
		expect(() => accessPolicyInput.parse({})).toThrow();
	});
});

describe("policyScopeInput", () => {
	it("should parse valid policy scope", () => {
		const result = policyScopeInput.parse({
			clientId: "client1",
		});

		expect(result.clientId).toBe("client1");
	});

	it("should parse policy scope without clientId", () => {
		const result = policyScopeInput.parse({});

		expect(result.clientId).toBeUndefined();
	});

	it("should coerce clientId to string", () => {
		const result = policyScopeInput.parse({
			clientId: 123,
		});

		expect(result.clientId).toBe("123");
	});
});
