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
	CaptchaType,
	ClientApiPaths,
	type KeyringPair,
	SiteVerifyRequestBody,
	type VerificationResponse,
	decodeProcaptchaOutput,
} from "@prosopo/types";
import { u8aToHex } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import { summariseRequestBody } from "./requestBodySummary.js";
import { resolveTestSiteKeyVerdict } from "./testSiteKey.js";

// Deriving an sr25519 pair from a secret costs 5-14ms, and a busy site sends
// the same secret on every request. Bounded because the key is whatever the
// caller sends: an unbounded map would grow with every secret ever presented.
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
		if (leastRecentlyUsed !== undefined)
			pairsBySecret.delete(leastRecentlyUsed);
	}
	return pair;
};

// Some sites were issued their account's `//1` derivation as the secret while
// their site key is the account's root address, so the hosted siteverify
// accepts either.
const LEGACY_DERIVATION_SUFFIX = "//1";

const pairForSiteKey = (
	secret: string,
	siteKey: string,
): KeyringPair | undefined => {
	try {
		const pair = pairForSecret(secret);
		if (pair.address === siteKey) return pair;
		if (!secret.includes(LEGACY_DERIVATION_SUFFIX)) return undefined;
		const rootPair = pairForSecret(
			secret.replace(LEGACY_DERIVATION_SUFFIX, ""),
		);
		return rootPair.address === siteKey ? rootPair : undefined;
	} catch {
		return undefined;
	}
};

// Tokens minted before the captchaType field existed fall back to the old
// heuristic, as @prosopo/server does: a challenge means PoW, otherwise image.
const verifyPathFor = (
	captchaType: CaptchaType | undefined,
	challenge: string | undefined,
): ClientApiPaths => {
	switch (captchaType) {
		case CaptchaType.image:
			return ClientApiPaths.VerifyImageCaptchaSolutionDapp;
		case CaptchaType.pow:
			return ClientApiPaths.VerifyPowCaptchaSolution;
		case CaptchaType.puzzle:
			return ClientApiPaths.VerifyPuzzleCaptchaSolution;
		case CaptchaType.audio:
			return ClientApiPaths.VerifyAudioCaptchaSolution;
		case CaptchaType.iconOrder:
			return ClientApiPaths.VerifyIconOrderCaptchaSolution;
		case CaptchaType.authenticated:
			return ClientApiPaths.VerifyAuthenticatedSession;
		default:
			return challenge
				? ClientApiPaths.VerifyPowCaptchaSolution
				: ClientApiPaths.VerifyImageCaptchaSolutionDapp;
	}
};

// The same fields the hosted siteverify returns. The provider's own
// sessionId is for log correlation between Prosopo services, not for sites.
const publicVerificationResponse = (
	response: VerificationResponse,
): VerificationResponse => ({
	[ApiParams.status]: "ok",
	[ApiParams.verified]: response[ApiParams.verified],
	...(response[ApiParams.score] && {
		[ApiParams.score]: response[ApiParams.score],
	}),
	...(response[ApiParams.reason] && {
		[ApiParams.reason]: response[ApiParams.reason],
	}),
});

/**
 * Verifies a token using the site's secret key instead of a signature over it.
 *
 * Proves the caller holds the secret, signs the token's timestamp with it, then
 * hands the request on to the verify route for the token's captcha type. That
 * route does the rest exactly as for a signed request, including forwarding to
 * the issuing provider, so the secret never leaves this node.
 *
 * Must be registered on the same router as, and before, the per-type verify
 * routes: it rewrites `req.url` and calls `next()` to reach them.
 */
export const siteVerifyHandler = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const parsed = SiteVerifyRequestBody.safeParse(req.body);
	if (!parsed.success) {
		return next(
			new ProsopoError({
				code: "INVALID_REQUEST",
				errorSite: "PROV-95",
				message: "Error parsing siteverify request",
				cause: parsed.error,
				context: { body: summariseRequestBody(req) },
			}),
		);
	}
	const { token, secret, ip, email, clientSessionId, timeouts } = parsed.data;

	let decoded: ReturnType<typeof decodeProcaptchaOutput>;
	try {
		decoded = decodeProcaptchaOutput(token);
	} catch {
		const notVerified: VerificationResponse = {
			[ApiParams.status]: "ok",
			[ApiParams.verified]: false,
		};
		return res.json(notVerified);
	}
	const { dapp, timestamp, captchaType, challenge } = decoded;

	const testVerdict = resolveTestSiteKeyVerdict(dapp, req.logger);
	if (testVerdict !== null) {
		const forced: VerificationResponse = {
			[ApiParams.status]: "ok",
			[ApiParams.verified]: testVerdict,
		};
		return res.json(forced);
	}

	if (!secret) {
		return next(
			new ProsopoError({
				code: "INVALID_REQUEST",
				errorSite: "PROV-96",
				message: "Missing secret key",
				context: { siteKey: dapp },
			}),
		);
	}

	const pair = pairForSiteKey(secret, dapp);
	if (!pair) {
		return next(
			new ProsopoError({
				code: "SITE_KEY_INVALID",
				errorSite: "PROV-97",
				context: { siteKey: dapp },
			}),
		);
	}

	req.body = {
		[ApiParams.token]: token,
		[ApiParams.dappSignature]: u8aToHex(pair.sign(timestamp.toString())),
		[ApiParams.ip]: ip ?? undefined,
		[ApiParams.email]: email,
		[ApiParams.clientSessionId]: clientSessionId,
		[ApiParams.maxVerifiedTime]: timeouts?.image?.cachedTimeout,
	};

	const sendJson = res.json.bind(res);
	res.json = (body: VerificationResponse) =>
		sendJson(res.statusCode < 300 ? publicVerificationResponse(body) : body);

	req.url = verifyPathFor(captchaType, challenge);
	next();
};
