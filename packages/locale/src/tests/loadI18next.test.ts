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

import type { i18n } from "i18next";
import { beforeEach, describe, expect, test, vi } from "vitest";

describe("loadI18next", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	test("should load backend i18n when backend is true", async () => {
		const mockI18n = {
			isInitialized: false,
			on: vi.fn((event: string, callback: (i18n: i18n) => void) => {
				if (event === "loaded") {
					setTimeout(() => callback(mockI18n as i18n), 0);
				}
			}),
		} as unknown as i18n;

		const mockInitializeI18n = vi.fn((callback?: (i18n: i18n) => void) => {
			if (callback) {
				setTimeout(() => callback(mockI18n), 0);
			}
			return mockI18n;
		});

		vi.doMock("../i18nBackend.js", () => ({
			default: mockInitializeI18n,
		}));

		const loadI18next = (await import("../loadI18next.js")).default;
		const result = await loadI18next(true);

		expect(result).toBe(mockI18n);
		expect(mockInitializeI18n).toHaveBeenCalled();
	});

	test("should load frontend i18n when backend is false", async () => {
		const mockI18n = {
			isInitialized: false,
			on: vi.fn((event: string, callback: (i18n: i18n) => void) => {
				if (event === "loaded") {
					setTimeout(() => callback(mockI18n as i18n), 0);
				}
			}),
		} as unknown as i18n;

		const mockInitializeI18n = vi.fn((callback?: (i18n: i18n) => void) => {
			if (callback) {
				setTimeout(() => callback(mockI18n), 0);
			}
			return mockI18n;
		});

		vi.doMock("../i18nFrontend.js", () => ({
			default: mockInitializeI18n,
		}));

		const loadI18next = (await import("../loadI18next.js")).default;
		const result = await loadI18next(false);

		expect(result).toBe(mockI18n);
		expect(mockInitializeI18n).toHaveBeenCalled();
	});

	test("should return cached instance on subsequent calls", async () => {
		const mockI18n = {
			isInitialized: false,
			on: vi.fn((event: string, callback: (i18n: i18n) => void) => {
				if (event === "loaded") {
					setTimeout(() => callback(mockI18n as i18n), 0);
				}
			}),
		} as unknown as i18n;

		let callCount = 0;
		const mockInitializeI18n = vi.fn((callback?: (i18n: i18n) => void) => {
			callCount++;
			if (callback) {
				setTimeout(() => callback(mockI18n), 0);
			}
			return mockI18n;
		});

		vi.doMock("../i18nBackend.js", () => ({
			default: mockInitializeI18n,
		}));

		const loadI18next = (await import("../loadI18next.js")).default;
		const first = await loadI18next(true);
		const second = await loadI18next(true);

		expect(first).toBe(second);
		expect(callCount).toBe(1);
	});

	test("should return i18n instance", async () => {
		// Verifies that the function returns an i18n instance
		const mockI18n = {
			isInitialized: false,
			on: vi.fn((event: string, callback: (i18n: i18n) => void) => {
				if (event === "loaded") {
					setTimeout(() => callback(mockI18n as i18n), 0);
				}
			}),
		} as unknown as i18n;

		const mockInitializeI18n = vi.fn((callback?: (i18n: i18n) => void) => {
			if (callback) {
				setTimeout(() => callback(mockI18n), 0);
			}
			return mockI18n;
		});

		vi.doMock("../i18nBackend.js", () => ({
			default: mockInitializeI18n,
		}));

		const loadI18next = (await import("../loadI18next.js")).default;
		const result = await loadI18next(true);

		expect(result).toBe(mockI18n);
		expect(mockInitializeI18n).toHaveBeenCalled();
	});
});
