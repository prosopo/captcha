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
import type { Request, RequestHandler } from "express";
import rateLimit, { type Options } from "express-rate-limit";

const ipKey = (req: Request): string => `ip:${req.ip ?? "unknown"}`;

const bearerToken = (req: Request): JWT | undefined => {
	const header = req.headers.authorization;
	if (typeof header !== "string") return undefined;
	const token = header.replace("Bearer ", "");
	return token.length > 0 ? token : undefined;
};

/**
 * Admin limits are per admin account so admin callers behind one IP don't
 * share a budget. The account comes from a token whose signature checks out
 * against one of the admin keys; anything else is limited by IP, because an
 * unverified `sub` can be rotated freely to get a fresh budget each time.
 */
export const adminRateLimitKey =
	(keys: ReadonlyArray<KeyringPair | undefined>) =>
	(req: Request): string => {
		const token = bearerToken(req);
		if (!token) return ipKey(req);
		for (const key of keys) {
			if (!key) continue;
			try {
				const result = key.jwtVerify(token);
				if (result.isValid && result.payload) {
					return `admin:${result.payload.sub}`;
				}
			} catch {
				// Malformed token: limited by IP below.
			}
		}
		return ipKey(req);
	};

/** Headroom for many sites verifying from one shared egress IP. */
export const DEFAULT_VERIFY_IP_LIMIT_MULTIPLIER = 2;

/**
 * Verify limits. The per-site-key budget stays so that sites verifying from
 * shared serverless egress IPs are not limited by each other. The site key
 * header is not authenticated at this point, so a second limiter per IP stops
 * one caller from rotating the header to get unlimited verifies.
 */
export const verifyRateLimiters = (
	limit: { windowMs: number; limit: number },
	handler: Options["handler"],
	ipMultiplier: number = DEFAULT_VERIFY_IP_LIMIT_MULTIPLIER,
): RequestHandler[] => [
	rateLimit({
		...limit,
		limit: limit.limit * ipMultiplier,
		handler,
		keyGenerator: ipKey,
	}),
	rateLimit({
		...limit,
		handler,
		keyGenerator: (req: Request): string => {
			const siteKey = req.headers["prosopo-site-key"];
			return typeof siteKey === "string" && siteKey.length > 0
				? `site:${siteKey}`
				: ipKey(req);
		},
	}),
];
