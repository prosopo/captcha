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
 * When `trafficFilter` is supplied, the datacenter and abuser contributions
 * are gated on the same rules `checkTrafficFilter` uses for the client IP.
 * A category counts here whenever the operator has configured any policy
 * for it (block or challenge) — either intent signals suspicion.
 *
 *   - datacenter category must be configured; IPs whose
 *     `providerType === "isp"` short-circuit; named allowlist skips
 *   - abuser category defaults to configured, with the score threshold
 *   - cross-category suppression: VPN / proxy / Tor / crawler IPs that also
 *     carry `isDatacenter=true` are NOT counted as datacenter when the
 *     operator hasn't configured that more specific category — mirrors
 *     the `datacenterSuppressedByCategory` rule in evaluateIpInfo.
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
		// Denylist wins: an explicitly listed provider counts as datacenter
		// even when the ISP short-circuit or category suppression would
		// otherwise exempt it.
		if (isDatacenterDenylisted(ip, trafficFilter.datacenterNameDenylist)) {
			return true;
		}
		// Cross-category suppression: don't penalise datacenter classification
		// when the operator has not configured the more specific category.
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
