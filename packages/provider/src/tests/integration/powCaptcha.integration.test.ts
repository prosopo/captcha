// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { sha256 } from "@noble/hashes/sha256";
import { u8aToHex } from "@polkadot/util/u8a";
import { generateMnemonic, getPairAsync } from "@prosopo/keyring";
import {
	ApiParams,
	CaptchaType,
	ClientApiPaths,
	type GetPowCaptchaChallengeRequestBodyType,
	type GetPowCaptchaResponse,
	type PowCaptchaSolutionResponse,
	type SubmitPowCaptchaSolutionBodyType,
} from "@prosopo/types";
import fetch from "node-fetch";
import { beforeAll, describe, expect, it } from "vitest";
import {
	dummyDappAccount,
	dummyUserAccount,
} from "./mocks/solvedTestCaptchas.js";
import { registerSiteKey } from "./registerSitekey.js";

// Define the endpoint path and base URL
const baseUrl = "http://localhost:9229";
const getPowCaptchaChallengePath = ClientApiPaths.GetPowCaptchaChallenge;
const dappAccount = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const userAccount = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

const bufferToHex = (buffer: Uint8Array): string =>
	Array.from(buffer)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");

// PoW Captcha Solver
const solvePoW = (data: string, difficulty: number): number => {
	let nonce = 0;
	const prefix = "0".repeat(difficulty);

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const message = new TextEncoder().encode(nonce + data);
		const hashHex = bufferToHex(sha256(message));

		if (hashHex.startsWith(prefix)) {
			return nonce;
		}

		nonce += 1;
	}
};

// PoW Captcha Incorrect Solver - avoids slim chance of accidental correct solution
const failPoW = (data: string, difficulty: number): number => {
	let nonce = 0;
	const prefix = "0".repeat(difficulty);

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const message = new TextEncoder().encode(nonce + data);
		const hashHex = bufferToHex(sha256(message));

		if (!hashHex.startsWith(prefix)) {
			return nonce;
		}

		nonce += 1;
	}
};

