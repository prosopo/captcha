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

import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { getMaintenanceMode } from "./admin/apiToggleMaintenanceModeEndpoint.js";
import { BlacklistRequestInspector } from "./blacklistRequestInspector.js";
import { isReservedTestSiteKey } from "./testSiteKey.js";

// The client routes this middleware guards carry the site key in the
// `prosopo-site-key` header (the verify routes, which read it from the body,
// are mounted ahead of the blocking middlewares and never reach here).
const isReservedTestSiteKeyRequest = (req: Request): boolean => {
	// `headers` is optional-chained rather than assumed: this runs on every
	// request ahead of the blocklist, so a malformed request must fall
	// through to the blocklist rather than throw past it.
	const siteKey = req.headers?.["prosopo-site-key"];
	return typeof siteKey === "string" && isReservedTestSiteKey(siteKey);
};

export const blockMiddleware = (providerEnvironment: ProviderEnvironment) => {
	// Resolve the access-rules storage lazily — in maintenance-mode startup
	// the Redis-backed storage isn't initialised, so eager resolution would
	// crash boot. We attempt resolution on the first request and fall through
	// (no-op) if storage is still unavailable.
	let blacklistRequestInspector: BlacklistRequestInspector | undefined;

	const environmentReadinessWaiter =
		providerEnvironment.isReady.bind(providerEnvironment);

	return (req: Request, res: Response, next: NextFunction) => {
		// In maintenance mode the captcha path short-circuits to a pass and the
		// access-rules store (Redis) may be unavailable — skip the blocklist
		// check so a slow or down store can't gate requests. env.getDb() now
		// returns a handle during maintenance (so the admin endpoints work), so
		// this explicit guard — not a thrown getDb() — is what keeps the
		// blocklist check off the hot path.
		if (getMaintenanceMode()) {
			return next();
		}
		// Reserved CI test site keys skip the blocklist. This middleware runs
		// ahead of domainMiddleware and decides purely on IP/JA4/ASN, so it
		// never sees a site key — which means CI running on shared cloud
		// runners gets caught by rules aimed at the bot operators who scrape
		// from those same ranges. Without this, a reserved key cannot make a
		// test suite deterministic, because the request is refused before any
		// site-key logic runs.
		//
		// The exemption is deliberately narrow: it only skips access-rule
		// evaluation. These keys already force a deterministic verdict and
		// their tokens are bound to the reserved key, so a caller cannot use
		// one to clear a captcha on a site protected by a real key.
		//
		// Trade-off, stated plainly: the site key is client-supplied, so an
		// abusive caller can set this header to opt out of IP/JA4/ASN
		// blocking. That is an abuse-shedding bypass, not an authentication
		// bypass — it buys unblocked access to the reserved key's own
		// always-pass flow and nothing else. If the load-shedding property
		// matters more than deterministic CI, gate this on an env flag and
		// enable it only where CI runs.
		if (isReservedTestSiteKeyRequest(req)) {
			return next();
		}
		if (!blacklistRequestInspector) {
			try {
				const db = providerEnvironment.getDb();
				const userAccessRulesStorage = db.getUserAccessRulesStorage();
				blacklistRequestInspector = new BlacklistRequestInspector(
					userAccessRulesStorage,
					environmentReadinessWaiter,
					db,
				);
			} catch {
				// Storage still not ready — skip the blocklist check this hop.
				return next();
			}
		}
		return blacklistRequestInspector.abortRequestForBlockedUsers(
			req,
			res,
			next,
		);
	};
};
