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
import { ProsopoError, isProsopoError, isSevereError } from "@prosopo/common";
import {
	ApiParams,
	CaptchaSolutionBody,
	type CaptchaSolutionBodyType,
	type CaptchaSolutionResponse,
	type DappUserSolutionResult,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { flatten, getIPAddress } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import type { AugmentedRequest } from "../../express.js";
import { Tasks } from "../../tasks/index.js";
import { getMaintenanceMode } from "../admin/apiToggleMaintenanceModeEndpoint.js";
import { summariseRequestBody } from "../requestBodySummary.js";
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
				msg: "Maintenance mode active - returning verified for image captcha",
			}));
			const result: CaptchaSolutionResponse = {
				status: "ok",
				captchas: [],
				verified: true,
			};
			return res.json(result);
		}

		const tasks = new Tasks(env, req.logger);

		let parsed: CaptchaSolutionBodyType;
		try {
			parsed = CaptchaSolutionBody.parse(req.body);
		} catch (err) {
			return next(
				new ProsopoError({
					code: "INVALID_REQUEST",
					errorSite: "PROV-24",
					message: "Error parsing captcha",
					cause: err,
					context: { body: summariseRequestBody(req) },
				}),
			);
		}

		const { user, dapp } = parsed;

		validateSiteKey(dapp);
		validateAddr(user);

		// Reserved CI test site keys force a deterministic verdict before any DB
		// lookup, so they work in every environment without a registered record.
		const testVerdict = resolveTestSiteKeyVerdict(dapp, req.logger);
		if (testVerdict !== null) {
			const result: CaptchaSolutionResponse = {
				status: "ok",
				captchas: [],
				verified: testVerdict,
			};
			return res.json(result);
		}

		try {
			const clientRecord = await tasks.db.getClientRecord(parsed.dapp);

			if (!clientRecord) {
				return next(
					new ProsopoError({
						code: "SITE_KEY_NOT_REGISTERED",
						errorSite: "PROV-25",
						context: { siteKey: dapp },
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
					parsed[ApiParams.behavioralData],
					// Persist the full ipinfo payload — consumers read
					// individual flags off this object instead of separate
					// flat fields.
					req.ipInfo,
					parsed[ApiParams.simdReadings],
					parsed[ApiParams.clientMetaData],
				);

			const returnValue: CaptchaSolutionResponse = {
				status: req.i18n.t(
					result.verified ? "API.CAPTCHA_PASSED" : "API.CAPTCHA_FAILED",
				),
				...result,
			};
			return res.json(returnValue);
		} catch (err) {
			if (isProsopoError(err) && !isSevereError(err)) return next(err);
			req.logger.error(() => ({
				err,
				body: summariseRequestBody(req),
				msg: "Error in image captcha solution submission",
			}));
			return next(
				new ProsopoError({
					code: "UNEXPECTED",
					errorSite: "PROV-26",
					message: "BadRequest",
					cause: err,
					context: { siteKey: req.body.dapp },
				}),
			);
		}
	};
