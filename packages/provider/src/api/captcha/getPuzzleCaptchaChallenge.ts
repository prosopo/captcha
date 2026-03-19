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
	GetPuzzleCaptchaChallengeRequestBody,
	type GetPuzzleCaptchaChallengeRequestBodyTypeOutput,
	type GetPuzzleCaptchaResponse,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { flatten } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import { getCompositeIpAddress } from "../../compositeIpAddress.js";
import type { AugmentedRequest } from "../../express.js";
import { Tasks } from "../../tasks/index.js";
import { normalizeRequestIp } from "../../utils/normalizeRequestIp.js";
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
		const tasks = new Tasks(env, req.logger);
		let parsed: GetPuzzleCaptchaChallengeRequestBodyTypeOutput;

		try {
			parsed = GetPuzzleCaptchaChallengeRequestBody.parse(req.body);
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

			const normalizedIp = normalizeRequestIp(req.ip, req.logger);
			const countryCode =
				await env.geolocationService.getCountryCode(normalizedIp);

			const userScope = getRequestUserScope(
				flatten(req.headers),
				req.ja4,
				normalizedIp,
				user,
				undefined,
				undefined,
				countryCode,
			);
			const userAccessPolicy = (
				await tasks.puzzleCaptchaManager.getPrioritisedAccessPolicies(
					userAccessRulesStorage,
					dapp,
					userScope,
				)
			)[0];

			const {
				valid,
				reason,
				sessionId: validSessionId,
			} = await tasks.puzzleCaptchaManager.isValidRequest(
				clientSettings,
				CaptchaType.puzzle,
				env,
				sessionId,
				userAccessPolicy,
				normalizedIp,
			);

			if (!valid) {
				return next(
					new ProsopoApiError(reason || "API.BAD_REQUEST", {
						context: { code: 400, siteKey: dapp, user },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			// Get countryCode from session if available
			let countryCodeToStore: string | undefined;
			if (validSessionId) {
				const sessionRecord =
					await tasks.db.getSessionRecordBySessionId(validSessionId);
				countryCodeToStore = sessionRecord?.countryCode;
			}
			if (!countryCodeToStore) {
				countryCodeToStore = countryCode;
			}

			const challenge =
				await tasks.puzzleCaptchaManager.getPuzzleCaptchaChallenge(user, dapp);

			await tasks.db.storePuzzleCaptchaRecord(
				challenge.puzzleChallengeId,
				user,
				dapp,
				challenge.imgUrl,
				challenge.destX,
				challenge.blockY,
				challenge.signature.provider.puzzleChallengeId,
				getCompositeIpAddress(normalizedIp),
				flatten(req.headers),
				req.ja4,
				validSessionId,
				countryCodeToStore,
			);

			const response: GetPuzzleCaptchaResponse = challenge;

			req.logger.info(() => ({
				msg: "Puzzle captcha challenge issued",
				data: {
					captchaType: CaptchaType.puzzle,
					puzzleChallengeId: challenge.puzzleChallengeId,
					user,
					dapp,
					sessionId,
				},
			}));

			return res.json(response);
		} catch (err) {
			req.logger.error(() => ({
				err,
				body: req.body,
				msg: "Error in puzzle captcha challenge request",
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
