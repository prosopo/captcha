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
import type { Logger } from "@prosopo/logger";
import {
	type BehavioralDataPacked,
	type CaptchaResult,
	type CaptchaSolutionEscalation,
	CaptchaStatus,
	type CaptchaType,
	ResultReason,
	type RoutingMachineBaseline,
	type RoutingMachineOutput,
	type RoutingMachinePhase,
	type RoutingMachineRawSignals,
	type Session,
	isInteractiveCaptchaType,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import type { EscalationOrigin } from "../api/captcha/escalation.js";
import type { UsageCounters } from "../util/usageCounters.js";
import {
	type DeviceVerdict,
	deriveDevice,
	solveDeviceSignals,
} from "../utils/devicePlatform.js";
import type { DecisionMachineRunner } from "./decisionMachine/decisionMachineRunner.js";
import { computeFrictionlessScore } from "./frictionless/frictionlessTasksUtils.js";
import { applyRouter } from "./frictionless/routingMachine.js";
import type { PostPowRoutingContext } from "./powCaptcha/powTasks.js";

/**
 * A second routing pass over a correct solve, which may send the user on to a
 * follow-up challenge instead of issuing a token.
 */
export interface PostSolveRouting {
	phase: RoutingMachinePhase;
	// Read off the solve's session because audio has no type of its own: it is
	// judged on the visual type of the session it was served against.
	baselineFor: (session: Session) => RoutingMachineBaseline | undefined;
	context: PostPowRoutingContext;
	// The solve's own signals, on top of the request's and the session's.
	raw: Partial<RoutingMachineRawSignals>;
	escalate: (args: {
		routingOutput: RoutingMachineOutput;
		device: DeviceVerdict;
		origin: EscalationOrigin;
	}) => Promise<CaptchaSolutionEscalation | undefined>;
}

// Recorded on a correct solve the routing machine escalated, so its token can
// never verify. The user's outcome lives on the escalated session.
export const ESCALATED_RESULT: CaptchaResult = {
	status: CaptchaStatus.disapproved,
	reason: ResultReason.CAPTCHA_DECISION_MACHINE_DENIED,
};

export type PostSolveRequest = Pick<PostSolveRouting, "context" | "escalate">;

/** The signals a post-solve pass reads off the originating session. */
export const sessionRoutingSignals = (
	session: Pick<
		Session,
		| "mode"
		| "simdReadings"
		| "currentUrl"
		| "iframeUrl"
		| "iFrame"
		| "scoreComponents"
		| "webrtc"
	>,
): Partial<RoutingMachineRawSignals> => ({
	...(session.mode && { mode: session.mode }),
	...(session.simdReadings && { simd: session.simdReadings }),
	// Captured at frictionless time from the widget's payload. A submit
	// request has no equivalent: its Referer is the captcha iframe, not the
	// host page. iframeUrl is only present when the widget was embedded.
	...(session.currentUrl && { currentUrl: session.currentUrl }),
	...(session.iframeUrl && { iframeUrl: session.iframeUrl }),
	...(session.iFrame !== undefined && { iFrame: session.iFrame }),
	// Gathered at frictionless time; a submit request sends no report.
	...(session.webrtc && { webrtc: session.webrtc }),
	...(session.scoreComponents?.triggeredDetectors?.length
		? { triggeredDetectors: session.scoreComponents.triggeredDetectors }
		: {}),
});

export interface PostSolveSubject {
	challenge: string;
	sessionId?: string;
	dappAccount: string;
	userAccount: string;
	// The type just solved, which an escalation may not repeat. Differs from
	// the baseline only for audio, which is judged on its session's type.
	solvedType: CaptchaType;
	behavioralDataPacked?: BehavioralDataPacked;
}

/**
 * Runs the post-solve routing pass over a correct solve and mints the
 * follow-up session when the machine escalates it. Any failure leaves the
 * solve standing, as if no machine had fired.
 */
export const runPostSolveRouting = async ({
	db,
	runner,
	counters,
	logger,
	label,
	postSolve,
	subject,
}: {
	db: Pick<IProviderDatabase, "getSessionRecordBySessionId">;
	runner: DecisionMachineRunner;
	counters: UsageCounters | null;
	logger: Logger;
	label: string;
	postSolve: PostSolveRouting;
	subject: PostSolveSubject;
}): Promise<CaptchaSolutionEscalation | undefined> => {
	if (!subject.sessionId) return undefined;
	try {
		const sessionRecord = await db.getSessionRecordBySessionId(
			subject.sessionId,
		);
		if (!sessionRecord) return undefined;
		const baseline = postSolve.baselineFor(sessionRecord);
		if (!baseline) return undefined;
		const { context } = postSolve;
		const { behavioralDataPacked } = subject;
		const device = deriveDevice({
			...context.device,
			webView: sessionRecord.webView,
			solve: solveDeviceSignals(behavioralDataPacked),
		});
		const routingOutput = await applyRouter({
			runner,
			counters,
			baseline,
			ctx: {
				dappAccount: subject.dappAccount,
				userAccount: subject.userAccount,
				...(context.tier !== undefined && { tier: context.tier }),
				ip: context.ip,
				countryCode: context.countryCode,
				score: computeFrictionlessScore(sessionRecord.scoreComponents),
				platform: device.platform,
				...(sessionRecord.d !== undefined && { d: sessionRecord.d }),
				raw: {
					...context.raw,
					...sessionRoutingSignals(sessionRecord),
					...postSolve.raw,
					...(behavioralDataPacked && { behavioralDataPacked }),
					...(behavioralDataPacked?.d && {
						deviceCapability: behavioralDataPacked.d,
					}),
				},
			},
			logger,
			phase: postSolve.phase,
		});
		if (
			!isInteractiveCaptchaType(routingOutput.captchaType) ||
			routingOutput.captchaType === baseline.captchaType
		) {
			return undefined;
		}
		logger.info(() => ({
			msg: `Routing machine escalated a ${label} solve`,
			data: {
				challenge: subject.challenge,
				routedCaptchaType: routingOutput.captchaType,
				routingReason: routingOutput.reason,
			},
		}));
		return await postSolve.escalate({
			routingOutput,
			device,
			origin: {
				sessionId: subject.sessionId,
				dappAccount: subject.dappAccount,
				captchaType: subject.solvedType,
				behavioralDataPacked,
			},
		});
	} catch (error) {
		logger.error(() => ({
			msg: `Post-solve routing failed for a ${label} solve`,
			err: error,
			data: { challenge: subject.challenge },
		}));
		return undefined;
	}
};
