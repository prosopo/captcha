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
	type IPInfoResponse,
	type ITrafficFilter,
	ResultReason,
	trafficFilterAbuserScoreThresholdDefault,
} from "@prosopo/types";

export type TrafficBlockReason =
	| ResultReason.VPN_BLOCKED
	| ResultReason.PROXY_BLOCKED
	| ResultReason.TOR_BLOCKED
	| ResultReason.ABUSER_BLOCKED
	| ResultReason.DATACENTER_BLOCKED
	| ResultReason.MOBILE_BLOCKED
	| ResultReason.SATELLITE_BLOCKED
	| ResultReason.CRAWLER_BLOCKED;

export type TrafficCheckResult =
	| { isBlocked: false }
	| { isBlocked: true; reason: TrafficBlockReason };

type EvaluateOptions = {
	suppressVpnDatacenterInteraction: boolean;
};

const evaluateIpInfo = (
	ipInfo: IPInfoResponse | undefined,
	trafficFilter: Partial<ITrafficFilter>,
	options: EvaluateOptions,
): TrafficCheckResult => {
	if (!ipInfo || !ipInfo.isValid) {
		return { isBlocked: false };
	}

	if (trafficFilter.blockVpn && ipInfo.isVPN) {
		return { isBlocked: true, reason: ResultReason.VPN_BLOCKED };
	}

	if (trafficFilter.blockProxy && ipInfo.isProxy) {
		return { isBlocked: true, reason: ResultReason.PROXY_BLOCKED };
	}

	if (trafficFilter.blockTor && ipInfo.isTor) {
		return { isBlocked: true, reason: ResultReason.TOR_BLOCKED };
	}

	if ((trafficFilter.blockAbuser ?? true) && ipInfo.isAbuser) {
		const threshold =
			trafficFilter.abuserScoreThreshold ??
			trafficFilterAbuserScoreThresholdDefault;
		const maxScore = Math.max(
			ipInfo.abuserScore ?? 0,
			ipInfo.companyAbuserScore ?? 0,
		);
		if (maxScore >= threshold) {
			return { isBlocked: true, reason: ResultReason.ABUSER_BLOCKED };
		}
	}

	if (
		trafficFilter.blockDatacenter &&
		ipInfo.isDatacenter &&
		!(
			options.suppressVpnDatacenterInteraction &&
			ipInfo.isVPN &&
			!trafficFilter.blockVpn
		)
	) {
		return { isBlocked: true, reason: ResultReason.DATACENTER_BLOCKED };
	}

	if (trafficFilter.blockMobile && ipInfo.isMobile) {
		return { isBlocked: true, reason: ResultReason.MOBILE_BLOCKED };
	}

	if (trafficFilter.blockSatellite && ipInfo.isSatellite) {
		return { isBlocked: true, reason: ResultReason.SATELLITE_BLOCKED };
	}

	if (trafficFilter.blockCrawler && ipInfo.isCrawler) {
		return { isBlocked: true, reason: ResultReason.CRAWLER_BLOCKED };
	}

	return { isBlocked: false };
};

/**
 * Checks whether a request should be blocked based on traffic filter
 * settings and the request's already-resolved IP info (attached to
 * `req.ipInfo` by `ipInfoMiddleware`). Each filter (VPN, proxy, Tor,
 * abuser, etc.) is evaluated independently. A missing or invalid
 * `ipInfo` falls back to "not blocked" so an outage in the upstream
 * service can't block all traffic.
 *
 * One cross-filter rule: when an operator enables `blockDatacenter` but
 * leaves `blockVpn` off, commercial VPNs that exit from datacenter IPs
 * (which is most of them — Mullvad, NordVPN, ProtonVPN, etc. all run on
 * AWS/OVH/Hetzner) would otherwise be caught by the datacenter rule.
 * Operators almost never intend that: "block data centers" is about
 * scraping/automation traffic, not VPN end-users. So the datacenter
 * rule is suppressed for IPs also flagged as VPN unless the operator
 * has opted in to blocking VPN traffic explicitly.
 */
export const checkTrafficFilter = (
	ipInfo: IPInfoResponse | undefined,
	trafficFilter: Partial<ITrafficFilter>,
	extraIpInfos?: ReadonlyArray<IPInfoResponse | undefined>,
): TrafficCheckResult => {
	const primary = evaluateIpInfo(ipInfo, trafficFilter, {
		suppressVpnDatacenterInteraction: true,
	});
	if (primary.isBlocked) {
		return primary;
	}

	for (const extra of extraIpInfos ?? []) {
		const result = evaluateIpInfo(extra, trafficFilter, {
			suppressVpnDatacenterInteraction: false,
		});
		if (result.isBlocked) {
			return result;
		}
	}

	return { isBlocked: false };
};
