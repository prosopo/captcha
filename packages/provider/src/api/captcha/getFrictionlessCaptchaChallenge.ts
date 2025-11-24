// Copyright 2021-2025 Prosopo (UK) Ltd.
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
	ContextType,
	GetFrictionlessCaptchaChallengeRequestBody,
} from "@prosopo/types";
import type { ScoreComponents } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { compareBinaryStrings, flatten } from "@prosopo/util";
import type { NextFunction, Response } from "express";
import type { Request } from "express";
import { getCompositeIpAddress } from "../../compositeIpAddress.js";
import type { AugmentedRequest } from "../../express.js";
import {
	FrictionlessManager,
	FrictionlessReason,
} from "../../tasks/frictionless/frictionlessTasks.js";
import { timestampDecayFunction } from "../../tasks/frictionless/frictionlessTasksUtils.js";
import { Tasks } from "../../tasks/index.js";
import { hashUserAgent } from "../../utils/hashUserAgent.js";
import { hashUserIp } from "../../utils/hashUserIp.js";
import { getMaintenanceMode } from "../admin/apiToggleMaintenanceModeEndpoint.js";
import { getRequestUserScope } from "../blacklistRequestInspector.js";
import {
	determineContextType,
	getContextThreshold,
} from "./contextAwareValidation.js";

const DEFAULT_FRICTIONLESS_THRESHOLD = 0.5;

