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
	resolveMaxEscalationLevel,
	severityToPuzzleDifficulty,
} from "@prosopo/captcha-severity";
import { DEFAULT_RENDER_SETTINGS } from "@prosopo/puzzle-assets";
import {
	type BehavioralDataPacked,
	type CaptchaSolutionEscalation,
	CaptchaType,
	type FingerprintSummaryStored,
	type FrictionlessReason,
	type IFrictionlessTypes,
	type IPuzzleSettings,
	type InteractiveCaptchaType,
	imageMaxRoundsDefault,
	isInteractiveCaptchaType,
	resolveAllowedCaptchaTypes,
} from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";
import type { Request } from "express";
import type { AugmentedRequest } from "../../express.js";
import { coerceToEnabledCaptchaType } from "../../tasks/captchaTypeSelection.js";
import { samplePuzzleDifficulty } from "../../tasks/puzzle/puzzleDifficulty.js";
import type { Tasks } from "../../tasks/tasks.js";
import {
	type DeviceVerdict,
	deriveDevice,
	solveDeviceSignals,
} from "../../utils/devicePlatform.js";
import {
	type RawTlsSignals,
	rawTlsSignalsForSession,
	rawTlsSignalsFromRecord,
} from "../rawTlsSignalsMiddleware.js";

type EscalationConnectionSignals = RawTlsSignals & {
	tcpToChelloUs?: number;
	chelloToHandshakeUs?: number;
};

interface EscalationSiteConstraints {
	allowedCaptchaTypes?: IFrictionlessTypes;
	imageMaxRounds?: number;
	puzzleMaxDifficulty?: number;
}

/** The submit request's connection, which the escalated session belongs on. */
export const escalationConnectionSignals = (
	req: Request & AugmentedRequest,
): EscalationConnectionSignals => ({
	tcpToChelloUs: req.tcpToChelloUs,
	chelloToHandshakeUs: req.chelloToHandshakeUs,
	...rawTlsSignalsForSession(req),
});

/** What the site lets an escalation serve. */
export const escalationSiteConstraints = (
	clientRecord: Pick<ClientRecord, "tier" | "settings">,
): EscalationSiteConstraints => ({
	allowedCaptchaTypes: resolveAllowedCaptchaTypes(
		clientRecord.settings,
		clientRecord.tier,
	),
	imageMaxRounds: clientRecord.settings?.imageMaxRounds,
	puzzleMaxDifficulty: clientRecord.settings?.puzzleMaxDifficulty,
});

/** The solved challenge an escalation follows on from. */
export interface EscalationOrigin {
	sessionId: string;
	dappAccount: string;
	captchaType: CaptchaType;
	behavioralDataPacked?: BehavioralDataPacked;
	fingerprintSummary?: FingerprintSummaryStored;
}

/**
 * Mint a session of the routed captcha type that carries the origin session's
 * risk profile (score, headers, IP, etc.) forward. Returns undefined when the
 * routing output is not an interactive escalation the site can serve.
 */
