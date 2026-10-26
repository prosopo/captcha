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

import { handleErrors, sendProsopoError } from "@prosopo/api-express-router";
import { ProsopoError } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { validateAddr, validateSiteKey } from "./validateAddress.js";

export const headerCheckMiddleware = (env: ProviderEnvironment) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const user = req.headers["prosopo-user"] as string;
			const siteKey = req.headers["prosopo-site-key"] as string;

			if (!user) {
				sendProsopoError(
					res,
					new ProsopoError({
						code: "UNAUTHORIZED",
						errorSite: "PROV-86",
						message: "Missing prosopo-user header",
					}),
				);
				return;
			}
			if (!siteKey) {
				sendProsopoError(
					res,
					new ProsopoError({
						code: "UNAUTHORIZED",
						errorSite: "PROV-87",
						message: "Missing prosopo-site-key header",
					}),
				);
				return;
			}

			validateSiteKey(siteKey);

			validateAddr(user);

			req.user = user;
			req.siteKey = siteKey;

			// Attach site key and user to the request logger
			req.logger = req.logger.with(
				{
					user,
					siteKey,
				},
				"header-check",
			);

			next();
		} catch (err) {
			return handleErrors(err as Error, req, res, next);
		}
	};
};
