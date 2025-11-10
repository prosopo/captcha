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

import { afterEach, describe, expect, it } from "vitest";
import { getWindowCallback } from "../elements/window.js";

describe("elements/window", () => {
	describe("getWindowCallback", () => {
		const originalWindow = global.window;

		afterEach(() => {
			// Clean up window object
			const keys = Object.keys(window);
			for (const key of keys) {
				if (key.startsWith("test")) {
					// biome-ignore lint/suspicious/noExplicitAny: Dynamic property cleanup
					delete (window as any)[key];
				}
			}
		});

		it("should retrieve a function from window object", () => {
			const testFn = () => "test";
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).testCallback = testFn;

			const result = getWindowCallback("testCallback");
			expect(result).toBe(testFn);
		});

		it("should handle window. prefix in callback name", () => {
			const testFn = () => "test";
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).testCallback = testFn;

			const result = getWindowCallback("window.testCallback");
			expect(result).toBe(testFn);
		});

		it("should throw error if callback is not a function", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).testCallback = "not a function";

			expect(() => getWindowCallback("testCallback")).toThrow(
				"Callback testCallback is not defined on the window object",
			);
		});

		it("should throw error if callback does not exist", () => {
			expect(() => getWindowCallback("nonExistentCallback")).toThrow(
				"Callback nonExistentCallback is not defined on the window object",
			);
		});

		it("should handle callback that is undefined", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).testCallback = undefined;

			expect(() => getWindowCallback("testCallback")).toThrow(
				"Callback testCallback is not defined on the window object",
			);
		});

		it("should handle callback that is null", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).testCallback = null;

			expect(() => getWindowCallback("testCallback")).toThrow(
				"Callback testCallback is not defined on the window object",
			);
		});

		it("should work with arrow functions", () => {
			const arrowFn = (x: number) => x * 2;
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).testArrowCallback = arrowFn;

			const result = getWindowCallback("testArrowCallback");
			expect(result).toBe(arrowFn);
			expect(result(5)).toBe(10);
		});

		it("should work with regular functions", () => {
			function regularFn(x: number) {
				return x * 2;
			}
			// biome-ignore lint/suspicious/noExplicitAny: Test setup
			(window as any).testRegularCallback = regularFn;

			const result = getWindowCallback("testRegularCallback");
			expect(result).toBe(regularFn);
			expect(result(5)).toBe(10);
		});
	});
});
