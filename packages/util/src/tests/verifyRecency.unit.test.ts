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
import { verifyRecency } from "../verifyRecency.js";

describe("verifyRecency", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	test("accepts a timestamp within the window", () => {
		expect(verifyRecency("999000___acct", 5000)).toBe(true);
	});

	test("rejects a timestamp outside the window", () => {
		expect(verifyRecency("990000___acct", 5000)).toBe(false);
	});

	test("rejects a missing timestamp", () => {
		expect(verifyRecency("___acct", 5000)).toBe(false);
	});

	test.each(["999000abc", "abc", "-5", "999000.5"])(
		"rejects malformed timestamp %s",
		(timestamp) => {
			expect(verifyRecency(`${timestamp}___acct`, 5000)).toBe(false);
		},
	);
});
