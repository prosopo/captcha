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

import {
	ContextType,
	type IUserSettings,
	contextAwareThresholdDefault,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	determineContextType,
	getContextThreshold,
} from "../../../api/captcha/contextAwareValidation.js";

describe("contextAwareValidation", () => {
	describe("determineContextType", () => {
		it("should return ContextType.Webview when webView is true", () => {
			const result = determineContextType(true);
			expect(result).toBe(ContextType.Webview);
		});

		it("should return ContextType.Default when webView is false", () => {
			const result = determineContextType(false);
			expect(result).toBe(ContextType.Default);
		});
	});

	describe("getContextThreshold", () => {
		it("should return default threshold when contextAware is not set", () => {
			const settings = {} as unknown as IUserSettings;
			const result = getContextThreshold(settings, ContextType.Default);
			expect(result).toBe(contextAwareThresholdDefault);
		});

		it("should return global threshold when no context-specific threshold is set", () => {
			const settings = {
				contextAware: {
					enabled: true,
					contexts: {
						[ContextType.Default]: {
							type: ContextType.Default,
							threshold: 0.8,
						},
					},
				},
			} as unknown as IUserSettings;
			const result = getContextThreshold(settings, ContextType.Default);
			expect(result).toBe(0.8);
		});

		it("should return context-specific threshold when configured", () => {
			const settings = {
				contextAware: {
					enabled: true,
					contexts: {
						[ContextType.Webview]: {
							type: ContextType.Webview,
							threshold: 0.9,
						},
						[ContextType.Default]: {
							type: ContextType.Default,
							threshold: 0.6,
						},
					},
				},
			} as unknown as IUserSettings;

			const webviewResult = getContextThreshold(settings, ContextType.Webview);
			expect(webviewResult).toBe(0.9);

			const defaultResult = getContextThreshold(settings, ContextType.Default);
			expect(defaultResult).toBe(0.6);
		});

		it("should return default threshold when context not found in object", () => {
			const settings = {
				contextAware: {
					enabled: true,
					contexts: {
						[ContextType.Webview]: {
							type: ContextType.Webview,
							threshold: 0.9,
						},
					},
				},
			} as unknown as IUserSettings;

			const result = getContextThreshold(settings, ContextType.Default);
			expect(result).toBe(contextAwareThresholdDefault);
		});

		it("should handle empty contexts object", () => {
			const settings = {
				contextAware: {
					enabled: true,
					contexts: {},
				},
			} as unknown as IUserSettings;

			const result = getContextThreshold(settings, ContextType.Default);
			expect(result).toBe(contextAwareThresholdDefault);
		});
	});
});
