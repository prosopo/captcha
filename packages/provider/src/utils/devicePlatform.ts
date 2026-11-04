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
	RequestHeaders,
	RoutingMachinePlatform,
	SolveDeviceSignals,
	TrafficCategoryPolicies,
} from "@prosopo/types";
import { type MobileVerdict, deriveMobileVerdict } from "./mobileSignals.js";

// NB: `isApple` covers desktop macOS as well as iOS. A rule that needs
// "iPhone / iPad specifically" must test the UA itself — see the iOS UA
// gate in the decision machines' route checks.
const APPLE_UA_REGEX = /iPhone|iPad|iPod|Macintosh|Mac OS X/i;

/**
 * Everything the device verdict is drawn from. Every caller supplies the same
 * set; `solve` is the only part that can be missing, because nothing has been
 * solved before the frictionless entry.
 */
export interface DeviceInputs {
	userAgent: string;
	headers?: RequestHeaders;
	/** The IP lookup for the connection being judged. */
	ipInfo?: { isValid?: boolean; isMobile?: boolean };
	tcpMss?: number;
	/** Only the encrypted bot-detection payload says this, so it rides on the session. */
	webView?: boolean;
	solve?: SolveDeviceSignals;
}

export interface DeviceVerdict {
	platform: RoutingMachinePlatform;
	mobile: MobileVerdict;
}

export const solveDeviceSignals = (
	behaviouralData: { d?: string; c2?: unknown[] } | undefined,
): SolveDeviceSignals | undefined =>
	behaviouralData && {
		...(behaviouralData.d !== undefined && {
			deviceCapability: behaviouralData.d,
		}),
		...(behaviouralData.c2 !== undefined && {
			touchEventCount: behaviouralData.c2.length,
		}),
	};

/**
 * The one place the provider decides what device a visitor is on. Routing,
 * decision machines and challenge sizing all read `platform.isMobile` or
 * `mobile` from here, so they cannot disagree about the same visitor.
 */
export const deriveDevice = ({
	userAgent,
	headers,
	ipInfo,
	tcpMss,
	webView = false,
	solve,
}: DeviceInputs): DeviceVerdict => {
	const mobile = deriveMobileVerdict({
		userAgent,
		...(headers && { headers }),
		...(ipInfo?.isValid && { carrierNetwork: ipInfo.isMobile }),
		...(tcpMss !== undefined && { tcpMss }),
		webView,
		...solve,
	});
	return {
		platform: {
			isApple: APPLE_UA_REGEX.test(userAgent),
			isWebView: webView,
			isMobile: mobile.isMobile,
		},
		mobile,
	};
};

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
