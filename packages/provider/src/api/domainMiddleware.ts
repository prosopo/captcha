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
import { ProviderApi } from "@prosopo/api";
import { ProsopoApiError } from "@prosopo/common";
import { ApiPrefix, DappDomainRequestBody } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Tasks } from "../tasks/index.js";
import { handleErrors } from "./errorHandler.js";

export const domainMiddleware = (env: ProviderEnvironment) => {
	const tasks = new Tasks(env);

	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const dapp = req.headers[",prosopo-site-key"] as string;
			if (!dapp) throw siteKeyNotRegisteredError("No sitekey provided");

			try {
				validateAddress(dapp, false, 42);
			} catch (err) {
				throw invalidSiteKeyError(dapp);
			}

			const clientSettings = await tasks.db.getClientRecord(dapp);
			if (!clientSettings) throw siteKeyNotRegisteredError(dapp);

			const allowedDomains = clientSettings.settings?.domains;
			if (!allowedDomains) throw siteKeyInvalidDomainError(dapp);

			const origin = req.headers.origin;
			if (!origin) throw unauthorizedOriginError();

			for (const domain of allowedDomains) {
				if (tasks.clientTaskManager.isSubdomainOrExactMatch(origin, domain)) {
					next();
					return;
				}
			}

			throw unauthorizedOriginError();
		} catch (err) {
			if (
				err instanceof ProsopoApiError ||
				err instanceof ZodError ||
				err instanceof SyntaxError
			) {
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

const siteKeyInvalidDomainError = (dapp: string) => {
	return new ProsopoApiError("API.UNAUTHORIZED_ORIGIN_URL", {
		context: {
			code: 400,
			message:
				"No domains are allowed for this site key. Please fix in the Procaptcha Portal",
			siteKey: dapp,
		},
	});
};
