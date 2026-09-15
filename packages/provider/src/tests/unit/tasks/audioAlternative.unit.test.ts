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

import { CaptchaType } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	isAudioAlternativeAllowed,
	isAudioAlternativeSessionType,
} from "../../../tasks/audioAlternative.js";

const VISUAL: CaptchaType[] = [
	CaptchaType.image,
	CaptchaType.puzzle,
	CaptchaType.iconOrder,
];
const NON_VISUAL: CaptchaType[] = [
	CaptchaType.pow,
	CaptchaType.frictionless,
	CaptchaType.authenticated,
	CaptchaType.audio,
];

describe("isAudioAlternativeSessionType", () => {
	it("is true for every visual challenge", () => {
		for (const type of VISUAL) {
			expect(isAudioAlternativeSessionType(type)).toBe(true);
		}
	});

	it("is false for types with no challenge to switch away from", () => {
		for (const type of NON_VISUAL) {
			expect(isAudioAlternativeSessionType(type)).toBe(false);
		}
		expect(isAudioAlternativeSessionType(undefined)).toBe(false);
	});
});

describe("isAudioAlternativeAllowed", () => {
	const on = { audioAccessibilityEnabled: true };
	const off = { audioAccessibilityEnabled: false };

	it("allows audio against a visual session on a site that opted in", () => {
		for (const type of VISUAL) {
			expect(isAudioAlternativeAllowed(CaptchaType.audio, type, on)).toBe(true);
		}
	});

	it("refuses when the site has not opted in", () => {
		for (const settings of [off, undefined]) {
			expect(
				isAudioAlternativeAllowed(
					CaptchaType.audio,
					CaptchaType.image,
					settings,
				),
			).toBe(false);
		}
	});

	it("refuses against a session with no visual challenge", () => {
		for (const type of NON_VISUAL) {
			expect(isAudioAlternativeAllowed(CaptchaType.audio, type, on)).toBe(
				false,
			);
		}
	});

	it("only ever applies to an audio request", () => {
		expect(
			isAudioAlternativeAllowed(CaptchaType.puzzle, CaptchaType.image, on),
		).toBe(false);
	});
});
