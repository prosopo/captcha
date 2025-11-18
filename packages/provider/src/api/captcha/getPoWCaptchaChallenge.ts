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
	GetPowCaptchaChallengeRequestBody,
	type GetPowCaptchaChallengeRequestBodyTypeOutput,
	type GetPowCaptchaResponse,
	type PoWChallengeId,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { flatten } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import { getCompositeIpAddress } from "../../compositeIpAddress.js";
import type { AugmentedRequest } from "../../express.js";
import { Tasks } from "../../tasks/index.js";
import {
	DemoKeyBehavior,
	logDemoKeyUsage,
	shouldBypassForDemoKey,
} from "../../utils/demoKeys.js";
import { getRequestUserScope } from "../blacklistRequestInspector.js";
import { validateAddr, validateSiteKey } from "../validateAddress.js";

export default (
	env: ProviderEnvironment,
	userAccessRulesStorage: AccessRulesStorage,
) =>
	async (
		req: Request & AugmentedRequest,
		res: Response,
		next: NextFunction,
	) => {
		let parsed: GetPowCaptchaChallengeRequestBodyTypeOutput;
		const tasks = new Tasks(env);
		tasks.setLogger(req.logger);

		try {
			parsed = GetPowCaptchaChallengeRequestBody.parse(req.body);
		} catch (err) {
			return next(
				new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
					context: { code: 400, error: err },
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}

		const { user, dapp, sessionId } = parsed;

		validateSiteKey(dapp);
		validateAddr(user);

		try {
			const clientSettings = await tasks.db.getClientRecord(dapp);

			if (!clientSettings) {
				return next(
					new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
						context: { code: 400, siteKey: dapp },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

		// Handle demo key - always pass (trivial difficulty)
		if (
			shouldBypassForDemoKey(dapp, DemoKeyBehavior.AlwaysPass)
		) {
			logDemoKeyUsage(
				req.logger,
				dapp,
				DemoKeyBehavior.AlwaysPass,
				"pow_captcha_challenge",
			);

				const timestamp = Date.now();
				const nonce = Math.floor(Math.random() * 1000000);
				const challengeId = `${timestamp}___${user}___${dapp}___${nonce}` as PoWChallengeId;

				const response: GetPowCaptchaResponse = {
					[ApiParams.status]: "ok",
					[ApiParams.challenge]: challengeId,
					[ApiParams.difficulty]: 1, // Trivially solvable
					[ApiParams.timestamp]: timestamp.toString(),
					[ApiParams.signature]: {
						[ApiParams.provider]: {
							[ApiParams.challenge]: "demo_provider_challenge",
						},
					},
				};

				return res.json(response);
			}

		// Handle demo key - always fail (impossible difficulty)
		if (
			shouldBypassForDemoKey(dapp, DemoKeyBehavior.AlwaysFail)
		) {
			logDemoKeyUsage(
				req.logger,
				dapp,
				DemoKeyBehavior.AlwaysFail,
				"pow_captcha_challenge",
			);

				const timestamp = Date.now();
				const nonce = Math.floor(Math.random() * 1000000);
				const challengeId = `${timestamp}___${user}___${dapp}___${nonce}` as PoWChallengeId;

				const response: GetPowCaptchaResponse = {
					[ApiParams.status]: "ok",
					[ApiParams.challenge]: challengeId,
					[ApiParams.difficulty]: 1, // Very easy, will fail later in flow
					[ApiParams.timestamp]: timestamp.toString(),
					[ApiParams.signature]: {
						[ApiParams.provider]: {
							[ApiParams.challenge]: "demo_provider_challenge",
						},
					},
				};

				return res.json(response);
			}

			const userScope = getRequestUserScope(
				flatten(req.headers),
				req.ja4,
				req.ip,
				user,
			);
			const userAccessPolicy = (
				await tasks.powCaptchaManager.getPrioritisedAccessPolicies(
					userAccessRulesStorage,
					dapp,
					userScope,
				)
			)[0];

			const {
				valid,
				reason,
				sessionId: validSessionId,
				powDifficulty,
			} = await tasks.powCaptchaManager.isValidRequest(
				clientSettings,
				CaptchaType.pow,
				env,
				sessionId,
				userAccessPolicy,
				req.ip,
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

			const origin = req.headers.origin;

			if (!origin) {
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: {
							error: "Origin header not found",
							code: 400,
							siteKey: dapp,
							user,
						},
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			const difficulty =
				powDifficulty ||
				userAccessPolicy?.powDifficulty ||
				clientSettings?.settings?.powDifficulty;
			const challenge = await tasks.powCaptchaManager.getPowCaptchaChallenge(
				user,
				dapp,
				origin,
				difficulty,
			);

			await tasks.db.storePowCaptchaRecord(
				challenge.challenge,
				{
					requestedAtTimestamp: challenge.requestedAtTimestamp,
					userAccount: user,
					dappAccount: dapp,
					nonce: Number.parseInt(challenge.challenge.split("___")[3] ?? "2", 10),
				},
				challenge.difficulty,
				challenge.providerSignature,
				getCompositeIpAddress(req.ip || ""),
				flatten(req.headers),
				req.ja4,
				validSessionId,
			);

			const getPowCaptchaResponse: GetPowCaptchaResponse = {
				[ApiParams.status]: "ok",
				[ApiParams.challenge]: challenge.challenge,
				[ApiParams.difficulty]: challenge.difficulty,
				[ApiParams.timestamp]: challenge.requestedAtTimestamp.toString(),
				[ApiParams.signature]: {
					[ApiParams.provider]: {
						[ApiParams.challenge]: challenge.providerSignature,
					},
				},
			};

			req.logger.info(() => ({
				msg: "PoW captcha challenge issued",
				data: {
					captchaType: CaptchaType.pow,
					challenge: challenge.challenge,
					difficulty: challenge.difficulty,
					user,
					dapp,
					session: sessionId,
				},
			}));
			return res.json(getPowCaptchaResponse);
		} catch (err) {
			req.logger.error(() => ({
				err,
				body: req.body,
				msg: "Error in PoW captcha challenge request",
			}));
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: {
						code: 500,
						siteKey: req.body.dapp,
						user: req.body.user,
						error: err,
					},
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}
	};
