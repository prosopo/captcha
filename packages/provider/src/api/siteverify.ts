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
import type { Logger } from "@prosopo/logger";
import {
	ApiParams,
	type CaptchaTimeoutOutput,
	CaptchaTimeoutSchema,
	CaptchaType,
	ClientApiPaths,
	INPUT_LIMITS,
	type KeyringPair,
	type ProcaptchaOutput,
	TIMED_OUT_VERIFY_SCORE,
	type VerificationResponse,
	boundedString,
	decodeProcaptchaOutput,
} from "@prosopo/types";
import { parseInteger, u8aToHex } from "@prosopo/util";
import express, {
	type NextFunction,
	type Request,
	type RequestHandler,
	type Response,
} from "express";
import rateLimit from "express-rate-limit";
import { number, object } from "zod";
import { rateLimitHandler } from "./rateLimitHandler.js";
import { summariseRequestBody } from "./requestBodySummary.js";
import { resolveTestSiteKeyVerdict } from "./testSiteKey.js";

export const SITEVERIFY_PATH = "/siteverify";

/**
 * Self-hosted nodes have no hosted siteverify API in front of them, so they
 * can opt in to answering the same `{secret, token}` contract themselves.
 * Off by default: the hosted fleet keeps verification behind the hosted API.
 */
export const isSiteverifyEnabled = (): boolean =>
	process.env.PROSOPO_SITEVERIFY_ENABLED === "1";

// The hosted siteverify answers verified when the provider has not replied
// within 5s, so a stalled provider cannot hold a site's logins open. Sites
// integrate against that behaviour, so this endpoint keeps it.
export const SITEVERIFY_DEADLINE_MS = 5000;

// Mirrors @prosopo/server's local freshness pre-check, which a direct verify
// call would otherwise skip.
const MAX_CLOCK_SKEW_MS = 30_000;

const SiteverifyBody = object({
	[ApiParams.token]: boundedString(INPUT_LIMITS.TOKEN),
	// Optional so reserved test site keys work without one.
	[ApiParams.secret]: boundedString(INPUT_LIMITS.TEXT).optional(),
	[ApiParams.ip]: boundedString(INPUT_LIMITS.ID).nullable().optional(),
	[ApiParams.email]: boundedString(INPUT_LIMITS.EMAIL).optional(),
	[ApiParams.clientSessionId]: boundedString(INPUT_LIMITS.ID).optional(),
	[ApiParams.timeouts]: object({
		image: object({ cachedTimeout: number().positive().optional() }).optional(),
	}).optional(),
});

// Deriving an sr25519 pair costs 5-14ms and a busy site sends the same secret
// on every request. Bounded because the key is whatever the caller sends.
const MAX_CACHED_PAIRS = 256;
const pairsBySecret = new Map<string, KeyringPair>();

const pairForSecret = (secret: string): KeyringPair => {
	const cached = pairsBySecret.get(secret);
	if (cached) {
		pairsBySecret.delete(secret);
		pairsBySecret.set(secret, cached);
		return cached;
	}
	const pair = getPair(secret);
	pairsBySecret.set(secret, pair);
	if (pairsBySecret.size > MAX_CACHED_PAIRS) {
		const leastRecentlyUsed = pairsBySecret.keys().next().value;
		if (leastRecentlyUsed !== undefined) {
			pairsBySecret.delete(leastRecentlyUsed);
		}
	}
	return pair;
};

// Some sites were issued their account's `//1` derivation as the secret while
// their site key is the account's root address; the hosted siteverify accepts
// either, so this does too.
const LEGACY_DERIVATION_SUFFIX = "//1";

const pairForSiteKey = (
	secret: string,
	siteKey: string,
): KeyringPair | undefined => {
	try {
		const pair = pairForSecret(secret);
		if (pair.address === siteKey) return pair;
		if (!secret.endsWith(LEGACY_DERIVATION_SUFFIX)) return undefined;
		const rootPair = pairForSecret(
			secret.slice(0, -LEGACY_DERIVATION_SUFFIX.length),
		);
		return rootPair.address === siteKey ? rootPair : undefined;
	} catch {
		return undefined;
	}
};

