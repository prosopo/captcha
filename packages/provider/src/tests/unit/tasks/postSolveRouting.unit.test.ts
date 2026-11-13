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
	WebRtcClientStatus,
	WebRtcOutcome,
	type WebRtcSignal,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { sessionRoutingSignals } from "../../../tasks/postSolveRouting.js";

const webrtc: WebRtcSignal = {
	outcome: WebRtcOutcome.mismatch,
	clientStatus: WebRtcClientStatus.gathered,
	gatherMs: 120,
	srflxCount: 1,
	hostMdnsCount: 1,
	hostRawCount: 0,
	requestIpSeen: false,
	leaked: { asnNumber: 5089, countryCode: "GB" },
};

type RoutingSession = Parameters<typeof sessionRoutingSignals>[0];

const session = (extra: Partial<RoutingSession> = {}): RoutingSession => ({
	scoreComponents: { baseScore: 0 },
	...extra,
});

describe("sessionRoutingSignals", () => {
	it("hands the session's WebRTC signal to the post-solve routing pass", () => {
		expect(sessionRoutingSignals(session({ webrtc })).webrtc).toEqual(webrtc);
	});

	it("leaves the signal out when the session has none", () => {
		expect(sessionRoutingSignals(session())).not.toHaveProperty("webrtc");
	});
});
