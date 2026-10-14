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

import { randomBytes, randomUUID } from "node:crypto";
import { u8aToHex } from "@polkadot/util";
import type { ProviderEnvironment } from "@prosopo/env";
import { generateMnemonic, getPair } from "@prosopo/keyring";
import { Tasks, getCompositeIpAddress } from "@prosopo/provider";
import {
	ApiParams,
	CaptchaType,
	ClientApiPaths,
	ClientSettingsSchema,
	type GetPowCaptchaResponse,
	type IUserSettings,
	type ServerPowCaptchaVerifyRequestBodyType,
	type Session,
	SubmitPowCaptchaSolutionBody,
	type SubmitPowCaptchaSolutionBodyType,
	Tier,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import { solvePoW } from "@prosopo/util";

export const VERIFY_CALLER_IP = "3.80.0.10";

// Fresh addresses per token, so ip lookups are only as cached as they would be
// in production: the user's own ip was seen at challenge time, the resolver's
// never was.
const randomPublicIp = (firstOctet: number): string =>
	[firstOctet, ...randomBytes(3)].join(".");

export type BenchSite = {
	siteKey: string;
	sign: (message: string) => string;
};

export const registerBenchSite = async (
	env: ProviderEnvironment,
	settings: Partial<IUserSettings>,
): Promise<BenchSite> => {
	const [mnemonic] = await generateMnemonic();
	const pair = getPair(mnemonic);
	await new Tasks(env).clientTaskManager.registerSiteKey(
		pair.address,
		Tier.Professional,
		ClientSettingsSchema.parse({
			captchaType: CaptchaType.pow,
			powDifficulty: 1,
			domains: ["localhost"],
			...settings,
		}),
	);
	return {
		siteKey: pair.address,
		sign: (message) => u8aToHex(pair.sign(message)),
	};
};

/**
 * A frictionless session as the detector would leave it before handing the
 * user a PoW challenge, so verify reads the same session shape (including a
 * DNS observation that needs enriching) as it does in production.
 */
const seedSession = async (
	env: ProviderEnvironment,
	siteKey: string,
	userIp: string,
): Promise<string> => {
	const sessionId = randomUUID();
	const session: Session = {
		sessionId,
		createdAt: new Date(),
		token: randomBytes(16).toString("hex"),
		score: 0.2,
		threshold: 0.5,
		scoreComponents: { baseScore: 0.2 },
		ipAddress: getCompositeIpAddress(userIp),
		captchaType: CaptchaType.pow,
		webView: false,
		iFrame: false,
		decryptedHeadHash: randomBytes(16).toString("hex"),
		siteKey,
		currentUrl: "https://localhost/",
		dnsEvent: {
			resolverIp: randomPublicIp(82),
			peerIp: userIp,
			pathValid: true,
			receivedAt: new Date(),
		},
	};
	await env.getDb().storeSessionRecord(session);
	return sessionId;
};

export type MintedToken = {
	token: string;
	timestamp: string;
	userIp: string;
};

const post = async <T>(
	url: string,
	headers: Record<string, string>,
	body: object,
): Promise<T> => {
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...headers },
		body: JSON.stringify(body),
	});
	const text = await response.text();
	if (!response.ok) {
		throw new Error(`${url} -> ${response.status}: ${text}`);
	}
	return JSON.parse(text) as T;
};

/** Runs the widget's half of a PoW solve against the provider and returns a token ready for verify. */
export const mintToken = async (
	env: ProviderEnvironment,
	providerUrl: string,
	site: BenchSite,
): Promise<MintedToken> => {
	const [userMnemonic, user] = await generateMnemonic();
	const userPair = getPair(userMnemonic);
	const userIp = randomPublicIp(81);
	const sessionId = await seedSession(env, site.siteKey, userIp);
	const headers = {
		Origin: "https://localhost",
		"Prosopo-Site-Key": site.siteKey,
		"Prosopo-User": user,
		"X-Forwarded-For": userIp,
	};

	const challenge = await post<GetPowCaptchaResponse>(
		`${providerUrl}${ClientApiPaths.GetPowCaptchaChallenge}`,
		headers,
		{ user, dapp: site.siteKey, sessionId },
	);
	const nonce = await solvePoW(challenge.challenge, challenge.difficulty);
	const userTimestampSignature = u8aToHex(userPair.sign(challenge.timestamp));
	const solution: SubmitPowCaptchaSolutionBodyType = {
		challenge: challenge.challenge,
		difficulty: challenge.difficulty,
		signature: {
			user: { timestamp: userTimestampSignature },
			provider: {
				challenge: challenge[ApiParams.signature][ApiParams.provider].challenge,
			},
		},
		user,
		dapp: site.siteKey,
		nonce,
	};
	await post<object>(
		`${providerUrl}${ClientApiPaths.SubmitPowCaptchaSolution}`,
		headers,
		SubmitPowCaptchaSolutionBody.parse(solution),
	);

	return {
		token: encodeProcaptchaOutput({
			user,
			dapp: site.siteKey,
			challenge: challenge.challenge,
			nonce,
			timestamp: challenge.timestamp,
			signature: {
				provider: challenge[ApiParams.signature][ApiParams.provider],
				user: { timestamp: userTimestampSignature },
			},
		}),
		timestamp: challenge.timestamp,
		userIp,
	};
};

export type VerifyOptions = {
	// Send the user's ip, as a site that passes it through to siteverify does.
	sendIp?: boolean;
	email?: string;
};

export type VerifyOutcome = {
	ms: number;
	status: number;
	verified: boolean;
	body: string;
};

export const verifyToken = async (
	providerUrl: string,
	site: BenchSite,
	minted: MintedToken,
	options: VerifyOptions,
): Promise<VerifyOutcome> => {
	const body: ServerPowCaptchaVerifyRequestBodyType = {
		token: minted.token,
		dappSignature: site.sign(minted.timestamp),
		...(options.sendIp && { ip: minted.userIp }),
		...(options.email && { email: options.email }),
	};
	const started = performance.now();
	const response = await fetch(
		`${providerUrl}${ClientApiPaths.VerifyPowCaptchaSolution}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Forwarded-For": VERIFY_CALLER_IP,
			},
			body: JSON.stringify(body),
		},
	);
	const text = await response.text();
	const ms = performance.now() - started;
	const verified =
		response.ok &&
		(JSON.parse(text) as { verified?: boolean }).verified === true;
	return { ms, status: response.status, verified, body: text };
};
