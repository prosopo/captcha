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

import type { KeyringPair } from "@prosopo/types";
import type { JWT } from "@prosopo/util-crypto";
import type { Request } from "express";

/**
 * The subject of the request's admin JWT, but only when its signature
 * verifies against one of the provider's admin keys. Claim checks such as
 * replay and audience are left to the auth middleware.
 */
export const verifiedAdminSubject = (
	req: Request,
	pair: KeyringPair | undefined,
	authAccount: KeyringPair | undefined,
): string | undefined => {
	const header = req.headers.authorization;
	if (typeof header !== "string" || !header.startsWith("Bearer ")) {
		return undefined;
	}
	const jwt: JWT = header.slice("Bearer ".length);
	for (const key of [authAccount, pair]) {
		try {
			const result = key?.jwtVerify(jwt);
			if (result?.isValid && result.payload) return result.payload.sub;
		} catch {}
	}
	return undefined;
};

/**
 * Rate-limit key for admin routes. A caller's own claims only pick the
 * counter once the token is proven to be signed by an admin key; anything
 * else counts against its IP, so a forged `sub` cannot mint fresh counters.
 */
export const adminRateLimitKey =
	(pair: KeyringPair | undefined, authAccount: KeyringPair | undefined) =>
	(req: Request): string => {
		const subject = verifiedAdminSubject(req, pair, authAccount);
		return subject !== undefined
			? `admin:${subject}`
			: `ip:${req.ip ?? "unknown"}`;
	};
