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

import { handleErrors } from "@prosopo/api-express-router";
import { ProsopoError, isProsopoError, toPublicError } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { decodeGoogleTranslateHost, parseUrl } from "@prosopo/util";
import { validateAddress } from "@prosopo/util-crypto";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Tasks } from "../tasks/index.js";
import { getMaintenanceMode } from "./admin/apiToggleMaintenanceModeEndpoint.js";
import { recordDomainValidation } from "./metrics.js";
import { isReservedTestSiteKey } from "./testSiteKey.js";

export const domainMiddleware = (env: ProviderEnvironment) => {
	// Resolve Tasks (and its DB handle) lazily. In maintenance-mode startup the
	// DB isn't initialised, so constructing Tasks eagerly here would call
	// env.getDb() and crash boot. Build it on the first request that actually
	// needs domain validation (i.e. once maintenance mode is off).
	let cachedTasks: Tasks | undefined;

	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			// If maintenance mode is active, skip domain validation
			if (getMaintenanceMode()) {
				req.logger.info(() => ({
					msg: "Maintenance mode active - skipping domain validation",
				}));
				next();
				return;
			}

			if (!cachedTasks) {
				cachedTasks = new Tasks(env);
			}
			const tasks = cachedTasks;

			const siteKey = req.headers["prosopo-site-key"] as string;
			if (!siteKey) throw siteKeyNotRegisteredError("No sitekey provided");

			try {
				validateAddress(siteKey, false, 42);
			} catch (err) {
				throw invalidSiteKeyError(siteKey);
			}

			// Handlers act on the site key in the body, so it must be the one
			// whose origin allowlist is checked here. Otherwise a request can
			// pass as the caller's own site while acting for another.
			const bodySiteKey = bodyDapp(req.body);
			if (bodySiteKey !== undefined && bodySiteKey !== siteKey)
				throw invalidSiteKeyError(siteKey);

			// Reserved CI test site keys have no DB record and no domain
			// allowlist; let them through so the deterministic test flow works in
			// every environment and from any origin.
			if (isReservedTestSiteKey(siteKey)) {
				recordDomainValidation("test_key");
				next();
				return;
			}

			const clientSettings = await tasks.db.getClientRecord(siteKey);
			if (!clientSettings) throw siteKeyNotRegisteredError(siteKey);

			const allowedDomains = clientSettings.settings?.domains;
			if (!allowedDomains)
				throw siteKeyInvalidDomainError(siteKey, req.hostname);

			const origin = req.headers.origin;
			if (!origin) throw unauthorizedOriginError(undefined);

			const candidateOrigins = [origin, ...googleTranslateOrigins(origin)];

			for (const candidate of candidateOrigins) {
				for (const domain of allowedDomains) {
					if (tasks.clientTaskManager.domainPatternMatcher(candidate, domain)) {
						recordDomainValidation("allowed");
						next();
						return;
					}
				}
			}

			throw unauthorizedOriginError(origin);
		} catch (err) {
			recordDomainValidation("rejected");
			if (
				isProsopoError(err) ||
				err instanceof ZodError ||
				err instanceof SyntaxError
			) {
				handleErrors(err, req, res, next);
				return;
			}
			// Anything else (a database or driver error, say) can carry
			// connection details, so it is logged rather than returned.
			req.logger.error(() => ({ err, msg: "Domain middleware error" }));
			const error = new ProsopoError({
				code: "UNAUTHORIZED",
				errorSite: "PROV-85",
				cause: err,
			});
			res
				.status(error.status)
				.json({ error: toPublicError(error, "BACKEND_ERROR") });
		}
	};
};

const bodyDapp = (body: unknown): unknown =>
	typeof body === "object" && body !== null && "dapp" in body
		? body.dapp
		: undefined;

// If the origin is a Google Translate proxy URL, return the decoded original
// origin(s) so the domain check can still match the site's allowed domains.
const googleTranslateOrigins = (origin: string): string[] => {
	try {
		const url = parseUrl(origin);
		const decodedHost = decodeGoogleTranslateHost(url.hostname);
		if (!decodedHost) return [];
		return [`${url.protocol}//${decodedHost}`];
	} catch {
		return [];
	}
};

const siteKeyNotRegisteredError = (dapp: string) => {
	return new ProsopoError({
		code: "SITE_KEY_NOT_REGISTERED",
		errorSite: "PROV-30",
		context: { siteKey: dapp },
	});
};

const invalidSiteKeyError = (siteKey: string) => {
	return new ProsopoError({
		code: "SITE_KEY_INVALID",
		errorSite: "PROV-31",
		context: { siteKey: siteKey },
	});
};

const unauthorizedOriginError = (origin?: string) => {
	return new ProsopoError({
		code: "ORIGIN_NOT_ALLOWED",
		errorSite: "PROV-32",
		context: { origin },
	});
};

const siteKeyInvalidDomainError = (dapp: string, domain: string) => {
	return new ProsopoError({
		code: "ORIGIN_NOT_ALLOWED",
		errorSite: "PROV-33",
		context: {
			message:
				"No domains are allowed for this site key. Please fix in the Procaptcha Portal",
			siteKey: dapp,
			domain,
		},
	});
};
