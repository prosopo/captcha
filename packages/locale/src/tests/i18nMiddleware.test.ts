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
import type { HandleOptions } from "i18next-http-middleware";
import { beforeEach, describe, expect, test, vi } from "vitest";

describe("i18nMiddleware", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	test("should load i18n and call handle with options", async () => {
		const mockI18n = {
			t: vi.fn(),
		} as unknown as i18n;

		const mockLoadI18next = vi.fn().mockResolvedValue(mockI18n);
		const mockHandle = vi
			.fn()
			.mockReturnValue((req: unknown, res: unknown, next: () => void) => {
				next();
			});

		vi.doMock("../loadI18next.js", () => ({
			default: mockLoadI18next,
		}));

		vi.doMock("i18next-http-middleware", () => ({
			handle: mockHandle,
		}));

		const i18nMiddleware = (await import("../i18nMiddleware.js")).default;
		const options: HandleOptions = {
			ignoreRoutes: ["/api"],
		};

		const result = await i18nMiddleware(options);

		expect(mockLoadI18next).toHaveBeenCalledWith(true);
		expect(mockHandle).toHaveBeenCalledWith(mockI18n, options);
		expect(result).toBeDefined();
	});

	test("should work with empty options", async () => {
		const mockI18n = {
			t: vi.fn(),
		} as unknown as i18n;

		const mockLoadI18next = vi.fn().mockResolvedValue(mockI18n);
		const mockHandle = vi
			.fn()
			.mockReturnValue((req: unknown, res: unknown, next: () => void) => {
				next();
			});

		vi.doMock("../loadI18next.js", () => ({
			default: mockLoadI18next,
		}));

		vi.doMock("i18next-http-middleware", () => ({
			handle: mockHandle,
		}));

		const i18nMiddleware = (await import("../i18nMiddleware.js")).default;
		const options: HandleOptions = {};

		const result = await i18nMiddleware(options);

		expect(mockLoadI18next).toHaveBeenCalledWith(true);
		expect(mockHandle).toHaveBeenCalledWith(mockI18n, options);
		expect(result).toBeDefined();
	});

	test("should propagate errors from loadI18next", async () => {
		const mockLoadI18next = vi.fn().mockRejectedValue(new Error("Load failed"));
		const mockHandle = vi.fn();

		vi.doMock("../loadI18next.js", () => ({
			default: mockLoadI18next,
		}));

		vi.doMock("i18next-http-middleware", () => ({
			handle: mockHandle,
		}));

		const i18nMiddleware = (await import("../i18nMiddleware.js")).default;
		const options: HandleOptions = {};

		await expect(i18nMiddleware(options)).rejects.toThrow("Load failed");
		expect(mockHandle).not.toHaveBeenCalled();
	});
});
