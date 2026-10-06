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

import {
	CaptchaType,
	type IFrictionlessTypes,
	resolveAllowedCaptchaTypes,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	type ConcreteCaptchaType,
	PUZZLE_REFRESHES_BEFORE_IMAGE,
	coerceToEnabledCaptchaType,
	switchTypeAfterRefreshes,
} from "../../../tasks/captchaTypeSelection.js";

const BOTH: IFrictionlessTypes = { image: true, puzzle: true, iconOrder: true };
const NO_IMAGE: IFrictionlessTypes = {
	image: false,
	puzzle: true,
	iconOrder: true,
};
const NO_PUZZLE: IFrictionlessTypes = {
	image: true,
	puzzle: false,
	iconOrder: false,
};
const NEITHER: IFrictionlessTypes = {
	image: false,
	puzzle: false,
	iconOrder: false,
};

const ALL_TYPES: ConcreteCaptchaType[] = [
	CaptchaType.pow,
	CaptchaType.image,
	CaptchaType.puzzle,
];

describe("coerceToEnabledCaptchaType", () => {
	it("never serves icon-order to a site without the icon-order feature flag", () => {
		const everyPreferenceOn = {
			frictionlessTypes: { image: true, puzzle: true, iconOrder: true },
		};
		expect(
			coerceToEnabledCaptchaType(
				CaptchaType.iconOrder,
				resolveAllowedCaptchaTypes(everyPreferenceOn),
			),
		).toBe(CaptchaType.puzzle);
		expect(
			coerceToEnabledCaptchaType(
				CaptchaType.iconOrder,
				resolveAllowedCaptchaTypes({
					...everyPreferenceOn,
					captchaTypeFeatureFlags: { iconOrder: false },
				}),
			),
		).toBe(CaptchaType.puzzle);
		expect(coerceToEnabledCaptchaType(CaptchaType.iconOrder, undefined)).toBe(
			CaptchaType.puzzle,
		);
	});

	it("serves icon-order once the feature flag is on and the owner has not turned it off", () => {
		expect(
			coerceToEnabledCaptchaType(
				CaptchaType.iconOrder,
				resolveAllowedCaptchaTypes({
					captchaTypeFeatureFlags: { iconOrder: true },
				}),
			),
		).toBe(CaptchaType.iconOrder);
		expect(
			coerceToEnabledCaptchaType(
				CaptchaType.iconOrder,
				resolveAllowedCaptchaTypes({
					frictionlessTypes: { iconOrder: false },
					captchaTypeFeatureFlags: { iconOrder: true },
				}),
			),
		).toBe(CaptchaType.puzzle);
	});

	it("passes every type through untouched when both are enabled", () => {
		for (const type of ALL_TYPES) {
			expect(coerceToEnabledCaptchaType(type, BOTH)).toBe(type);
		}
	});

	it("never serves image on a site with image disabled", () => {
		for (const type of ALL_TYPES) {
			expect(coerceToEnabledCaptchaType(type, NO_IMAGE)).not.toBe(
				CaptchaType.image,
			);
		}
	});

	it("substitutes puzzle for image when image is disabled", () => {
		expect(coerceToEnabledCaptchaType(CaptchaType.image, NO_IMAGE)).toBe(
			CaptchaType.puzzle,
		);
	});

	it("substitutes image for puzzle when puzzle is disabled", () => {
		expect(coerceToEnabledCaptchaType(CaptchaType.puzzle, NO_PUZZLE)).toBe(
			CaptchaType.image,
		);
	});

	it("falls back to pow when neither interactive type is enabled", () => {
		expect(coerceToEnabledCaptchaType(CaptchaType.image, NEITHER)).toBe(
			CaptchaType.pow,
		);
		expect(coerceToEnabledCaptchaType(CaptchaType.puzzle, NEITHER)).toBe(
			CaptchaType.pow,
		);
	});

	it("always leaves pow reachable — it is the terminal fallback", () => {
		for (const types of [BOTH, NO_IMAGE, NO_PUZZLE, NEITHER]) {
			expect(coerceToEnabledCaptchaType(CaptchaType.pow, types)).toBe(
				CaptchaType.pow,
			);
		}
	});

	it("treats a missing setting as every type enabled, not as none", () => {
		// A client record written before the field existed must keep serving
		// what it served yesterday rather than silently narrowing to pow.
		for (const type of ALL_TYPES) {
			expect(coerceToEnabledCaptchaType(type, undefined)).toBe(type);
		}
	});

	it("treats a partial setting as enabled for the unspecified type", () => {
		expect(
			coerceToEnabledCaptchaType(CaptchaType.image, { puzzle: false }),
		).toBe(CaptchaType.image);
		expect(
			coerceToEnabledCaptchaType(CaptchaType.puzzle, { image: false }),
		).toBe(CaptchaType.puzzle);
	});

	it("only ever narrows — coercion cannot introduce an interactive type", () => {
		// pow is the least friction of the three; a coercion that turned pow
		// into image or puzzle would hand a user a harder challenge than any
		// upstream selector asked for.
		for (const types of [BOTH, NO_IMAGE, NO_PUZZLE, NEITHER]) {
			expect(coerceToEnabledCaptchaType(CaptchaType.pow, types)).toBe(
				CaptchaType.pow,
			);
		}
	});
});

describe("switchTypeAfterRefreshes", () => {
	it("keeps the puzzle below the refresh limit", () => {
		expect(
			switchTypeAfterRefreshes(
				CaptchaType.puzzle,
				PUZZLE_REFRESHES_BEFORE_IMAGE - 1,
				BOTH,
			),
		).toBe(CaptchaType.puzzle);
	});

	it("keeps the puzzle when nothing was refreshed", () => {
		expect(switchTypeAfterRefreshes(CaptchaType.puzzle, undefined, BOTH)).toBe(
			CaptchaType.puzzle,
		);
	});

	it("serves image once the refresh limit is reached", () => {
		expect(
			switchTypeAfterRefreshes(
				CaptchaType.puzzle,
				PUZZLE_REFRESHES_BEFORE_IMAGE,
				BOTH,
			),
		).toBe(CaptchaType.image);
	});

	it("keeps the puzzle on a site with image disabled", () => {
		expect(
			switchTypeAfterRefreshes(
				CaptchaType.puzzle,
				PUZZLE_REFRESHES_BEFORE_IMAGE + 5,
				NO_IMAGE,
			),
		).toBe(CaptchaType.puzzle);
	});

	it("never moves image or pow, however many refreshes", () => {
		for (const type of [CaptchaType.image, CaptchaType.pow] as const) {
			expect(switchTypeAfterRefreshes(type, 100, BOTH)).toBe(type);
		}
	});
});
