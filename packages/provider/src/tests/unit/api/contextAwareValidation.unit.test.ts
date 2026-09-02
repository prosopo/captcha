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

import {
	ContextType,
	type IUserSettings,
	contextAwareThresholdDefault,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	determineContextType,
	getContextThreshold,
	isContextConfigured,
} from "../../../api/captcha/contextAwareValidation.js";

const DESKTOP_UA =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const IPHONE_UA =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_UA =
	"Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_PHONE_UA =
	"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const ANDROID_TABLET_UA =
	"Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const settingsWith = (
	contexts: Record<string, { type: ContextType; threshold: number }>,
): IUserSettings =>
	({
		contextAware: { enabled: true, contexts },
	}) as unknown as IUserSettings;

describe("contextAwareValidation", () => {
	describe("determineContextType", () => {
		it("classifies desktop browsers", () => {
			expect(determineContextType(DESKTOP_UA, false)).toBe(ContextType.Desktop);
		});

		it("classifies phones", () => {
			expect(determineContextType(IPHONE_UA, false)).toBe(ContextType.Mobile);
			expect(determineContextType(ANDROID_PHONE_UA, false)).toBe(
				ContextType.Mobile,
			);
		});

		it("classifies tablets, including an iPad whose UA carries a Mobile token", () => {
			expect(determineContextType(IPAD_UA, false)).toBe(ContextType.Tablet);
			expect(determineContextType(ANDROID_TABLET_UA, false)).toBe(
				ContextType.Tablet,
			);
		});

		it("crosses each device family with the webview flag", () => {
			expect(determineContextType(DESKTOP_UA, true)).toBe(
				ContextType.DesktopWebview,
			);
			expect(determineContextType(IPHONE_UA, true)).toBe(
				ContextType.MobileWebview,
			);
			expect(determineContextType(IPAD_UA, true)).toBe(
				ContextType.TabletWebview,
			);
		});

		it("falls back to desktop for a missing user agent", () => {
			expect(determineContextType(undefined, false)).toBe(ContextType.Desktop);
		});
	});

	describe("isContextConfigured", () => {
		it("is false when contextAware is not set", () => {
			expect(
				isContextConfigured({} as unknown as IUserSettings, ContextType.Mobile),
			).toBe(false);
		});

		it("is true only for the device contexts that are configured", () => {
			const settings = settingsWith({
				[ContextType.Mobile]: { type: ContextType.Mobile, threshold: 0.8 },
			});

			expect(isContextConfigured(settings, ContextType.Mobile)).toBe(true);
			expect(isContextConfigured(settings, ContextType.Desktop)).toBe(false);
			expect(isContextConfigured(settings, ContextType.MobileWebview)).toBe(
				false,
			);
		});

		it("expands a legacy default context over every non-webview family", () => {
			const settings = settingsWith({
				[ContextType.Default]: { type: ContextType.Default, threshold: 0.75 },
			});

			expect(isContextConfigured(settings, ContextType.Desktop)).toBe(true);
			expect(isContextConfigured(settings, ContextType.Mobile)).toBe(true);
			expect(isContextConfigured(settings, ContextType.Tablet)).toBe(true);
			expect(isContextConfigured(settings, ContextType.MobileWebview)).toBe(
				false,
			);
		});

		it("expands a legacy webview context over every webview family", () => {
			const settings = settingsWith({
				[ContextType.Webview]: { type: ContextType.Webview, threshold: 0.75 },
			});

			expect(isContextConfigured(settings, ContextType.MobileWebview)).toBe(
				true,
			);
			expect(isContextConfigured(settings, ContextType.TabletWebview)).toBe(
				true,
			);
			expect(isContextConfigured(settings, ContextType.DesktopWebview)).toBe(
				true,
			);
			expect(isContextConfigured(settings, ContextType.Mobile)).toBe(false);
		});
	});

	describe("getContextThreshold", () => {
		it("returns the default threshold when contextAware is not set", () => {
			const settings = {} as unknown as IUserSettings;
			expect(getContextThreshold(settings, ContextType.Desktop)).toBe(
				contextAwareThresholdDefault,
			);
		});

		it("returns the device context's own threshold", () => {
			const settings = settingsWith({
				[ContextType.Mobile]: { type: ContextType.Mobile, threshold: 0.9 },
				[ContextType.Desktop]: { type: ContextType.Desktop, threshold: 0.6 },
			});

			expect(getContextThreshold(settings, ContextType.Mobile)).toBe(0.9);
			expect(getContextThreshold(settings, ContextType.Desktop)).toBe(0.6);
		});

		it("inherits a legacy context's threshold across its family", () => {
			const settings = settingsWith({
				[ContextType.Default]: { type: ContextType.Default, threshold: 0.85 },
			});

			expect(getContextThreshold(settings, ContextType.Desktop)).toBe(0.85);
			expect(getContextThreshold(settings, ContextType.Tablet)).toBe(0.85);
		});

		it("lets a device context override the legacy threshold that covers it", () => {
			const settings = settingsWith({
				[ContextType.Default]: { type: ContextType.Default, threshold: 0.85 },
				[ContextType.Mobile]: { type: ContextType.Mobile, threshold: 0.6 },
			});

			expect(getContextThreshold(settings, ContextType.Mobile)).toBe(0.6);
			expect(getContextThreshold(settings, ContextType.Desktop)).toBe(0.85);
		});

		it("returns the default threshold for an unconfigured context", () => {
			const settings = settingsWith({
				[ContextType.Mobile]: { type: ContextType.Mobile, threshold: 0.9 },
			});

			expect(getContextThreshold(settings, ContextType.Desktop)).toBe(
				contextAwareThresholdDefault,
			);
		});

		it("handles an empty contexts object", () => {
			const settings = settingsWith({});
			expect(getContextThreshold(settings, ContextType.Desktop)).toBe(
				contextAwareThresholdDefault,
			);
		});
	});
});
