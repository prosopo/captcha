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

// `puzzleMaxDifficulty` is a site setting, so its bounds live on the schema in
// @prosopo/types. The ladder it bounds lives in @prosopo/captcha-severity,
// which @prosopo/types deliberately does not depend on — that package's
// zero-dependency, browser-safe property is load-bearing. So the two numbers
// are written out twice and nothing in either package can catch them drifting.
//
// @prosopo/provider depends on both, so the pin lives here. If this fails,
// the ladder changed and `settings.ts` needs the same edit — not the other way
// round.

import {
	MAX_AUTO_ESCALATION_LEVEL,
	PUZZLE_DIFFICULTY_LEVELS,
} from "@prosopo/captcha-severity";
import {
	puzzleMaxDifficultyDefault,
	puzzleMaxDifficultyMax,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";

describe("puzzleMaxDifficulty bounds track the puzzle difficulty ladder", () => {
	it("defaults to the automatic escalation ceiling, preserving behaviour for sites that never set it", () => {
		expect(puzzleMaxDifficultyDefault).toBe(MAX_AUTO_ESCALATION_LEVEL);
	});

	it("allows every level the ladder defines", () => {
		expect(puzzleMaxDifficultyMax).toBe(PUZZLE_DIFFICULTY_LEVELS.length - 1);
	});

	// 0 has to stay reachable: it is the whole point of the setting — the
	// documented "nothing escalated" level, where the session is left bare and
	// the site's own puzzle settings render.
	it("keeps level 0 within bounds", () => {
		expect(puzzleMaxDifficultyMax).toBeGreaterThanOrEqual(0);
		expect(PUZZLE_DIFFICULTY_LEVELS.some((band) => band.level === 0)).toBe(
			true,
		);
	});
});
