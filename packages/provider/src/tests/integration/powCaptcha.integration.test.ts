// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { getPairAsync } from "@prosopo/contract";
import {
	ApiParams,
	ApiPaths,
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
const getPowCaptchaChallengePath = ApiPaths.GetPowCaptchaChallenge;
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
			await registerSiteKey(dappAccount);
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
				},
				body: JSON.stringify(body),
			});

			expect(response.status).toBe(200);

			const data = await response.json();

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
				},
				body: JSON.stringify({ user: userAccount, dapp: dappAccount }),
			});

			expect(response.status).toBe(400);
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

			const dappAccount = dappPair.address;

			await registerSiteKey(dappAccount);

			const origin = "http://localhost";
			const requestBody: GetPowCaptchaChallengeRequestBodyType = {
				user: userPair.address,
				dapp: dappAccount,
			};
			const captchaRes = await fetch(
				`${baseUrl}${getPowCaptchaChallengePath}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
						Origin: origin,
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
				dapp: dappAccount,
			};
			const response = await fetch(
				`${baseUrl}${ApiPaths.SubmitPowCaptchaSolution}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
						Origin: origin,
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

			const captchaRes = await fetch(
				`${baseUrl}${getPowCaptchaChallengePath}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
						Origin: origin,
					},
					body: JSON.stringify({ user: userAccount, dapp: dappAccount }),
				},
			);

			const challengeBody = (await captchaRes.json()) as GetPowCaptchaResponse;

			const challenge = challengeBody.challenge;
			const difficulty = challengeBody.difficulty;
			const signature = challengeBody.signature;
			const nonce = failPoW(challenge, difficulty);
			const verifiedTimeout = 120000;

			const dapp = "5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw";
			await registerSiteKey(dapp);
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
				`${baseUrl}${ApiPaths.SubmitPowCaptchaSolution}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
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
					},
					body: JSON.stringify({ user: userAccount, dapp: dappAccount }),
				},
			);

			const challengeBody = (await captchaRes.json()) as GetPowCaptchaResponse;

			const challenge = challengeBody.challenge;
			const difficulty = challengeBody.difficulty;
			const signature = challengeBody.signature;
			const nonce = failPoW(challenge, difficulty);
			const verifiedTimeout = 120000;

			const dapp = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
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
				`${baseUrl}${ApiPaths.SubmitPowCaptchaSolution}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
					},
					body: JSON.stringify(body),
				},
			);

			expect(response.status).toBe(200);

			const data = (await response.json()) as PowCaptchaSolutionResponse;
			expect(data).toHaveProperty("error");
			expect(data.error).toBe("Site key not registered");
		});
	});
});
