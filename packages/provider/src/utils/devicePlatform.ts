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

import type {
	ITrafficFilter,
	RoutingMachinePlatform,
	TrafficCategoryPolicies,
} from "@prosopo/types";

// NB: `isApple` covers desktop macOS as well as iOS. A rule that needs
// "iPhone / iPad specifically" must test the UA itself — see the iOS UA
// gate in the decision machines' route checks.
const APPLE_UA_REGEX = /iPhone|iPad|iPod|Macintosh|Mac OS X/i;
const MOBILE_UA_REGEX = /Mobile|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i;

/**
 * Derive platform flags from server-visible signals. `isWebView` is supplied
 * by the caller because that bit only comes from the encrypted bot-detection
 * payload, not request headers. `isMobile` prefers IPInfo's network-classified
 * mobile bit when present and falls back to UA parsing otherwise.
 */
export const derivePlatform = (
	userAgent: string,
	webView: boolean,
	ipInfo?: { isMobile?: boolean },
): RoutingMachinePlatform => ({
	isApple: APPLE_UA_REGEX.test(userAgent),
	isWebView: webView,
	isMobile:
		typeof ipInfo?.isMobile === "boolean"
			? ipInfo.isMobile
			: MOBILE_UA_REGEX.test(userAgent),
});

// Categories on TrafficFilterSchema that carry a TrafficCategoryPolicy. The
// schema's other keys (thresholds, allow/deny name lists, skipExtras…) are
// not egress classes and have no `action`.
const TRAFFIC_FILTER_CATEGORIES = [
	"vpn",
	"proxy",
	"tor",
	"datacenter",
	"abuser",
	"mobile",
	"satellite",
	"crawler",
] as const satisfies readonly (keyof TrafficCategoryPolicies)[];

/**
 * Project a site's `trafficFilter` down to just its per-category policies, for
 * consumption by routing / decision machines. Machines use these both to tell
 * whether the operator rejects an egress class at all, and to inherit the
 * operator's configured action when they classify one themselves — see
 * `TrafficCategoryPolicies`.
 *
 * Returns `undefined` when no category is configured, so the field can be
 * omitted from the machine input entirely.
 */
export const deriveTrafficPolicies = (
	trafficFilter: Partial<ITrafficFilter> | undefined,
): TrafficCategoryPolicies | undefined => {
	if (!trafficFilter) return undefined;
	const policies: TrafficCategoryPolicies = {};
	let any = false;
	for (const category of TRAFFIC_FILTER_CATEGORIES) {
		const policy = trafficFilter[category];
		if (policy) {
			policies[category] = policy;
			any = true;
		}
	}
	return any ? policies : undefined;
};