const getRoundsFromSimScore = (simScore: number) => {
	if (simScore >= 0.9) return 0;
	if (simScore >= 0.8) return 3;
	if (simScore >= 0.7) return 4;
	if (simScore >= 0.6) return 6;
	if (simScore >= 0.5) return 7;
	return 8;
};

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
			const tasks = new Tasks(env, req.logger);
			const { token, headHash, dapp, user } =
				GetFrictionlessCaptchaChallengeRequestBody.parse(req.body);

			// If in maintenance mode, store dummy token and send PoW captcha
			if (getMaintenanceMode()) {
				req.logger.info(() => ({
					msg: "Maintenance mode active - storing dummy token and sending PoW captcha",
					data: { dapp, user },
				}));

				// Send PoW captcha with dummy frictionless data
				return res.json(
					await tasks.frictionlessManager.sendPowCaptcha({
						token,
						score: 0,
						threshold: 0.5,
						scoreComponents: {
							baseScore: 0,
						},
						providerSelectEntropy: 0,
						ipAddress: getCompositeIpAddress(req.ip || ""),
						webView: false,
						iFrame: false,
						decryptedHeadHash: "",
					}),
				);
			}

			// Check if the token has already been used
			const existingToken = await tasks.db.getSessionRecordByToken(token);

			if (existingToken) {
				req.logger.info(() => ({
					token: existingToken,
					msg: "Token has already been used",
				}));
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: {
							code: 400,
							siteKey: dapp,
							user,
						},
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			// Calculate the hash for this user-IP-sitekey combination
			const userSitekeyIpHash = hashUserIp(user, req.ip || "", dapp);

			const existingSession =
				await tasks.db.getSessionByuserSitekeyIpHash(userSitekeyIpHash);

			if (existingSession) {
				req.logger.info(() => ({
					msg: "Reusing existing session for user-IP-sitekey combination",
					data: {
						userSitekeyIpHash,
						sessionId: existingSession.sessionId,
						captchaType: existingSession.captchaType,
					},
				}));
				return res.json({
					[ApiParams.captchaType]: existingSession.captchaType,
					[ApiParams.sessionId]: existingSession.sessionId,
					[ApiParams.status]: "ok",
				});
			}

			const lScore = tasks.frictionlessManager.checkLangRules(
				req.headers["accept-language"] || "",
			);

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
			} = await tasks.frictionlessManager.decryptPayload(token, headHash);

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

			const { valid, reason } = await tasks.frictionlessManager.isValidRequest(
				clientRecord,
				CaptchaType.frictionless,
				env,
			);

			if (!valid) {
				return next(
					new ProsopoApiError(reason || "API.BAD_REQUEST", {
						context: {
							code: 400,
							siteKey: dapp,
							user,
						},
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			const botThreshold =
				clientRecord.settings?.frictionlessThreshold ||
				DEFAULT_FRICTIONLESS_THRESHOLD;

			// Initialize score components
			let scoreComponents: ScoreComponents = {
				baseScore: baseBotScore,
				...(lScore && { lScore }),
			};

			const ipAddress = getCompositeIpAddress(req.ip || "");

			// Set common session parameters on the frictionless manager
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
			});

			// Check if the IP address is blocked
			const userScope = getRequestUserScope(
				flatten(req.headers),
				req.ja4,
				req.ip,
				user,
			);
			const userAccessPolicy = (
				await tasks.frictionlessManager.getPrioritisedAccessPolicies(
					userAccessRulesStorage,
					dapp,
					userScope,
				)
			)[0];

			// If the user or IP address has an image captcha config defined, send an image captcha
			if (userAccessPolicy) {
				const scoreUpdate = tasks.frictionlessManager.scoreIncreaseAccessPolicy(
					userAccessPolicy,
					baseBotScore,
					botScore,
					scoreComponents,
				);
				botScore = scoreUpdate.score;
				scoreComponents = scoreUpdate.scoreComponents;
				tasks.frictionlessManager.updateScore(botScore, scoreComponents);

				if (userAccessPolicy.captchaType === CaptchaType.image) {
					return res.json(
						await tasks.frictionlessManager.sendImageCaptcha({
							solvedImagesCount: userAccessPolicy.solvedImagesCount,
							userSitekeyIpHash,
							reason: FrictionlessReason.USER_ACCESS_POLICY,
						}),
					);
				}
				if (userAccessPolicy.captchaType === CaptchaType.pow) {
					return res.json(
						await tasks.frictionlessManager.sendPowCaptcha({
							userSitekeyIpHash,
							reason: FrictionlessReason.USER_ACCESS_POLICY,
						}),
					);
				}
			}

			// Check the user agent in token and user id in request match request
			// Hash the request user agent to compare with the hashed user agent from the token
			console.log(req.headers);
			const headersUserAgent = req.headers["user-agent"];
			const hashedHeadersUserAgent = headersUserAgent
				? hashUserAgent(headersUserAgent)
				: "";
			const headersProsopoUser = req.headers["prosopo-user"];
			if (
				hashedHeadersUserAgent !== userAgent ||
				headersProsopoUser !== userId
			) {
				req.logger.info(() => ({
					msg: "User agent or user id does not match",
					data: {
						headersUserAgent,
						hashedHeadersUserAgent,
						userAgent: userAgent, // This is the hashed user agent from the token
						headersProsopoUser,
						userId,
					},
				}));

				console.log({
					userAgent,
					hashedHeadersUserAgent,
					userId,
					headersProsopoUser,
				});

				return res.json(
					await tasks.frictionlessManager.sendImageCaptcha({
						solvedImagesCount: timestampDecayFunction(
							timestamp,
							decryptionFailed,
						),
						userSitekeyIpHash,
						reason: FrictionlessReason.USER_AGENT_MISMATCH,
					}),
				);
			}

			// Check the context
			if (clientRecord.settings.contextAware?.enabled) {
				// Determine available contexts
				const contexts = clientRecord.settings.contextAware?.contexts || {};
				const hasDefault = contexts[ContextType.Default] !== undefined;
				const hasWebview = contexts[ContextType.Webview] !== undefined;

				// Choose contextType according to rules:
				// - if both exist, use determineContextType(webView)
				// - if only default exists, use Default
				// - if only webview exists, use Webview
				// - if neither, skip context-aware validation
				let contextType: ContextType | undefined;
				if (hasDefault && hasWebview) {
					contextType = determineContextType(webView);
				} else if (hasDefault) {
					contextType = ContextType.Default;
				} else if (hasWebview) {
					contextType = ContextType.Webview;
				} else {
					contextType = undefined;
				}

				if (contextType) {
					// Get context-specific entropy
					const clientEntropy =
						await tasks.frictionlessManager.getClientContextEntropy(
							clientRecord.account,
							contextType,
						);

					if (clientEntropy) {
						if (!decryptedHeadHash) {
							tasks.logger.info(() => ({
								msg: "No decryptedHeadHash in session for context aware client",
							}));
							return next(
								new ProsopoApiError("API.BAD_REQUEST", {
									context: {
										code: 400,
										siteKey: dapp,
										user,
									},
									i18n: req.i18n,
									logger: req.logger,
								}),
							);
						}

						// Get the threshold for this context
						const threshold = getContextThreshold(
							clientRecord.settings,
							contextType,
						);

						const sim = compareBinaryStrings(decryptedHeadHash, clientEntropy);
						const isValidContext = sim >= threshold;
						if (!isValidContext) {
							return res.json(
								await tasks.frictionlessManager.sendImageCaptcha({
									solvedImagesCount: getRoundsFromSimScore(sim),
									userSitekeyIpHash,
									reason: FrictionlessReason.CONTEXT_AWARE_VALIDATION_FAILED,
								}),
							);
						}
					}
				}
			}

			// If webview disallowed and webview detected, send an image captcha
			if (clientRecord.settings.disallowWebView && webView) {
				tasks.logger.info(() => ({
					msg: "WebView detected",
				}));
				const scoreUpdate = tasks.frictionlessManager.scoreIncreaseWebView(
					baseBotScore,
					botScore,
					scoreComponents,
				);
				botScore = scoreUpdate.score;
				scoreComponents = scoreUpdate.scoreComponents;
				tasks.frictionlessManager.updateScore(botScore, scoreComponents);

				return res.json(
					await tasks.frictionlessManager.sendImageCaptcha({
						solvedImagesCount: env.config.captchas.solved.count * 2,
						userSitekeyIpHash,
						reason: FrictionlessReason.WEBVIEW_DETECTED,
					}),
				);
			}

			// If the timestamp is older than 10 minutes, send an image captcha
			if (FrictionlessManager.timestampTooOld(timestamp)) {
				const scoreUpdate = tasks.frictionlessManager.scoreIncreaseTimestamp(
					timestamp,
					baseBotScore,
					botScore,
					scoreComponents,
				);
				botScore = scoreUpdate.score;
				scoreComponents = scoreUpdate.scoreComponents;
				tasks.frictionlessManager.updateScore(botScore, scoreComponents);

				return res.json(
					await tasks.frictionlessManager.sendImageCaptcha({
						solvedImagesCount: timestampDecayFunction(
							timestamp,
							decryptionFailed,
						),
						userSitekeyIpHash,
						reason: FrictionlessReason.OLD_TIMESTAMP,
					}),
				);
			}

			// If the host is not verified, send an image captcha
			const hostVerified = await tasks.frictionlessManager.hostVerified(
				providerSelectEntropy,
			);
			if (!hostVerified.verified) {
				const scoreUpdate =
					tasks.frictionlessManager.scoreIncreaseUnverifiedHost(
						hostVerified.domain,
						baseBotScore,
						botScore,
						scoreComponents,
					);
				botScore = scoreUpdate.score;
				scoreComponents = scoreUpdate.scoreComponents;
				tasks.frictionlessManager.updateScore(botScore, scoreComponents);
			}

			// If the bot score is greater than the threshold, send an image captcha
			if (Number(botScore) > botThreshold) {
				req.logger.info(() => ({
					msg: "Bot score is greater than threshold",
					data: {
						botScore,
						botThreshold,
						token,
					},
				}));
				return res.json(
					await tasks.frictionlessManager.sendImageCaptcha({
						solvedImagesCount: env.config.captchas.solved.count,
						userSitekeyIpHash,
						reason: FrictionlessReason.BOT_SCORE_ABOVE_THRESHOLD,
					}),
				);
			}

			// Otherwise, send a PoW captcha
			return res.json(
				await tasks.frictionlessManager.sendPowCaptcha({
					userSitekeyIpHash,
				}),
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
