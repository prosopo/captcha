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

import type { Logger } from "@prosopo/common";
import type { ITrafficFilter } from "@prosopo/types";
import type { IIpInfoService } from "@prosopo/types-env";

export type TrafficBlockReason =
	| "API.VPN_BLOCKED"
	| "API.PROXY_BLOCKED"
	| "API.TOR_BLOCKED"
	| "API.ABUSER_BLOCKED"
	| "API.DATACENTER_BLOCKED"
	| "API.MOBILE_BLOCKED"
	| "API.SATELLITE_BLOCKED"
	| "API.CRAWLER_BLOCKED";

export type TrafficCheckResult =
	| { isBlocked: false }
	| { isBlocked: true; reason: TrafficBlockReason };

/**
 * Checks whether an IP should be blocked based on traffic filter settings.
 * Each filter (VPN, proxy, Tor, abuser) is evaluated independently.
 * Falls back to "not blocked" on lookup failure so an outage in the
 * upstream service can't block all traffic.
 */
export const checkTrafficFilter = async (
	ip: string,
	trafficFilter: Partial<ITrafficFilter>,
	ipInfoService: IIpInfoService,
	logger: Logger,
): Promise<TrafficCheckResult> => {
	try {
		const info = await ipInfoService.lookup(ip);

		if (!info.isValid) {
			return { isBlocked: false };
		}

		if (trafficFilter.blockVpn && info.isVPN) {
			return { isBlocked: true, reason: "API.VPN_BLOCKED" };
		}

		if (trafficFilter.blockProxy && info.isProxy) {
			return { isBlocked: true, reason: "API.PROXY_BLOCKED" };
		}

		if (trafficFilter.blockTor && info.isTor) {
			return { isBlocked: true, reason: "API.TOR_BLOCKED" };
		}

		if ((trafficFilter.blockAbuser ?? true) && info.isAbuser) {
			const threshold = trafficFilter.abuserScoreThreshold ?? 0;
			const maxScore = Math.max(
				info.abuserScore ?? 0,
				info.companyAbuserScore ?? 0,
			);
			if (maxScore >= threshold) {
				return { isBlocked: true, reason: "API.ABUSER_BLOCKED" };
			}
		}

		if (trafficFilter.blockDatacenter && info.isDatacenter) {
			return { isBlocked: true, reason: "API.DATACENTER_BLOCKED" };
		}

		if (trafficFilter.blockMobile && info.isMobile) {
			return { isBlocked: true, reason: "API.MOBILE_BLOCKED" };
		}

		if (trafficFilter.blockSatellite && info.isSatellite) {
			return { isBlocked: true, reason: "API.SATELLITE_BLOCKED" };
		}

		if (trafficFilter.blockCrawler && info.isCrawler) {
			return { isBlocked: true, reason: "API.CRAWLER_BLOCKED" };
		}

		return { isBlocked: false };
	} catch (error) {
		logger.warn(() => ({
			msg: "Traffic filter check failed; allowing request",
			error,
			ip,
		}));
		return { isBlocked: false };
	}
};
