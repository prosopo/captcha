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
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";

const hasValidAdminJwt = (
	req: Request,
	pair: KeyringPair | undefined,
	authAccount: KeyringPair | undefined,
): boolean => {
	const header = req.headers.authorization;
	if (typeof header !== "string" || !header.startsWith("Bearer ")) return false;
	const jwt: JWT = header.slice("Bearer ".length);
	try {
		return (
			authAccount?.jwtVerify(jwt).isValid === true ||
			pair?.jwtVerify(jwt).isValid === true
		);
	} catch {
		return false;
	}
};

/**
 * Parses the detector-pool push body with its large limit, but only for a
 * request that carries a valid admin JWT. This parser runs before the admin
 * auth middleware and the rate limits, so without the check anyone could make
 * the provider buffer and parse a body of up to `limit`. Other requests fall
 * through to the default, much smaller, JSON parser.
 */
export const detectorPoolBodyParser = (
	limit: string,
	pair: KeyringPair | undefined,
	authAccount: KeyringPair | undefined,
) => {
	const parse = express.json({ limit });
	return (req: Request, res: Response, next: NextFunction): void => {
		if (!hasValidAdminJwt(req, pair, authAccount)) {
			next();
			return;
		}
		parse(req, res, next);
	};
};
