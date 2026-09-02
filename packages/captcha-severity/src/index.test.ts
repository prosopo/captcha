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
	captchaPolicySeverity,
	isStricterCaptchaPolicy,
	isStricterCaptchaType,
	rankCaptchaType,
} from "./index.js";

// The four members of CaptchaType, as bare strings. Not imported from
// @prosopo/types — this package deliberately has no dependencies, and the
// coupling is asserted on the consuming side instead.
const TYPES = ["image", "puzzle", "pow", "frictionless"] as const;
const STRICTEST_FIRST = ["image", "puzzle", "pow", "frictionless"] as const;

// Well above imageMaxRoundsDefault (32). `solvedImagesCount` is validated by
// `number().int().min(2)` with no upper bound, so "absurd" is reachable.
const ABSURD_ROUNDS = 100_000;

describe("rankCaptchaType", () => {
	it("ranks image > puzzle > pow > frictionless", () => {
		const ascending = [...STRICTEST_FIRST].reverse();
		const ranks = ascending.map(rankCaptchaType);
		expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
		expect(new Set(ranks).size).toBe(ascending.length);
	});

	it("ranks unset and unrecognised values at 0", () => {
		expect(rankCaptchaType(undefined)).toBe(0);
		expect(rankCaptchaType("")).toBe(0);
		expect(rankCaptchaType("not-a-captcha-type")).toBe(0);
	});

	// frictionless used to tie with unset at 0 in the access-rule table.
	it("ranks frictionless above unset", () => {
		expect(rankCaptchaType("frictionless")).toBeGreaterThan(
			rankCaptchaType(undefined),
		);
	});
});

describe("isStricterCaptchaType — type only, settings ignored", () => {
	// Adjacent pairs in both orderings — non-adjacent comparisons would still
	// pass with an off-by-one in the table.
	it.each([
		["image", "puzzle", true],
		["puzzle", "image", false],
		["puzzle", "pow", true],
		["pow", "puzzle", false],
		["pow", "frictionless", true],
		["frictionless", "pow", false],
	])(
		"isStricterCaptchaType(%s, %s) === %s",
		(candidate, incumbent, expected) => {
			expect(isStricterCaptchaType(candidate, incumbent)).toBe(expected);
		},
	);

	it("is false for equal types, so the incumbent is kept", () => {
		for (const type of TYPES) {
			expect(isStricterCaptchaType(type, type)).toBe(false);
		}
	});

	it("treats any real type as stricter than unset", () => {
		for (const type of TYPES) {
			expect(isStricterCaptchaType(type, undefined)).toBe(true);
			expect(isStricterCaptchaType(undefined, type)).toBe(false);
		}
	});

	it("is false when both sides are unset", () => {
		expect(isStricterCaptchaType(undefined, undefined)).toBe(false);
	});
});

describe("captchaPolicySeverity — type dominates", () => {
	it("orders by type before any setting", () => {
		expect(captchaPolicySeverity({ captchaType: "image" })).toBeGreaterThan(
			captchaPolicySeverity({ captchaType: "puzzle" }),
		);
		expect(captchaPolicySeverity({ captchaType: "puzzle" })).toBeGreaterThan(
			captchaPolicySeverity({ captchaType: "pow" }),
		);
		expect(captchaPolicySeverity({ captchaType: "pow" })).toBeGreaterThan(
			captchaPolicySeverity({ captchaType: "frictionless" }),
		);
	});

	/**
	 * The regression this package exists to prevent.
	 *
	 * The access rules previously scored `base + solvedImagesCount` with tiers
	 * 10 apart, so a `Restrict[pow]` carrying 32 rounds (the default
	 * `imageMaxRounds`) scored 42 and beat a `Restrict[image]` at 30. No
	 * setting may lift a policy over a stricter captcha type.
	 */
	it("never lets a setting lift a policy over a stricter type", () => {
		for (let i = 0; i < STRICTEST_FIRST.length - 1; i++) {
			const stricter = STRICTEST_FIRST[i] as string;
			const weaker = STRICTEST_FIRST[i + 1] as string;
			const maxedOutWeaker = captchaPolicySeverity({
				captchaType: weaker,
				solvedImagesCount: ABSURD_ROUNDS,
				powDifficulty: ABSURD_ROUNDS,
			});
			expect(maxedOutWeaker).toBeLessThan(
				captchaPolicySeverity({ captchaType: stricter }),
			);
		}
	});

	it("scores an unset or unrecognised type at 0 regardless of settings", () => {
		expect(
			captchaPolicySeverity({ solvedImagesCount: 12, powDifficulty: 10 }),
		).toBe(0);
		expect(
			captchaPolicySeverity({
				captchaType: "not-a-captcha-type",
				solvedImagesCount: 12,
			}),
		).toBe(0);
	});
});

