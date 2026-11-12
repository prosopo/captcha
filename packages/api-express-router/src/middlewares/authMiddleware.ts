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
import { ProsopoError, isProsopoError, toPublicError } from "@prosopo/common";
import type { ApiJsonError, KeyringPair } from "@prosopo/types";
import {
	type JWT,
	type JWTVerifyOptions,
	type JWTVerifyResult,
	JWT_LIFETIME_EXCEEDED_ERROR,
} from "@prosopo/util-crypto";
import type { NextFunction, Request, Response } from "express";
import type { JwtReplayGuard } from "./jwtReplayGuard.js";

export type AuthMiddlewareOptions = {
	/** Claim checks (audience, maximum lifetime) applied to every token. */
	verify?: JWTVerifyOptions;
	/**
	 * Makes a token that carries a `jti` single-use. Tokens without `jti` are
	 * unaffected, so existing issuers keep working until they add one.
	 */
	replayGuard?: JwtReplayGuard;
};

type Verification = { key: KeyringPair; result: JWTVerifyResult };

const verifyWith = (
	keys: (KeyringPair | undefined)[],
	jwt: JWT,
	options: AuthMiddlewareOptions,
): { verified?: JWTVerifyResult; rejections: Verification[] } => {
	const rejections: Verification[] = [];
	for (const key of keys) {
		if (!key) continue;
		const result = key.jwtVerify(jwt, options.verify);
		if (result.isValid) return { verified: result, rejections };
		rejections.push({ key, result });
	}
	return { rejections };
};

// A correctly signed token that outlives the lifetime cap can never pass, so
// it is a caller misconfiguration rather than a bad credential. Re-verifying
// without the cap confirms the signature before anything from the token is
// logged; the subject must then be one of our own keys, which bounds the set.
const subjectsWarnedForLifetime = new Set<string>();

const warnOnOverlongLifetime = (
	req: Request,
	jwt: JWT,
	rejections: Verification[],
	verify: JWTVerifyOptions | undefined,
): void => {
	const maxLifetimeSeconds = verify?.maxLifetimeSeconds;
	if (maxLifetimeSeconds === undefined) return;
	for (const { key, result } of rejections) {
		if (result.error !== JWT_LIFETIME_EXCEEDED_ERROR) continue;
		const uncapped = key.jwtVerify(jwt, {
			...verify,
			maxLifetimeSeconds: undefined,
		});
		const payload = uncapped.payload;
		if (!uncapped.isValid || !payload) continue;
		if (subjectsWarnedForLifetime.has(payload.sub)) return;
		subjectsWarnedForLifetime.add(payload.sub);
		req.logger.warn(() => ({
			msg: "Rejected a correctly signed token whose lifetime exceeds the maximum",
			data: {
				sub: payload.sub,
				lifetimeSeconds: payload.exp - payload.iat,
				maxLifetimeSeconds,
			},
		}));
		return;
	}
};

const isReplay = (
	result: JWTVerifyResult,
	options: AuthMiddlewareOptions,
): boolean => {
	const payload = result.payload;
	if (!options.replayGuard || !payload || typeof payload.jti !== "string") {
		return false;
	}
	return !options.replayGuard.claim(
		`${payload.sub}:${payload.jti}`,
		payload.exp,
	);
};

export const authMiddleware = ({
	pair,
	authAccount,
	options = {},
}: {
	pair: KeyringPair | undefined;
	authAccount?: KeyringPair;
	options?: AuthMiddlewareOptions;
}) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const jwt = extractJWT(req);

			const { verified, rejections } = verifyWith(
				[authAccount, pair],
				jwt,
				options,
			);

			if (verified && !isReplay(verified, options)) {
				next();
				return;
			}

			warnOnOverlongLifetime(req, jwt, rejections, options.verify);
			unauthorized(res);
			return;
		} catch (err) {
			req.logger.debug(() => ({ err, msg: "Auth Middleware Error" }));
			unauthorized(res, err);
			return;
		}
	};
};

// The thrown value can carry request context, stack or config, so anything
// but an UNAUTHORIZED error is reported as a plain UNAUTHORIZED.
const unauthorized = (res: Response, cause?: unknown): void => {
	const error = isProsopoError(cause, "UNAUTHORIZED")
		? cause
		: new ProsopoError({ code: "UNAUTHORIZED", errorSite: "APIX-8", cause });
	const body: { error: ApiJsonError } = {
		error: toPublicError(error, "BACKEND_ERROR"),
	};
	res.status(error.status).json(body);
};

const extractJWT = (req: Request) => {
	const authHeader = req.headers.Authorization || req.headers.authorization;

	if (!authHeader || typeof authHeader !== "string") {
		throw new ProsopoError({
			code: "UNAUTHORIZED",
			errorSite: "APIX-3",
			message: "Missing authorization header",
			context: { error: "Missing Authorization header" },
		});
	}

	const jwt = authHeader.replace("Bearer ", "");

	if (!jwt) {
		throw new ProsopoError({
			code: "UNAUTHORIZED",
			errorSite: "APIX-4",
			message: "Invalid JWT",
			context: { error: "Missing JWT" },
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
		throw new ProsopoError({
			code: "UNAUTHORIZED",
			errorSite: "APIX-5",
			message: "Invalid signature",
			context: {
				error: "Signature verification failed",
				account: pair.address,
				message,
				signature,
			},
		});
	}
};
