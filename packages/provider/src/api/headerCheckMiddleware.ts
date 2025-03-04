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

import { handleErrors } from "@prosopo/api-express-router";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { getJA4 } from "./ja4.js";
import { validateAddr, validiateSiteKey } from "./validateAddress.js";

export const headerCheckMiddleware = (env: ProviderEnvironment) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const user = req.headers["prosopo-user"] as string;
			const siteKey = req.headers["prosopo-site-key"] as string;

			if (!user) {
				unauthorised(res);
				return;
			}
			if (!siteKey) {
				unauthorised(res);
				return;
			}

			validiateSiteKey(siteKey);

			validateAddr(user);

			const ja4 = await getJA4(req.headers, req.logger);

			req.user = user;
			req.siteKey = siteKey;
			req.ja4 = ja4.ja4PlusFingerprint || "";

			next();
		} catch (err) {
			return handleErrors(err as Error, req, res, next);
		}
	};
};

const unauthorised = (res: Response) =>
	res.status(401).json({ error: "Unauthorized", message: "Unauthorized" });
