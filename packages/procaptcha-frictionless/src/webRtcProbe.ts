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
	WEBRTC_MAX_CANDIDATES,
	WEBRTC_MAX_CANDIDATE_LENGTH,
	WebRtcClientStatus,
	type WebRtcProbeReport,
} from "@prosopo/types";

// Runs alongside detection, so in practice this only bounds the wait when
// detection finishes first.
const GATHER_DEADLINE_MS = 1500;
// Full gathering can take seconds when an IPv6 path is dead, so stop shortly
// after the first srflx rather than waiting for completion.
const AFTER_FIRST_SRFLX_MS = 150;

/**
 * Gathers ICE candidates against the provider's STUN server. Never rejects; the
 * provider compares the srflx candidates with what its stun-probe saw.
 */
export const gatherWebRtcCandidates = (
	stunUrl: string,
): Promise<WebRtcProbeReport> => {
	const startedAt = Date.now();
	const report = (status: WebRtcClientStatus, candidates: string[] = []) => ({
		status,
		gatherMs: Math.min(Date.now() - startedAt, 60_000),
		candidates,
	});
	if (typeof RTCPeerConnection !== "function") {
		return Promise.resolve(report(WebRtcClientStatus.unsupported));
	}
	return new Promise((resolve) => {
		const candidates: string[] = [];
		let pc: RTCPeerConnection | undefined;
		let settled = false;
		let afterSrflx: ReturnType<typeof setTimeout> | undefined;
		const finish = (status: WebRtcClientStatus) => {
			if (settled) return;
			settled = true;
			clearTimeout(deadline);
			clearTimeout(afterSrflx);
			try {
				pc?.close();
			} catch {
				/* already closed */
			}
			resolve(report(status, candidates));
		};
		const deadline = setTimeout(
			() => finish(WebRtcClientStatus.timeout),
			GATHER_DEADLINE_MS,
		);
		try {
			pc = new RTCPeerConnection({ iceServers: [{ urls: stunUrl }] });
			pc.onicecandidate = (event) => {
				if (!event.candidate) return finish(WebRtcClientStatus.gathered);
				const line = event.candidate.candidate;
				if (!line || candidates.length >= WEBRTC_MAX_CANDIDATES) return;
				candidates.push(line.slice(0, WEBRTC_MAX_CANDIDATE_LENGTH));
				if (event.candidate.type === "srflx" && !afterSrflx) {
					afterSrflx = setTimeout(
						() => finish(WebRtcClientStatus.gathered),
						AFTER_FIRST_SRFLX_MS,
					);
				}
			};
			pc.createDataChannel("p");
			pc.createOffer()
				.then((offer) => pc?.setLocalDescription(offer))
				.catch(() => finish(WebRtcClientStatus.error));
		} catch {
			finish(WebRtcClientStatus.error);
		}
	});
};
