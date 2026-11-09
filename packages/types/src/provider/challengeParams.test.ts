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
	CONCRETE_CAPTCHA_TYPES,
	CaptchaType,
} from "../client/captchaType/captchaType.js";
import {
	ChallengeParamsSchema,
	deriveChallengeParams,
} from "./challengeParams.js";

const ALL_KNOBS = {
	solvedImagesCount: 6,
	powDifficulty: 4,
	puzzleTolerance: 20,
	iconOrderTolerance: 30,
};

describe("deriveChallengeParams", () => {
	it("keeps only the knobs that belong to the minted type", () => {
		expect(deriveChallengeParams(CaptchaType.image, ALL_KNOBS)).toEqual({
			type: CaptchaType.image,
			solvedImagesCount: 6,
		});
		expect(deriveChallengeParams(CaptchaType.pow, ALL_KNOBS)).toEqual({
			type: CaptchaType.pow,
			powDifficulty: 4,
		});
		expect(deriveChallengeParams(CaptchaType.puzzle, ALL_KNOBS)).toEqual({
			type: CaptchaType.puzzle,
			tolerance: 20,
		});
		expect(deriveChallengeParams(CaptchaType.iconOrder, ALL_KNOBS)).toEqual({
			type: CaptchaType.iconOrder,
			tolerance: 30,
		});
	});

	it("omits absent knobs rather than writing undefined", () => {
		for (const type of CONCRETE_CAPTCHA_TYPES) {
			expect(deriveChallengeParams(type, {})).toEqual({ type });
		}
	});

	it("produces output the schema accepts for every concrete type", () => {
		for (const type of CONCRETE_CAPTCHA_TYPES) {
			expect(
				ChallengeParamsSchema.safeParse(deriveChallengeParams(type, ALL_KNOBS))
					.success,
			).toBe(true);
		}
	});
});

describe("ChallengeParamsSchema", () => {
	it("strips a knob that belongs to another type", () => {
		const parsed = ChallengeParamsSchema.parse({
			type: CaptchaType.pow,
			solvedImagesCount: 6,
		});
		expect(parsed).toEqual({ type: CaptchaType.pow });
	});

	it("rejects types a session is never minted as", () => {
		for (const type of [CaptchaType.frictionless, CaptchaType.audio]) {
			expect(ChallengeParamsSchema.safeParse({ type }).success).toBe(false);
		}
	});
});
