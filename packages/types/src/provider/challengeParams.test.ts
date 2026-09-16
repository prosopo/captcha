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
import { CaptchaType } from "../client/captchaType/captchaType.js";
import {
	ChallengeParamsSchema,
	deriveChallengeParams,
} from "./challengeParams.js";

// The flat fields a session creator has to hand, with every type's knobs
// present at once — the point of the derivation is that only the ones
// belonging to the chosen type survive.
const ALL_KNOBS = {
	solvedImagesCount: 6,
	powDifficulty: 4,
	blocked: true,
	puzzleTolerance: 20,
};

describe("deriveChallengeParams", () => {
	it("keeps only the image knobs for image", () => {
		expect(deriveChallengeParams(CaptchaType.image, ALL_KNOBS)).toEqual({
			type: CaptchaType.image,
			solvedImagesCount: 6,
			blocked: true,
		});
	});

	it("keeps only the pow knobs for pow", () => {
		expect(deriveChallengeParams(CaptchaType.pow, ALL_KNOBS)).toEqual({
			type: CaptchaType.pow,
			powDifficulty: 4,
		});
	});

	it("keeps only the puzzle knobs for puzzle", () => {
		expect(deriveChallengeParams(CaptchaType.puzzle, ALL_KNOBS)).toEqual({
			type: CaptchaType.puzzle,
			tolerance: 20,
		});
	});

	it("returns undefined for frictionless", () => {
		// Frictionless is a router — it never names a concrete challenge, so a
		// session created under it has no challenge params to record.
		expect(deriveChallengeParams(CaptchaType.frictionless, ALL_KNOBS)).toBe(
			undefined,
		);
	});

	it("omits absent knobs rather than writing undefined", () => {
		// Mongo would otherwise persist explicit nulls for every unset knob.
		expect(deriveChallengeParams(CaptchaType.image, {})).toEqual({
			type: CaptchaType.image,
		});
		expect(deriveChallengeParams(CaptchaType.pow, {})).toEqual({
			type: CaptchaType.pow,
		});
		expect(deriveChallengeParams(CaptchaType.puzzle, {})).toEqual({
			type: CaptchaType.puzzle,
		});
	});

	it("preserves a falsy blocked flag", () => {
		expect(
			deriveChallengeParams(CaptchaType.image, { blocked: false }),
		).toEqual({ type: CaptchaType.image, blocked: false });
	});

	it("produces output the schema accepts for every challenge type", () => {
		for (const type of [
			CaptchaType.image,
			CaptchaType.pow,
			CaptchaType.puzzle,
		]) {
			const derived = deriveChallengeParams(type, ALL_KNOBS);
			expect(ChallengeParamsSchema.safeParse(derived).success).toBe(true);
		}
	});
});

describe("ChallengeParamsSchema", () => {
	it("strips a knob that belongs to another challenge type", () => {
		// Deliberately not `.strict()`: this schema also parses records read
		// back out of Mongo, where the Mixed subdocument can carry extra keys.
		// The guarantee is that a pow record can never surface image knobs to a
		// reader, not that writing them is an error.
		const parsed = ChallengeParamsSchema.parse({
			type: CaptchaType.pow,
			solvedImagesCount: 6,
		});
		expect(parsed).toEqual({ type: CaptchaType.pow });
		expect(parsed).not.toHaveProperty("solvedImagesCount");
	});

	it("rejects an unknown discriminator", () => {
		expect(
			ChallengeParamsSchema.safeParse({ type: CaptchaType.frictionless })
				.success,
		).toBe(false);
	});
});
