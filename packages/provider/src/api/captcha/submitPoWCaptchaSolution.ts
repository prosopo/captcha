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
	type PowCaptchaSolutionResponse,
	SubmitPowCaptchaSolutionBody,
	type SubmitPowCaptchaSolutionBodyTypeOutput,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { flatten, getIPAddress } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import type { AugmentedRequest } from "../../express.js";
import { Tasks } from "../../tasks/tasks.js";
import {
	DemoKeyBehavior,
	logDemoKeyUsage,
	shouldBypassForDemoKey,
} from "../../utils/demoKeys.js";
import { getMaintenanceMode } from "../admin/apiToggleMaintenanceModeEndpoint.js";
import { validateAddr, validateSiteKey } from "../validateAddress.js";

export default (env: ProviderEnvironment) =>
	async (
		req: Request & AugmentedRequest,
		res: Response,
		next: NextFunction,
	) => {
		let parsed: SubmitPowCaptchaSolutionBodyTypeOutput;
		const tasks = new Tasks(env, req.logger);

		// If in maintenance mode, always return verified
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

		try {
			parsed = SubmitPowCaptchaSolutionBody.parse(req.body);
		} catch (err) {
			req.logger.error(() => ({
				msg: "PoW captcha solution validation error",
				error: err,
			}));
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
			verifiedTimeout,
			dapp,
			user,
			behavioralData,
			salt,
		} = parsed;

		validateSiteKey(dapp);
		validateAddr(user);

		// Handle demo key - always pass
		// Check demo keys BEFORE checking site key registration
		if (shouldBypassForDemoKey(dapp, DemoKeyBehavior.AlwaysPass)) {
			logDemoKeyUsage(
				req.logger,
				dapp,
				DemoKeyBehavior.AlwaysPass,
				"pow_captcha_solution",
			);

			const response: PowCaptchaSolutionResponse = {
				status: "ok",
				verified: true,
			};
			return res.json(response);
		}

		// Handle demo key - always fail
		if (shouldBypassForDemoKey(dapp, DemoKeyBehavior.AlwaysFail)) {
			logDemoKeyUsage(
				req.logger,
				dapp,
				DemoKeyBehavior.AlwaysFail,
				"pow_captcha_solution",
			);

			const response: PowCaptchaSolutionResponse = {
				status: "ok",
				verified: false,
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

			const verified = await tasks.powCaptchaManager.verifyPowCaptchaSolution(
				challenge,
				signature.provider.challenge,
				nonce,
				verifiedTimeout,
				signature.user.timestamp,
				getIPAddress(req.ip || ""),
				flatten(req.headers),
				behavioralData,
				salt,
			);
			const response: PowCaptchaSolutionResponse = { status: "ok", verified };
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
