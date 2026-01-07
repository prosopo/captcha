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
import { describe, expect, it, vi } from "vitest";
import { consoleTableWithWrapping } from "../table.js";

describe("table", () => {
	describe("consoleTableWithWrapping", () => {
		it("calls console.table with wrapped data", () => {
			const consoleSpy = vi
				.spyOn(console, "table")
				.mockImplementation(() => {});
			const data = [{ a: "short", b: "value" }];
			consoleTableWithWrapping(data);
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it("wraps long values", () => {
			const consoleSpy = vi
				.spyOn(console, "table")
				.mockImplementation(() => {});
			const longValue = "a".repeat(200);
			const data = [{ a: longValue, b: "short" }];
			consoleTableWithWrapping(data, 50);
			const callArgs = consoleSpy.mock.calls[0];
			expect(callArgs).toBeDefined();
			if (callArgs && Array.isArray(callArgs[0])) {
				expect(callArgs[0].length).toBeGreaterThan(1);
			}
			consoleSpy.mockRestore();
		});

		it("handles empty data", () => {
			const consoleSpy = vi
				.spyOn(console, "table")
				.mockImplementation(() => {});
			consoleTableWithWrapping([]);
			expect(consoleSpy).toHaveBeenCalledWith([]);
			consoleSpy.mockRestore();
		});

		it("uses default maxColWidth when not specified", () => {
			const consoleSpy = vi
				.spyOn(console, "table")
				.mockImplementation(() => {});
			const data = [{ a: "value" }];
			consoleTableWithWrapping(data);
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});
});

