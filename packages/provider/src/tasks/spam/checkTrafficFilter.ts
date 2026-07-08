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
	type IPInfoResult,
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

// Match the allowlist against `datacenterName`, `providerName`
// (`company.name`), and `asnOrganization` — case-insensitive, whitespace
// trimmed. The upstream ipapi only populates `datacenter.datacenter` for
// curated named ranges, so falling back to providerName and asnOrganization
// lets the allowlist also catch generic CDN / cloud-provider IPs that come
// back with `is_datacenter: true` but no datacenter name.
const isDatacenterAllowlisted = (
	ipInfo: IPInfoResult,
	allowlist: ReadonlyArray<string> | undefined,
): boolean => {
	if (!allowlist || allowlist.length === 0) {
		return false;
	}
	const candidates: string[] = [];
	for (const value of [
		ipInfo.datacenterName,
		ipInfo.providerName,
		ipInfo.asnOrganization,
	]) {
		if (typeof value !== "string") continue;
		const trimmed = value.trim().toLowerCase();
		if (trimmed) candidates.push(trimmed);
	}
	if (candidates.length === 0) {
		return false;
	}
	const normalisedAllowlist = allowlist.map((entry) =>
		entry.trim().toLowerCase(),
	);
	return candidates.some((c) => normalisedAllowlist.includes(c));
};

const evaluateIpInfo = (
	ipInfo: IPInfoResponse | undefined,
	trafficFilter: Partial<ITrafficFilter>,
	isDnsExtra = false,
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

	const datacenterSuppressedByCategory =
		(ipInfo.isVPN && !trafficFilter.blockVpn) ||
		(ipInfo.isProxy && !trafficFilter.blockProxy) ||
		(ipInfo.isTor && !trafficFilter.blockTor) ||
		(ipInfo.isCrawler && !trafficFilter.blockCrawler);

	if (
		trafficFilter.blockDatacenter &&
		ipInfo.isDatacenter &&
		ipInfo.providerType !== "isp" &&
		!datacenterSuppressedByCategory &&
		!isDatacenterAllowlisted(ipInfo, trafficFilter.datacenterNameAllowlist)
	) {
		return { isBlocked: true, reason: ResultReason.DATACENTER_BLOCKED };
	}

	if (trafficFilter.blockMobile && ipInfo.isMobile) {
		return { isBlocked: true, reason: ResultReason.MOBILE_BLOCKED };
	}

	if (trafficFilter.blockSatellite && ipInfo.isSatellite) {
		return { isBlocked: true, reason: ResultReason.SATELLITE_BLOCKED };
	}

	// Skip the crawler check on DNS extras (peer/resolver). Public DNS
	// resolvers like 8.8.8.8 (Google) and 1.1.1.1 (Cloudflare) share IP
	// space with search crawlers, so is_crawler on a resolver is the
	// resolver itself, not a crawler visiting the captcha endpoint.
	if (!isDnsExtra && trafficFilter.blockCrawler && ipInfo.isCrawler) {
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
 * One cross-filter rule: "block datacenters" is about scraping and
 * automation traffic, not VPN/proxy/Tor end-users or search crawlers,
 * all of which sit on datacenter infrastructure by design. So the
 * datacenter rule is suppressed for IPs whose more specific category
 * (VPN, proxy, Tor, crawler) the operator has left unblocked. If the
 * operator has opted into blocking that category, the earlier category
 * check fires first and short-circuits before the datacenter rule is
 * reached. This applies uniformly to the primary request IP and to the
 * enriched DNS extras (peer/resolver).
 *
 * One extras-specific rule: the crawler check is skipped entirely on
 * DNS extras. Public DNS resolvers (Google `8.8.8.8`, Cloudflare
 * `1.1.1.1`) share IP space with search crawlers, so `is_crawler=true`
 * on a resolver is the resolver itself, not a crawler visiting the
 * captcha endpoint. Applying `blockCrawler` to a resolver would
 * false-positive on ordinary users who resolve via public DoH.
 *
 * The datacenter rule also honours `datacenterNameAllowlist`: consumer
 * relays route through datacenter ranges and are reported as
 * `is_datacenter=true` by upstream but the exiting users are real humans.
 * Operators can list the datacenter, provider, or ASN organisation names
 * they want to allow through — see `isDatacenterAllowlisted`.
 *
 * The datacenter rule also short-circuits when upstream classifies the
 * provider as an ISP (`providerType === "isp"`). Consumer ISPs like
 * Afrihost, Comcast, or BT are sometimes flagged `is_datacenter=true` by
 * upstream heuristics — usually because part of the ASN hosts B2B or
 * hosting services — but the eyeball ranges behind those ASNs carry
 * ordinary end-users. The ISP categorisation is stronger evidence of
 * consumer traffic than the datacenter boolean.
 *
 * When `trafficFilter.skipExtrasOnValidDnsPath` is on and the catcher
 * confirmed the DNS path matched the connection path (`pathValid: true`),
 * the extras evaluation is skipped. This stops public-DoH resolver IPs
 * from tripping the datacenter rule for ordinary users.
 */
export const checkTrafficFilter = (
	ipInfo: IPInfoResponse | undefined,
	trafficFilter: Partial<ITrafficFilter>,
	extraIpInfos?: ReadonlyArray<IPInfoResponse | undefined>,
	dnsPathValid?: boolean,
): TrafficCheckResult => {
	const primary = evaluateIpInfo(ipInfo, trafficFilter);
	if (primary.isBlocked) {
		return primary;
	}

	if (trafficFilter.skipExtrasOnValidDnsPath && dnsPathValid === true) {
		return { isBlocked: false };
	}

	for (const extra of extraIpInfos ?? []) {
		const result = evaluateIpInfo(extra, trafficFilter, true);
		if (result.isBlocked) {
			return result;
		}
	}

	return { isBlocked: false };
};
