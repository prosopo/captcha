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

import type { IIpInfoService } from "@prosopo/ipinfo";
import type {
	EnrichedDnsEvent,
	IPInfoResponse,
	ITrafficFilter,
	Session,
} from "@prosopo/types";
import { trafficFilterAbuserScoreThresholdDefault } from "@prosopo/types";
import {
	isDatacenterAllowlisted,
	isDatacenterDenylisted,
} from "../spam/checkTrafficFilter.js";

export type { EnrichedDnsEvent };

export const enrichDnsEvent = async (
	dnsEvent: Session["dnsEvent"] | undefined,
	ipInfoService: IIpInfoService,
	primaryIp?: string,
): Promise<EnrichedDnsEvent | undefined> => {
	if (!dnsEvent) {
		return undefined;
	}
	const enriched: EnrichedDnsEvent = {
		peerIp: dnsEvent.peerIp,
		resolverIp: dnsEvent.resolverIp,
		pathValid: dnsEvent.pathValid,
	};
	const lookups: Promise<IPInfoResponse | undefined>[] = [];
	const kinds: ("peer" | "resolver")[] = [];
	if (dnsEvent.peerIp && dnsEvent.peerIp !== primaryIp) {
		lookups.push(ipInfoService.lookup(dnsEvent.peerIp));
		kinds.push("peer");
	}
	if (dnsEvent.resolverIp && dnsEvent.resolverIp !== primaryIp) {
		lookups.push(ipInfoService.lookup(dnsEvent.resolverIp));
		kinds.push("resolver");
	}
	if (lookups.length === 0) {
		return enriched;
	}
	const results = await Promise.all(lookups);
	kinds.forEach((k, i) => {
		const info = results[i];
		if (!info) return;
		if (k === "peer") enriched.peerIpInfo = info;
		else enriched.resolverIpInfo = info;
	});
	return enriched;
};

export const getIpInfoAsn = (
	info: IPInfoResponse | undefined,
): number | undefined => (info?.isValid ? info.asnNumber : undefined);

export const extraIpInfosFromEnrichedDnsEvent = (
	enriched: EnrichedDnsEvent | undefined,
): IPInfoResponse[] => {
	if (!enriched) return [];
	const out: IPInfoResponse[] = [];
	if (enriched.peerIpInfo) out.push(enriched.peerIpInfo);
	if (enriched.resolverIpInfo) out.push(enriched.resolverIpInfo);
	return out;
};

/**
 * Score the DNS path for asymmetry between the client's DNS resolver / peer
 * IPs and its connection IP. The score sums four kinds of signal:
 *
 *   - `pathValid=false` (protocol-layer failure — always counted)
 *   - resolver / peer classified `isDatacenter`
 *   - resolver / peer classified `isAbuser`
 *   - client IP is a consumer ISP but resolver is datacenter (compound)
 *
 * When `trafficFilter` is supplied, the datacenter contribution is gated
 * on operator-policy-aware shielding, *not* on the strict per-IP precedence
 * chain the client-IP path uses. DNS resolvers are legitimately often on
 * datacenter ranges (Google/Cloudflare/consumer-VPN DNS), so signal
 * counting has to consider the operator's stance:
 *
 *   - datacenter category must be configured; `providerType === "isp"`
 *     short-circuits; `datacenterNameAllowlist` skips; `datacenterNameDenylist`
 *     forces the signal through (denylist wins over all other exemptions)
 *   - a higher-precedence flag the operator has left **unconfigured** (VPN,
 *     proxy, Tor, crawler) on the same resolver IP shields the datacenter
 *     signal — the flag "explains" the DC status and the operator has said
 *     they don't care about that category. Flags that are configured (block
 *     or challenge) do *not* shield, because the operator is treating that
 *     category as suspicious in its own right.
 *   - abuser is not shielded by any other category: its signal counts
 *     whenever the abuser category is configured and the score meets the
 *     threshold.
 *
 * `pathValid` is a protocol signal, not a category — it always contributes
 * regardless of trafficFilter. When `trafficFilter` is omitted, all
 * datacenter / abuser flags count (preserves the pre-gating behaviour for
 * admin / diagnostic recompute callers).
 */
export const computeDnsAsymmetry = (
	enriched: EnrichedDnsEvent | undefined,
	clientIpInfo: IPInfoResponse | undefined,
	trafficFilter?: Partial<ITrafficFilter>,
): number => {
	if (!enriched) return 0;
	let score = 0;
	if (enriched.pathValid === false) score += 0.3;

	const countDc = (ip: IPInfoResponse | undefined): boolean => {
		if (!ip?.isValid || !ip.isDatacenter) return false;
		if (!trafficFilter) return true;
		if (trafficFilter.datacenter === undefined) return false;
		// Denylist wins over shielding and over the ISP / allowlist checks —
		// an explicitly named provider counts as DC no matter what.
		if (isDatacenterDenylisted(ip, trafficFilter.datacenterNameDenylist)) {
			return true;
		}
		// Policy-aware shielding: a higher-precedence flag the operator has
		// left unconfigured (i.e. is allowing) "explains" why this resolver
		// is on a datacenter range and suppresses the DC signal. When the
		// operator has actually configured that category (block or challenge)
		// there's no shielding, because they're treating that category as
		// suspicious in its own right.
		if (
			(ip.isVPN && trafficFilter.vpn === undefined) ||
			(ip.isProxy && trafficFilter.proxy === undefined) ||
			(ip.isTor && trafficFilter.tor === undefined) ||
			(ip.isCrawler && trafficFilter.crawler === undefined)
		) {
			return false;
		}
		if (ip.providerType === "isp") return false;
		return !isDatacenterAllowlisted(ip, trafficFilter.datacenterNameAllowlist);
	};

	const countAbuser = (ip: IPInfoResponse | undefined): boolean => {
		if (!ip?.isValid || !ip.isAbuser) return false;
		if (!trafficFilter) return true;
		if (trafficFilter.abuser === undefined) return false;
		const threshold =
			trafficFilter.abuserScoreThreshold ??
			trafficFilterAbuserScoreThresholdDefault;
		const maxScore = Math.max(ip.abuserScore ?? 0, ip.companyAbuserScore ?? 0);
		return maxScore >= threshold;
	};

	if (countDc(enriched.resolverIpInfo)) score += 0.3;
	if (countAbuser(enriched.resolverIpInfo)) score += 0.2;
	if (countDc(enriched.peerIpInfo)) score += 0.2;
	if (countAbuser(enriched.peerIpInfo)) score += 0.2;

	if (
		clientIpInfo?.isValid &&
		clientIpInfo.providerType === "isp" &&
		countDc(enriched.resolverIpInfo)
	) {
		score += 0.2;
	}
	return Math.min(score, 1);
};
