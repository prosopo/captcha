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
import { getUTCDate } from "../date.js";

describe("date", () => {
	describe("getUTCDate", () => {
		it("converts date to UTC date", () => {
			const date = new Date("2023-01-15T10:30:45.123Z");
			const utcDate = getUTCDate(date);
			expect(utcDate.getTime()).toBe(date.getTime());
			expect(utcDate.getUTCFullYear()).toBe(2023);
			expect(utcDate.getUTCMonth()).toBe(0);
			expect(utcDate.getUTCDate()).toBe(15);
			expect(utcDate.getUTCHours()).toBe(10);
			expect(utcDate.getUTCMinutes()).toBe(30);
			expect(utcDate.getUTCSeconds()).toBe(45);
			expect(utcDate.getUTCMilliseconds()).toBe(123);
		});

		it("handles local timezone dates correctly", () => {
			const date = new Date(2023, 0, 15, 10, 30, 45, 123);
			const utcDate = getUTCDate(date);
			expect(utcDate.getUTCFullYear()).toBe(date.getFullYear());
			expect(utcDate.getUTCMonth()).toBe(date.getMonth());
			expect(utcDate.getUTCDate()).toBe(date.getDate());
			expect(utcDate.getUTCHours()).toBe(date.getHours());
			expect(utcDate.getUTCMinutes()).toBe(date.getMinutes());
			expect(utcDate.getUTCSeconds()).toBe(date.getSeconds());
			expect(utcDate.getUTCMilliseconds()).toBe(date.getMilliseconds());
		});
	});
});