type VerifyTarget = { path: ClientApiPaths; cachedTimeout: number };

// Same dispatch as @prosopo/server's verifyProvider, including the legacy
// heuristic for tokens minted before they declared a captchaType.
const resolveVerifyTarget = (
	decoded: ProcaptchaOutput,
	timeouts: CaptchaTimeoutOutput,
): VerifyTarget => {
	const { captchaType, challenge } = decoded;
	switch (captchaType) {
		case CaptchaType.image:
			return {
				path: ClientApiPaths.VerifyImageCaptchaSolutionDapp,
				cachedTimeout: timeouts.image.cachedTimeout,
			};
		case CaptchaType.pow:
			return {
				path: ClientApiPaths.VerifyPowCaptchaSolution,
				cachedTimeout: timeouts.pow.cachedTimeout,
			};
		case CaptchaType.puzzle:
			return {
				path: ClientApiPaths.VerifyPuzzleCaptchaSolution,
				cachedTimeout: timeouts.puzzle.cachedTimeout,
			};
		case CaptchaType.audio:
			return {
				path: ClientApiPaths.VerifyAudioCaptchaSolution,
				cachedTimeout: timeouts.audio.cachedTimeout,
			};
		case CaptchaType.iconOrder:
			return {
				path: ClientApiPaths.VerifyIconOrderCaptchaSolution,
				cachedTimeout: timeouts.iconOrder.cachedTimeout,
			};
		case CaptchaType.authenticated:
			return {
				path: ClientApiPaths.VerifyAuthenticatedSession,
				cachedTimeout: timeouts.pow.cachedTimeout,
			};
		default:
			return challenge
				? {
						path: ClientApiPaths.VerifyPowCaptchaSolution,
						cachedTimeout: timeouts.pow.cachedTimeout,
					}
				: {
						path: ClientApiPaths.VerifyImageCaptchaSolutionDapp,
						cachedTimeout: timeouts.image.cachedTimeout,
					};
	}
};

const isRecent = (timestamp: number, timeoutMs: number): boolean => {
	const age = Date.now() - timestamp;
	return age >= -MAX_CLOCK_SKEW_MS && age < timeoutMs;
};

const answer = (verified: boolean): VerificationResponse => ({
	[ApiParams.status]: "ok",
	[ApiParams.verified]: verified,
});

// The fields the hosted siteverify returns. The provider's own sessionId and
// translated status are for Prosopo's services, not for sites.
const publicVerificationResponse = (
	response: VerificationResponse,
): VerificationResponse => ({
	...answer(response[ApiParams.verified]),
	...(response[ApiParams.score] !== undefined && {
		[ApiParams.score]: response[ApiParams.score],
	}),
	...(response[ApiParams.reason] && {
		[ApiParams.reason]: response[ApiParams.reason],
	}),
});

