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
import { flatten, isProtectDeployment, sanitisePageUrl } from "@prosopo/util";
import { verifyWebBotAuth } from "@prosopo/web-bot-auth";
import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getCompositeIpAddress } from "../../../compositeIpAddress.js";
import type { AugmentedRequest } from "../../../express.js";
import { Tasks } from "../../../tasks/index.js";
import {
	derivePlatform,
	deriveTrafficPolicies,
} from "../../../utils/devicePlatform.js";
import { hashUserAgent } from "../../../utils/hashUserAgent.js";
import { hashUserIp } from "../../../utils/hashUserIp.js";
import { normalizeRequestIp } from "../../../utils/normalizeRequestIp.js";
import { getMaintenanceMode } from "../../admin/apiToggleMaintenanceModeEndpoint.js";
import {
	getRequestUserScope,
	normalizeHeadersForMatching,
} from "../../blacklistRequestInspector.js";
import { buildDnsEventUrl } from "../../dnsEventUrl.js";
import {
	recordBotScore,
	recordDetectorTriggered,
	recordFrictionlessDecision,
} from "../../metrics.js";
import { rawTlsSignalsForSession } from "../../rawTlsSignalsMiddleware.js";
import { isReservedTestSiteKey } from "../../testSiteKey.js";
import { buildFrictionlessMaintenanceResponse } from "../maintenanceModeResponses.js";
import {
	applyTrafficFilterAtRequestTime,
	handleFrictionlessTrafficFilter,
} from "../trafficFilterRequestTime.js";
import { handleAccessPolicy } from "./accessPolicy.js";
import { resolveScoreLadder } from "./constants.js";
import { runDecisionMachine } from "./decisionMachine.js";
import { decryptIncomingSimdReadings } from "./decryptSimdReadings.js";
import { attachHoneypot } from "./honeypotResponse.js";
import { resolveSessionDedup } from "./sessionDedup.js";
import {
	runConfiguredCaptchaTypeShortCircuit,
	runEmptyDetectorPoolPowFallback,
} from "./shortCircuit.js";

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
				detectorSessionId,
				currentUrl: reportedCurrentUrl,
				iframeUrl: reportedIframeUrl,
				clientSessionId,
			} = GetFrictionlessCaptchaChallengeRequestBody.parse(req.body);

			// Re-sanitised to scheme + host + path so secrets carried in the page
			// URL are never persisted. undefined when absent or not a usable
			// http(s) URL. `iframeUrl` is only set when the widget was embedded.
			const currentUrl = sanitisePageUrl(reportedCurrentUrl);
			const iframeUrl = sanitisePageUrl(reportedIframeUrl);
			// Only persisted when true — see the sparse index on
			// {isProtect, createdAt}.
			const isProtect = isProtectDeployment(currentUrl, iframeUrl);

			// Sessions need a unique, truthy token for dedup, so synthesise one
			// when the client had no detector to produce it. The raw `token` is
			// what the decision machine's missing-token gate reads.
			const sessionToken = token || `notoken-${uuidv4()}`;

			const normalizedIp = normalizeRequestIp(req.ip, req.logger);
			// Always persist a concrete mode so analytics can tell visible from
			// invisible traffic: the client only sends `mode` to opt into
			// invisible.
			const sessionMode: ModeEnum =
				mode === ModeEnum.invisible ? ModeEnum.invisible : ModeEnum.visible;

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
					mode: sessionMode,
				},
			}));

			// Must run before `new Tasks(env, ...)`, whose constructor throws in
			// maintenance mode (`env.getDb()` with no `env.db`). The
			// /captcha/{type} and /submit/{type} endpoints also short-circuit so
			// the widget keeps rendering while Mongo is unavailable.
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

			const [decodedSimdReadings, { existingToken, dedup }, clientRecord] =
				await Promise.all([
					decryptIncomingSimdReadings(
						tasks.frictionlessManager,
						simdReadings,
						detectorSessionId,
					),
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

			// `isValid: false` means the ipapi lookup failed and none of its
			// fields are populated, so it is treated as no ipInfo at all.
			const validIpInfo =
				req.ipInfo && "isValid" in req.ipInfo && req.ipInfo.isValid
					? req.ipInfo
					: undefined;
			const countryCode = validIpInfo?.countryCode;
			const asn = validIpInfo?.asnNumber;
			const ipInfoMobile = validIpInfo?.isMobile;
			// The raw header: the decrypted `userAgent` is a hash that only
			// `runUserAgentMismatchCheck` can use.
			const requestUserAgent = String(req.headers["user-agent"] ?? "");

			if (dedup) {
				// The reused session must still agree with the active access
				// policy and routing machine, which otherwise run only on the
				// fresh-session path below. A conflicting cached captchaType (e.g.
				// an IP rule forcing `image`, or a routing machine published after
				// the session was minted) would be rejected at /captcha/{type}
				// with INCORRECT_CAPTCHA_TYPE or escalated by the post-PoW router
				// into a session the widget can't follow, so on conflict the
				// session is evicted and the type re-derived below.
				const dedupFlatHeaders = flatten(req.headers);
				const dedupTrafficPolicies = deriveTrafficPolicies(
					clientRecord.settings?.trafficFilter,
				);
				const dedupUserScope = getRequestUserScope(
					dedupFlatHeaders,
					req.ja4,
					normalizedIp,
					user,
					undefined,
					undefined,
					countryCode,
					asn,
				);
				// Skip deferToVerify policies — they enforce at verify time
				// only; using them here to invalidate a dedup session would
				// prematurely eject a user whose frictionless flow should
				// complete normally before the block fires downstream.
				const dedupAccessPolicy = (
					await tasks.frictionlessManager.getPrioritisedAccessPolicies(
						userAccessRulesStorage,
						dapp,
						dedupUserScope,
						normalizeHeadersForMatching(req.headers),
					)
				).find((p) => !p.deferToVerify);
				const dedupConflictsWithPolicy =
					dedupAccessPolicy !== undefined &&
					(dedupAccessPolicy.type === AccessPolicyType.Block ||
						(dedupAccessPolicy.captchaType !== undefined &&
							dedupAccessPolicy.captchaType !== dedup.captchaType));

				// Ask the routing machine (if any) what it would pick now; evict if
				// it disagrees with the cached captchaType. `score`, `webView` and
				// the page URLs come from the cached session, as they can't be
				// re-derived without re-decrypting the payload; the other signals
				// (UA, JA4, country, mobile) come from this request.
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
								...(countryCode && { countryCode }),
								score: dedup.session.score,
								platform: derivePlatform(
									requestUserAgent,
									dedup.session.webView,
									{
										...(typeof ipInfoMobile === "boolean" && {
											isMobile: ipInfoMobile,
										}),
									},
								),
								raw: {
									headers: dedupFlatHeaders,
									userAgent: requestUserAgent,
									...(req.ja4 && { ja4: req.ja4 }),
									// Timing values are per-connection, so they come from
									// this request: dedup.session was created on a
									// different TCP connection.
									...(req.tcpToChelloUs !== undefined && {
										tcpToChelloUs: req.tcpToChelloUs,
									}),
									...(req.chelloToHandshakeUs !== undefined && {
										chelloToHandshakeUs: req.chelloToHandshakeUs,
									}),
									...rawTlsSignalsForSession(req),
									...(validIpInfo && { ipInfo: validIpInfo }),
									...(dedup.session.currentUrl && {
										currentUrl: dedup.session.currentUrl,
									}),
									...(dedup.session.iframeUrl && {
										iframeUrl: dedup.session.iframeUrl,
									}),
									...(dedupTrafficPolicies && {
										trafficPolicies: dedupTrafficPolicies,
									}),
								},
							},
						)
					: { captchaType: cachedCaptchaType };
				const dedupConflictsWithRouting =
					dedupRouted.captchaType !== cachedCaptchaType;

				// The cached session's `bundleId` decrypts every later SIMD /
				// behavioural payload (via resolveBundleBySessionId), but this
				// request's fresh /detector/assign may have bound
				// `detectorSessionId` to a different bundle. Later hops would then
				// encrypt with one key and decrypt with another
				// (ERR_OSSL_RSA_OAEP_DECODING_ERROR), escalating via the DM's
				// empty-BDP rule. If the incoming binding has expired (Redis TTL)
				// the fresh bundleId is unknown, so the session is reused as-is.
				let dedupConflictsWithBundle = false;
				let dedupIncomingBundleId: string | undefined;
				if (detectorSessionId && dedup.session.bundleId) {
					const incoming =
						await tasks.frictionlessManager.resolveBundleByDetectorSession(
							detectorSessionId,
						);
					dedupIncomingBundleId = incoming?.bundleId;
					if (
						dedupIncomingBundleId !== undefined &&
						dedupIncomingBundleId !== dedup.session.bundleId
					) {
						dedupConflictsWithBundle = true;
					}
				}

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
					// Bundle-only mismatch: rebind `bundleId` in place rather than
					// evicting. Evicting races /captcha/{type} and solution calls
					// the widget already has in flight for `dedup.sessionId`, which
					// then find no session and fail with INCORRECT_CAPTCHA_TYPE
					// (400). Cache-first write-behind so same-request reads see the
					// update.
					if (dedupConflictsWithBundle && dedupIncomingBundleId) {
						req.logger.info(() => ({
							msg: "Rebinding reused session bundleId to match incoming detector",
							data: {
								userSitekeyIpHash,
								sessionId: dedup.sessionId,
								cachedBundleId: dedup.session.bundleId,
								incomingBundleId: dedupIncomingBundleId,
							},
						}));
						await tasks.frictionlessManager.updateSessionRecordWithCache(
							dedup.sessionId,
							{ bundleId: dedupIncomingBundleId },
						);
					}
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
						[ApiParams.captchaType]: cachedCaptchaType,
						[ApiParams.sessionId]: dedup.sessionId,
						[ApiParams.status]: "ok",
						dns_url: buildDnsEventUrl(dedup.sessionId),
					});
				}
			}

			const ipAddress = getCompositeIpAddress(normalizedIp);
			const flatHeaders = flatten(req.headers);

			const shortCircuitInput = {
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
				requestId: req.requestId,
				logger: req.logger,
				...(detectorSessionId && { detectorSessionId }),
				...(req.tcpToChelloUs !== undefined && {
					tcpToChelloUs: req.tcpToChelloUs,
				}),
				...(req.chelloToHandshakeUs !== undefined && {
					chelloToHandshakeUs: req.chelloToHandshakeUs,
				}),
				...rawTlsSignalsForSession(req),
			};

			const shortCircuitResponse = await runConfiguredCaptchaTypeShortCircuit(
				shortCircuitInput,
				res,
			);
			if (shortCircuitResponse) return shortCircuitResponse;

			// This provider has no bundles to assign, so no client could have run
			// detection — serve a real PoW challenge.
			const emptyPoolResponse = await runEmptyDetectorPoolPowFallback(
				shortCircuitInput,
				res,
			);
			if (emptyPoolResponse) return emptyPoolResponse;

			const lScore = tasks.frictionlessManager.checkLangRules(
				req.headers["accept-language"] || "",
			);

			// Web Bot Auth (RFC 9421): if the request carries a valid Ed25519
			// signature and the signer's JWKS at /.well-known/http-message-
			// signatures-directory verifies it, promote the canonical signer
			// URL onto the userScope so `webBotAuthAgent` access rules can
			// match on the verified identity. Unsigned traffic falls through
			// with webBotAuthAgent=undefined and hits the normal detector
			// stack.
			const verified = await verifyWebBotAuth({
				method: req.method,
				url: `https://${req.headers.host ?? ""}${req.originalUrl ?? req.url}`,
				headers: flatten(req.headers),
			});
			const verifiedSignerUrl = verified.verified
				? verified.signerUrl
				: undefined;

			const userScope = getRequestUserScope(
				flatten(req.headers),
				req.ja4,
				normalizedIp,
				user,
				undefined,
				undefined,
				countryCode,
				asn,
				verifiedSignerUrl,
			);

			const [decryptedPayload, validation, accessPolicies] = await Promise.all([
				tasks.frictionlessManager.decryptPayload(
					token,
					headHash,
					detectorSessionId,
				),
				tasks.frictionlessManager.isValidRequest(
					clientRecord,
					CaptchaType.frictionless,
					env,
				),
				tasks.frictionlessManager.getPrioritisedAccessPolicies(
					userAccessRulesStorage,
					dapp,
					userScope,
					normalizeHeadersForMatching(req.headers),
				),
			]);

			// Authenticated fast-path: any non-deferToVerify Allow rule matching
			// the userScope (verified Web Bot Auth agent, IP CIDR, JA4, UA, ASN,
			// country, or a combination) skips the decision machine and mints an
			// authenticated session with `serverChecked: false`, which the
			// operator's `/client/authenticated/verify` call consumes.
			// deferToVerify policies enforce at verify time only, so are ignored.
			//
			// A Block or Restrict on the same match set always outranks Allow, so
			// "allow /24" plus "block 10.0.0.5" still blocks that address.
			const blockingPolicy = accessPolicies.find(
				(p) =>
					!p.deferToVerify &&
					(p.type === AccessPolicyType.Block ||
						p.type === AccessPolicyType.Restrict),
			);
			const allowingPolicy = blockingPolicy
				? undefined
				: accessPolicies.find(
						(p) => !p.deferToVerify && p.type === AccessPolicyType.Allow,
					);
			if (allowingPolicy) {
				const authenticatedSession =
					await tasks.frictionlessManager.createAuthenticatedSession(
						token,
						ipAddress,
						// May be empty string when the Allow was matched by IP /
						// JA4 / UA instead of webBotAuthAgent. The session field
						// stays unset in that case so verify-side observability
						// distinguishes "verified signer" from "trusted IP".
						verifiedSignerUrl ?? "",
						dapp,
						userSitekeyIpHash,
						flatHeaders,
						validIpInfo,
						clientSessionId,
					);
				req.logger.info(() => ({
					msg: "Frictionless decision",
					data: {
						decision: "authenticated_allow_rule",
						captchaType: CaptchaType.authenticated,
						sessionId: authenticatedSession.sessionId,
						webBotAuthAgent: verifiedSignerUrl,
						ruleType: allowingPolicy.description,
					},
				}));
				recordFrictionlessDecision("authenticated_allow_rule");
				attachHoneypot(res, clientRecord);
				return res.json({
					[ApiParams.captchaType]: CaptchaType.authenticated,
					[ApiParams.sessionId]: authenticatedSession.sessionId,
					[ApiParams.status]: "ok",
					dns_url: buildDnsEventUrl(authenticatedSession.sessionId),
					...(verifiedSignerUrl && { agent: verifiedSignerUrl }),
				});
			}

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
				g,
				i,
				cv,
				sq,
				cg,
				sm,
				b,
				sw,
				md,
				bn,
				fs,
				bundleId,
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

			const { botThreshold, botImageThreshold } = resolveScoreLadder(
				clientRecord.settings?.frictionlessThreshold,
			);

			let scoreComponents: ScoreComponents = {
				baseScore: baseBotScore,
				...(lScore && { lScore }),
				...(triggeredDetectors &&
					triggeredDetectors.length > 0 && { triggeredDetectors }),
				...(shadowDomPenalty !== undefined && { shadowDomPenalty }),
			};

			tasks.frictionlessManager.setSessionParams({
				token: sessionToken,
				score: botScore,
				threshold: botThreshold,
				scoreComponents,
				ipAddress,
				webView,
				iFrame,
				decryptedHeadHash,
				siteKey: dapp,
				...(currentUrl && { currentUrl }),
				...(iframeUrl && { iframeUrl }),
				...(isProtect && { isProtect: true }),
				ipInfo: req.ipInfo,
				headers: flatHeaders,
				mode: sessionMode,
				// Promote the resolved pool bundle onto the session so later hops
				// (SIMD attach, PoW/puzzle/image solution submit) can resolve the
				// same keypair + inner cipher to decrypt their payloads.
				...(bundleId && { bundleId }),
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
				...(g !== undefined && { g }),
				...(i !== undefined && { i }),
				...(cv !== undefined && { cv }),
				...(sq !== undefined && { sq }),
				...(cg !== undefined && { cg }),
				...(sm !== undefined && { sm }),
				...(b !== undefined && { b }),
				...(sw !== undefined && { sw }),
				...(md !== undefined && { md }),
				...(bn !== undefined && { bn }),
				...(fs !== undefined && { fs }),
				...(req.tcpToChelloUs !== undefined && {
					tcpToChelloUs: req.tcpToChelloUs,
				}),
				...(req.chelloToHandshakeUs !== undefined && {
					chelloToHandshakeUs: req.chelloToHandshakeUs,
				}),
				...rawTlsSignalsForSession(req),
			});

			const trafficPolicies = deriveTrafficPolicies(
				clientRecord.settings?.trafficFilter,
			);
			tasks.frictionlessManager.setRoutingContext({
				dappAccount: dapp,
				userAccount: user,
				ip: normalizedIp,
				countryCode,
				score: botScore,
				imageMaxRounds: clientRecord.settings.imageMaxRounds,
				imageMinRounds: clientRecord.settings.imageMinRounds,
				// Constrains what `sendCaptcha` may finally mint, and sizes a
				// puzzle chosen in place of a disabled image challenge.
				frictionlessTypes: clientRecord.settings.frictionlessTypes,
				baseImageRounds: env.config.captchas.solved.count,
				puzzleMaxDifficulty: clientRecord.settings.puzzleMaxDifficulty,
				platform: derivePlatform(requestUserAgent, webView, {
					...(typeof ipInfoMobile === "boolean" && { isMobile: ipInfoMobile }),
				}),
				raw: {
					headers: flatHeaders,
					userAgent: requestUserAgent,
					...(req.ja4 && { ja4: req.ja4 }),
					...(req.tcpToChelloUs !== undefined && {
						tcpToChelloUs: req.tcpToChelloUs,
					}),
					...(req.chelloToHandshakeUs !== undefined && {
						chelloToHandshakeUs: req.chelloToHandshakeUs,
					}),
					...rawTlsSignalsForSession(req),
					...(validIpInfo && { ipInfo: validIpInfo }),
					...(currentUrl && { currentUrl }),
					...(iframeUrl && { iframeUrl }),
					// Which egress categories this site blocks, so egress-sensitive
					// route rules can skip sites that accept VPN / proxy / DC users.
					...(trafficPolicies && { trafficPolicies }),
				},
			});

			// Skip deferred *Block* policies only. handleAccessPolicy
			// treats a Block as a 401 short-circuit, so a deferred Block
			// reaching here would reject at request time and defeat the
			// "solve normally, block at verify" contract.
			//
			// A deferred Restrict is deliberately let through: it never
			// takes the 401 branch, and it is how a deferred rule sets
			// the captcha type it wants served. The rule then blocks at
			// verify via checkForHardBlock. Filtering it out here would
			// mean the challenge type it names is silently ignored.
			const userAccessPolicy = accessPolicies.find(
				(p) => !(p.deferToVerify === true && p.type === AccessPolicyType.Block),
			);

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

			// Access policies are more targeted than trafficFilter, so any
			// matched access policy has already dispatched above. Only fall
			// through here when access policies didn't fire.
			const trafficFilterVerdict = applyTrafficFilterAtRequestTime(
				req.ipInfo,
				clientRecord.settings?.trafficFilter,
				req.logger,
			);
			const trafficFilterOutcome = await handleFrictionlessTrafficFilter(
				{
					verdict: trafficFilterVerdict,
					frictionlessManager: tasks.frictionlessManager,
					clientRecord,
					userSitekeyIpHash,
					dapp,
					ipInfo: req.ipInfo,
					flatHeaders,
					logger: req.logger,
				},
				res,
			);
			if (trafficFilterOutcome.handled) return trafficFilterOutcome.response;

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
					headHash,
					botThreshold,
					botImageThreshold,
					triggeredDetectors,
					currentUrl,
					iframeUrl,
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