export const mintEscalation = async ({
	tasks,
	routingOutput,
	origin,
	device: routedDevice,
	perConnectionSignals,
	siteConstraints,
}: {
	tasks: Tasks;
	routingOutput?: { captchaType: CaptchaType };
	origin: EscalationOrigin;
	// The verdict routing ran on, when it ran.
	device?: DeviceVerdict;
	// Per-connection signals (TLS handshake timings + raw TCP handshake
	// signals) come from the CURRENT submit request, not from the origin
	// session — those values belong to a different TCP connection made
	// during the earlier frictionless request.
	perConnectionSignals?: EscalationConnectionSignals;
	// Site constraints on what an escalation may serve. An absent
	// `allowedCaptchaTypes` falls back to the default flags and preferences,
	// and an absent `imageMaxRounds` to the schema default, so the round
	// count is bounded either way.
	siteConstraints?: EscalationSiteConstraints;
}): Promise<CaptchaSolutionEscalation | undefined> => {
	if (!routingOutput || !isInteractiveCaptchaType(routingOutput.captchaType)) {
		return undefined;
	}

	const originSession = await tasks.db.getSessionRecordBySessionId(
		origin.sessionId,
	);
	if (!originSession) return undefined;

	const solveDevice = solveDeviceSignals(origin.behavioralDataPacked);
	// Routing judged the device already; size the escalation on that same
	// verdict. Only an escalation routing never ran for (missing coordinates,
	// a changed IP) lacks one, and it is judged here by the same function.
	const device =
		routedDevice ??
		deriveDevice({
			userAgent: originSession.headers?.["user-agent"] ?? "",
			headers: originSession.headers,
			ipInfo: originSession.ipInfo,
			tcpMss: originSession.tcpMss,
			webView: originSession.webView,
			solve: solveDevice,
		});

	const routed = routingOutput as {
		captchaType: InteractiveCaptchaType;
		solvedImagesCount?: number;
		powDifficulty?: number;
		reason?: string;
	};

	// Second place a session's captchaType is decided (the other is
	// sendCaptcha). Same reasoning: escalating into a type this provider
	// cannot render — or the site has disabled — would leave the widget with a
	// session it can never satisfy.
	const escalatedType = coerceToEnabledCaptchaType(
		routed.captchaType,
		siteConstraints?.allowedCaptchaTypes,
	);

	// Coercion bottoms out at PoW, which is not an escalation, and landing on
	// the type just solved would loop. Either way the solve stands, which is
	// the same outcome as no routing machine having fired.
	if (
		escalatedType === CaptchaType.pow ||
		escalatedType === origin.captchaType
	) {
		return undefined;
	}

	const imageMaxRounds =
		siteConstraints?.imageMaxRounds ?? imageMaxRoundsDefault;

	// Size a puzzle escalation off the same severity currency the image path
	// uses, so a site with image disabled keeps a graduated response instead
	// of serving one identical puzzle for every escalation. `createSession`
	// takes these as its trailing overrides; they are dropped for non-puzzle
	// types by the same rule as in sendCaptcha.
	const escalationPuzzleOverrides = (():
		| {
				puzzleTolerance: number;
				puzzle: IPuzzleSettings;
				puzzleLevel: number;
		  }
		| undefined => {
		if (escalatedType !== CaptchaType.puzzle) return undefined;
		const { isMobile } = device.platform;
		const level = severityToPuzzleDifficulty(
			routed.solvedImagesCount ?? originSession.solvedImagesCount,
			tasks.config.captchas.solved.count,
			resolveMaxEscalationLevel(siteConstraints?.puzzleMaxDifficulty, isMobile),
		);
		// As in sendCaptcha: level 0 leaves the site's configured puzzle
		// settings in force rather than overriding them with band values.
		if (level === 0) return undefined;
		const difficulty = samplePuzzleDifficulty(
			level,
			DEFAULT_RENDER_SETTINGS.holeDarken,
		);
		return {
			puzzleTolerance: difficulty.tolerance,
			puzzle: difficulty.puzzle,
			puzzleLevel: difficulty.level,
		};
	})();

	// Prefer the routing machine's own selection reason (e.g. an invalid
	// fingerprint proof) for the escalated captcha record; fall back to the
	// originating session's reason when the machine didn't supply one.
	const selectionReason =
		(routed.reason as FrictionlessReason | undefined) ?? originSession.reason;

	// Enumerated rather than spread from `originSession`: what an escalation
	// inherits from the session it escalated from is a deliberate list, not
	// "everything the origin happened to carry". Behavioural data in
	// particular lives only in the pow-solve request payload and must not
	// follow the user onto the new session.
	const newSession = await tasks.frictionlessManager.createSession({
		token: originSession.token,
		score: originSession.score,
		threshold: originSession.threshold,
		scoreComponents: originSession.scoreComponents,
		ipAddress: originSession.ipAddress,
		captchaType: escalatedType,
		// The origin's siteKey is the source of truth if set.
		siteKey: originSession.siteKey ?? origin.dappAccount,
		// Clamp to the sitekey's ceiling. The routing machine's output schema
		// only constrains the count to a positive int, so an escalation could
		// otherwise mint a session demanding more rounds than the site permits.
		solvedImagesCount:
			escalatedType === CaptchaType.image
				? Math.min(
						routed.solvedImagesCount ??
							originSession.solvedImagesCount ??
							tasks.config.captchas.solved.count,
						imageMaxRounds,
					)
				: undefined,
		userSitekeyIpHash: originSession.userSitekeyIpHash,
		webView: originSession.webView,
		iFrame: originSession.iFrame,
		decryptedHeadHash: originSession.decryptedHeadHash,
		reason: selectionReason,
		ipInfo: originSession.ipInfo,
		headers: originSession.headers,
		mode: originSession.mode,
		simdReadings: originSession.simdReadings,
		// The whole detector bag, so the escalated session answers the same
		// rules the origin would have. Previously each signal was named here
		// individually and several were never added, so they stopped existing
		// the moment a user was escalated.
		d: originSession.d,
		// Carry the detector pool bundle forward so the escalated image/puzzle
		// solve can decrypt the (same-origin) behavioural payload.
		bundleId: originSession.bundleId,
		currentUrl: originSession.currentUrl,
		iframeUrl: originSession.iframeUrl,
		webrtc: originSession.webrtc,
		isProtect: originSession.isProtect,
		isEscalation: true,
		// The DM-input read path (captchaManager.getSessionRecordWithOriginFallback)
		// uses this to fall back to the origin session for fields the escalation
		// doesn't carry itself — simdReadings (attached by pow-submit
		// fire-and-forget, races the escalation read), dnsEvent (set by the DNS
		// sidecar on the origin's TLS connection only).
		originSessionId: originSession.sessionId,
		// Two summaries of the solve, not the behavioural data itself, so a
		// challenge issued for this session judges the same device.
		...(solveDevice && { solveDevice }),
		// Raw signals for the current PoW-submit TCP connection — not the
		// origin's. The escalation session belongs on this hop's fingerprint.
		tcpToChelloUs: perConnectionSignals?.tcpToChelloUs,
		chelloToHandshakeUs: perConnectionSignals?.chelloToHandshakeUs,
		...rawTlsSignalsFromRecord(perConnectionSignals),
		puzzleTolerance: escalationPuzzleOverrides?.puzzleTolerance,
		puzzle: escalationPuzzleOverrides?.puzzle,
		puzzleLevel: escalationPuzzleOverrides?.puzzleLevel,
		// The escalated session is the same render as the origin, so it answers
		// to the same session id the verify call will correlate against.
		clientMetaData: originSession.clientMetaData,
		// Same device, so the same bucket. A proof submitted with the solve is
		// newer than the one sent at frictionless time, so it wins.
		fingerprintSummary:
			origin.fingerprintSummary ?? originSession.fingerprintSummary,
	});

	// Record the origin → escalation sessionId mapping so a /captcha/*
	// request that arrives carrying the originating sessionId (because the
	// widget didn't switch to the escalation id, or a network retry fired
	// on the old state) resolves forward to `newSession` instead of
	// landing on NO_SESSION_FOUND. See `cacheSessionEscalation` in
	// `packages/database/src/redisCache.ts` for the full rationale.
	if (tasks.writeQueue) {
		await tasks.writeQueue.cacheSessionEscalation(
			origin.sessionId,
			newSession.sessionId,
		);
	}

	return {
		captchaType: escalatedType,
		sessionId: newSession.sessionId,
	};
};
