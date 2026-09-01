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
 * Duplicated from `@prosopo/decision-machines`' `uaClassify` — as `classifyOs`
 * is — because the provider / user-access-policy request path cannot depend on
 * that package. The two must agree, so a routing-rule `browserNameIn` and an
 * access-rule `browser` name the same thing.
 *
 * `unknown` is a first-class value so an allow-list ("only let Firefox
 * through") blocks unrecognised User-Agents instead of silently passing them.
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
 * Classify the browser from a raw User-Agent string. Pure, so it is safe to
 * call on the provider's server-side request path.
 *
 * Test order is load-bearing: every branch below Chrome also carries a
 * `chrome/` token, and Safari's signature appears in nearly every WebKit UA, so
 * the specific engines and the in-app browsers have to be ruled out first.
 * Anything unrecognised returns `unknown` rather than guessing.
 *
 * Driven off the full User-Agent rather than the `sec-ch-ua` client hint on
 * purpose: a client can simply omit client hints, but stripping the User-Agent
 * breaks far more, so the UA is the harder signal to bypass.
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
