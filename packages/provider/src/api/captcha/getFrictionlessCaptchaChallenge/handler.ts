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
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { flatten } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import { getCompositeIpAddress } from "../../../compositeIpAddress.js";
import type { AugmentedRequest } from "../../../express.js";
import { Tasks } from "../../../tasks/index.js";
import { derivePlatform } from "../../../utils/devicePlatform.js";
import { hashUserIp } from "../../../utils/hashUserIp.js";
import { normalizeRequestIp } from "../../../utils/normalizeRequestIp.js";
import { getMaintenanceMode } from "../../admin/apiToggleMaintenanceModeEndpoint.js";
import { getRequestUserScope } from "../../blacklistRequestInspector.js";
import { buildDnsEventUrl } from "../../dnsEventUrl.js";
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

			const { token, headHash, dapp, user, mode, simdReadings } =
				GetFrictionlessCaptchaChallengeRequestBody.parse(req.body);

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
				baseBotScore,
				timestamp,
				providerSelectEntropy,
				userId,
				userAgent,
				webView,
				iFrame,
				decryptedHeadHash,
				decryptionFailed,
				triggeredDetectors,
				shadowDomPenalty,
				entropyMathRandomFingerprint,
				entropyCryptoFingerprint,
				entropyWallClockOffsetMs,
				entropyMathRandomFirst,
			} = decryptedPayload;

			req.logger.debug(() => ({
				msg: "Decrypted payload",
				data: {
					baseBotScore,
					timestamp,
					providerSelectEntropy,
					userId,
					userAgent,
					webView,
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
				providerSelectEntropy,
				ipAddress,
				webView,
				iFrame,
				decryptedHeadHash,
				siteKey: dapp,
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
					providerSelectEntropy,
					baseBotScore,
					botScore,
					scoreComponents,
					token,
					botThreshold,
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
