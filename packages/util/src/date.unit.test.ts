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
import { getUTCDate } from "./date.js";

describe("getUTCDate", () => {
	test("types", () => {
		const result = getUTCDate(new Date());
		const _v1: Date = result;
	});

	test("converts local date to UTC date with same components", () => {
		const localDate = new Date(2024, 0, 15, 14, 30, 45, 123);
		const utcDate = getUTCDate(localDate);

		expect(utcDate.getUTCFullYear()).toBe(2024);
		expect(utcDate.getUTCMonth()).toBe(0);
		expect(utcDate.getUTCDate()).toBe(15);
		expect(utcDate.getUTCHours()).toBe(14);
		expect(utcDate.getUTCMinutes()).toBe(30);
		expect(utcDate.getUTCSeconds()).toBe(45);
		expect(utcDate.getUTCMilliseconds()).toBe(123);
	});

	test("handles date at midnight", () => {
		const localDate = new Date(2024, 5, 1, 0, 0, 0, 0);
		const utcDate = getUTCDate(localDate);

		expect(utcDate.getUTCFullYear()).toBe(2024);
		expect(utcDate.getUTCMonth()).toBe(5);
		expect(utcDate.getUTCDate()).toBe(1);
		expect(utcDate.getUTCHours()).toBe(0);
		expect(utcDate.getUTCMinutes()).toBe(0);
		expect(utcDate.getUTCSeconds()).toBe(0);
		expect(utcDate.getUTCMilliseconds()).toBe(0);
	});

	test("handles date at end of day", () => {
		const localDate = new Date(2024, 11, 31, 23, 59, 59, 999);
		const utcDate = getUTCDate(localDate);

		expect(utcDate.getUTCFullYear()).toBe(2024);
		expect(utcDate.getUTCMonth()).toBe(11);
		expect(utcDate.getUTCDate()).toBe(31);
		expect(utcDate.getUTCHours()).toBe(23);
		expect(utcDate.getUTCMinutes()).toBe(59);
		expect(utcDate.getUTCSeconds()).toBe(59);
		expect(utcDate.getUTCMilliseconds()).toBe(999);
	});

	test("handles leap year date", () => {
		const localDate = new Date(2024, 1, 29, 12, 0, 0, 0);
		const utcDate = getUTCDate(localDate);

		expect(utcDate.getUTCFullYear()).toBe(2024);
		expect(utcDate.getUTCMonth()).toBe(1);
		expect(utcDate.getUTCDate()).toBe(29);
		expect(utcDate.getUTCHours()).toBe(12);
	});

	test("preserves all date components regardless of timezone", () => {
		const localDate = new Date(2023, 6, 4, 8, 15, 30, 500);
		const utcDate = getUTCDate(localDate);

		expect(utcDate.getUTCFullYear()).toBe(localDate.getFullYear());
		expect(utcDate.getUTCMonth()).toBe(localDate.getMonth());
		expect(utcDate.getUTCDate()).toBe(localDate.getDate());
		expect(utcDate.getUTCHours()).toBe(localDate.getHours());
		expect(utcDate.getUTCMinutes()).toBe(localDate.getMinutes());
		expect(utcDate.getUTCSeconds()).toBe(localDate.getSeconds());
		expect(utcDate.getUTCMilliseconds()).toBe(localDate.getMilliseconds());
	});

	test("handles date from different year", () => {
		const localDate = new Date(2000, 0, 1, 12, 0, 0, 0);
		const utcDate = getUTCDate(localDate);

		expect(utcDate.getUTCFullYear()).toBe(2000);
		expect(utcDate.getUTCMonth()).toBe(0);
		expect(utcDate.getUTCDate()).toBe(1);
	});

	test("handles date with milliseconds precision", () => {
		const localDate = new Date(2024, 3, 10, 10, 20, 30, 456);
		const utcDate = getUTCDate(localDate);

		expect(utcDate.getUTCMilliseconds()).toBe(456);
	});

	test("returns a new Date instance", () => {
		const localDate = new Date(2024, 0, 1);
		const utcDate = getUTCDate(localDate);

		expect(utcDate).not.toBe(localDate);
		expect(utcDate instanceof Date).toBe(true);
	});
});

