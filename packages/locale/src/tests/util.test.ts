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

import { describe, expect, test, vi } from "vitest";
import { isClientSide, isServerSide } from "../util.js";

describe("util", () => {
	describe("isClientSide", () => {
		test("should return true when window and document exist", () => {
			const mockWindow = {
				document: {
					createElement: vi.fn(),
				},
			};
			global.window = mockWindow as unknown as Window & typeof globalThis;
			expect(isClientSide()).toBe(true);
		});

		test("should return false when window is undefined", () => {
			// @ts-expect-error - intentionally setting to undefined for test
			global.window = undefined;
			expect(isClientSide()).toBe(false);
		});

		test("should return false when window.document is undefined", () => {
			global.window = { document: undefined } as unknown as Window &
				typeof globalThis;
			expect(isClientSide()).toBe(false);
		});

		test("should return false when window.document.createElement is undefined", () => {
			global.window = {
				document: {},
			} as unknown as Window & typeof globalThis;
			expect(isClientSide()).toBe(false);
		});
	});

	describe("isServerSide", () => {
		test("should return false when window and document exist", () => {
			const mockWindow = {
				document: {
					createElement: vi.fn(),
				},
			};
			global.window = mockWindow as unknown as Window & typeof globalThis;
			expect(isServerSide()).toBe(false);
		});

		test("should return true when window is undefined", () => {
			// @ts-expect-error - intentionally setting to undefined for test
			global.window = undefined;
			expect(isServerSide()).toBe(true);
		});

		test("should return true when window.document is undefined", () => {
			global.window = { document: undefined } as unknown as Window &
				typeof globalThis;
			expect(isServerSide()).toBe(true);
		});

		test("should return true when window.document.createElement is undefined", () => {
			global.window = {
				document: {},
			} as unknown as Window & typeof globalThis;
			expect(isServerSide()).toBe(true);
		});

		test("should be the inverse of isClientSide", () => {
			const testCases = [
				{ window: undefined },
				{ window: { document: undefined } },
				{ window: { document: {} } },
				{ window: { document: { createElement: vi.fn() } } },
			];

			for (const testCase of testCases) {
				global.window = testCase.window as unknown as Window &
					typeof globalThis;
				expect(isServerSide()).toBe(!isClientSide());
			}
		});
	});
});