describe("captchaPolicySeverity — intra-tier axes", () => {
	// image: more rounds is harder.
	it("ranks image by solvedImagesCount", () => {
		expect(
			captchaPolicySeverity({ captchaType: "image", solvedImagesCount: 9 }),
		).toBeGreaterThan(
			captchaPolicySeverity({ captchaType: "image", solvedImagesCount: 2 }),
		);
	});

	// pow: higher difficulty is harder.
	it("ranks pow by powDifficulty", () => {
		expect(
			captchaPolicySeverity({ captchaType: "pow", powDifficulty: 8 }),
		).toBeGreaterThan(
			captchaPolicySeverity({ captchaType: "pow", powDifficulty: 4 }),
		);
	});

	// puzzle shares the image severity currency: it has no rounds, so the
	// provider maps solvedImagesCount onto a puzzle difficulty level. Detector
	// rules keep the field on puzzle rules precisely for this.
	it("ranks puzzle by solvedImagesCount, the shared severity currency", () => {
		expect(
			captchaPolicySeverity({ captchaType: "puzzle", solvedImagesCount: 9 }),
		).toBeGreaterThan(
			captchaPolicySeverity({ captchaType: "puzzle", solvedImagesCount: 2 }),
		);
	});

	it("treats an unset setting as the bottom of its tier", () => {
		expect(captchaPolicySeverity({ captchaType: "image" })).toBe(
			captchaPolicySeverity({ captchaType: "image", solvedImagesCount: 0 }),
		);
		expect(
			captchaPolicySeverity({ captchaType: "image", solvedImagesCount: 2 }),
		).toBeGreaterThan(captchaPolicySeverity({ captchaType: "image" }));
	});

	// Each type reads only its own axis, so a setting that belongs to another
	// type cannot move it.
	it("ignores settings that do not govern the type", () => {
		expect(
			captchaPolicySeverity({ captchaType: "image", powDifficulty: 10 }),
		).toBe(captchaPolicySeverity({ captchaType: "image" }));
		expect(
			captchaPolicySeverity({ captchaType: "pow", solvedImagesCount: 32 }),
		).toBe(captchaPolicySeverity({ captchaType: "pow" }));
		expect(
			captchaPolicySeverity({ captchaType: "puzzle", powDifficulty: 10 }),
		).toBe(captchaPolicySeverity({ captchaType: "puzzle" }));
	});

	// A negative or non-finite value must not drag a policy below its own tier.
	it("clamps negative and non-finite settings", () => {
		for (const bad of [-1, -ABSURD_ROUNDS, Number.NaN]) {
			expect(
				captchaPolicySeverity({
					captchaType: "image",
					solvedImagesCount: bad,
				}),
			).toBe(captchaPolicySeverity({ captchaType: "image" }));
		}
	});
});

describe("isStricterCaptchaPolicy — type then settings", () => {
	it("breaks a same-type tie on the governing setting", () => {
		expect(
			isStricterCaptchaPolicy(
				{ captchaType: "image", solvedImagesCount: 9 },
				{ captchaType: "image", solvedImagesCount: 2 },
			),
		).toBe(true);
		expect(
			isStricterCaptchaPolicy(
				{ captchaType: "image", solvedImagesCount: 2 },
				{ captchaType: "image", solvedImagesCount: 9 },
			),
		).toBe(false);
	});

	it("still lets the type dominate the setting", () => {
		expect(
			isStricterCaptchaPolicy(
				{ captchaType: "pow", powDifficulty: 10 },
				{ captchaType: "image", solvedImagesCount: 2 },
			),
		).toBe(false);
		expect(
			isStricterCaptchaPolicy(
				{ captchaType: "image", solvedImagesCount: 2 },
				{ captchaType: "pow", powDifficulty: 10 },
			),
		).toBe(true);
	});

	it("is false for genuinely equal policies, so the incumbent is kept", () => {
		expect(
			isStricterCaptchaPolicy(
				{ captchaType: "image", solvedImagesCount: 3 },
				{ captchaType: "image", solvedImagesCount: 3 },
			),
		).toBe(false);
	});

	// The difference from the type-only comparison, stated directly.
	it("differs from isStricterCaptchaType on a same-type pair", () => {
		const harder = { captchaType: "image", solvedImagesCount: 9 };
		const milder = { captchaType: "image", solvedImagesCount: 2 };
		expect(isStricterCaptchaType(harder.captchaType, milder.captchaType)).toBe(
			false,
		);
		expect(isStricterCaptchaPolicy(harder, milder)).toBe(true);
	});
});
