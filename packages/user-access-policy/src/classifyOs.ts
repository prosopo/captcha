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
 * The operating systems the classifier can resolve a request to. Kept
 * deliberately in step with the OS vocabulary in
 * `@prosopo/decision-machines`' `uaClassify` (so a routing-rule `osNameIn` and
 * an access-rule `os` agree on the same names), but defined here because the
 * provider / user-access-policy request path cannot depend on the
 * decision-machines package.
 *
 * `unknown` is the catch-all when no signature matches. It is a first-class
 * value so an allow-list ("only let Windows through") can block unrecognised
 * User-Agents instead of silently passing them.
 */
export const OS_NAMES = [
	"windows",
	"macos",
	"ios",
	"android",
	"linux",
	"unknown",
] as const;

export type OsName = (typeof OS_NAMES)[number];

/**
 * Classify the operating system from a raw User-Agent string. Pure — no
 * navigator/window/DOM dependence — so it is safe to call on the provider's
 * server-side request path.
 *
 * Detection order matches `uaClassify.classifyUserAgent`: iOS (iphone/ipad/
 * ipod) is tested before the generic mac signature, and Android before Linux,
 * because those User-Agents contain the more general token too. Detection is
 * conservative — anything unrecognised returns `unknown` rather than guessing,
 * so an `os === "ios"` rule never fires on a UA we don't understand.
 *
 * The classification is driven off the full User-Agent rather than the
 * `sec-ch-ua-platform` client hint on purpose: a client can simply omit client
 * hints, but stripping the User-Agent breaks far more, so the UA is the more
 * reliable signal for an OS-restriction rule that is meant to be hard to
 * bypass.
 */
export const classifyOs = (userAgent: string | undefined): OsName => {
	const ua = (userAgent || "").toLowerCase();

	if (/iphone|ipad|ipod/.test(ua)) {
		return "ios";
	}
	if (/android/.test(ua)) {
		return "android";
	}
	if (/windows/.test(ua)) {
		return "windows";
	}
	if (/macintosh|mac os/.test(ua)) {
		return "macos";
	}
	if (/linux/.test(ua)) {
		return "linux";
	}
	return "unknown";
};
