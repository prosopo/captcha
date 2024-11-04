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

export const domainMiddleware = (env: ProviderEnvironment) => {
	const tasks = new Tasks(env);

	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			// Stops this middleware from running on non-api routes like /json /favicon.ico etc
			if (req.url.indexOf(ApiPrefix) === -1) {
				next();
				return;
			}

			let parsed: { dapp: string };
			try {
				parsed = DappDomainRequestBody.parse(req.body);
			} catch (err) {
				return next(siteKeyNotRegisteredError("No sitekey provided"));
			}
			const dapp = parsed.dapp;

			try {
				validateAddress(dapp, false, 42);
			} catch (err) {
				return next(siteKeyNotRegisteredError(dapp));
			}

			const clientSettings = await tasks.db.getClientRecord(dapp);
			if (!clientSettings) return next(next(siteKeyNotRegisteredError(dapp)));

			const allowedDomains = clientSettings.settings?.domains;
			if (!allowedDomains) return next(siteKeyNotRegisteredError(dapp));

			const origin = req.headers.origin;
			if (!origin) return next(siteKeyNotRegisteredError(dapp));

			for (const domain of allowedDomains) {
				if (tasks.clientTaskManager.isSubdomainOrExactMatch(origin, domain)) {
					next();
					return;
				}
			}

			return next(siteKeyNotRegisteredError(dapp));
		} catch (err) {
			console.error("Auth Middleware Error:", err);
			res.status(401).json({ error: "Unauthorized", message: err });
			return;
		}
	};
};

const siteKeyNotRegisteredError = (dapp: string) => {
	return new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
		context: { code: 400, siteKey: dapp },
	});
};
