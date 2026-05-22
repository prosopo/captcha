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
	DEFAULT_FRICTIONLESS_THRESHOLD,
	getRoundsFromSimScore,
} from "../../../../../api/captcha/getFrictionlessCaptchaChallenge/constants.js";

describe("getFrictionlessCaptchaChallenge/constants", () => {
	it("uses 0.5 as the default frictionless threshold", () => {
		expect(DEFAULT_FRICTIONLESS_THRESHOLD).toBe(0.5);
	});

	describe("getRoundsFromSimScore", () => {
		const cases: Array<[number, number]> = [
			[1.0, 0],
			[0.9, 0],
			[0.89, 3],
			[0.8, 3],
			[0.79, 4],
			[0.7, 4],
			[0.69, 6],
			[0.6, 6],
			[0.59, 7],
			[0.5, 7],
			[0.49, 8],
			[0, 8],
		];
		for (const [sim, rounds] of cases) {
			it(`maps sim=${sim} → ${rounds} rounds`, () => {
				expect(getRoundsFromSimScore(sim)).toBe(rounds);
			});
		}

		it("is monotonically non-decreasing as similarity decreases", () => {
			// Iterate by integer percentage to avoid floating-point drift.
			let last = -Number.POSITIVE_INFINITY;
			for (let pct = 100; pct >= 0; pct -= 5) {
				const rounds = getRoundsFromSimScore(pct / 100);
				expect(rounds).toBeGreaterThanOrEqual(last);
				last = rounds;
			}
		});
	});
});
