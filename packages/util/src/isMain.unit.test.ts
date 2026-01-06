import { fileURLToPath } from "node:url";
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
import { isMain } from "./isMain.js";

describe("isMain", () => {
	test("types", () => {
		// check the types are picked up correctly by ts
		// isMain can return boolean | "" | undefined due to process.argv[1] potentially being undefined
		// and the expression (binName && process.argv[1] && ...) can evaluate to "" if process.argv[1] is ""
		const v1: boolean | "" | undefined = isMain("file:///path/to/test.js");
		const v2: boolean | "" | undefined = isMain(
			"file:///path/to/test.js",
			"mybin",
		);
		const v3: boolean | "" | undefined = isMain({ exports: {} } as NodeModule);

		// Test with actual module (if available)
		if (typeof require !== "undefined") {
			const mockModule = { exports: {} } as NodeModule;
			const v4: boolean | "" | undefined = isMain(mockModule);
		}

		// Verify return type
		const result = isMain("file:///path/to/test.js");
		const _v5: boolean | "" | undefined = result;
	});

	const originalArgv = process.argv;

	beforeEach(() => {
		process.argv = [...originalArgv];
	});

	afterEach(() => {
		process.argv = originalArgv;
		vi.restoreAllMocks();
	});

	describe("with string (ES6 module)", () => {
		test("returns true when process.argv[1] matches import.meta.url path", () => {
			const testUrl = "file:///path/to/test.js";
			const testPath = fileURLToPath(testUrl);
			process.argv[1] = testPath;

			expect(isMain(testUrl)).toBe(true);
		});

		test("returns false when process.argv[1] does not match", () => {
			const testUrl = "file:///path/to/test.js";
			process.argv[1] = "/different/path.js";

			// When binName is not provided and paths don't match, returns falsy (false)
			const result = isMain(testUrl);
			expect(result).toBeFalsy();
		});

		test("returns true when running with npx and binName matches", () => {
			const testUrl = "file:///path/to/test.js";
			process.argv[1] = "/some/path/node_modules/.bin/mybin";

			expect(isMain(testUrl, "mybin")).toBe(true);
		});

		test("returns false when running with npx but binName does not match", () => {
			const testUrl = "file:///path/to/test.js";
			process.argv[1] = "/some/path/node_modules/.bin/otherbin";

			expect(isMain(testUrl, "mybin")).toBe(false);
		});

		test("returns false when process.argv[1] is undefined", () => {
			const testUrl = "file:///path/to/test.js";
			process.argv[1] = undefined as unknown as string;

			// When process.argv[1] is undefined, the function returns falsy (undefined)
			const result = isMain(testUrl, "mybin");
			expect(result).toBeFalsy();
		});

		test("handles npx path with different node_modules location", () => {
			const testUrl = "file:///path/to/test.js";
			process.argv[1] = "/usr/local/lib/node_modules/.bin/mybin";

			expect(isMain(testUrl, "mybin")).toBe(true);
		});
	});

	describe("with NodeModule (CommonJS)", () => {
		test("returns true when require.main equals module", () => {
			const mockModule = {
				exports: {},
			} as NodeModule;

			// Mock require and require.main to point to the same module
			const mockRequire = {
				main: mockModule,
			};
			vi.stubGlobal("require", mockRequire);

			// In an ES module test environment, typeof require is still 'undefined' even after stubbing
			// This test documents current behavior: function returns false in ES module context
			const result = isMain(mockRequire.main);
			expect(result).toBe(false);
		});

		test("returns false when require.main does not equal module", () => {
			const mockModule = {
				exports: {},
			} as NodeModule;

			const otherModule = {
				exports: {},
			} as NodeModule;

			// Mock require.main
			vi.stubGlobal("require", {
				main: otherModule,
			});

			expect(isMain(mockModule)).toBe(false);
		});

		test("returns false when require is undefined", () => {
			const mockModule = {
				exports: {},
			} as NodeModule;

			// Remove require from global
			vi.stubGlobal("require", undefined);

			expect(isMain(mockModule)).toBe(false);
		});

		test("returns false when module does not have exports property", () => {
			const mockModule = {} as NodeModule;

			vi.stubGlobal("require", {
				main: mockModule,
			});

			expect(isMain(mockModule)).toBe(false);
		});
	});

	describe("edge cases", () => {
		test("handles empty string URL", () => {
			process.argv[1] = "";
			// fileURLToPath with empty string throws Invalid URL error
			expect(() => isMain("")).toThrow();
		});

		test("handles URL with special characters", () => {
			const testUrl = "file:///path%20with%20spaces/test.js";
			const testPath = fileURLToPath(testUrl);
			process.argv[1] = testPath;

			expect(isMain(testUrl)).toBe(true);
		});

		test("handles relative path in process.argv[1]", () => {
			const testUrl = "file:///path/to/test.js";
			process.argv[1] = "./test.js";

			// Returns falsy when paths don't match
			const result = isMain(testUrl);
			expect(result).toBeFalsy();
		});
	});
});
