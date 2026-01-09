// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyRecency } from "../verifyRecency.js";

describe("verifyRecency", () => {
	// Mock Date.now to control current time in tests
	const mockCurrentTime = 1704067200000; // 2024-01-01 00:00:00 UTC

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(mockCurrentTime);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should return true when challenge is within maxVerifiedTime", () => {
		const challengeTimestamp = mockCurrentTime - 5000; // 5 seconds ago
		const challenge = `${challengeTimestamp}___someData`;
		const maxVerifiedTime = 10000; // 10 seconds

		const result = verifyRecency(challenge, maxVerifiedTime);
		expect(result).toBe(true);
	});

	it("should return true when challenge timestamp equals current time", () => {
		const challenge = `${mockCurrentTime}___someData`;
		const maxVerifiedTime = 10000;

		const result = verifyRecency(challenge, maxVerifiedTime);
		expect(result).toBe(true);
	});

	it("should return false when challenge is older than maxVerifiedTime", () => {
		const challengeTimestamp = mockCurrentTime - 15000; // 15 seconds ago
		const challenge = `${challengeTimestamp}___someData`;
		const maxVerifiedTime = 10000; // 10 seconds

		const result = verifyRecency(challenge, maxVerifiedTime);
		expect(result).toBe(false);
	});

	it("should return false when timestamp is missing from challenge", () => {
		const challenge = "___someData"; // Empty timestamp
		const maxVerifiedTime = 10000;

		const result = verifyRecency(challenge, maxVerifiedTime);
		expect(result).toBe(false);
	});

	it("should return false when challenge has no separator", () => {
		const challenge = "someDataWithoutSeparator";
		const maxVerifiedTime = 10000;

		const result = verifyRecency(challenge, maxVerifiedTime);
		expect(result).toBe(false);
	});

	it("should return false when timestamp is not a valid number", () => {
		const challenge = "invalidTimestamp___someData";
		const maxVerifiedTime = 10000;

		const result = verifyRecency(challenge, maxVerifiedTime);
		expect(result).toBe(false);
	});

	it("should handle challenge with multiple separators", () => {
		const challengeTimestamp = mockCurrentTime - 5000;
		const challenge = `${challengeTimestamp}___part1___part2`;
		const maxVerifiedTime = 10000;

		const result = verifyRecency(challenge, maxVerifiedTime);
		expect(result).toBe(true);
	});

	it("should handle empty challenge string", () => {
		const challenge = "";
		const maxVerifiedTime = 10000;

		const result = verifyRecency(challenge, maxVerifiedTime);
		expect(result).toBe(false);
	});

	it("should handle maxVerifiedTime of 0", () => {
		const challenge = `${mockCurrentTime}___someData`;
		const maxVerifiedTime = 0;

		const result = verifyRecency(challenge, maxVerifiedTime);
		expect(result).toBe(true); // Current time - current time = 0, which equals 0
	});

	it("should handle negative maxVerifiedTime", () => {
		const challengeTimestamp = mockCurrentTime - 1000;
		const challenge = `${challengeTimestamp}___someData`;
		const maxVerifiedTime = -1000;

		const result = verifyRecency(challenge, maxVerifiedTime);
		expect(result).toBe(false); // 1000 > -1000
	});
});