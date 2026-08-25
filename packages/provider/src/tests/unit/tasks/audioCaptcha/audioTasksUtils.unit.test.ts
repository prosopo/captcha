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

import { describe, expect, test } from "vitest";
import {
	normaliseAudioAnswer,
	validateAudioSolution,
} from "../../../../tasks/audioCaptcha/audioTasksUtils.js";

describe("normaliseAudioAnswer", () => {
	test("keeps digits in order and drops everything else", () => {
		expect(normaliseAudioAnswer("12345")).toBe("12345");
		expect(normaliseAudioAnswer("1 2 3 4 5")).toBe("12345");
		expect(normaliseAudioAnswer("1-2-3-4-5")).toBe("12345");
		expect(normaliseAudioAnswer("  12 345  ")).toBe("12345");
		expect(normaliseAudioAnswer("1,2.3/4\\5")).toBe("12345");
	});

	test("cannot turn one digit sequence into a different one", () => {
		// The whole safety argument for normalising: only non-digits are
		// removed, so order and identity are preserved.
		expect(normaliseAudioAnswer("54321")).toBe("54321");
		expect(normaliseAudioAnswer("1a2b3")).toBe("123");
	});

	test("returns empty for input with no digits", () => {
		expect(normaliseAudioAnswer("")).toBe("");
		expect(normaliseAudioAnswer("   ")).toBe("");
		expect(normaliseAudioAnswer("abc")).toBe("");
	});
});

describe("validateAudioSolution", () => {
	test("accepts an exact match", () => {
		expect(validateAudioSolution("12345", "12345")).toBe(true);
	});

	test("accepts the separator variations people actually type", () => {
		expect(validateAudioSolution("1 2 3 4 5", "12345")).toBe(true);
		expect(validateAudioSolution(" 12345 ", "12345")).toBe(true);
		expect(validateAudioSolution("1-2-3-4-5", "12345")).toBe(true);
	});

	test("rejects a wrong answer", () => {
		expect(validateAudioSolution("12346", "12345")).toBe(false);
		expect(validateAudioSolution("54321", "12345")).toBe(false);
	});

	test("rejects a prefix, a suffix and an extra digit", () => {
		// No partial credit: a five-digit answer must be five digits.
		expect(validateAudioSolution("1234", "12345")).toBe(false);
		expect(validateAudioSolution("123456", "12345")).toBe(false);
		expect(validateAudioSolution("012345", "12345")).toBe(false);
	});

	test("rejects a single-substitution near miss", () => {
		// Deliberately no edit-distance tolerance — one allowed substitution
		// would take a blind guess from 1-in-100,000 to roughly 1-in-2,200.
		expect(validateAudioSolution("12395", "12345")).toBe(false);
	});

	test("rejects empty and whitespace-only submissions", () => {
		expect(validateAudioSolution("", "12345")).toBe(false);
		expect(validateAudioSolution("   ", "12345")).toBe(false);
		expect(validateAudioSolution("abcde", "12345")).toBe(false);
	});

	test("rejects everything when the stored answer is empty", () => {
		// A record with an empty `answer` should be impossible, but if one
		// existed, "" === "" must not pass every submission.
		expect(validateAudioSolution("", "")).toBe(false);
		expect(validateAudioSolution("12345", "")).toBe(false);
	});
});
