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

describe("i18nFrontend", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	test("should initialize i18n when not already initialized", async () => {
		const mockI18n = {
			isInitialized: false,
			use: vi.fn().mockReturnThis(),
			init: vi.fn(),
			on: vi.fn((event: string, callback: (i18n: i18n) => void) => {
				if (event === "loaded") {
					setTimeout(() => callback(mockI18n as i18n), 0);
				}
			}),
		} as unknown as i18n;

		vi.doMock("i18next", () => ({
			default: mockI18n,
		}));

		const { initializeI18n } = await import("../i18nFrontend.js");
		const result = initializeI18n();

		expect(result).toBe(mockI18n);
		expect(mockI18n.use).toHaveBeenCalled();
		expect(mockI18n.init).toHaveBeenCalled();
	});

	test("should not initialize when already initialized", async () => {
		const mockI18n = {
			isInitialized: true,
			use: vi.fn().mockReturnThis(),
			init: vi.fn(),
			on: vi.fn(),
		} as unknown as i18n;

		vi.doMock("i18next", () => ({
			default: mockI18n,
		}));

		const { initializeI18n } = await import("../i18nFrontend.js");
		const result = initializeI18n();

		expect(result).toBe(mockI18n);
		expect(mockI18n.use).not.toHaveBeenCalled();
		expect(mockI18n.init).not.toHaveBeenCalled();
	});

	test("should call callback when loaded event fires", async () => {
		const mockI18n = {
			isInitialized: false,
			use: vi.fn().mockReturnThis(),
			init: vi.fn(),
			on: vi.fn((event: string, callback: (i18n: i18n) => void) => {
				if (event === "loaded") {
					setTimeout(() => callback(mockI18n as i18n), 0);
				}
			}),
		} as unknown as i18n;

		const callback = vi.fn();

		vi.doMock("i18next", () => ({
			default: mockI18n,
		}));

		const { initializeI18n } = await import("../i18nFrontend.js");
		initializeI18n(callback);

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(callback).toHaveBeenCalledWith(mockI18n);
	});

	test("should work without callback", async () => {
		const mockI18n = {
			isInitialized: false,
			use: vi.fn().mockReturnThis(),
			init: vi.fn(),
			on: vi.fn(),
		} as unknown as i18n;

		vi.doMock("i18next", () => ({
			default: mockI18n,
		}));

		const { initializeI18n } = await import("../i18nFrontend.js");
		const result = initializeI18n();

		expect(result).toBe(mockI18n);
		expect(mockI18n.init).toHaveBeenCalled();
	});
});