const siteverifyHandler =
	(defaultTimeouts: CaptchaTimeoutOutput) =>
	(req: Request, res: Response, next: NextFunction) => {
		const parsed = SiteverifyBody.safeParse(req.body);
		if (!parsed.success) {
			return next(
				new ProsopoError({
					code: "INVALID_REQUEST",
					errorSite: "PROV-99",
					message: "Error parsing siteverify request",
					cause: parsed.error,
					context: { body: summariseRequestBody(req) },
				}),
			);
		}
		const { token, secret, ip, email, clientSessionId, timeouts } = parsed.data;

		// The hosted siteverify answers an unreadable token as not verified.
		let decoded: ProcaptchaOutput;
		try {
			decoded = decodeProcaptchaOutput(token);
		} catch {
			return res.json(answer(false));
		}

		const testVerdict = resolveTestSiteKeyVerdict(decoded.dapp, req.logger);
		if (testVerdict !== null) {
			return res.json(answer(testVerdict));
		}

		if (!secret) {
			return next(
				new ProsopoError({
					code: "INVALID_REQUEST",
					errorSite: "PROV-100",
					message: "Missing secret key",
					context: { siteKey: decoded.dapp },
				}),
			);
		}

		const pair = pairForSiteKey(secret, decoded.dapp);
		if (!pair) {
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
		if (!timestamp.ok) {
			return res.json(answer(false));
		}

		const target = resolveVerifyTarget(decoded, defaultTimeouts);
		const cachedTimeout =
			target.path === ClientApiPaths.VerifyImageCaptchaSolutionDapp
				? (timeouts?.image?.cachedTimeout ?? target.cachedTimeout)
				: target.cachedTimeout;
		if (!isRecent(timestamp.value, cachedTimeout)) {
			return res.json(answer(false));
		}

		req.body = {
			[ApiParams.token]: token,
			[ApiParams.dappSignature]: u8aToHex(pair.sign(decoded.timestamp)),
			[ApiParams.ip]: ip ?? undefined,
			[ApiParams.email]: email,
			[ApiParams.clientSessionId]: clientSessionId,
			...(target.path === ClientApiPaths.VerifyImageCaptchaSolutionDapp && {
				[ApiParams.maxVerifiedTime]: cachedTimeout,
			}),
		};

		const sendJson = res.json.bind(res);
		let answered = false;
		const answerOnce = (body: VerificationResponse): Response => {
			if (answered) return res;
			answered = true;
			clearTimeout(deadline);
			return sendJson(body);
		};
		res.json = (body: VerificationResponse) =>
			answerOnce(
				res.statusCode < 300 ? publicVerificationResponse(body) : body,
			);

		const deadline = setTimeout(() => {
			req.logger.error(() => ({
				msg: "siteverify timed out, answering verified",
				data: { siteKey: decoded.dapp, deadlineMs: SITEVERIFY_DEADLINE_MS },
			}));
			res.status(200);
			answerOnce({
				...answer(true),
				[ApiParams.score]: TIMED_OUT_VERIFY_SCORE,
				[ApiParams.timedOut]: true,
			});
		}, SITEVERIFY_DEADLINE_MS);
		res.on("close", () => clearTimeout(deadline));

		req.url = target.path;
		return next();
	};

/**
 * `POST /siteverify` with `{token, secret, ip?, email?, clientSessionId?}`,
 * answering exactly as the hosted siteverify API does. The secret is the site
 * key's private key: it is checked against the token's site key, used to sign
 * the token's timestamp, and the request is then handed to the ordinary verify
 * route for the token's captcha type, so every check those routes make still
 * applies, including forwarding to the issuing provider.
 *
 * Must be registered ahead of the verify routes in the same router: it
 * rewrites `req.url` and calls `next()` to dispatch to them.
 */
export const siteverifyHandlers = (): RequestHandler[] => [
	express.urlencoded({ extended: false, limit: "1mb" }),
	siteverifyHandler(CaptchaTimeoutSchema.parse(undefined)),
];

const SITEVERIFY_DEFAULT_WINDOW_MS = 60_000;
const SITEVERIFY_DEFAULT_LIMIT = 15_000;

const positiveIntegerFromEnv = (name: string, fallback: number): number => {
	const parsed = parseInteger(process.env[name], { min: 1 });
	return parsed.ok ? parsed.value : fallback;
};

/**
 * Keyed on the `Prosopo-Site-Key` header when present, as the PoW and image
 * verify routes are, so sites behind a shared egress IP are not limited as one
 * caller; otherwise on the caller's IP.
 */
export const siteverifyRateLimit = (logger: Logger): RequestHandler =>
	rateLimit({
		windowMs: positiveIntegerFromEnv(
			"PROSOPO_SITE_VERIFY_WINDOW",
			SITEVERIFY_DEFAULT_WINDOW_MS,
		),
		limit: positiveIntegerFromEnv(
			"PROSOPO_SITE_VERIFY_LIMIT",
			SITEVERIFY_DEFAULT_LIMIT,
		),
		handler: rateLimitHandler(logger, SITEVERIFY_PATH),
		keyGenerator: (req) => {
			const siteKey = req.headers["prosopo-site-key"];
			return (typeof siteKey === "string" && siteKey) || req.ip || "unknown";
		},
	});
