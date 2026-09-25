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

import { hexToU8a } from "@polkadot/util";
import { ProsopoApiError, ProsopoBaseError } from "@prosopo/common";
import type { TranslationKey } from "@prosopo/locale";
import type { ApiJsonError, KeyringPair } from "@prosopo/types";
import type { JWT } from "@prosopo/util-crypto";
import type { NextFunction, Request, Response } from "express";

export const authMiddleware = (
	pair: KeyringPair | undefined,
	authAccount?: KeyringPair | undefined,
) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const jwt = extractJWT(req);

			if (authAccount?.jwtVerify(jwt).isValid) {
				next();
				return;
			}

			if (pair?.jwtVerify(jwt).isValid) {
				next();
				return;
			}

			unauthorized(req, res, "API.UNAUTHORIZED");
			return;
		} catch (err) {
			req.logger.error(() => ({ err, msg: "Auth Middleware Error" }));
			// The thrown value can carry request context, stack or config, so
			// only its translation key goes back to the caller.
			unauthorized(
				req,
				res,
				(err instanceof ProsopoBaseError && err.translationKey) ||
					"API.UNAUTHORIZED",
			);
			return;
		}
	};
};

const unauthorized = (
	req: Request,
	res: Response,
	key: TranslationKey,
): void => {
	const body: { error: ApiJsonError } = {
		error: {
			code: 401,
			key,
			message: req.i18n ? req.i18n.t(key) : key,
		},
	};
	res.status(401).json(body);
};

const extractJWT = (req: Request) => {
	const authHeader = req.headers.Authorization || req.headers.authorization;

	if (!authHeader || typeof authHeader !== "string") {
		throw new ProsopoApiError("GENERAL.MISSING_AUTH_HEADER", {
			context: { error: "Missing Authorization header", code: 401 },
		});
	}

	const jwt = authHeader.replace("Bearer ", "");

	if (!jwt) {
		throw new ProsopoApiError("GENERAL.INVALID_JWT", {
			context: { error: "Missing JWT", code: 400 },
		});
	}

	return jwt as JWT;
};

export const verifySignature = (
	signature: string,
	message: string,
	pair: KeyringPair,
) => {
	const u8Sig = hexToU8a(signature);

	if (!pair.verify(message, u8Sig, pair.publicKey)) {
		throw new ProsopoApiError("GENERAL.INVALID_SIGNATURE", {
			context: {
				error: "Signature verification failed",
				code: 401,
				account: pair.address,
				message,
				signature,
			},
		});
	}
};
