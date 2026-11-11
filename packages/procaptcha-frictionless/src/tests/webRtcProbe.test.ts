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

import { WebRtcClientStatus } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gatherWebRtcCandidates } from "../webRtcProbe.js";

type FakeCandidate = { candidate: string; type: string } | null;

const HOST =
	"candidate:2 1 udp 2122260223 abc.local 49637 typ host generation 0";
const SRFLX =
	"candidate:1 1 udp 1677729535 82.45.237.60 49637 typ srflx raddr 0.0.0.0 rport 0";

// Emits the scripted candidates after setLocalDescription, as a browser does.
const fakePeerConnection = (
	script: Array<{ at: number; candidate: FakeCandidate }>,
) => {
	const configs: RTCConfiguration[] = [];
	let closed = 0;
	class FakePeerConnection {
		onicecandidate: ((event: { candidate: FakeCandidate }) => void) | null =
			null;
		constructor(config: RTCConfiguration) {
			configs.push(config);
		}
		createDataChannel(_label: string): void {}
		async createOffer(): Promise<RTCSessionDescriptionInit> {
			return { type: "offer", sdp: "" };
		}
		async setLocalDescription(_d: RTCSessionDescriptionInit): Promise<void> {
			for (const { at, candidate } of script) {
				setTimeout(() => this.onicecandidate?.({ candidate }), at);
			}
		}
		close(): void {
			closed += 1;
		}
	}
	vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
	return { configs, closed: () => closed };
};

describe("gatherWebRtcCandidates", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("reports unsupported when the browser has no RTCPeerConnection", async () => {
		vi.stubGlobal("RTCPeerConnection", undefined);
		const report = await gatherWebRtcCandidates(
			"stun:pronode1.prosopo.io:3478",
		);
		expect(report.status).toBe(WebRtcClientStatus.unsupported);
		expect(report.candidates).toEqual([]);
	});

	it("uses only the provider's STUN server and stops shortly after the first srflx", async () => {
		const pc = fakePeerConnection([
			{ at: 5, candidate: { candidate: HOST, type: "host" } },
			{ at: 40, candidate: { candidate: SRFLX, type: "srflx" } },
			{ at: 5000, candidate: null },
		]);
		const pending = gatherWebRtcCandidates("stun:pronode1.prosopo.io:3478");
		await vi.advanceTimersByTimeAsync(200);
		const report = await pending;
		expect(pc.configs).toEqual([
			{ iceServers: [{ urls: "stun:pronode1.prosopo.io:3478" }] },
		]);
		expect(report.status).toBe(WebRtcClientStatus.gathered);
		expect(report.candidates).toEqual([HOST, SRFLX]);
		expect(pc.closed()).toBe(1);
	});

	it("finishes when gathering completes without a srflx", async () => {
		fakePeerConnection([
			{ at: 5, candidate: { candidate: HOST, type: "host" } },
			{ at: 10, candidate: null },
		]);
		const pending = gatherWebRtcCandidates("stun:pronode1.prosopo.io:3478");
		await vi.advanceTimersByTimeAsync(20);
		const report = await pending;
		expect(report.status).toBe(WebRtcClientStatus.gathered);
		expect(report.candidates).toEqual([HOST]);
	});

	it("times out when the STUN server never answers", async () => {
		fakePeerConnection([
			{ at: 5, candidate: { candidate: HOST, type: "host" } },
		]);
		const pending = gatherWebRtcCandidates("stun:pronode1.prosopo.io:3478");
		await vi.advanceTimersByTimeAsync(1600);
		const report = await pending;
		expect(report.status).toBe(WebRtcClientStatus.timeout);
		expect(report.gatherMs).toBeGreaterThanOrEqual(1500);
	});
});
