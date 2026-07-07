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
	ApiParams,
	CaptchaType,
	GetFrictionlessCaptchaChallengeRequestBody,
	ModeEnum,
	type ScoreComponents,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import {
	AccessPolicyType,
	type AccessRulesStorage,
} from "@prosopo/user-access-policy";
import { flatten, sanitisePageUrl } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import { getCompositeIpAddress } from "../../../compositeIpAddress.js";
import type { AugmentedRequest } from "../../../express.js";
import { Tasks } from "../../../tasks/index.js";
import { derivePlatform } from "../../../utils/devicePlatform.js";
import { hashUserAgent } from "../../../utils/hashUserAgent.js";
import { hashUserIp } from "../../../utils/hashUserIp.js";
import { normalizeRequestIp } from "../../../utils/normalizeRequestIp.js";
import { getMaintenanceMode } from "../../admin/apiToggleMaintenanceModeEndpoint.js";
import { getRequestUserScope } from "../../blacklistRequestInspector.js";
import { buildDnsEventUrl } from "../../dnsEventUrl.js";
import {
	recordBotScore,
	recordDetectorTriggered,
	recordFrictionlessDecision,
} from "../../metrics.js";
import { isReservedTestSiteKey } from "../../testSiteKey.js";
import { buildFrictionlessMaintenanceResponse } from "../maintenanceModeResponses.js";
import { handleAccessPolicy } from "./accessPolicy.js";
import { DEFAULT_FRICTIONLESS_THRESHOLD } from "./constants.js";
import { runDecisionMachine } from "./decisionMachine.js";
import { decryptIncomingSimdReadings } from "./decryptSimdReadings.js";
import { attachHoneypot } from "./honeypotResponse.js";
import { resolveSessionDedup } from "./sessionDedup.js";
import { runConfiguredCaptchaTypeShortCircuit } from "./shortCircuit.js";

