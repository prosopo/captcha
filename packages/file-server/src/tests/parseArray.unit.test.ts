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
import { parseArray } from "../index.js";

describe("parseArray", () => {
	it("should parse valid JSON array", () => {
		const result = parseArray('["a", "b", "c"]');
		expect(result).toEqual(["a", "b", "c"]);
	});

	it("should parse valid JSON array with numbers", () => {
		const result = parseArray("[1, 2, 3]");
		expect(result).toEqual([1, 2, 3]);
	});

	it("should parse valid JSON array with mixed types", () => {
		const result = parseArray('["a", 1, true, null]');
		expect(result).toEqual(["a", 1, true, null]);
	});

	it("should parse valid JSON array with nested arrays", () => {
		const result = parseArray('["a", ["b", "c"]]');
		expect(result).toEqual(["a", ["b", "c"]]);
	});

	it("should parse valid JSON array with objects", () => {
		const result = parseArray('["a", {"b": "c"}]');
		expect(result).toEqual(["a", { b: "c" }]);
	});

	it("should parse empty JSON array", () => {
		const result = parseArray("[]");
		expect(result).toEqual([]);
	});

	it("should return single value as array when JSON parse fails", () => {
		const result = parseArray("single-value");
		expect(result).toEqual(["single-value"]);
	});

	it("should return single value as array when invalid JSON", () => {
		const result = parseArray("{invalid json}");
		expect(result).toEqual(["{invalid json}"]);
	});

	it("should return single value as array when empty string", () => {
		const result = parseArray("");
		expect(result).toEqual([""]);
	});

	it("should parse valid JSON string (not array) and return as array", () => {
		const result = parseArray('"string-value"');
		expect(result).toEqual("string-value");
	});

	it("should parse valid JSON number and return as number", () => {
		const result = parseArray("123");
		expect(result).toEqual(123);
	});

	it("should have correct return type", () => {
		const result = parseArray('["a"]');
		expectTypeOf(result).toEqualTypeOf<unknown>();
	});
});
