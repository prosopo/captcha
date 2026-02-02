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

import type { Server } from "node:net";
import { sha256 } from "@noble/hashes/sha256";
import { datasetWithSolutionHashes } from "@prosopo/datasets";
import { ProviderEnvironment } from "@prosopo/env";
import { generateMnemonic, getPair } from "@prosopo/keyring";
import { Tasks, startProviderApi } from "@prosopo/provider";
import {
	ApiParams,
	CaptchaType,
	ClientApiPaths,
	ClientSettingsSchema,
	DatabaseTypes,
	type GetPowCaptchaChallengeRequestBodyType,
	type GetPowCaptchaResponse,
	type KeyringPair,
	type PowCaptchaSolutionResponse,
	ProsopoConfigSchema,
	type SubmitPowCaptchaSolutionBodyType,
	Tier,
} from "@prosopo/types";
import { u8aToHex } from "@prosopo/util";
import { randomAsHex } from "@prosopo/util-crypto";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dummyUserAccount } from "./mocks/solvedTestCaptchas.js";

// Define the endpoint paths
const getPowCaptchaChallengePath = ClientApiPaths.GetPowCaptchaChallenge;
const userId = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

// Function to get a random available port
function getRandomPort(): number {
	// Use a random port in the range 10000-60000 to avoid conflicts
	return Math.floor(Math.random() * 50000) + 10000;
}

/**
 * Register a site key directly in the database using Tasks
 * This mimics the setup script's registerSiteKey functionality
 */
