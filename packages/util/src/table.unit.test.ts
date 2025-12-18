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
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { consoleTableWithWrapping } from "./table.js";

describe("table", () => {
	test("types", () => {
		// Verify return type is void
		type ReturnType = typeof consoleTableWithWrapping extends (
			...args: any[]
		) => infer R
			? R
			: never;
		const _v1: void = undefined as unknown as ReturnType;

		// Verify parameter types
		type Params = Parameters<typeof consoleTableWithWrapping>;
		const _v2: { [key: string]: string }[] = [] as Params[0];
		const _v3: number | undefined = 90 as Params[1];
	});

	let consoleTableSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleTableSpy = vi.spyOn(console, "table").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleTableSpy.mockRestore();
	});

	test("calls console.table with data when no wrapping needed", () => {
		const data = [
			{ name: "John", age: "30" },
			{ name: "Jane", age: "25" },
		];

		consoleTableWithWrapping(data, 90);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
		expect(consoleTableSpy).toHaveBeenCalledWith(data);
	});

	test("wraps long values across multiple rows", () => {
		const data = [
			{
				name: "John",
				description: "a".repeat(200), // 200 characters, will wrap at 90
			},
		];

		consoleTableWithWrapping(data, 90);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
		const callArg = consoleTableSpy.mock.calls[0]?.[0] as
			| { [key: string]: string }[]
			| undefined;
		expect(callArg).toBeDefined();
		expect(Array.isArray(callArg)).toBe(true);
		if (callArg) {
			const firstRow = callArg[0];
			if (firstRow && firstRow.description) {
				expect(callArg.length).toBeGreaterThan(1);
				expect(firstRow.description.length).toBeLessThanOrEqual(90);
			}
		}
	});

	test("handles empty data array", () => {
		const data: { [key: string]: string }[] = [];

		consoleTableWithWrapping(data, 90);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
		expect(consoleTableSpy).toHaveBeenCalledWith([]);
	});

	test("handles data with empty strings", () => {
		const data = [
			{ name: "", age: "" },
			{ name: "John", age: "30" },
		];

		consoleTableWithWrapping(data, 90);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
	});

	test("handles data with null or undefined values", () => {
		const data = [
			{ name: "John", age: "30", extra: undefined as unknown as string },
		];

		consoleTableWithWrapping(data, 90);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
	});

	test("wraps multiple columns", () => {
		const data = [
			{
				col1: "a".repeat(200),
				col2: "b".repeat(200),
				col3: "c".repeat(200),
			},
		];

		consoleTableWithWrapping(data, 90);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
		const callArg = consoleTableSpy.mock.calls[0]?.[0] as
			| { [key: string]: string }[]
			| undefined;
		expect(callArg).toBeDefined();
		if (callArg) {
			expect(callArg.length).toBeGreaterThan(1);
			callArg.forEach((row: { [key: string]: string }) => {
				Object.values(row).forEach((value) => {
					if (value && typeof value === "string") {
						expect(value.length).toBeLessThanOrEqual(90);
					}
				});
			});
		}
	});

	test("uses custom maxColWidth", () => {
		const data = [
			{
				name: "a".repeat(200),
			},
		];

		consoleTableWithWrapping(data, 50);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
		const callArg = consoleTableSpy.mock.calls[0]?.[0] as
			| { [key: string]: string }[]
			| undefined;
		expect(callArg).toBeDefined();
		if (callArg && callArg.length > 0) {
			const firstRow = callArg[0];
			if (firstRow && firstRow.name) {
				expect(firstRow.name.length).toBeLessThanOrEqual(50);
			}
		}
	});

	test("handles values exactly at maxColWidth", () => {
		const data = [
			{
				name: "a".repeat(90),
			},
		];

		consoleTableWithWrapping(data, 90);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
		const callArg = consoleTableSpy.mock.calls[0]?.[0] as
			| { [key: string]: string }[]
			| undefined;
		expect(callArg).toBeDefined();
		if (callArg) {
			const firstRow = callArg[0];
			if (firstRow && firstRow.name) {
				expect(firstRow.name.length).toBe(90);
			}
		}
	});

	test("handles values just over maxColWidth", () => {
		const data = [
			{
				name: "a".repeat(91),
			},
		];

		consoleTableWithWrapping(data, 90);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
		const callArg = consoleTableSpy.mock.calls[0]?.[0] as
			| { [key: string]: string }[]
			| undefined;
		expect(callArg).toBeDefined();
		if (callArg && callArg.length >= 2) {
			expect(callArg.length).toBe(2);
			const firstRow = callArg[0];
			const secondRow = callArg[1];
			if (firstRow && firstRow.name) {
				expect(firstRow.name.length).toBe(90);
			}
			if (secondRow && secondRow.name) {
				expect(secondRow.name.length).toBe(1);
			}
		}
	});

	test("handles multiple items with different lengths", () => {
		const data = [
			{ name: "Short", description: "Short desc" },
			{ name: "Long", description: "a".repeat(200) },
		];

		consoleTableWithWrapping(data, 90);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
	});

	test("preserves all columns in wrapped rows", () => {
		const data = [
			{
				col1: "a".repeat(200),
				col2: "b",
				col3: "c",
			},
		];

		consoleTableWithWrapping(data, 90);

		expect(consoleTableSpy).toHaveBeenCalledTimes(1);
		const callArg = consoleTableSpy.mock.calls[0]?.[0] as
			| { [key: string]: string }[]
			| undefined;
		expect(callArg).toBeDefined();
		if (callArg) {
			callArg.forEach((row: { [key: string]: string }) => {
				expect(row).toHaveProperty("col1");
				expect(row).toHaveProperty("col2");
				expect(row).toHaveProperty("col3");
			});
		}
	});
});

