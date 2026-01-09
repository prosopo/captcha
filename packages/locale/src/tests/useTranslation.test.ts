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
import type {
	UseTranslationOptions,
	UseTranslationResponse,
} from "react-i18next";
import { beforeEach, describe, expect, test, vi } from "vitest";

describe("useTranslation", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	test("should call initializeI18n and useTranslationDefault", async () => {
		const mockT = vi.fn((key: string) => key);
		const mockI18n = {
			t: mockT,
		} as unknown as i18n;

		const mockInitializeI18n = vi.fn(() => mockI18n);

		const mockUseTranslationDefault = vi.fn(
			(
				_ns: string,
				_options?: UseTranslationOptions<"translation">,
			): UseTranslationResponse<"translation", unknown> => {
				return {
					t: mockT,
					i18n: mockI18n,
					ready: true,
				} as unknown as UseTranslationResponse<"translation", unknown>;
			},
		);

		vi.doMock("../i18nFrontend.js", () => ({
			default: mockInitializeI18n,
		}));

		vi.doMock("react-i18next", () => ({
			useTranslation: mockUseTranslationDefault,
		}));

		const useTranslation = (await import("../useTranslation.js")).default;
		const result = useTranslation();

		expect(mockInitializeI18n).toHaveBeenCalled();
		expect(mockUseTranslationDefault).toHaveBeenCalledWith("translation", {
			i18n: mockI18n,
		});
		expect(result.t).toBe(mockT);
		expect(result.i18n).toBe(mockI18n);
	});

	test("should pass options to useTranslationDefault", async () => {
		const mockT = vi.fn((key: string) => key);
		const mockI18n = {
			t: mockT,
		} as unknown as i18n;

		const mockInitializeI18n = vi.fn(() => mockI18n);

		const mockUseTranslationDefault = vi.fn(
			(
				_ns: string,
				_options?: UseTranslationOptions<"translation">,
			): UseTranslationResponse<"translation", unknown> => {
				return {
					t: mockT,
					i18n: mockI18n,
					ready: true,
				} as unknown as UseTranslationResponse<"translation", unknown>;
			},
		);

		vi.doMock("../i18nFrontend.js", () => ({
			default: mockInitializeI18n,
		}));

		vi.doMock("react-i18next", () => ({
			useTranslation: mockUseTranslationDefault,
		}));

		const useTranslation = (await import("../useTranslation.js")).default;
		const options = {
			keyPrefix: "WIDGET",
		} as unknown as UseTranslationOptions<"translation">;
		const result = useTranslation(options);

		expect(mockUseTranslationDefault).toHaveBeenCalledWith("translation", {
			i18n: mockI18n,
			...options,
		});
		expect(result.t).toBe(mockT);
	});

	test("should work without options", async () => {
		const mockT = vi.fn((key: string) => key);
		const mockI18n = {
			t: mockT,
		} as unknown as i18n;

		const mockInitializeI18n = vi.fn(() => mockI18n);

		const mockUseTranslationDefault = vi.fn(
			(
				_ns: string,
				_options?: UseTranslationOptions<"translation">,
			): UseTranslationResponse<"translation", unknown> => {
				return {
					t: mockT,
					i18n: mockI18n,
					ready: true,
				} as unknown as UseTranslationResponse<"translation", unknown>;
			},
		);

		vi.doMock("../i18nFrontend.js", () => ({
			default: mockInitializeI18n,
		}));

		vi.doMock("react-i18next", () => ({
			useTranslation: mockUseTranslationDefault,
		}));

		const useTranslation = (await import("../useTranslation.js")).default;
		const result = useTranslation();

		expect(mockUseTranslationDefault).toHaveBeenCalledWith("translation", {
			i18n: mockI18n,
		});
		expect(result).toBeDefined();
	});
});
