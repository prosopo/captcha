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
import type { ProviderEnvironment } from "@prosopo/types-env";
import { extractDomainFromEmail } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import { object, string } from "zod";
import type { AugmentedRequest } from "../../express.js";
import { Tasks } from "../../tasks/index.js";
import { checkSpamEmail as checkSpamEmailFn } from "../../tasks/spam/checkSpamEmail.js";

const CheckSpamEmailRequestBody = object({
	email: string(),
	dapp: string(),
});

export default (env: ProviderEnvironment) =>
	async (
		req: Request & AugmentedRequest,
		res: Response,
		next: NextFunction,
	) => {
		try {
			const tasks = new Tasks(env, req.logger);
			const { email, dapp } = CheckSpamEmailRequestBody.parse(req.body);
			const emailDomain = extractDomainFromEmail(email);
			req.logger.info(() => ({
				msg: "Check spam email handler entry",
				data: {
					emailDomain,
					path: req.path,
					method: req.method,
				},
			}));
			// Get client record and perform the same validation as frictionless flow
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
			// Validate client is allowed to use spam email domain checking
			const valid = clientRecord.settings.spamEmailDomainCheckEnabled;
			if (!valid) {
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: {
							code: 400,
							siteKey: dapp,
						},
						i18n: req.i18n,
						logger: req.logger,
					}),
				);
			}
			// Check if email is spam
			const isSpam = await checkSpamEmailFn(
				email,
				tasks.db,
				env.config,
				req.logger,
			);
			req.logger.info(() => ({
				msg: "Spam email check result",
				data: {
					emailDomain,
					isSpam,
				},
			}));
			return res.json({
				isSpam,
				emailDomain,
			});
		} catch (error) {
			req.logger.error(() => ({
				msg: "Error in check spam email handler",
				error,
			}));
			return next(
				new ProsopoApiError("API.INTERNAL_SERVER_ERROR", {
					context: { code: 500 },
					i18n: req.i18n,
					logger: req.logger,
				}),
			);
		}
	};
