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
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { verifyRecency } from "./verifyRecency.js";

describe("verifyRecency", () => {
	test("types", () => {
		// check the types are picked up correctly by ts
		const v1: boolean = verifyRecency("1234567890___data", 10000);
		const v2: boolean = verifyRecency("1234567890___data", 0);
		const v3: boolean = verifyRecency(
			"1234567890___data",
			Number.MAX_SAFE_INTEGER,
		);

		// Verify return type is always boolean
		const result = verifyRecency("1234567890___data", 10000);
		const _v4: boolean = result;
	});

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("returns true when challenge is within maxVerifiedTime", () => {
		const now = Date.now();
		const maxVerifiedTime = 10000; // 10 seconds
		const challengeTimestamp = now - 5000; // 5 seconds ago
		const challenge = `${challengeTimestamp}___someData`;

		vi.setSystemTime(now);
		expect(verifyRecency(challenge, maxVerifiedTime)).toBe(true);
	});

	test("returns true when challenge is exactly at maxVerifiedTime", () => {
		const now = Date.now();
		const maxVerifiedTime = 10000; // 10 seconds
		const challengeTimestamp = now - 10000; // exactly 10 seconds ago
		const challenge = `${challengeTimestamp}___someData`;

		vi.setSystemTime(now);
		expect(verifyRecency(challenge, maxVerifiedTime)).toBe(true);
	});

	test("returns false when challenge is older than maxVerifiedTime", () => {
		const now = Date.now();
		const maxVerifiedTime = 10000; // 10 seconds
		const challengeTimestamp = now - 15000; // 15 seconds ago
		const challenge = `${challengeTimestamp}___someData`;

		vi.setSystemTime(now);
		expect(verifyRecency(challenge, maxVerifiedTime)).toBe(false);
	});

	test("returns true when challenge is very recent", () => {
		const now = Date.now();
		const maxVerifiedTime = 10000; // 10 seconds
		const challengeTimestamp = now - 100; // 100ms ago
		const challenge = `${challengeTimestamp}___someData`;

		vi.setSystemTime(now);
		expect(verifyRecency(challenge, maxVerifiedTime)).toBe(true);
	});

	test("returns true when challenge is from the future (within tolerance)", () => {
		const now = Date.now();
		const maxVerifiedTime = 10000; // 10 seconds
		const challengeTimestamp = now + 1000; // 1 second in the future
		const challenge = `${challengeTimestamp}___someData`;

		vi.setSystemTime(now);
		// Future timestamps result in negative difference, which is <= maxVerifiedTime
		expect(verifyRecency(challenge, maxVerifiedTime)).toBe(true);
	});

	test("returns false when challenge has no timestamp", () => {
		const challenge = "___someData";
		const maxVerifiedTime = 10000;
		expect(verifyRecency(challenge, maxVerifiedTime)).toBe(false);
	});

	test("returns false when challenge has empty timestamp", () => {
		const challenge = "___someData";
		const maxVerifiedTime = 10000;
		expect(verifyRecency(challenge, maxVerifiedTime)).toBe(false);
	});

	test("handles challenge with multiple separators", () => {
		const now = Date.now();
		const maxVerifiedTime = 10000;
		const challengeTimestamp = now - 5000;
		const challenge = `${challengeTimestamp}___part1___part2___part3`;

		vi.setSystemTime(now);
		expect(verifyRecency(challenge, maxVerifiedTime)).toBe(true);
	});

	test("handles challenge with only timestamp", () => {
		const now = Date.now();
		const maxVerifiedTime = 10000;
		const challengeTimestamp = now - 5000;
		const challenge = `${challengeTimestamp}`;

		vi.setSystemTime(now);
		expect(verifyRecency(challenge, maxVerifiedTime)).toBe(true);
	});

	test("handles very large maxVerifiedTime", () => {
		const now = Date.now();
		const maxVerifiedTime = Number.MAX_SAFE_INTEGER;
		const challengeTimestamp = now - 1000000; // 1 million ms ago
		const challenge = `${challengeTimestamp}___someData`;

		vi.setSystemTime(now);
		expect(verifyRecency(challenge, maxVerifiedTime)).toBe(true);
	});

	test("handles zero maxVerifiedTime", () => {
		const now = Date.now();
		const maxVerifiedTime = 0;
		const challengeTimestamp = now;
		const challenge = `${challengeTimestamp}___someData`;

		vi.setSystemTime(now);
		expect(verifyRecency(challenge, maxVerifiedTime)).toBe(true);
	});

	test("handles negative maxVerifiedTime", () => {
		const now = Date.now();
		const maxVerifiedTime = -1000;
		const challengeTimestamp = now - 5000;
		const challenge = `${challengeTimestamp}___someData`;

		vi.setSystemTime(now);
		// Negative maxVerifiedTime means nothing is recent enough
		expect(verifyRecency(challenge, maxVerifiedTime)).toBe(false);
	});
});
