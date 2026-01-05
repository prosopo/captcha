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
import { describe, expect, expectTypeOf, it } from "vitest";
import { toInt } from "../index.js";

describe("toInt", () => {
	it("should return number when input is number", () => {
		const result = toInt(42);
		expect(result).toBe(42);
		expectTypeOf(result).toEqualTypeOf<number | undefined>();
	});

	it("should return number when input is zero", () => {
		const result = toInt(0);
		expect(result).toBe(0);
	});

	it("should return number when input is negative number", () => {
		const result = toInt(-42);
		expect(result).toBe(-42);
	});

	it("should return undefined when input is undefined", () => {
		const result = toInt(undefined);
		expect(result).toBeUndefined();
		expectTypeOf(result).toEqualTypeOf<number | undefined>();
	});

	it("should parse valid integer string", () => {
		const result = toInt("42");
		expect(result).toBe(42);
	});

	it("should parse valid integer string with zero", () => {
		const result = toInt("0");
		expect(result).toBe(0);
	});

	it("should parse valid negative integer string", () => {
		const result = toInt("-42");
		expect(result).toBe(-42);
	});

	it("should parse integer string with leading zeros", () => {
		const result = toInt("007");
		expect(result).toBe(7);
	});

	it("should parse integer string with whitespace", () => {
		const result = toInt("  42  ");
		expect(result).toBe(42);
	});

	it("should return NaN when input is non-numeric string", () => {
		const result = toInt("not-a-number");
		expect(Number.isNaN(result)).toBe(true);
	});

	it("should return NaN when input is empty string", () => {
		const result = toInt("");
		expect(Number.isNaN(result)).toBe(true);
	});

	it("should parse float string and return integer part", () => {
		const result = toInt("42.7");
		expect(result).toBe(42);
	});

	it("should parse float string and return integer part for negative", () => {
		const result = toInt("-42.7");
		expect(result).toBe(-42);
	});

	it("should have correct parameter types", () => {
		expectTypeOf(toInt)
			.parameter(0)
			.toEqualTypeOf<string | number | undefined>();
	});
});
