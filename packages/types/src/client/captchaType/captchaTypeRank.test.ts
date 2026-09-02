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
import { CaptchaType } from "./captchaType.js";
import { isStricterCaptchaType, rankCaptchaType } from "./captchaTypeRank.js";

describe("rankCaptchaType", () => {
	// Pinned as an explicit ordered list rather than pairwise, so a change to
	// any one rank is a visible diff here.
	it("ranks image > puzzle > pow > frictionless", () => {
		const ordered = [
			CaptchaType.frictionless,
			CaptchaType.pow,
			CaptchaType.puzzle,
			CaptchaType.image,
		];
		const ranks = ordered.map(rankCaptchaType);
		expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
		expect(new Set(ranks).size).toBe(ordered.length);
	});

	// Everything unknown sits below every real type, so a policy naming no
	// captcha type never beats one that does.
	it("ranks undefined and unrecognised values at 0", () => {
		expect(rankCaptchaType(undefined)).toBe(0);
		expect(rankCaptchaType("")).toBe(0);
		expect(rankCaptchaType("not-a-captcha-type")).toBe(0);
	});

	it("accepts the enum and its bare string value identically", () => {
		expect(rankCaptchaType(CaptchaType.image)).toBe(rankCaptchaType("image"));
		expect(rankCaptchaType(CaptchaType.puzzle)).toBe(rankCaptchaType("puzzle"));
		expect(rankCaptchaType(CaptchaType.pow)).toBe(rankCaptchaType("pow"));
		expect(rankCaptchaType(CaptchaType.frictionless)).toBe(
			rankCaptchaType("frictionless"),
		);
	});

	// The table is keyed by plain strings, so a renamed enum member would
	// silently start ranking 0. This catches that.
	it("has a rank for every member of the CaptchaType enum", () => {
		for (const value of Object.values(CaptchaType)) {
			expect(rankCaptchaType(value)).toBeGreaterThan(0);
		}
	});
});

describe("isStricterCaptchaType", () => {
	// Adjacent pairs, both orderings — non-adjacent comparisons would still
	// pass with an off-by-one in the table.
	it.each([
		[CaptchaType.image, CaptchaType.puzzle, true],
		[CaptchaType.puzzle, CaptchaType.image, false],
		[CaptchaType.puzzle, CaptchaType.pow, true],
		[CaptchaType.pow, CaptchaType.puzzle, false],
		[CaptchaType.pow, CaptchaType.frictionless, true],
		[CaptchaType.frictionless, CaptchaType.pow, false],
	])(
		"isStricterCaptchaType(%s, %s) === %s",
		(candidate, incumbent, expected) => {
			expect(isStricterCaptchaType(candidate, incumbent)).toBe(expected);
		},
	);

	// Strictly greater, so a tie keeps the incumbent. Callers reduce left to
	// right and the competing policies can carry different render tunables,
	// so the tie has to resolve to the first consistently.
	it("is false for equal ranks, so the incumbent is kept", () => {
		for (const value of Object.values(CaptchaType)) {
			expect(isStricterCaptchaType(value, value)).toBe(false);
		}
	});

	it("treats any real type as stricter than undefined", () => {
		for (const value of Object.values(CaptchaType)) {
			expect(isStricterCaptchaType(value, undefined)).toBe(true);
			expect(isStricterCaptchaType(undefined, value)).toBe(false);
		}
	});

	it("is false when both sides are unset", () => {
		expect(isStricterCaptchaType(undefined, undefined)).toBe(false);
	});
});
