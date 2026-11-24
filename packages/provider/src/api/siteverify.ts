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

import { ProsopoError } from "@prosopo/common";
import { getPair } from "@prosopo/keyring";
import {
	ApiParams,
	type CaptchaTimeoutOutput,
	CaptchaTimeoutSchema,
	CaptchaType,
	ClientApiPaths,
	type KeyringPair,
	type ProcaptchaOutput,
	type VerificationResponse,
	decodeProcaptchaOutput,
	isChallengeCaptchaType,
} from "@prosopo/types";
import { parseInteger, u8aToHex } from "@prosopo/util";
import express, {
	type NextFunction,
	type Request,
	type RequestHandler,
	type Response,
} from "express";
import { object, string } from "zod";

export const SITEVERIFY_PATH = "/siteverify";

/**
 * Self-hosted nodes have no hosted siteverify API in front of them, so they
 * can opt in to answering the same `{secret, token}` contract themselves.
 * Off by default: the hosted fleet keeps verification behind the hosted API.
 */
export const isSiteverifyEnabled = (): boolean =>
	process.env.PROSOPO_SITEVERIFY_ENABLED === "1";

// Mirrors @prosopo/server's local freshness pre-check, which a direct verify
// call would otherwise skip.
const MAX_CLOCK_SKEW_MS = 30_000;

const SiteverifyBody = object({
	[ApiParams.token]: string().min(1),
	secret: string().min(1),
	[ApiParams.ip]: string().optional(),
	[ApiParams.email]: string().optional(),
	[ApiParams.clientSessionId]: string().optional(),
});

const VERIFY_PATHS: Record<
	| CaptchaType.image
	| CaptchaType.pow
	| CaptchaType.puzzle
	| CaptchaType.audio
	| CaptchaType.iconOrder
	| CaptchaType.authenticated,
	ClientApiPaths
> = {
	[CaptchaType.image]: ClientApiPaths.VerifyImageCaptchaSolutionDapp,
	[CaptchaType.pow]: ClientApiPaths.VerifyPowCaptchaSolution,
	[CaptchaType.puzzle]: ClientApiPaths.VerifyPuzzleCaptchaSolution,
	[CaptchaType.audio]: ClientApiPaths.VerifyAudioCaptchaSolution,
	[CaptchaType.iconOrder]: ClientApiPaths.VerifyIconOrderCaptchaSolution,
	[CaptchaType.authenticated]: ClientApiPaths.VerifyAuthenticatedSession,
};

type VerifyTarget = { path: ClientApiPaths; cachedTimeout: number };

// Same dispatch as @prosopo/server's verifyProvider, including the legacy
// heuristic for tokens minted before they declared a captchaType.
const resolveVerifyTarget = (
	decoded: ProcaptchaOutput,
	timeouts: CaptchaTimeoutOutput,
): VerifyTarget => {
	const { captchaType, challenge } = decoded;
	if (isChallengeCaptchaType(captchaType)) {
		return {
			path: VERIFY_PATHS[captchaType],
			cachedTimeout: timeouts[captchaType].cachedTimeout,
		};
	}
	if (captchaType === CaptchaType.authenticated) {
		return {
			path: VERIFY_PATHS[CaptchaType.authenticated],
			cachedTimeout: timeouts.pow.cachedTimeout,
		};
	}
	return challenge
		? {
				path: VERIFY_PATHS[CaptchaType.pow],
				cachedTimeout: timeouts.pow.cachedTimeout,
			}
		: {
				path: VERIFY_PATHS[CaptchaType.image],
				cachedTimeout: timeouts.image.cachedTimeout,
			};
};

const isRecent = (timestamp: number, timeoutMs: number): boolean => {
	const age = Date.now() - timestamp;
	return age >= -MAX_CLOCK_SKEW_MS && age < timeoutMs;
};

const pairFromSecret = (secret: string): KeyringPair | undefined => {
	try {
		return getPair(secret);
	} catch {
		return undefined;
	}
};

const signTimestamp = (
	pair: KeyringPair,
	timestamp: string,
): string | undefined => {
	try {
		return u8aToHex(pair.sign(timestamp));
	} catch {
		return undefined;
	}
};

/**
 * `POST /siteverify` with `{token, secret, ip?, email?, clientSessionId?}`,
 * answering `{status, verified, ...}` exactly as the hosted siteverify API
 * does. The secret is the site key's private key: it is checked against the
 * token's site key, used to sign the token's timestamp, and the request is
 * then handed to the ordinary verify route for the token's captcha type, so
 * every check those routes make still applies.
 *
 * Must be registered ahead of the verify routes in the same router: it
 * rewrites `req.url` and calls `next()` to dispatch to them.
 */
export const siteverifyHandlers = (): RequestHandler[] => {
	const timeouts = CaptchaTimeoutSchema.parse(undefined);

	const handler = (req: Request, res: Response, next: NextFunction) => {
		const parsed = SiteverifyBody.safeParse(req.body);
		if (!parsed.success) {
			return next(
				new ProsopoError({
					code: "INVALID_REQUEST",
					errorSite: "PROV-99",
					message: "token and secret are required",
					cause: parsed.error,
				}),
			);
		}
		const { token, secret, ip, email, clientSessionId } = parsed.data;

		let decoded: ProcaptchaOutput;
		try {
			decoded = decodeProcaptchaOutput(token);
		} catch (error) {
			return next(
				new ProsopoError({
					code: "INVALID_REQUEST",
					errorSite: "PROV-100",
					message: "Error parsing captcha",
					cause: error,
				}),
			);
		}

		const pair = pairFromSecret(secret);
		if (!pair || pair.address !== decoded.dapp) {
			return next(
				new ProsopoError({
					code: "SITE_KEY_INVALID",
					errorSite: "PROV-101",
					message: "Secret does not belong to the token's site key",
					context: { siteKey: decoded.dapp },
				}),
			);
		}

		const timestamp = parseInteger(decoded.timestamp, { min: 0 });
		const dappSignature = timestamp.ok
			? signTimestamp(pair, decoded.timestamp)
			: undefined;
		if (!timestamp.ok || !dappSignature) {
			return next(
				new ProsopoError({
					code: "INVALID_REQUEST",
					errorSite: "PROV-102",
					message: "Error parsing captcha",
				}),
			);
		}

		const target = resolveVerifyTarget(decoded, timeouts);
		if (!isRecent(timestamp.value, target.cachedTimeout)) {
			const expired: VerificationResponse = {
				status: req.i18n.t("API.USER_NOT_VERIFIED_TIME_EXPIRED"),
				[ApiParams.verified]: false,
			};
			return res.json(expired);
		}

		req.body = {
			[ApiParams.token]: token,
			[ApiParams.dappSignature]: dappSignature,
			[ApiParams.ip]: ip,
			[ApiParams.email]: email,
			[ApiParams.clientSessionId]: clientSessionId,
			...(target.path === ClientApiPaths.VerifyImageCaptchaSolutionDapp
				? { [ApiParams.maxVerifiedTime]: target.cachedTimeout }
				: {}),
		};
		req.url = target.path;
		return next();
	};

	return [express.urlencoded({ extended: false, limit: "1mb" }), handler];
};
