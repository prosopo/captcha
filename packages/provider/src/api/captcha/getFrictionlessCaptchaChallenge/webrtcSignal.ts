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

import { isIP, isIPv4 } from "node:net";
import type { Logger } from "@prosopo/logger";
import {
	WebRtcClientStatus,
	WebRtcOutcome,
	type WebRtcProbeReport,
	type WebRtcSignal,
} from "@prosopo/types";
import type { IIpInfoService } from "@prosopo/types-env";
import { Address6 } from "ip-address";
import {
	type StunProbeLookup,
	withStunProbe,
} from "../../../services/stunProbe.js";

type Candidate = {
	type: string;
	protocol: string;
	address: string;
	port: number;
};

// RFC 8839 §5.1: candidate:<foundation> <component> <transport> <priority>
// <address> <port> typ <type> ...
export const parseCandidate = (line: string): Candidate | undefined => {
	const parts = line
		.replace(/^a=/, "")
		.replace(/^candidate:/, "")
		.trim()
		.split(/\s+/);
	const [, , protocol, , address, port, typ, type] = parts;
	const portNumber = Number(port);
	if (typ !== "typ" || !protocol || !address || !type) return undefined;
	if (!Number.isInteger(portNumber) || portNumber < 0 || portNumber > 65535) {
		return undefined;
	}
	return {
		type,
		protocol: protocol.toLowerCase(),
		address: address.replace(/^\[|\]$/g, ""),
		port: portNumber,
	};
};

const stripMapped = (ip: string): string => ip.replace(/^::ffff:/i, "");

// IPv6 hosts pick a fresh temporary address per connection, so the UDP and
// HTTP sockets of one browser only share the /64.
const sameHost = (a: string, b: string): boolean => {
	if (isIPv4(a) || isIPv4(b)) return a === b;
	const prefix = (ip: string) =>
		new Address6(`${ip}/64`).startAddress().correctForm();
	return prefix(a) === prefix(b);
};

const sameFamily = (a: string, b: string): boolean => isIP(a) === isIP(b);

type Lookups = {
	requestIpSeen: boolean;
	seen: Candidate[];
};

const lookupAll = async (
	lookup: StunProbeLookup,
	requestIp: string,
	srflx: Candidate[],
): Promise<Lookups> => {
	const requestIpSeen = (await lookup(requestIp, 0)).hit;
	const seen: Candidate[] = [];
	for (const c of srflx) {
		if ((await lookup(c.address, c.port)).hit) seen.push(c);
	}
	return { requestIpSeen, seen };
};

const leakedNetwork = async (
	ip: string,
	ipInfoService: IIpInfoService,
): Promise<WebRtcSignal["leaked"]> => {
	if (!ipInfoService.isAvailable()) return undefined;
	const info = await ipInfoService.lookup(ip);
	if (!info.isValid) return undefined;
	return {
		...(info.asnNumber !== undefined && { asnNumber: info.asnNumber }),
		...(info.countryCode && { countryCode: info.countryCode }),
		isProxy: info.isProxy,
		isVPN: info.isVPN,
		isDatacenter: info.isDatacenter,
	};
};

export type EvaluateWebRtcInput = {
	report: WebRtcProbeReport | undefined;
	requestIp: string;
	socketPath: string | undefined;
	ipInfoService: IIpInfoService;
	logger: Logger;
};

/**
 * Compares the browser's srflx candidates with what this node's stun-probe saw
 * and with the HTTP request's address. Never throws: the signal is optional and
 * must not hold up or fail the frictionless request.
 */
export const evaluateWebRtc = async ({
	report,
	requestIp: rawRequestIp,
	socketPath,
	ipInfoService,
	logger,
}: EvaluateWebRtcInput): Promise<WebRtcSignal | undefined> => {
	if (!report) return undefined;
	const requestIp = stripMapped(rawRequestIp);
	const candidates = report.candidates
		.map(parseCandidate)
		.filter((c): c is Candidate => c !== undefined);
	const host = candidates.filter((c) => c.type === "host");
	const srflx = candidates.filter(
		(c, i, all) =>
			c.type === "srflx" &&
			c.protocol === "udp" &&
			isIP(c.address) !== 0 &&
			all.findIndex(
				(o) =>
					o.type === "srflx" && o.address === c.address && o.port === c.port,
			) === i,
	);
	const base = {
		clientStatus: report.status,
		gatherMs: report.gatherMs,
		srflxCount: srflx.length,
		hostMdnsCount: host.filter((c) => c.address.endsWith(".local")).length,
		hostRawCount: host.filter((c) => isIP(c.address) !== 0).length,
	};

	if (report.status === WebRtcClientStatus.unsupported) {
		return { ...base, outcome: WebRtcOutcome.unsupported };
	}
	if (report.status === WebRtcClientStatus.error) {
		return { ...base, outcome: WebRtcOutcome.error };
	}
	if (!socketPath) {
		return { ...base, outcome: WebRtcOutcome.probeUnavailable };
	}

	let lookups: Lookups;
	try {
		lookups = await withStunProbe(socketPath, (lookup) =>
			lookupAll(lookup, requestIp, srflx),
		);
	} catch (err) {
		logger.debug(() => ({ msg: "stun-probe lookup failed", err }));
		return { ...base, outcome: WebRtcOutcome.probeUnavailable };
	}
	const withSeen = { ...base, requestIpSeen: lookups.requestIpSeen };

	if (srflx.length === 0)
		return { ...withSeen, outcome: WebRtcOutcome.noSrflx };
	if (lookups.seen.length === 0) {
		return { ...withSeen, outcome: WebRtcOutcome.claimedNotSeen };
	}
	const comparable = lookups.seen.filter((c) =>
		sameFamily(c.address, requestIp),
	);
	if (comparable.length === 0) {
		return { ...withSeen, outcome: WebRtcOutcome.otherFamilyOnly };
	}
	if (comparable.some((c) => sameHost(c.address, requestIp))) {
		return { ...withSeen, outcome: WebRtcOutcome.match };
	}

	const leakedIp = comparable[0]?.address;
	let network: WebRtcSignal["leaked"];
	if (leakedIp) {
		try {
			network = await leakedNetwork(leakedIp, ipInfoService);
		} catch (err) {
			logger.debug(() => ({ msg: "leaked address lookup failed", err }));
		}
	}
	return {
		...withSeen,
		outcome: WebRtcOutcome.mismatch,
		...(leakedIp && { leaked: { ip: leakedIp, ...network } }),
	};
};