describe("PoW Integration Tests", () => {
	describe("GetPowCaptchaChallenge", () => {
		beforeAll(async () => {
			await registerSiteKey(dappAccount, CaptchaType.pow);
		});

		it("should supply a PoW challenge to a Dapp User", async () => {
			const origin = "http://localhost";
			const body: GetPowCaptchaChallengeRequestBodyType = {
				user: userAccount,
				dapp: dappAccount,
			};
			const response = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
				method: "POST",
				headers: {
					Connection: "close",
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": dappAccount,
					"Prosopo-User": userAccount,
				},
				body: JSON.stringify(body),
			});

			expect(response.status).toBe(200);

			const data = await response.json();

			console.log("\n ---- \n data \n ---- \n", data);

			expect(data).toHaveProperty("challenge");
			expect(data).toHaveProperty("difficulty");
			expect(data).toHaveProperty("signature");
		});

		it("should return an error if origin header is not provided", async () => {
			const response = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
				method: "POST",
				headers: {
					Connection: "close",
					"Content-Type": "application/json",
					"Prosopo-Site-Key": dappAccount,
					"Prosopo-User": userAccount,
				},
				body: JSON.stringify({ user: userAccount, dapp: dappAccount }),
			});

			expect(response.status).toBe(400);
		});

		it("should return an error if origin header is not valid", async () => {
			const origin = "http://notallowed.com";
			const response = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
				method: "POST",
				headers: {
					Connection: "close",
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": dappAccount,
					"Prosopo-User": userAccount,
				},
				body: JSON.stringify({ user: userAccount, dapp: dappAccount }),
			});

			expect(response.status).toBe(400);
			expect(response.statusText).toBe("Bad Request");
		});
	});
	describe("SubmitPowCaptchaSolution", () => {
		it("should verify a correctly completed PoW captcha as true", async () => {
			const userPair = await getPairAsync(
				dummyUserAccount.seed,
				undefined,
				"sr25519",
				42,
			);
			const dappPair = await getPairAsync(
				dummyDappAccount.seed,
				undefined,
				"sr25519",
				42,
			);

			const dummyDappAccountAddr = dappPair.address;

			await registerSiteKey(dummyDappAccountAddr, CaptchaType.pow);

			const origin = "http://localhost";
			const requestBody: GetPowCaptchaChallengeRequestBodyType = {
				user: userPair.address,
				dapp: dummyDappAccountAddr,
			};
			const captchaRes = await fetch(
				`${baseUrl}${getPowCaptchaChallengePath}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
						Origin: origin,
						"Prosopo-Site-Key": dummyDappAccountAddr,
						"Prosopo-User": userAccount,
					},
					body: JSON.stringify(requestBody),
				},
			);

			const challengeBody = (await captchaRes.json()) as GetPowCaptchaResponse;

			const challenge = challengeBody.challenge;
			const difficulty = challengeBody.difficulty;
			const signature = challengeBody.signature;
			const nonce = solvePoW(challenge, difficulty);

			const verifiedTimeout = 120000;
			const submitBody: SubmitPowCaptchaSolutionBodyType = {
				challenge,
				difficulty,
				signature: {
					[ApiParams.provider]: signature[ApiParams.provider],
					[ApiParams.user]: {
						[ApiParams.timestamp]: u8aToHex(
							userPair.sign(challengeBody[ApiParams.timestamp].toString()),
						),
					},
				},
				nonce,
				verifiedTimeout,
				user: userPair.address,
				dapp: dummyDappAccountAddr,
			};
			const response = await fetch(
				`${baseUrl}${ClientApiPaths.SubmitPowCaptchaSolution}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
						Origin: origin,
						"Prosopo-Site-Key": dummyDappAccountAddr,
						"Prosopo-User": userAccount,
					},
					body: JSON.stringify(submitBody),
				},
			);

			expect(response.status).toBe(200);

			const data = (await response.json()) as PowCaptchaSolutionResponse;

			expect(data).toHaveProperty("verified");
			expect(data.verified).toBe(true);
		});

		it("should return false for incorrectly completed PoW captcha", async () => {
			const userPair = await getPairAsync(
				dummyUserAccount.seed,
				undefined,
				"sr25519",
				42,
			);
			const userAccount = userPair.address;
			const origin = "http://localhost";
			const dapp = "5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw";
			await registerSiteKey(dapp, CaptchaType.pow);

			const captchaRes = await fetch(
				`${baseUrl}${getPowCaptchaChallengePath}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
						Origin: origin,
						"Prosopo-Site-Key": dapp,
						"Prosopo-User": userAccount,
					},
					body: JSON.stringify({ user: userAccount, dapp: dapp }),
				},
			);

			const challengeBody = (await captchaRes.json()) as GetPowCaptchaResponse;

			const challenge = challengeBody.challenge;
			const difficulty = challengeBody.difficulty;
			const signature = challengeBody.signature;
			const nonce = failPoW(challenge, difficulty);
			const verifiedTimeout = 120000;

			const body: SubmitPowCaptchaSolutionBodyType = {
				challenge,
				difficulty,
				[ApiParams.signature]: {
					[ApiParams.provider]: signature[ApiParams.provider],
					[ApiParams.user]: {
						[ApiParams.timestamp]: u8aToHex(
							userPair.sign(challengeBody[ApiParams.timestamp].toString()),
						),
					},
				},
				nonce,
				verifiedTimeout,
				user: userPair.address,
				dapp,
			};
			const response = await fetch(
				`${baseUrl}${ClientApiPaths.SubmitPowCaptchaSolution}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
						Origin: origin,
						"Prosopo-Site-Key": dapp,
						"Prosopo-User": userAccount,
					},
					body: JSON.stringify(body),
				},
			);

			expect(response.status).toBe(200);

			const data = (await response.json()) as PowCaptchaSolutionResponse;
			expect(data).toHaveProperty("verified");
			expect(data.verified).toBe(false);
		});

		it("should return an error for an unregistered site key", async () => {
			const [_mnemonic, unregisteredAccount] = await generateMnemonic();
			const userPair = await getPairAsync(
				dummyUserAccount.seed,
				undefined,
				"sr25519",
				42,
			);
			const userAccount = userPair.address;
			const origin = "http://localhost";

			const captchaRes = await fetch(
				`${baseUrl}${getPowCaptchaChallengePath}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
						Origin: origin,
						"Prosopo-Site-Key": unregisteredAccount,
						"Prosopo-User": userAccount,
					},
					body: JSON.stringify({
						user: userAccount,
						dapp: unregisteredAccount,
					}),
				},
			);

			const data = (await captchaRes.json()) as GetPowCaptchaResponse;

			expect(data).toHaveProperty("error");
			expect(data.error?.message).toBe("Site key not registered");
		});
	});

	it("should return an error for an invalid site key", async () => {
		const userPair = await getPairAsync(
			dummyUserAccount.seed,
			undefined,
			"sr25519",
			42,
		);
		const userAccount = userPair.address;
		const origin = "http://localhost";
		const invalidSiteKey = "junk";

		const captchaRes = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
			method: "POST",
			headers: {
				Connection: "close",
				"Content-Type": "application/json",
				Origin: origin,
				"Prosopo-Site-Key": invalidSiteKey,
				"Prosopo-User": userAccount,
			},
			body: JSON.stringify({ user: userAccount, dapp: invalidSiteKey }),
		});

		const challengeBody = (await captchaRes.json()) as GetPowCaptchaResponse;

		expect(challengeBody).toHaveProperty("error");
		expect(challengeBody.error?.message).toBe("Invalid site key");
	});

	it("should return an error if the captcha type is set to image", async () => {
		const userPair = await getPairAsync(
			dummyUserAccount.seed,
			undefined,
			"sr25519",
		);
		const userAccount = userPair.address;
		const origin = "http://localhost";
		const dapp = "5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw";
		await registerSiteKey(dapp, CaptchaType.image);

		const captchaRes = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
			method: "POST",
			headers: {
				Connection: "close",
				"Content-Type": "application/json",
				Origin: origin,
				"Prosopo-Site-Key": dapp,
				"Prosopo-User": userAccount,
			},
			body: JSON.stringify({ user: userAccount, dapp }),
		});

		const challengeBody = (await captchaRes.json()) as GetPowCaptchaResponse;

		expect(challengeBody).toHaveProperty("error");
		expect(challengeBody.error?.message).toBe("Incorrect CAPTCHA type");
		expect(challengeBody.error?.code).toBe(400);
	});
	it("should return an error if the captcha type is set to frictionless and no sessionID is sent", async () => {
		const userPair = await getPairAsync(
			dummyUserAccount.seed,
			undefined,
			"sr25519",
		);
		const userAccount = userPair.address;
		const origin = "http://localhost";
		// Create a new site key to avoid conflicts with other tests
		const [mnemonic, dapp] = await generateMnemonic();
		await registerSiteKey(dapp, CaptchaType.frictionless);

		const captchaRes = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
			method: "POST",
			headers: {
				Connection: "close",
				"Content-Type": "application/json",
				Origin: origin,
				"Prosopo-Site-Key": dapp,
				"Prosopo-User": userAccount,
			},
			body: JSON.stringify({ user: userAccount, dapp }),
		});

		const challengeBody = (await captchaRes.json()) as GetPowCaptchaResponse;

		expect(challengeBody).toHaveProperty("error");
		expect(challengeBody.error?.message).toBe("Incorrect CAPTCHA type");
		expect(challengeBody.error?.code).toBe(400);
	});
});
