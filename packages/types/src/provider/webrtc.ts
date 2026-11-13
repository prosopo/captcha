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

import { z } from "zod";

export enum WebRtcClientStatus {
	gathered = "gathered",
	timeout = "timeout",
	unsupported = "unsupported",
	error = "error",
}

// How the browser's server-reflexive (srflx) candidates compare with what the
// provider's stun-probe sidecar saw and with the HTTP request's address.
export enum WebRtcOutcome {
	// The STUN request arrived from the HTTP request's address.
	match = "match",
	// The STUN request arrived, from a different address than HTTP: the HTTP
	// traffic went through a proxy that the UDP did not.
	mismatch = "mismatch",
	// The client reported srflx candidates no STUN request matches.
	claimedNotSeen = "claimed_not_seen",
	// Only srflx candidates of the other IP family, so nothing to compare.
	otherFamilyOnly = "other_family_only",
	noSrflx = "no_srflx",
	unsupported = "unsupported",
	error = "error",
	// The provider could not ask its stun-probe.
	probeUnavailable = "probe_unavailable",
}

export const WEBRTC_MAX_CANDIDATES = 32;
export const WEBRTC_MAX_CANDIDATE_LENGTH = 512;

export const WebRtcProbeReportSchema = z.object({
	status: z.nativeEnum(WebRtcClientStatus),
	gatherMs: z.number().int().min(0).max(60_000),
	candidates: z
		.array(z.string().max(WEBRTC_MAX_CANDIDATE_LENGTH))
		.max(WEBRTC_MAX_CANDIDATES),
});

export type WebRtcProbeReport = z.infer<typeof WebRtcProbeReportSchema>;

// Stored on the session. A mismatch records the leaked address and its
// network, so a site can block the machine behind the proxy, not only the exit.
export const WebRtcSignalSchema = z.object({
	outcome: z.nativeEnum(WebRtcOutcome),
	clientStatus: z.nativeEnum(WebRtcClientStatus),
	gatherMs: z.number().int().min(0).max(60_000),
	srflxCount: z.number().int().min(0).max(WEBRTC_MAX_CANDIDATES),
	hostMdnsCount: z.number().int().min(0).max(WEBRTC_MAX_CANDIDATES),
	// Host candidates carrying a literal address. Browsers hide these behind
	// mDNS names by default.
	hostRawCount: z.number().int().min(0).max(WEBRTC_MAX_CANDIDATES),
	// Whether any STUN request came from the HTTP request's address at all.
	requestIpSeen: z.boolean().optional(),
	leaked: z
		.object({
			ip: z.string().max(45).optional(),
			asnNumber: z.number().int().optional(),
			countryCode: z.string().max(8).optional(),
			isProxy: z.boolean().optional(),
			isVPN: z.boolean().optional(),
			isDatacenter: z.boolean().optional(),
		})
		.optional(),
});

export type WebRtcSignal = z.infer<typeof WebRtcSignalSchema>;
