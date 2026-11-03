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
	CONCRETE_CAPTCHA_TYPES,
	CaptchaType,
	ChallengeCaptchaTypeSchema,
	DecisionMachineCaptchaTypeSchema,
	INTERACTIVE_CAPTCHA_TYPES,
	isChallengeCaptchaType,
	isConcreteCaptchaType,
	isInteractiveCaptchaType,
} from "./captchaType.js";

describe("challenge captcha types", () => {
	it("covers every enum member except frictionless and authenticated", () => {
		expect(new Set(CHALLENGE_CAPTCHA_TYPES)).toEqual(
			new Set(
				Object.values(CaptchaType).filter(
					(type) =>
						type !== CaptchaType.frictionless &&
						type !== CaptchaType.authenticated,
				),
			),
		);
	});

	it("rejects frictionless, authenticated and undefined", () => {
		for (const type of [
			CaptchaType.frictionless,
			CaptchaType.authenticated,
			undefined,
		]) {
			expect(isChallengeCaptchaType(type)).toBe(false);
			expect(isConcreteCaptchaType(type)).toBe(false);
			expect(isInteractiveCaptchaType(type)).toBe(false);
		}
	});

	it("keeps DecisionMachineCaptchaTypeSchema as an alias", () => {
		expect(DecisionMachineCaptchaTypeSchema).toBe(ChallengeCaptchaTypeSchema);
	});
});

describe("concrete captcha types", () => {
	it("is every challenge except audio", () => {
		expect(new Set(CONCRETE_CAPTCHA_TYPES)).toEqual(
			new Set(
				CHALLENGE_CAPTCHA_TYPES.filter((type) => type !== CaptchaType.audio),
			),
		);
		expect(isConcreteCaptchaType(CaptchaType.audio)).toBe(false);
	});
});

describe("interactive captcha types", () => {
	it("is every concrete type except pow", () => {
		expect(new Set(INTERACTIVE_CAPTCHA_TYPES)).toEqual(
			new Set(
				CONCRETE_CAPTCHA_TYPES.filter((type) => type !== CaptchaType.pow),
			),
		);
		expect(isInteractiveCaptchaType(CaptchaType.pow)).toBe(false);
	});

	it("accepts each of its members", () => {
		for (const type of INTERACTIVE_CAPTCHA_TYPES) {
			expect(isInteractiveCaptchaType(type)).toBe(true);
			expect(isConcreteCaptchaType(type)).toBe(true);
			expect(isChallengeCaptchaType(type)).toBe(true);
		}
	});
});