export default (
	env: ProviderEnvironment,
	userAccessRulesStorage: AccessRulesStorage,
) =>
	async (
		req: Request & AugmentedRequest,
		res: Response,
		next: NextFunction,
	) => {
		try {
			res.on("finish", () => {
				req.logger.info(() => ({
					msg: "Frictionless response finished",
					data: {
						status: res.statusCode,
						path: req.path,
						method: req.method,
					},
				}));
			});

			const {
				token,
				headHash,
				dapp,
				user,
				mode,
				simdReadings,
				currentUrl: reportedCurrentUrl,
			} = GetFrictionlessCaptchaChallengeRequestBody.parse(req.body);

			// Re-sanitise whatever the client reported: keep only scheme + host
			// + path and drop the query string, fragment and any embedded
			// credentials so we never persist secrets carried in the page URL.
			// undefined when the field is absent or not a usable http(s) URL —
			// the decision machine treats that as "not reported" and forces an
			// image captcha.
			const currentUrl = sanitisePageUrl(reportedCurrentUrl);

			const normalizedIp = normalizeRequestIp(req.ip, req.logger);
			const sessionMode =
				mode === ModeEnum.invisible ? ModeEnum.invisible : undefined;

			req.logger.info(() => ({
				msg: "Frictionless handler entry",
				data: {
					token,
					user,
					dapp,
					normalizedIp,
					ja4: req.ja4,
					path: req.path,
					method: req.method,
					...(sessionMode && { mode: sessionMode }),
				},
			}));

			// Maintenance mode: short-circuit before constructing Tasks. The
			// Tasks constructor calls `env.getDb()`, which throws when `env.db`
			// is undefined (the maintenance-mode case). The matching
			// /captcha/{type} and /submit/{type} endpoints also short-circuit so
			// the captcha widget keeps rendering while Mongo is unavailable.
			if (getMaintenanceMode()) {
				req.logger.info(() => ({
					msg: "Maintenance mode active - returning dummy PoW captcha session",
					data: { dapp, user },
				}));
				return res.json(
					buildFrictionlessMaintenanceResponse(
						CaptchaType.pow,
						env.config.host,
					),
				);
			}

			// Reserved CI test site keys: serve an invisible PoW session
			// (no DB record required) so the flow is deterministic and
			// non-interactive. The verdict is forced at /submit/pow and
			// /verify based on which reserved key it is. Checked before
			// any async work so the test path stays free of decrypts /
			// DB lookups.
			if (isReservedTestSiteKey(dapp)) {
				req.logger.warn(() => ({
					msg: "Reserved TEST site key - returning invisible PoW session",
					data: { dapp, user },
				}));
				return res.json(
					buildFrictionlessMaintenanceResponse(
						CaptchaType.pow,
						env.config.host,
					),
				);
			}

			const tasks = new Tasks(env, req.logger);
			const userSitekeyIpHash = hashUserIp(user, normalizedIp, dapp);

			// Fan out the three independent async dependencies in
			// parallel: SIMD reading decrypt, session dedup lookup, and
			// the client record fetch. The original sequential ordering
			// paid for each in series on every request and dominated p50
			// on the hottest endpoint. Errors in any branch surface via
			// Promise.all rejection, which the outer catch already
			// handles.
			const [decodedSimdReadings, { existingToken, dedup }, clientRecord] =
				await Promise.all([
					decryptIncomingSimdReadings(tasks.frictionlessManager, simdReadings),
					resolveSessionDedup(tasks, token, userSitekeyIpHash, req.logger),
					tasks.db.getClientRecord(dapp),
				]);

			if (existingToken) {
				req.logger.info(() => ({
					token: existingToken,
					msg: "Token has already been used",
				}));
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { code: 400, siteKey: dapp, user },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			if (!clientRecord) {
				return next(
					new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
						context: { code: 400, siteKey: dapp },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			if (dedup) {
				// A reused session must still honour an active user access policy
				// AND the configured routing machine. This fast-path returns
				// before handleAccessPolicy / runDecisionMachine below, so a
				// cached session whose captchaType conflicts with either gate —
				// e.g. an IP rate-limit rule forcing `image`, or a routing
				// machine published after this dedup pointer was minted that
				// now wants `puzzle` — would be served as-is and then either
				// hard-rejected at the /captcha/{type} gate with
				// INCORRECT_CAPTCHA_TYPE or escalated by the post-PoW router
				// into a session the widget can't follow. Re-check both here
				// and on conflict evict the stale session so the request falls
				// through to the access policy / decision machine, which will
				// re-derive the correct captcha type.
				const dedupCountryCode =
					req.ipInfo && "isValid" in req.ipInfo && req.ipInfo.isValid
						? req.ipInfo.countryCode
						: undefined;
				const dedupAsn =
					req.ipInfo && "isValid" in req.ipInfo && req.ipInfo.isValid
						? req.ipInfo.asnNumber
						: undefined;
				const dedupIsMobile =
					req.ipInfo && "isValid" in req.ipInfo && req.ipInfo.isValid
						? req.ipInfo.isMobile
						: undefined;
				const dedupFlatHeaders = flatten(req.headers);
				const dedupUserAgent = String(req.headers["user-agent"] ?? "");
				const dedupUserScope = getRequestUserScope(
					dedupFlatHeaders,
					req.ja4,
					normalizedIp,
					user,
					undefined,
					undefined,
					dedupCountryCode,
					dedupAsn,
				);
				const dedupAccessPolicy = (
					await tasks.frictionlessManager.getPrioritisedAccessPolicies(
						userAccessRulesStorage,
						dapp,
						dedupUserScope,
					)
				)[0];
				const dedupConflictsWithPolicy =
					dedupAccessPolicy !== undefined &&
					(dedupAccessPolicy.type === AccessPolicyType.Block ||
						(dedupAccessPolicy.captchaType !== undefined &&
							dedupAccessPolicy.captchaType !== dedup.captchaType));

				// Ask the routing machine (if any) what it would pick now,
				// using the cached session's signals as the baseline. If it
				// disagrees with the cached captchaType, evict.
				//
				// The router input intentionally mirrors the inputs the cached
				// session was created under: `score` and `webView` come from
				// the persisted session, the rest (UA, JA4, country, mobile)
				// come from the current request. A routing machine that only
				// reads the captchaType (e.g. blanket-escalate-to-puzzle) will
				// behave identically. One that mixes per-request signals with
				// session-derived ones gets the request-time view of every
				// input that's available without re-decrypting the payload.
				const cachedCaptchaType = dedup.captchaType as
					| CaptchaType.image
					| CaptchaType.pow
					| CaptchaType.puzzle;
				const dedupRouted = normalizedIp
					? await tasks.frictionlessManager.applyRoutingMachine(
							{
								captchaType: cachedCaptchaType,
								...(dedup.session.solvedImagesCount !== undefined && {
									solvedImagesCount: dedup.session.solvedImagesCount,
								}),
								...(dedup.session.powDifficulty !== undefined && {
									powDifficulty: dedup.session.powDifficulty,
								}),
							},
							{
								dappAccount: dapp,
								userAccount: user,
								ip: normalizedIp,
								...(dedupCountryCode && { countryCode: dedupCountryCode }),
								score: dedup.session.score,
								platform: derivePlatform(
									dedupUserAgent,
									dedup.session.webView,
									{
										...(typeof dedupIsMobile === "boolean" && {
											isMobile: dedupIsMobile,
										}),
									},
								),
								raw: {
									headers: dedupFlatHeaders,
									userAgent: dedupUserAgent,
									...(req.ja4 && { ja4: req.ja4 }),
									// Timing values are per-connection so they come from
									// the current request even in the dedup replay path —
									// dedup.session was created on a different TCP conn.
									...(req.tcpToChelloMs !== undefined && {
										tcpToChelloMs: req.tcpToChelloMs,
									}),
									...(req.chelloToHandshakeMs !== undefined && {
										chelloToHandshakeMs: req.chelloToHandshakeMs,
									}),
									// currentUrl uses the cached session's value to
									// match the rest of the dedup routing input (score,
									// webView, captchaType are all pulled from dedup).
									...(dedup.session.currentUrl && {
										currentUrl: dedup.session.currentUrl,
									}),
								},
							},
						)
					: { captchaType: cachedCaptchaType };
				const dedupConflictsWithRouting =
					dedupRouted.captchaType !== cachedCaptchaType;

				if (dedupConflictsWithPolicy || dedupConflictsWithRouting) {
					req.logger.info(() => ({
						msg: "Evicting reused session: cached captchaType conflicts with access policy or routing machine",
						data: {
							userSitekeyIpHash,
							sessionId: dedup.sessionId,
							cachedCaptchaType: dedup.captchaType,
							...(dedupConflictsWithPolicy && {
								policyType: dedupAccessPolicy?.type,
								policyCaptchaType: dedupAccessPolicy?.captchaType,
							}),
							...(dedupConflictsWithRouting && {
								routedCaptchaType: dedupRouted.captchaType,
							}),
						},
					}));
					// Mongo is authoritative for dedup (see resolveSessionDedup): mark
					// the stale session deleted so the next request doesn't re-reuse it,
					// and drop the Redis pointers up front to avoid a resurrection race.
					await tasks.db.checkAndRemoveSession(dedup.sessionId);
					await Promise.all([
						tasks.writeQueue?.invalidateCachedSession(dedup.sessionId) ??
							Promise.resolve(),
						tasks.writeQueue?.invalidateCachedSessionByHash(
							userSitekeyIpHash,
						) ?? Promise.resolve(),
					]);
				} else {
					req.logger.info(() => ({
						msg: "Reusing existing session for user-IP-sitekey combination",
						data: {
							userSitekeyIpHash,
							sessionId: dedup.sessionId,
							captchaType: dedup.captchaType,
						},
					}));
					req.logger.info(() => ({
						msg: "Frictionless decision",
						data: {
							decision: "reuse_session",
							captchaType: dedup.captchaType,
							sessionId: dedup.sessionId,
						},
					}));
					recordFrictionlessDecision("reuse_session");
					attachHoneypot(res, clientRecord);
					return res.json({
						[ApiParams.captchaType]: dedup.captchaType as
							| CaptchaType.image
							| CaptchaType.pow
							| CaptchaType.puzzle,
						[ApiParams.sessionId]: dedup.sessionId,
						[ApiParams.status]: "ok",
						dns_url: buildDnsEventUrl(dedup.sessionId),
					});
				}
			}

			const ipAddress = getCompositeIpAddress(normalizedIp);
			const flatHeaders = flatten(req.headers);
			const countryCode =
				req.ipInfo && "isValid" in req.ipInfo && req.ipInfo.isValid
					? req.ipInfo.countryCode
					: undefined;
			const asn =
				req.ipInfo && "isValid" in req.ipInfo && req.ipInfo.isValid
					? req.ipInfo.asnNumber
					: undefined;

			const shortCircuitResponse = await runConfiguredCaptchaTypeShortCircuit(
				{
					tasks,
					env,
					clientRecord,
					token,
					dapp,
					ipAddress,
					ipInfo: req.ipInfo,
					flatHeaders,
					sessionMode,
					userSitekeyIpHash,
					logger: req.logger,
					...(req.tcpToChelloMs !== undefined && {
						tcpToChelloMs: req.tcpToChelloMs,
					}),
					...(req.chelloToHandshakeMs !== undefined && {
						chelloToHandshakeMs: req.chelloToHandshakeMs,
					}),
				},
				res,
			);
			if (shortCircuitResponse) return shortCircuitResponse;

			const lScore = tasks.frictionlessManager.checkLangRules(
				req.headers["accept-language"] || "",
			);

			const userScope = getRequestUserScope(
				flatten(req.headers),
				req.ja4,
				normalizedIp,
				user,
				undefined,
				undefined,
				countryCode,
				asn,
			);

			// Fan out the three independent post-shortcircuit awaits:
			// payload decrypt (CPU-bound crypto), validation (cheap
			// async), and the Redis-backed access-policy lookup. None of
			// them depends on the others' outputs — running them in
			// series previously added up to ~50-80ms on the hot path.
			const [decryptedPayload, validation, accessPolicies] = await Promise.all([
				tasks.frictionlessManager.decryptPayload(token, headHash),
				tasks.frictionlessManager.isValidRequest(
					clientRecord,
					CaptchaType.frictionless,
					env,
				),
				tasks.frictionlessManager.getPrioritisedAccessPolicies(
					userAccessRulesStorage,
					dapp,
					userScope,
				),
			]);

			const {
				baseBotScore: rawBaseBotScore,
				timestamp: rawTimestamp,
				userId: rawUserId,
				userAgent: rawUserAgent,
				webView,
				iFrame,
				decryptedHeadHash,
				decryptionFailed: rawDecryptionFailed,
				triggeredDetectors,
				shadowDomPenalty,
				entropyMathRandomFingerprint,
				entropyCryptoFingerprint,
				entropyWallClockOffsetMs,
				entropyMathRandomFirst,
			} = decryptedPayload;

			// Test-only override: cypress can't produce a server-decryptable
			// detector token (no public-key exchange in the test bundle), so
			// `decryptionFailed` always trips and the frictionless flow's UA
			// + score + timestamp gates short-circuit every request to image.
			// With this env var set, synthesise the decrypted-payload values
			// from the live request so the flow reaches the default-PoW path
			// — which is what production hits when the bot detector is happy
			// and lets cypress exercise the post-PoW route() escalation.
			// Explicitly named so it can't be set in prod by accident.
			const detectorOverride =
				process.env.PROSOPO_TEST_FRICTIONLESS_DETECTOR_OVERRIDE === "1";
			const baseBotScore = detectorOverride ? 0 : rawBaseBotScore;
			const timestamp = detectorOverride ? Date.now() : rawTimestamp;
			const userId = detectorOverride
				? (req.headers["prosopo-user"] as string | undefined)
				: rawUserId;
			// `runUserAgentMismatchCheck` compares the *hashed* request UA to
			// `input.userAgent`, so the synthesised override must already be
			// hashed for the equality check to clear.
			const userAgent = detectorOverride
				? hashUserAgent((req.headers["user-agent"] as string) ?? "")
				: rawUserAgent;
			const decryptionFailed = detectorOverride ? false : rawDecryptionFailed;

			req.logger.debug(() => ({
				msg: "Decrypted payload",
				data: {
					baseBotScore,
					timestamp,
					userId,
					userAgent,
					webView,
					...(detectorOverride && { detectorOverride: true }),
				},
			}));

			let botScore = baseBotScore + lScore;

			const { valid, reason } = validation;

			if (!valid) {
				return next(
					new ProsopoApiError(reason || "API.BAD_REQUEST", {
						context: { code: 400, siteKey: dapp, user },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			recordBotScore(botScore);
			if (triggeredDetectors && triggeredDetectors.length > 0) {
				recordDetectorTriggered(triggeredDetectors);
			}

			const botThreshold =
				clientRecord.settings?.frictionlessThreshold ||
				DEFAULT_FRICTIONLESS_THRESHOLD;

			let scoreComponents: ScoreComponents = {
				baseScore: baseBotScore,
				...(lScore && { lScore }),
				...(triggeredDetectors &&
					triggeredDetectors.length > 0 && { triggeredDetectors }),
				...(shadowDomPenalty !== undefined && { shadowDomPenalty }),
			};

			tasks.frictionlessManager.setSessionParams({
				token,
				score: botScore,
				threshold: botThreshold,
				scoreComponents,
				ipAddress,
				webView,
				iFrame,
				decryptedHeadHash,
				siteKey: dapp,
				...(currentUrl && { currentUrl }),
				ipInfo: req.ipInfo,
				headers: flatHeaders,
				mode: sessionMode,
				...(decodedSimdReadings && { simdReadings: decodedSimdReadings }),
				...(entropyMathRandomFingerprint !== undefined && {
					entropyMathRandomFingerprint,
				}),
				...(entropyCryptoFingerprint !== undefined && {
					entropyCryptoFingerprint,
				}),
				...(entropyWallClockOffsetMs !== undefined && {
					entropyWallClockOffsetMs,
				}),
				...(entropyMathRandomFirst !== undefined && {
					entropyMathRandomFirst,
				}),
				...(req.tcpToChelloMs !== undefined && {
					tcpToChelloMs: req.tcpToChelloMs,
				}),
				...(req.chelloToHandshakeMs !== undefined && {
					chelloToHandshakeMs: req.chelloToHandshakeMs,
				}),
			});

			const ipInfoMobile =
				req.ipInfo && "isValid" in req.ipInfo && req.ipInfo.isValid
					? req.ipInfo.isMobile
					: undefined;
			const safeUserAgent = userAgent ?? "";
			tasks.frictionlessManager.setRoutingContext({
				dappAccount: dapp,
				userAccount: user,
				ip: normalizedIp,
				countryCode,
				score: botScore,
				platform: derivePlatform(safeUserAgent, webView, {
					...(typeof ipInfoMobile === "boolean" && { isMobile: ipInfoMobile }),
				}),
				raw: {
					headers: flatHeaders,
					userAgent: safeUserAgent,
					...(req.ja4 && { ja4: req.ja4 }),
					...(req.tcpToChelloMs !== undefined && {
						tcpToChelloMs: req.tcpToChelloMs,
					}),
					...(req.chelloToHandshakeMs !== undefined && {
						chelloToHandshakeMs: req.chelloToHandshakeMs,
					}),
					...(currentUrl && { currentUrl }),
				},
			});

			const userAccessPolicy = accessPolicies[0];

			const accessPolicyOutcome = await handleAccessPolicy(
				{
					tasks,
					clientRecord,
					userAccessPolicy,
					baseBotScore,
					botScore,
					scoreComponents,
					userSitekeyIpHash,
					dapp,
					ipInfo: req.ipInfo,
					flatHeaders,
					logger: req.logger,
					userScope,
				},
				res,
			);
			if (accessPolicyOutcome.handled) return accessPolicyOutcome.response;
			botScore = accessPolicyOutcome.botScore;
			scoreComponents = accessPolicyOutcome.scoreComponents;

			return await runDecisionMachine(
				{
					tasks,
					env,
					clientRecord,
					dapp,
					user,
					userSitekeyIpHash,
					flatHeaders,
					ipInfo: req.ipInfo,
					timestamp,
					decryptionFailed,
					userAgent,
					userId,
					webView,
					decryptedHeadHash,
					baseBotScore,
					botScore,
					scoreComponents,
					token,
					botThreshold,
					currentUrl,
				},
				{ req, res, next },
			);
		} catch (err) {
			req.logger.error(() => ({
				err,
				msg: "Error in frictionless captcha challenge",
			}));
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: { code: 400, error: err },
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}
	};
