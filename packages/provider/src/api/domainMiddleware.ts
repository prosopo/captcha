// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { validateAddress } from "@polkadot/util-crypto";
import { ProsopoApiError } from "@prosopo/common";
import { ApiPrefix, DappDomainRequestBody } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { Tasks } from "../tasks/index.js";
import { handleErrors } from "./errorHandler.js";

export const domainMiddleware = (env: ProviderEnvironment) => {
	const tasks = new Tasks(env);

	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const sitekeyInParams = req.params.dapp;
			let dapp: string;
			if (sitekeyInParams) {
				dapp = sitekeyInParams;
			} else {
				let parsed: { dapp: string };
				try {
					parsed = DappDomainRequestBody.parse(req.body);
				} catch (err) {
					throw siteKeyNotRegisteredError("No sitekey provided");
				}
				dapp = parsed.dapp;
			}

			try {
				validateAddress(dapp, false, 42);
			} catch (err) {
				throw invalidSiteKeyError(dapp);
			}

			const clientSettings = await tasks.db.getClientRecord(dapp);
			if (!clientSettings) throw siteKeyNotRegisteredError(dapp);

			const allowedDomains = clientSettings.settings?.domains;
			if (!allowedDomains) return next(siteKeyNotRegisteredError(dapp));

			const origin = req.headers.origin;
			if (!origin) throw siteKeyNotRegisteredError(dapp);

			for (const domain of allowedDomains) {
				if (tasks.clientTaskManager.isSubdomainOrExactMatch(origin, domain)) {
					next();
					return;
				}
			}

			throw unauthorizedOriginError();
		} catch (err) {
			if (err instanceof ProsopoApiError) {
				handleErrors(err, req, res, next);
			} else {
				res.status(401).json({ error: "Unauthorized", message: err });
				return;
			}
		}
	};
};

const siteKeyNotRegisteredError = (dapp: string) => {
	return new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
		context: { code: 400, siteKey: dapp },
	});
};

const invalidSiteKeyError = (dapp: string) => {
	return new ProsopoApiError("API.INVALID_SITE_KEY", {
		context: { code: 400, siteKey: dapp },
	});
};

const unauthorizedOriginError = () => {
	return new ProsopoApiError("API.UNAUTHORIZED_ORIGIN_URL", {
		context: { code: 400 },
	});
};
