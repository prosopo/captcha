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

import type { RoutingMachinePlatform } from "@prosopo/types";

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
