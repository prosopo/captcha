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
import { isProtectChallengeReferer } from "../../../../../api/captcha/getFrictionlessCaptchaChallenge/challengeReferer.js";

describe("isProtectChallengeReferer", () => {
	it.each<[string, string | undefined, boolean]>([
		[
			"challenge URL with jti",
			"https://protect.example.com/api/protect/challenge?jti=bumblebee-1",
			true,
		],
		[
			"challenge URL without query",
			"https://protect.example.com/api/protect/challenge",
			true,
		],
		[
			"challenge sub-path",
			"https://protect.example.com/api/protect/challenge/verify",
			true,
		],
		["origin only", "https://protect.example.com/", false],
		["site page", "https://www.example.com/app/catalog/browse", false],
		[
			"similar but different path",
			"https://protect.example.com/api/protect/challenges",
			false,
		],
		[
			"path only in the query",
			"https://example.com/?next=/api/protect/challenge",
			false,
		],
		["not a URL", "api/protect/challenge", false],
		["empty", "", false],
		["absent", undefined, false],
	])("%s", (_label, referer, expected) => {
		expect(isProtectChallengeReferer(referer)).toBe(expected);
	});
});
