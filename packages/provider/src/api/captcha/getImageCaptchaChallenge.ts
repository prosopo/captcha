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
import { parseCaptchaAssets } from "@prosopo/datasets";
import {
	ApiParams,
	type Captcha,
	CaptchaRequestBody,
	type CaptchaRequestBodyTypeOutput,
	type CaptchaResponseBody,
	CaptchaType,
	type ProsopoCaptchaCountConfigSchemaOutput,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { flatten, getIPAddress } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import type { AugmentedRequest } from "../../express.js";
import { GeolocationService } from "../../services/geolocation.js";
import { Tasks } from "../../tasks/index.js";
import { normalizeRequestIp } from "../../utils/normalizeRequestIp.js";
import { getRequestUserScope } from "../blacklistRequestInspector.js";
import { validateAddr, validateSiteKey } from "../validateAddress.js";

// Singleton geolocation service instance
let geolocationService: GeolocationService | null = null;

const getGeolocationService = (
	env: ProviderEnvironment,
): GeolocationService => {
	if (!geolocationService) {
		geolocationService = new GeolocationService(
			env.config.maxmindDbPath,
			env.logger,
		);
	}
	return geolocationService;
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
		const tasks = new Tasks(env, req.logger);
		let parsed: CaptchaRequestBodyTypeOutput;

		const normalizedIp = normalizeRequestIp(req.ip, req.logger);
		if (!normalizedIp) {
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: { code: 400, error: "IP address not found" },
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}

		const ipAddress = getIPAddress(normalizedIp);

		try {
			parsed = CaptchaRequestBody.parse(req.body);
		} catch (err) {
			return next(
				new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
					context: { code: 400, error: err },
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}

		const { datasetId: clientDatasetId, user, dapp, sessionId } = parsed;

		// Use client-provided datasetId if available, otherwise use provider's default
		const datasetId = clientDatasetId || env.datasetId;

		if (!datasetId) {
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: {
						code: 400,
						error: "No dataset available. Please upload a dataset first.",
					},
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}

		validateSiteKey(dapp);
		validateAddr(user);

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

			// Get country code for geoblocking
			const geoService = getGeolocationService(env);
			const countryCode = await geoService.getCountryCode(normalizedIp);

			const userScope = getRequestUserScope(
				flatten(req.headers),
				req.ja4,
				normalizedIp,
				user,
				undefined, // headHash
				undefined, // coords
				countryCode,
			);
			const userAccessPolicy = (
				await tasks.imgCaptchaManager.getPrioritisedAccessPolicies(
					userAccessRulesStorage,
					dapp,
					userScope,
				)
			)[0];

			const {
				valid,
				reason,
				sessionId: validSessionId,
				solvedImagesCount,
			} = await tasks.imgCaptchaManager.isValidRequest(
				clientRecord,
				CaptchaType.image,
				env,
				sessionId,
				userAccessPolicy,
				normalizedIp,
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

			const captchaConfig: ProsopoCaptchaCountConfigSchemaOutput = {
				solved: {
					count:
						solvedImagesCount ||
						userAccessPolicy?.solvedImagesCount ||
						env.config.captchas.solved.count,
				},
				unsolved: {
					count:
						userAccessPolicy?.unsolvedImagesCount ||
						env.config.captchas.unsolved.count,
				},
			};

			const taskData =
				await tasks.imgCaptchaManager.getRandomCaptchasAndRequestHash(
					datasetId,
					user,
					ipAddress,
					captchaConfig,
					clientRecord.settings.imageThreshold ?? 0.8,
					validSessionId,
				);
			const captchaResponse: CaptchaResponseBody = {
				[ApiParams.status]: "ok",
				[ApiParams.captchas]: taskData.captchas.map((captcha: Captcha) => ({
					...captcha,
					target: req.t(`TARGET.${captcha.target}`),
					items: captcha.items.map((item) =>
						parseCaptchaAssets(item, env.assetsResolver),
					),
				})),
				[ApiParams.requestHash]: taskData.requestHash,
				[ApiParams.timestamp]: taskData.timestamp.toString(),
				[ApiParams.signature]: {
					[ApiParams.provider]: {
						[ApiParams.requestHash]: taskData.signedRequestHash,
					},
				},
			};
			req.logger.info(() => ({
				msg: "Image captcha challenge issued",
				data: {
					captchaType: CaptchaType.image,
					requestHash: taskData.requestHash,
					solvedImagesCount: captchaConfig.solved.count,
					user,
					dapp,
					sessionId,
				},
			}));
			return res.json(captchaResponse);
		} catch (err) {
			req.logger.error(() => ({
				err,
				data: req.params,
				msg: "Error in image captcha challenge request",
			}));
			return next(
				new ProsopoApiError("API.BAD_REQUEST", {
					context: {
						error: err,

						code: 500,
						params: req.params,
					},
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}
	};
