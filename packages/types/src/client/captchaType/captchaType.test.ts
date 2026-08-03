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
import { describe, expect, it } from "vitest";
import {
	CHALLENGE_CAPTCHA_TYPES,
	CaptchaType,
	ChallengeCaptchaTypeSchema,
	DecisionMachineCaptchaTypeSchema,
	INTERACTIVE_CAPTCHA_TYPES,
	InteractiveCaptchaTypeSchema,
	isChallengeCaptchaType,
	isInteractiveCaptchaType,
} from "./captchaType.js";

describe("challenge captcha types", () => {
	it("covers every enum member except frictionless", () => {
		// Frictionless is the router, not a challenge — if a new challenge is
		// added to the enum without being added to CHALLENGE_CAPTCHA_TYPES,
		// this catches it.
		expect(new Set(CHALLENGE_CAPTCHA_TYPES)).toEqual(
			new Set(
				Object.values(CaptchaType).filter(
					(t) => t !== CaptchaType.frictionless,
				),
			),
		);
	});

	it("accepts the three challenge types and rejects frictionless", () => {
		for (const type of CHALLENGE_CAPTCHA_TYPES) {
			expect(ChallengeCaptchaTypeSchema.safeParse(type).success).toBe(true);
			expect(isChallengeCaptchaType(type)).toBe(true);
		}
		expect(
			ChallengeCaptchaTypeSchema.safeParse(CaptchaType.frictionless).success,
		).toBe(false);
		expect(isChallengeCaptchaType(CaptchaType.frictionless)).toBe(false);
	});

	it("treats undefined as not a challenge type", () => {
		expect(isChallengeCaptchaType(undefined)).toBe(false);
		expect(isInteractiveCaptchaType(undefined)).toBe(false);
	});

	it("keeps DecisionMachineCaptchaTypeSchema as an alias", () => {
		// Stored decision-machine artefacts still reference the old name.
		expect(DecisionMachineCaptchaTypeSchema).toBe(ChallengeCaptchaTypeSchema);
	});
});

describe("interactive captcha types", () => {
	it("is image and puzzle only", () => {
		expect(INTERACTIVE_CAPTCHA_TYPES).toEqual([
			CaptchaType.image,
			CaptchaType.puzzle,
		]);
	});

	it("accepts image and puzzle, rejects pow and frictionless", () => {
		for (const type of INTERACTIVE_CAPTCHA_TYPES) {
			expect(InteractiveCaptchaTypeSchema.safeParse(type).success).toBe(true);
			expect(isInteractiveCaptchaType(type)).toBe(true);
		}
		for (const type of [CaptchaType.pow, CaptchaType.frictionless]) {
			expect(InteractiveCaptchaTypeSchema.safeParse(type).success).toBe(false);
			expect(isInteractiveCaptchaType(type)).toBe(false);
		}
	});

	it("is a strict subset of the challenge types", () => {
		for (const type of INTERACTIVE_CAPTCHA_TYPES) {
			expect(isChallengeCaptchaType(type)).toBe(true);
		}
		expect(INTERACTIVE_CAPTCHA_TYPES.length).toBeLessThan(
			CHALLENGE_CAPTCHA_TYPES.length,
		);
	});
});
