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
import { consoleTableWithWrapping } from "../table.js";

describe("consoleTableWithWrapping", () => {
	let consoleTableSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleTableSpy = vi.spyOn(console, "table").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleTableSpy.mockRestore();
	});

	it("should call console.table with original data when no wrapping needed", () => {
		const data = [
			{ name: "John", age: "25" },
			{ name: "Jane", age: "30" },
		];

		consoleTableWithWrapping(data, 50);

		expect(consoleTableSpy).toHaveBeenCalledWith(data);
	});

	it("should wrap long text across multiple rows", () => {
		const data = [
			{ name: "VeryLongNameThatExceedsLimit", description: "Short" },
		];

		consoleTableWithWrapping(data, 10);

		// Should be called with wrapped data
		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
		const calledWith = consoleTableSpy.mock.calls[0][0] as Array<Record<string, string>>;

		// Should have multiple rows for the wrapped item
		expect(calledWith.length).toBeGreaterThan(1);

		// First row should have the first part of the long name
		expect(calledWith[0].name).toBe("VeryLongNa");
		expect(calledWith[0].description).toBe("Short");

		// Second row should have the remaining part
		expect(calledWith[1].name).toBe("meThatExce");
		expect(calledWith[1].description).toBe(""); // Empty for remaining rows
	});

	it("should handle multiple columns with different lengths", () => {
		const data = [
			{
				short: "Hi",
				medium: "MediumLength",
				long: "ThisIsAVeryLongStringThatShouldBeWrappedAcrossMultipleRows",
			},
		];

		consoleTableWithWrapping(data, 15);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
		const calledWith = consoleTableSpy.mock.calls[0][0] as Array<Record<string, string>>;

		// Should create multiple rows
		expect(calledWith.length).toBeGreaterThan(1);

		// Check that all columns are present in each row
		calledWith.forEach((row) => {
			expect(row).toHaveProperty("short");
			expect(row).toHaveProperty("medium");
			expect(row).toHaveProperty("long");
		});
	});

	it("should handle empty data array", () => {
		const data: Array<Record<string, string>> = [];

		consoleTableWithWrapping(data, 50);

		expect(consoleTableSpy).toHaveBeenCalledWith([]);
	});

	it("should filter out rows with only empty strings", () => {
		const data = [
			{ name: "", description: "" },
		];

		consoleTableWithWrapping(data, 10);

		// Rows with only empty/falsy values are filtered out
		expect(consoleTableSpy).toHaveBeenCalledWith([]);
	});

	it("should handle data with undefined values", () => {
		const data = [
			{ name: "Test", description: undefined as any },
		];

		consoleTableWithWrapping(data, 10);

		expect(consoleTableSpy).toHaveBeenCalledWith(data);
	});

	it("should use default maxColWidth when not provided", () => {
		const data = [
			{ name: "VeryLongNameThatExceedsDefaultLimitOf90CharactersAndShouldBeWrapped" },
		];

		consoleTableWithWrapping(data);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
		const calledWith = consoleTableSpy.mock.calls[0][0] as Array<Record<string, string>>;

		// With default limit of 90, this should still fit
		expect(calledWith.length).toBe(1);
	});

	it("should handle multiple data items with wrapping", () => {
		const data = [
			{ name: "Short", value: "LongValueThatWillBeWrappedToNextLine" },
			{ name: "AnotherShort", value: "AnotherLongValue" },
		];

		consoleTableWithWrapping(data, 15);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
		const calledWith = consoleTableSpy.mock.calls[0][0] as Array<Record<string, string>>;

		// Should have more rows than original data due to wrapping
		expect(calledWith.length).toBeGreaterThan(data.length);

		// Should preserve the structure
		expect(calledWith.some(row => row.name === "Short")).toBe(true);
		expect(calledWith.some(row => row.value?.startsWith("LongValue"))).toBe(true);
	});

	it("should handle maxColWidth of 1", () => {
		const data = [
			{ text: "ABC" },
		];

		consoleTableWithWrapping(data, 1);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
		const calledWith = consoleTableSpy.mock.calls[0][0] as Array<Record<string, string>>;

		// Should create multiple rows, one for each character
		expect(calledWith.length).toBeGreaterThan(1);
		expect(calledWith[0].text).toBe("A");
	});
});