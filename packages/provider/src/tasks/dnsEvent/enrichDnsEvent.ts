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
import type { EnrichedDnsEvent, IPInfoResponse, Session } from "@prosopo/types";

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

export const computeDnsAsymmetry = (
	enriched: EnrichedDnsEvent | undefined,
	clientIpInfo: IPInfoResponse | undefined,
): number => {
	if (!enriched) return 0;
	let score = 0;
	if (enriched.pathValid === false) score += 0.3;
	if (enriched.resolverIpInfo?.isValid) {
		if (enriched.resolverIpInfo.isDatacenter) score += 0.3;
		if (enriched.resolverIpInfo.isAbuser) score += 0.2;
	}
	if (enriched.peerIpInfo?.isValid) {
		if (enriched.peerIpInfo.isDatacenter) score += 0.2;
		if (enriched.peerIpInfo.isAbuser) score += 0.2;
	}
	if (
		clientIpInfo?.isValid &&
		clientIpInfo.providerType === "isp" &&
		enriched.resolverIpInfo?.isValid &&
		enriched.resolverIpInfo.isDatacenter
	) {
		score += 0.2;
	}
	return Math.min(score, 1);
};