async function registerSiteKeyInDb(
	env: ProviderEnvironment,
	siteKey: string,
	captchaType: CaptchaType,
): Promise<void> {
	const tasks = new Tasks(env);
	await tasks.clientTaskManager.registerSiteKey(
		siteKey,
		Tier.Free,
		ClientSettingsSchema.parse({
			captchaType,
			domains: ["localhost", "0.0.0.0", "127.0.0.0", "example.com"],
			frictionlessThreshold: 0.5,
			powDifficulty: 4,
		}),
	);
}

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
	let env: ProviderEnvironment;
	let mongoContainer: StartedTestContainer;
	let redisContainer: StartedTestContainer;
	let server: Server;
	let tasks: Tasks;
	let testPort: number;
	let baseUrl: string;

	beforeAll(async () => {
		// Get a unique port for this test suite
		testPort = getRandomPort();
		baseUrl = `http://localhost:${testPort}`;

		// Start MongoDB container
		mongoContainer = await new GenericContainer("mongo:6.0.17")
			.withExposedPorts(27017)
			.withEnvironment({
				MONGO_INITDB_ROOT_USERNAME: "root",
				MONGO_INITDB_ROOT_PASSWORD: "root",
				MONGO_INITDB_DATABASE: "prosopo_test",
			})
			.start();

		// Start Redis container
		redisContainer = await new GenericContainer("redis/redis-stack:latest")
			.withExposedPorts(6379)
			.withEnvironment({
				REDIS_ARGS: "--requirepass root",
			})
			.start();

		const mongoHost = mongoContainer.getHost();
		const mongoPort = mongoContainer.getMappedPort(27017);
		const redisHost = redisContainer.getHost();
		const redisPort = redisContainer.getMappedPort(6379);

		const config = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: `http://localhost:${testPort}`,
			account: {
				secret:
					process.env.PROVIDER_MNEMONIC ||
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			authAccount: {
				secret:
					process.env.ADMIN_MNEMONIC ||
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			database: {
				development: {
					type: DatabaseTypes.enum.provider,
					endpoint: `mongodb://root:root@${mongoHost}:${mongoPort}`,
					dbname: "prosopo_test",
					authSource: "admin",
				},
			},
			redisConnection: {
				url: `redis://:${encodeURIComponent("root")}@${redisHost}:${redisPort}`,
				password: "root",
				indexName: randomAsHex(16),
			},
			ipApi: {
				baseUrl: "https://dummyUrl.com",
				apiKey: "dummyKey",
			},
			server: {
				baseURL: "http://localhost",
				port: testPort,
			},
		});

		env = new ProviderEnvironment(config);
		await env.isReady();

		const db = env.getDb();

		// wait until Redis is ready
		await db.getRedisAccessRulesConnection().getClient();

		// Setup provider dataset - this is critical for the tests to work
		// This mimics the setup script's setupProvider functionality
		tasks = new Tasks(env);
		env.logger.info(() => ({ msg: "Setting up provider dataset" }));
		await tasks.datasetManager.providerSetDataset(datasetWithSolutionHashes);

		// Start the provider API server
		// This mimics the CLI start functionality
		env.logger.info(() => ({
			msg: `Starting provider API on port ${testPort}`,
		}));
		server = await startProviderApi(env, true, testPort);
	});

	afterAll(async () => {
		if (server) {
			await new Promise<void>((resolve, reject) => {
				server.close((err) => {
					if (err) reject(err);
					else resolve();
				});
			});
		}
		if (env) {
			await env.getDb().close();
		}
		if (mongoContainer) {
			await mongoContainer.stop();
		}
		if (redisContainer) {
			await redisContainer.stop();
		}
	});

	describe("GetPowCaptchaChallenge", () => {
		let siteKeyMnemonic: string;
		let siteKey: string;
		let userMnemonic: string;
		let userId: string;

		beforeEach(async () => {
			// Create a new site key to avoid conflicts with other tests
			[siteKeyMnemonic, siteKey] = await generateMnemonic();
			await registerSiteKeyInDb(env, siteKey, CaptchaType.pow);
			[userMnemonic, userId] = await generateMnemonic();
		});

		it("should supply a PoW challenge to a Dapp User", async () => {
			const origin = "http://localhost";
			const body: GetPowCaptchaChallengeRequestBodyType = {
				user: userId,
				dapp: siteKey,
			};
			const response = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
				method: "POST",
				headers: {
					Connection: "close",
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": siteKey,
					"Prosopo-User": userId,
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
					"Prosopo-Site-Key": siteKey,
					"Prosopo-User": userId,
				},
				body: JSON.stringify({ user: userId, dapp: siteKey }),
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
					"Prosopo-Site-Key": siteKey,
					"Prosopo-User": userId,
				},
				body: JSON.stringify({ user: userId, dapp: siteKey }),
			});

			expect(response.status).toBe(400);
			expect(response.statusText).toBe("Bad Request");
		});
	});
	describe("SubmitPowCaptchaSolution", () => {
		let siteKeyMnemonic: string;
		let siteKey: string;
		let userMnemonic: string;
		let userPair: KeyringPair;
		let userId: string;

		beforeEach(async () => {
			// Create a new site key to avoid conflicts with other tests
			[siteKeyMnemonic, siteKey] = await generateMnemonic();
			await registerSiteKeyInDb(env, siteKey, CaptchaType.pow);
			[userMnemonic, userId] = await generateMnemonic();
			userPair = getPair(userMnemonic);
		});
		it("should verify a correctly completed PoW captcha as true", async () => {
			const origin = "http://localhost";
			const requestBody: GetPowCaptchaChallengeRequestBodyType = {
				user: userId,
				dapp: siteKey,
			};
			const captchaRes = await fetch(
				`${baseUrl}${getPowCaptchaChallengePath}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Origin: origin,
						"Prosopo-Site-Key": siteKey,
						"Prosopo-User": userId,
					},
					body: JSON.stringify(requestBody),
				},
			);

			const challengeBody = (await captchaRes.json()) as GetPowCaptchaResponse;

			const challenge = challengeBody.challenge;
			const difficulty = challengeBody.difficulty;
			const signature = challengeBody.signature;
			const nonce = await solvePoW(challenge, difficulty);

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
				dapp: siteKey,
			};
			const response = await fetch(
				`${baseUrl}${ClientApiPaths.SubmitPowCaptchaSolution}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
						Origin: origin,
						"Prosopo-Site-Key": siteKey,
						"Prosopo-User": userId,
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
			const origin = "http://localhost";

			const captchaRes = await fetch(
				`${baseUrl}${getPowCaptchaChallengePath}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
						Origin: origin,
						"Prosopo-Site-Key": siteKey,
						"Prosopo-User": userId,
					},
					body: JSON.stringify({ user: userId, dapp: siteKey }),
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
				dapp: siteKey,
			};
			const response = await fetch(
				`${baseUrl}${ClientApiPaths.SubmitPowCaptchaSolution}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
						Origin: origin,
						"Prosopo-Site-Key": siteKey,
						"Prosopo-User": userId,
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
			const userPair = getPair(dummyUserAccount.seed, undefined, "sr25519", 42);
			const userId = userPair.address;
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
						"Prosopo-User": userId,
					},
					body: JSON.stringify({
						user: userId,
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
		const origin = "http://localhost";
		const invalidSiteKey = "junk";

		const captchaRes = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
			method: "POST",
			headers: {
				Connection: "close",
				"Content-Type": "application/json",
				Origin: origin,
				"Prosopo-Site-Key": invalidSiteKey,
				"Prosopo-User": userId,
			},
			body: JSON.stringify({ user: userId, dapp: invalidSiteKey }),
		});

		const challengeBody = (await captchaRes.json()) as GetPowCaptchaResponse;

		expect(challengeBody).toHaveProperty("error");
		expect(challengeBody.error?.message).toBe("Invalid site key");
	});

	it("should return an error if the captcha type is set to image", async () => {
		const userPair = getPair(dummyUserAccount.seed, undefined, "sr25519");
		const userId = userPair.address;
		const origin = "http://localhost";
		const siteKey = "5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw";

		await registerSiteKeyInDb(env, siteKey, CaptchaType.image);

		const captchaRes = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
			method: "POST",
			headers: {
				Connection: "close",
				"Content-Type": "application/json",
				Origin: origin,
				"Prosopo-Site-Key": siteKey,
				"Prosopo-User": userId,
			},
			body: JSON.stringify({ user: userId, dapp: siteKey }),
		});

		const challengeBody = (await captchaRes.json()) as GetPowCaptchaResponse;

		expect(challengeBody).toHaveProperty("error");
		expect(challengeBody.error?.message).toBe("Incorrect CAPTCHA type");
		expect(challengeBody.error?.code).toBe(400);
	});
	it("should return an error if the captcha type is set to frictionless and no sessionID is sent", async () => {
		const userPair = getPair(dummyUserAccount.seed, undefined, "sr25519");
		const userId = userPair.address;
		const origin = "http://localhost";
		// Create a new site key to avoid conflicts with other tests
		const [_mnemonic, dapp] = await generateMnemonic();
		await registerSiteKeyInDb(env, dapp, CaptchaType.frictionless);

		const captchaRes = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
			method: "POST",
			headers: {
				Connection: "close",
				"Content-Type": "application/json",
				Origin: origin,
				"Prosopo-Site-Key": dapp,
				"Prosopo-User": userId,
			},
			body: JSON.stringify({ user: userId, dapp }),
		});

		const challengeBody = (await captchaRes.json()) as GetPowCaptchaResponse;

		expect(challengeBody).toHaveProperty("error");
		expect(challengeBody.error?.message).toBe("Incorrect CAPTCHA type");
		expect(challengeBody.error?.code).toBe(400);
	});
});
