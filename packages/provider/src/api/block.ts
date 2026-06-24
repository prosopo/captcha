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
import { BlacklistRequestInspector } from "./blacklistRequestInspector.js";

export const blockMiddleware = (providerEnvironment: ProviderEnvironment) => {
	// Resolve the access-rules storage lazily — in maintenance-mode startup
	// the Redis-backed storage isn't initialised, so eager resolution would
	// crash boot. We attempt resolution on the first request and fall through
	// (no-op) if storage is still unavailable.
	let blacklistRequestInspector: BlacklistRequestInspector | undefined;

	const environmentReadinessWaiter =
		providerEnvironment.isReady.bind(providerEnvironment);

	return (req: Request, res: Response, next: NextFunction) => {
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
