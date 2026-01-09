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

import { describe, expect, it } from "vitest";
import { getUTCDate } from "../date.js";

describe("getUTCDate", () => {
	// Test that getUTCDate converts local time components to UTC
	it("should create UTC date from local date components", () => {
		// Create a date in a specific timezone context
		const localDate = new Date("2023-12-25T15:30:45.123Z"); // This is already UTC

		const utcDate = getUTCDate(localDate);

		// The function should take the individual components and create a UTC date
		// So it should be equivalent to new Date(Date.UTC(...))
		const expectedUTC = new Date(
			Date.UTC(
				localDate.getFullYear(),
				localDate.getMonth(),
				localDate.getDate(),
				localDate.getHours(),
				localDate.getMinutes(),
				localDate.getSeconds(),
				localDate.getMilliseconds(),
			),
		);

		expect(utcDate.getTime()).toBe(expectedUTC.getTime());
		expect(utcDate.toISOString()).toBe(expectedUTC.toISOString());
	});

	it("should handle dates with different timezone offsets", () => {
		// Create a date that represents local time in a different timezone
		// This is tricky to test deterministically, but we can test that the function
		// produces a date where UTC methods return the same values as the input's local methods

		const localDate = new Date(2023, 11, 25, 15, 30, 45, 123); // Local time components

		const utcDate = getUTCDate(localDate);

		// The UTC date should have the same UTC time values as the local date's components
		expect(utcDate.getUTCFullYear()).toBe(localDate.getFullYear());
		expect(utcDate.getUTCMonth()).toBe(localDate.getMonth());
		expect(utcDate.getUTCDate()).toBe(localDate.getDate());
		expect(utcDate.getUTCHours()).toBe(localDate.getHours());
		expect(utcDate.getUTCMinutes()).toBe(localDate.getMinutes());
		expect(utcDate.getUTCSeconds()).toBe(localDate.getSeconds());
		expect(utcDate.getUTCMilliseconds()).toBe(localDate.getMilliseconds());
	});

	it("should return a Date object", () => {
		const localDate = new Date();
		const utcDate = getUTCDate(localDate);

		expect(utcDate).toBeInstanceOf(Date);
	});

	it("should handle edge cases like start/end of year", () => {
		// Test with December 31st
		const endOfYear = new Date(2023, 11, 31, 23, 59, 59, 999);
		const utcEndOfYear = getUTCDate(endOfYear);

		expect(utcEndOfYear.getUTCFullYear()).toBe(2023);
		expect(utcEndOfYear.getUTCMonth()).toBe(11); // December
		expect(utcEndOfYear.getUTCDate()).toBe(31);

		// Test with January 1st
		const startOfYear = new Date(2024, 0, 1, 0, 0, 0, 0);
		const utcStartOfYear = getUTCDate(startOfYear);

		expect(utcStartOfYear.getUTCFullYear()).toBe(2024);
		expect(utcStartOfYear.getUTCMonth()).toBe(0); // January
		expect(utcStartOfYear.getUTCDate()).toBe(1);
	});

	it("should handle leap year dates", () => {
		const leapDay = new Date(2024, 1, 29, 12, 0, 0, 0); // February 29, 2024
		const utcLeapDay = getUTCDate(leapDay);

		expect(utcLeapDay.getUTCFullYear()).toBe(2024);
		expect(utcLeapDay.getUTCMonth()).toBe(1); // February
		expect(utcLeapDay.getUTCDate()).toBe(29);
	});
});