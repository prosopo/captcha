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
import { severityToPuzzleDifficulty } from "@prosopo/captcha-severity";
import { ProsopoApiError } from "@prosopo/common";
import { DEFAULT_RENDER_SETTINGS } from "@prosopo/puzzle-assets";
import {
	CaptchaType,
	type FrictionlessReason,
	type IFrictionlessTypes,
	type IPuzzleSettings,
	type PowCaptchaSolutionEscalation,
	type PowCaptchaSolutionResponse,
	SubmitPowCaptchaSolutionBody,
	type SubmitPowCaptchaSolutionBodyTypeOutput,
	imageMaxRoundsDefault,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { flatten, getIPAddress } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import type { AugmentedRequest } from "../../express.js";
import { coerceToEnabledCaptchaType } from "../../tasks/captchaTypeSelection.js";
import { samplePuzzleDifficulty } from "../../tasks/puzzle/puzzleDifficulty.js";
import { Tasks } from "../../tasks/tasks.js";
import {
	derivePlatform,
	deriveTrafficPolicies,
} from "../../utils/devicePlatform.js";
import { getMaintenanceMode } from "../admin/apiToggleMaintenanceModeEndpoint.js";
import { rawTlsSignalsForSession } from "../rawTlsSignalsMiddleware.js";
import { resolveTestSiteKeyVerdict } from "../testSiteKey.js";
import { validateAddr, validateSiteKey } from "../validateAddress.js";

export default (env: ProviderEnvironment) =>
	async (
		req: Request & AugmentedRequest,
		res: Response,
		next: NextFunction,
	) => {
		// Maintenance-mode short-circuit must run before `new Tasks(env, ...)`
		// because the Tasks constructor calls `env.getDb()`, which throws when
		// `env.db` is undefined (the maintenance-mode case).
		if (getMaintenanceMode()) {
			req.logger.info(() => ({
				msg: "Maintenance mode active - returning verified",
			}));
			const response: PowCaptchaSolutionResponse = {
				status: "ok",
				verified: true,
			};
			return res.json(response);
		}

		let parsed: SubmitPowCaptchaSolutionBodyTypeOutput;
		const tasks = new Tasks(env, req.logger);

		try {
			parsed = SubmitPowCaptchaSolutionBody.parse(req.body);
		} catch (err) {
			return next(
				new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
					context: { code: 400, error: err, body: req.body },
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}

		const {
			challenge,
			signature,
			nonce,
			dapp,
			user,
			behavioralData,
			salt,
			simdReadings,
			clientMetaData,
			fingerprintProof,
		} = parsed;

		validateSiteKey(dapp);
		validateAddr(user);

		// Reserved CI test site keys force a deterministic verdict before any DB
		// lookup, so they work in every environment without a registered record.
		const testVerdict = resolveTestSiteKeyVerdict(dapp, req.logger);
		if (testVerdict !== null) {
			const response: PowCaptchaSolutionResponse = {
				status: "ok",
				verified: testVerdict,
			};
			return res.json(response);
		}

		try {
			const clientRecord = await tasks.db.getClientRecord(dapp);

			if (!clientRecord) {
				return next(
					new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
						context: { code: 400, siteKey: dapp },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			// Build the post-pow routing context from the current request.
			// PowCaptchaManager fills in score, behavioural data, and the
			// session-derived isWebView flag once it has resolved the
			// originating session record.
			const flatHeaders = flatten(req.headers);
			const userAgent = req.headers["user-agent"] ?? "";
			const countryCode =
				req.ipInfo && "isValid" in req.ipInfo && req.ipInfo.isValid
					? req.ipInfo.countryCode
					: undefined;
			// Observability for the proof-of-fingerprint flow: the validation
			// itself runs inside the closed-source routing machine (no logger), so
			// log here at the provider boundary whether a proof arrived.
			req.logger.info(() => ({
				msg: fingerprintProof
					? "fingerprintProof detected"
					: "no fingerprintProof on PoW submission",
				data: {
					fingerprintProofPresent: fingerprintProof !== undefined,
					fingerprintProofBytes: fingerprintProof?.length ?? 0,
					challenge,
				},
			}));

			const trafficPolicies = deriveTrafficPolicies(
				clientRecord.settings?.trafficFilter,
			);

			tasks.powCaptchaManager.setPostPowContext({
				ip: req.ip || "",
				countryCode,
				// `false` here is a placeholder — `runPostPowRouting` overrides
				// isWebView with the value recorded on the originating session.
				platform: derivePlatform(userAgent, false),
				raw: {
					headers: flatHeaders,
					userAgent,
					...(req.ja4 && { ja4: req.ja4 }),
					...(fingerprintProof && { fingerprintProof }),
					...(req.tcpToChelloUs !== undefined && {
						tcpToChelloUs: req.tcpToChelloUs,
					}),
					...(req.chelloToHandshakeUs !== undefined && {
						chelloToHandshakeUs: req.chelloToHandshakeUs,
					}),
					...rawTlsSignalsForSession(req),
					// PoW-submit's ipInfo is looked up fresh on this request
					// (per-connection, so it's the PoW submit hop's IP not
					// the frictionless entry hop's). Only surface on the
					// isValid:true branch of the discriminated union.
					...(req.ipInfo &&
						"isValid" in req.ipInfo &&
						req.ipInfo.isValid && { ipInfo: req.ipInfo }),
					// Which egress categories this site blocks, so egress-sensitive
					// route rules can skip sites that accept VPN / proxy / DC users.
					...(trafficPolicies && { trafficPolicies }),
				},
			});

			// `solutionTimeout` gates issuance → submit; falls back to
			// `verifiedTimeout` for records that pre-date the field, since
			// historically that value covered both windows. Mongoose `default`
			// doesn't fire on reads, so the runtime value can be undefined
			// even though the parsed schema type says `number`.
			const persistedSolutionTimeout = clientRecord.settings.solutionTimeout as
				| number
				| undefined;
			const submitWindowMs: number =
				persistedSolutionTimeout ?? clientRecord.settings.verifiedTimeout;
			const result = await tasks.powCaptchaManager.verifyPowCaptchaSolution(
				challenge,
				signature.provider.challenge,
				nonce,
				submitWindowMs,
				signature.user.timestamp,
				getIPAddress(req.ip || ""),
				flatHeaders,
				behavioralData,
				salt,
				simdReadings,
				clientMetaData,
			);

			// Surface the routing machine's post-PoW decision (escalation +
			// selection reason, e.g. FINGERPRINT_PROOF_INVALID) at the provider
			// boundary so the fingerprint outcome is visible in provider logs.
			if (result.routingOutput) {
				req.logger.info(() => ({
					msg: "post-PoW routing decision",
					data: {
						routedCaptchaType: result.routingOutput?.captchaType,
						routingReason: result.routingOutput?.reason,
						challenge,
					},
				}));
			}

			const escalation = await buildEscalation(
				tasks,
				result,
				challenge,
				{
					tcpToChelloUs: req.tcpToChelloUs,
					chelloToHandshakeUs: req.chelloToHandshakeUs,
					...rawTlsSignalsForSession(req),
				},
				{
					frictionlessTypes: clientRecord.settings?.frictionlessTypes,
					imageMaxRounds: clientRecord.settings?.imageMaxRounds,
				},
			);
			const response: PowCaptchaSolutionResponse = {
				status: "ok",
				// On escalation the user is not done — they still need to clear
				// the follow-up image/puzzle challenge before we hand them a token.
				verified: escalation ? false : result.verified,
				...(escalation && { escalation }),
			};
			return res.json(response);
		} catch (err) {
			req.logger.error(() => ({
				err,
				body: req.body,
				msg: "Error in PoW captcha solution submission",
			}));
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: {
						code: 500,
						siteKey: req.body.dapp,
						error: err,
					},
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}
	};

/**
 * Translate the routing-machine output into an escalation by minting a fresh
 * session of the chosen captcha type, carrying forward the originating
 * session's risk profile (score, headers, IP, etc.). Returns undefined when
 * the router decided to keep the user on PoW (i.e. no escalation needed).
 *
 * Exported for unit testing only — the handler above is the production entry
 * point.
 */
export const buildEscalation = async (
	tasks: Tasks,
	result: { verified: boolean; routingOutput?: { captchaType: CaptchaType } },
	challenge: string,
	// Per-connection signals (TLS handshake timings + raw TCP handshake
	// signals) come from the CURRENT PoW-submit request, not from
	// `originSession` — those values belong to a different TCP connection
	// made during the earlier frictionless request.
	perConnectionSignals?: {
		tcpToChelloUs?: number;
		chelloToHandshakeUs?: number;
		synNs?: number;
		synackNs?: number;
		ackNs?: number;
		observedTtl?: number;
		tcpMss?: number;
		tcpWscale?: number;
		tcpOptsFlags?: number;
		tcpOptsOrder?: number;
		tcpWindow?: number;
	},
	// Site constraints on what an escalation may serve. Threaded from the
	// handler, which already holds the client record, rather than re-read
	// here. An absent `frictionlessTypes` means "no constraint recorded" and
	// leaves every type enabled; an absent `imageMaxRounds` falls back to the
	// schema default so the round count is bounded either way.
	siteConstraints?: {
		frictionlessTypes?: IFrictionlessTypes;
		imageMaxRounds?: number;
	},
): Promise<PowCaptchaSolutionEscalation | undefined> => {
	if (!result.verified || !result.routingOutput) return undefined;
	const routedType = result.routingOutput.captchaType;
	if (routedType !== CaptchaType.image && routedType !== CaptchaType.puzzle) {
		return undefined;
	}

	const powRecord = await tasks.db.getPowCaptchaRecordByChallenge(challenge);
	if (!powRecord?.sessionId) return undefined;

	const originSession = await tasks.db.getSessionRecordBySessionId(
		powRecord.sessionId,
	);
	if (!originSession) return undefined;

	const routed = result.routingOutput as {
		captchaType: CaptchaType.image | CaptchaType.puzzle;
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
		siteConstraints?.frictionlessTypes,
	);

	// Coercion bottoms out at PoW, which is not an escalation: the user has
	// just solved a PoW challenge, so re-issuing one would either loop or hand
	// them a free pass. A site with BOTH interactive types disabled therefore
	// cannot escalate a verified PoW solve at all — the solve stands, which is
	// the same outcome as no routing machine having fired.
	if (escalatedType === CaptchaType.pow) return undefined;

	const imageMaxRounds =
		siteConstraints?.imageMaxRounds ?? imageMaxRoundsDefault;

	// Size a puzzle escalation off the same severity currency the image path
	// uses, so a site with image disabled keeps a graduated response instead
	// of serving one identical puzzle for every escalation. `createSession`
	// takes these as its trailing overrides; they are dropped for non-puzzle
	// types by the same rule as in sendCaptcha.
	const escalationPuzzleOverrides = (():
		| { puzzleTolerance: number; puzzle: IPuzzleSettings }
		| undefined => {
		if (escalatedType !== CaptchaType.puzzle) return undefined;
		const level = severityToPuzzleDifficulty(
			routed.solvedImagesCount ?? originSession.solvedImagesCount,
			tasks.config.captchas.solved.count,
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
		};
	})();

	// Prefer the routing machine's own selection reason (e.g. an invalid
	// fingerprint proof) for the escalated captcha record; fall back to the
	// originating session's reason when the machine didn't supply one.
	const selectionReason =
		(routed.reason as FrictionlessReason | undefined) ?? originSession.reason;

	const newSession = await tasks.frictionlessManager.createSession(
		originSession.token,
		originSession.score,
		originSession.threshold,
		originSession.scoreComponents,
		originSession.ipAddress,
		escalatedType,
		originSession.siteKey ?? powRecord.dappAccount,
		// Clamp to the sitekey's ceiling. This was the one image-issuing path
		// that took a router-supplied round count unbounded — the routing
		// machine's output schema only constrains it to a positive int, so an
		// escalation could mint a session demanding far more rounds than the
		// site permits. Every other path already clamps; serve-time in
		// getImageCaptchaChallenge clamps too, so the visible effect was a
		// session record that misreported the challenge it would produce.
		escalatedType === CaptchaType.image
			? Math.min(
					routed.solvedImagesCount ??
						originSession.solvedImagesCount ??
						tasks.config.captchas.solved.count,
					imageMaxRounds,
				)
			: undefined,
		undefined,
		originSession.userSitekeyIpHash,
		originSession.webView,
		originSession.iFrame,
		originSession.decryptedHeadHash,
		selectionReason,
		undefined,
		undefined,
		originSession.ipInfo,
		originSession.headers,
		originSession.mode,
		originSession.simdReadings,
		originSession.entropyMathRandomFingerprint,
		originSession.entropyCryptoFingerprint,
		originSession.entropyWallClockOffsetMs,
		originSession.entropyMathRandomFirst,
		// Carry the detector pool bundle forward so the escalated image/puzzle
		// solve can decrypt the (same-origin) behavioural payload.
		originSession.bundleId,
		originSession.currentUrl,
		perConnectionSignals?.tcpToChelloUs,
		perConnectionSignals?.chelloToHandshakeUs,
		true,
		originSession.iframeUrl,
		originSession.isProtect,
		// Record the origin sessionId on the escalation record. The
		// DM-input read path (captchaManager.getSessionRecordWithOriginFallback)
		// uses this to fall back to the origin session for fields that the
		// escalation doesn't carry itself — simdReadings (attached by pow-
		// submit fire-and-forget, races the escalation read), dnsEvent
		// (set by the DNS sidecar on the origin's TLS connection only).
		originSession.sessionId,
		originSession.g,
		undefined,
		originSession.i,
		originSession.sw,
		originSession.md,
		originSession.bn,
		originSession.fs,
		// Raw signals for the current PoW-submit TCP connection — not the
		// origin's. Escalation session belongs on this hop's fingerprint.
		perConnectionSignals && {
			synNs: perConnectionSignals.synNs,
			synackNs: perConnectionSignals.synackNs,
			ackNs: perConnectionSignals.ackNs,
			observedTtl: perConnectionSignals.observedTtl,
			tcpMss: perConnectionSignals.tcpMss,
			tcpWscale: perConnectionSignals.tcpWscale,
			tcpOptsFlags: perConnectionSignals.tcpOptsFlags,
			tcpOptsOrder: perConnectionSignals.tcpOptsOrder,
			tcpWindow: perConnectionSignals.tcpWindow,
		},
		escalationPuzzleOverrides,
	);

	// Record the origin → escalation sessionId mapping so a /captcha/*
	// request that arrives carrying the originating sessionId (because the
	// widget didn't switch to the escalation id, or a network retry fired
	// on the old state) resolves forward to `newSession` instead of
	// landing on NO_SESSION_FOUND. See `cacheSessionEscalation` in
	// `packages/database/src/redisCache.ts` for the full rationale.
	if (tasks.writeQueue) {
		await tasks.writeQueue.cacheSessionEscalation(
			powRecord.sessionId,
			newSession.sessionId,
		);
	}

	return {
		captchaType: escalatedType,
		sessionId: newSession.sessionId,
	};
};
