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
import { ProsopoApiError } from "@prosopo/common";
import {
	CaptchaType,
	type FrictionlessReason,
	type PowCaptchaSolutionEscalation,
	type PowCaptchaSolutionResponse,
	SubmitPowCaptchaSolutionBody,
	type SubmitPowCaptchaSolutionBodyTypeOutput,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { flatten, getIPAddress } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import type { AugmentedRequest } from "../../express.js";
import { Tasks } from "../../tasks/tasks.js";
import { derivePlatform } from "../../utils/devicePlatform.js";
import { getMaintenanceMode } from "../admin/apiToggleMaintenanceModeEndpoint.js";
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
					...(req.tcpToChelloMs !== undefined && {
						tcpToChelloMs: req.tcpToChelloMs,
					}),
					...(req.chelloToHandshakeMs !== undefined && {
						chelloToHandshakeMs: req.chelloToHandshakeMs,
					}),
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

			const escalation = await buildEscalation(tasks, result, challenge, {
				tcpToChelloMs: req.tcpToChelloMs,
				chelloToHandshakeMs: req.chelloToHandshakeMs,
			});
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
	// TLS handshake timings are per-connection: they must come from the
	// current PoW-submit request, not from `originSession` (whose values
	// belong to a different TCP connection made during the earlier
	// frictionless request).
	handshakeTiming?: {
		tcpToChelloMs?: number;
		chelloToHandshakeMs?: number;
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
		routed.captchaType,
		originSession.siteKey ?? powRecord.dappAccount,
		routed.captchaType === CaptchaType.image
			? (routed.solvedImagesCount ?? originSession.solvedImagesCount)
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
		originSession.currentUrl,
		handshakeTiming?.tcpToChelloMs,
		handshakeTiming?.chelloToHandshakeMs,
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
		captchaType: routed.captchaType,
		sessionId: newSession.sessionId,
	};
};
