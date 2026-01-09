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
	CaptchaSolutionBody,
	type CaptchaSolutionBodyType,
	type CaptchaSolutionResponse,
	type DappUserSolutionResult,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { flatten, getIPAddress } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import type { AugmentedRequest } from "../../express.js";
import { Tasks } from "../../tasks/index.js";
import { getMaintenanceMode } from "../admin/apiToggleMaintenanceModeEndpoint.js";
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

		// If in maintenance mode, always return verified
		if (getMaintenanceMode()) {
			req.logger.info(() => ({
				msg: "Maintenance mode active - returning verified for image captcha",
			}));
			const result: CaptchaSolutionResponse = {
				status: "ok",
				captchas: [],
				verified: true,
			};
			return res.json(result);
		}

		let parsed: CaptchaSolutionBodyType;
		try {
			parsed = CaptchaSolutionBody.parse(req.body);
		} catch (err) {
			return next(
				new ProsopoApiError("CAPTCHA.PARSE_ERROR", {
					context: { code: 400, error: err, body: req.body },
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}

		const { user, dapp } = parsed;

		validateSiteKey(dapp);
		validateAddr(user);

		try {
			const clientRecord = await tasks.db.getClientRecord(parsed.dapp);

			if (!clientRecord) {
				return next(
					new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
						context: { code: 400, siteKey: dapp },
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}

			const result: DappUserSolutionResult =
				await tasks.imgCaptchaManager.dappUserSolution(
					user,
					dapp,
					parsed[ApiParams.requestHash],
					parsed[ApiParams.captchas],
					parsed[ApiParams.signature].user.timestamp,
					Number.parseInt(parsed[ApiParams.timestamp]),
					parsed[ApiParams.signature].provider.requestHash,
					getIPAddress(req.ip || ""),
					flatten(req.headers),
					req.ja4,
				);

			const returnValue: CaptchaSolutionResponse = {
				status: req.i18n.t(
					result.verified ? "API.CAPTCHA_PASSED" : "API.CAPTCHA_FAILED",
				),
				...result,
			};
			return res.json(returnValue);
		} catch (err) {
			req.logger.error(() => ({
				err,
				body: req.body,
				msg: "Error in image captcha solution submission",
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
