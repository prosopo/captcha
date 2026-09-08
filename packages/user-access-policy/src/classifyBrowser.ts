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

/**
 * Kept in step with `@prosopo/decision-machines`' `uaClassify` — as `classifyOs`
 * is — but defined here because the provider request path cannot depend on that
 * package.
 */
export const BROWSER_NAMES = [
	"chrome",
	"safari",
	"firefox",
	"edge",
	"opera",
	"samsung_internet",
	"wechat",
	"facebook",
	"instagram",
	"ie",
	"unknown",
] as const;

export type BrowserName = (typeof BROWSER_NAMES)[number];

/**
 * Branch order is load-bearing: every browser below Chrome also carries a
 * `chrome/` token, and Safari's signature appears in nearly every WebKit UA.
 *
 * Reads the User-Agent rather than the `sec-ch-ua` client hint because a client
 * can simply omit client hints, but stripping the UA breaks far more.
 */
export const classifyBrowser = (userAgent: string | undefined): BrowserName => {
	const ua = (userAgent || "").toLowerCase();

	if (/\bedg(?:e|a|ios)?\//.test(ua)) {
		return "edge";
	}
	if (/samsungbrowser/.test(ua)) {
		return "samsung_internet";
	}
	if (/\bopr\/|opera/.test(ua)) {
		return "opera";
	}
	if (/micromessenger/.test(ua)) {
		return "wechat";
	}
	if (/fban|fbav|fbios/.test(ua)) {
		return "facebook";
	}
	if (/instagram/.test(ua)) {
		return "instagram";
	}
	if (/firefox|fxios/.test(ua)) {
		return "firefox";
	}
	if (/msie|trident/.test(ua)) {
		return "ie";
	}
	if (/\bchrome\/|\bcrios\//.test(ua)) {
		return "chrome";
	}
	if (/safari\//.test(ua)) {
		return "safari";
	}
	return "unknown";
};
