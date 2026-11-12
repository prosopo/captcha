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
import type {
	CaptchaSolutionEscalation,
	RoutingMachineBaseline,
	RoutingMachineOutput,
	RoutingMachinePhase,
	RoutingMachineRawSignals,
	Session,
} from "@prosopo/types";
import type { EscalationOrigin } from "../api/captcha/escalation.js";
import type { DeviceVerdict } from "../utils/devicePlatform.js";
import type { PostPowRoutingContext } from "./powCaptcha/powTasks.js";

/**
 * A second routing pass over a correct solve, which may send the user on to a
 * follow-up challenge instead of issuing a token.
 */
export interface PostSolveRouting {
	phase: RoutingMachinePhase;
	baseline: RoutingMachineBaseline;
	context: PostPowRoutingContext;
	// The solve's own signals, on top of the request's and the session's.
	raw: Partial<RoutingMachineRawSignals>;
	escalate: (args: {
		routingOutput: RoutingMachineOutput;
		device: DeviceVerdict;
		origin: EscalationOrigin;
	}) => Promise<CaptchaSolutionEscalation | undefined>;
}

/** The signals a post-solve pass reads off the originating session. */
export const sessionRoutingSignals = (
	session: Pick<
		Session,
		"mode" | "simdReadings" | "currentUrl" | "iframeUrl" | "scoreComponents"
	>,
): Partial<RoutingMachineRawSignals> => ({
	...(session.mode && { mode: session.mode }),
	...(session.simdReadings && { simd: session.simdReadings }),
	// Captured at frictionless time from the widget's payload. A submit
	// request has no equivalent: its Referer is the captcha iframe, not the
	// host page. iframeUrl is only present when the widget was embedded.
	...(session.currentUrl && { currentUrl: session.currentUrl }),
	...(session.iframeUrl && { iframeUrl: session.iframeUrl }),
	...(session.scoreComponents?.triggeredDetectors?.length
		? { triggeredDetectors: session.scoreComponents.triggeredDetectors }
		: {}),
});
