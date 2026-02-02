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
import { stringToU8a, u8aToHex } from "@polkadot/util";
import { datasetWithSolutionHashes } from "@prosopo/datasets";
import { ProviderEnvironment } from "@prosopo/env";
import { generateMnemonic, getPair } from "@prosopo/keyring";
import { Tasks, startProviderApi } from "@prosopo/provider";
import {
	ApiParams,
	type CaptchaRequestBodyType,
	type CaptchaResponseBody,
	type CaptchaSolutionBodyType,
	type CaptchaSolutionResponse,
	CaptchaType,
	ClientApiPaths,
	ClientSettingsSchema,
	DatabaseTypes,
	ProsopoConfigSchema,
	Tier,
} from "@prosopo/types";
import { embedData } from "@prosopo/util";
import { randomAsHex } from "@prosopo/util-crypto";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dummyUserAccount } from "./mocks/solvedTestCaptchas.js";

const solutions = datasetWithSolutionHashes;
const userAccount = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

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

describe("Image Captcha Integration Tests", () => {
	let env: ProviderEnvironment;
	let mongoContainer: StartedTestContainer;
	let redisContainer: StartedTestContainer;
	let server: Server;
	let dappAccount: string;
	let mnemonic: string;
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

	beforeEach(async () => {
		// Create a new site key to avoid conflicts with other tests
		[mnemonic, dappAccount] = await generateMnemonic();
		await registerSiteKeyInDb(env, dappAccount, CaptchaType.image);
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

	describe("GetImageCaptchaChallenge", () => {
		it("should supply an image captcha challenge to a Dapp User", async () => {
			const origin = "http://localhost";
			const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
			const getImgCaptchaBody: CaptchaRequestBodyType = {
				[ApiParams.dapp]: dappAccount,
				[ApiParams.user]: userAccount,
				[ApiParams.datasetId]: solutions.datasetId,
			};

			const response = await fetch(getImageCaptchaURL, {
				method: "POST",
				body: JSON.stringify(getImgCaptchaBody),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": dappAccount,
					"Prosopo-User": userAccount,
				},
			});
			console.log(response);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("captchas");
		});

		it("should not supply an image captcha challenge to a Dapp User if the site key is not registered", async () => {
			const origin = "http://localhost";
			const [_mnemonic, unregisteredAccount] = await generateMnemonic();
			const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
			const body: CaptchaRequestBodyType = {
				[ApiParams.dapp]: unregisteredAccount,
				[ApiParams.user]: userAccount,
				[ApiParams.datasetId]: solutions.datasetId,
			};

			const response = await fetch(getImageCaptchaURL, {
				method: "POST",
				body: JSON.stringify(body),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": unregisteredAccount,
					"Prosopo-User": userAccount,
				},
			});

			expect(response.status).toBe(400);
			const data = (await response.json()) as CaptchaResponseBody;
			expect(data).toHaveProperty("error");
			expect(data.error?.message).toBe("Site key not registered");
		});

		it("should not supply an image captcha challenge to a Dapp User if an invalid site key is provided", async () => {
			const invalidSiteKey = "junk";
			const origin = "http://localhost";
			const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
			const body: CaptchaRequestBodyType = {
				[ApiParams.dapp]: invalidSiteKey,
				[ApiParams.user]: userAccount,
				[ApiParams.datasetId]: solutions.datasetId,
			};

			const response = await fetch(getImageCaptchaURL, {
				method: "POST",
				body: JSON.stringify(body),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": invalidSiteKey,
					"Prosopo-User": userAccount,
				},
			});

			const data = (await response.json()) as CaptchaResponseBody;
			expect(response.status).toBe(400);
			expect(data).toHaveProperty("error");
			expect(data.error?.message).toBe("Invalid site key");
		});

		it("should fail if datasetID is incorrect", async () => {
			const datasetId = "thewrongdsetId";
			const origin = "http://localhost";
			const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
			const body: CaptchaRequestBodyType = {
				[ApiParams.dapp]: dappAccount,
				[ApiParams.user]: userAccount,
				[ApiParams.datasetId]: datasetId,
			};
			const response = await fetch(getImageCaptchaURL, {
				method: "POST",
				body: JSON.stringify(body),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": dappAccount,
					"Prosopo-User": userAccount,
				},
			});

			expect(response.status).toBe(500);
		});
		it("should return an error if the captcha type is set to pow", async () => {
			const origin = "http://localhost";
			const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;

			await registerSiteKeyInDb(env, dappAccount, CaptchaType.pow);
			const body: CaptchaRequestBodyType = {
				[ApiParams.dapp]: dappAccount,
				[ApiParams.user]: userAccount,
				[ApiParams.datasetId]: solutions.datasetId,
			};
			const response = await fetch(getImageCaptchaURL, {
				method: "POST",
				body: JSON.stringify(body),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": dappAccount,
					"Prosopo-User": userAccount,
				},
			});

			expect(response.status).toBe(400);
			const data = (await response.json()) as CaptchaResponseBody;
			expect(data).toHaveProperty("error");
			expect(data.error?.message).toBe("Incorrect CAPTCHA type");
			expect(data.error?.code).toBe(400);
		});
		it("should return a translated error if the captcha type is set to pow and the language is set to es", async () => {
			const origin = "http://localhost";
			const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
			await registerSiteKeyInDb(env, dappAccount, CaptchaType.pow);
			const body: CaptchaRequestBodyType = {
				[ApiParams.dapp]: dappAccount,
				[ApiParams.user]: userAccount,
				[ApiParams.datasetId]: solutions.datasetId,
			};
			const response = await fetch(getImageCaptchaURL, {
				method: "POST",
				body: JSON.stringify(body),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": dappAccount,
					"Prosopo-User": userAccount,
					"Accept-Language": "es",
				},
			});

			expect(response.status).toBe(400);
			const data = (await response.json()) as CaptchaResponseBody;
			expect(data).toHaveProperty("error");
			expect(data.error?.message).toBe("Tipo di CAPTCHA errato");
			expect(data.error?.code).toBe(400);
		});
	});
	it("should return an error if the captcha type is set to frictionless and no sessionID is sent", async () => {
		const origin = "http://localhost";
		const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
		await registerSiteKeyInDb(env, dappAccount, CaptchaType.frictionless);
		const body: CaptchaRequestBodyType = {
			[ApiParams.dapp]: dappAccount,
			[ApiParams.user]: userAccount,
			[ApiParams.datasetId]: solutions.datasetId,
		};
		const response = await fetch(getImageCaptchaURL, {
			method: "POST",
			body: JSON.stringify(body),
			headers: {
				"Content-Type": "application/json",
				Origin: origin,
				"Prosopo-Site-Key": dappAccount,
				"Prosopo-User": userAccount,
			},
		});

		expect(response.status).toBe(400);
		const data = (await response.json()) as CaptchaResponseBody;
		expect(data).toHaveProperty("error");
		expect(data.error?.message).toBe("Incorrect CAPTCHA type");
		expect(data.error?.code).toBe(400);
	});

	describe("SubmitImageCaptchaSolution", () => {
		it("should verify a correctly completed image captcha as true", async () => {
			// Use dummyUserAccount for signing, but dappAccount (registered in beforeEach) as the site key
			const pair = getPair(dummyUserAccount.seed, undefined, "sr25519", 42);
			const userAccount = dummyUserAccount.address;
			const origin = "http://localhost";

			// Get captcha challenge using the site key registered in beforeEach
			const getImageCaptchaURL = `${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`;
			const getImgCaptchaBody: CaptchaRequestBodyType = {
				[ApiParams.dapp]: dappAccount,
				[ApiParams.user]: userAccount,
				[ApiParams.datasetId]: solutions.datasetId,
			};
			const response = await fetch(getImageCaptchaURL, {
				method: "POST",
				body: JSON.stringify(getImgCaptchaBody),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": dappAccount,
					"Prosopo-User": userAccount,
				},
			});

			expect(response.status).toBe(200);

			const data = (await response.json()) as CaptchaResponseBody;

			// Create a map of solutions from the dataset for quick lookup
			const solutionMap = new Map<string, string[]>(
				// @ts-ignore
				datasetWithSolutionHashes.captchas
					.filter((captcha) => captcha.solution)
					.map((captcha) => [
						captcha.captchaContentId,
						captcha.solution?.map((s) => s.toString() as string),
					]),
			);

			// Map the returned captchas to their solutions
			const temp = data.captchas.map((captcha, index) => {
				const solution = solutionMap.get(captcha.captchaContentId);
				if (!solution) {
					throw new Error(
						`Solution not found for captchaContentId: ${captcha.captchaContentId}`,
					);
				}

				return {
					captchaContentId: captcha.captchaContentId,
					captchaId: captcha.captchaId,
					salt: embedData(randomAsHex(), [
						1 + index,
						2 + index,
						3 + index,
						4 + index,
					]),
					solution: solution,
				};
			});

			const solveImgCaptchaBody: CaptchaSolutionBodyType = {
				[ApiParams.captchas]: temp,
				[ApiParams.dapp]: dappAccount,
				[ApiParams.requestHash]: data.requestHash,
				[ApiParams.signature]: {
					[ApiParams.user]: {
						[ApiParams.timestamp]: u8aToHex(
							pair.sign(stringToU8a(data.timestamp)),
						),
					},
					[ApiParams.provider]: data[ApiParams.signature][ApiParams.provider],
				},
				[ApiParams.timestamp]: data.timestamp,
				[ApiParams.user]: userAccount,
			};

			const solveThatCaptcha = await fetch(
				`${baseUrl}${ClientApiPaths.SubmitImageCaptchaSolution}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Origin: origin,
						"Prosopo-Site-Key": dappAccount,
						"Prosopo-User": userAccount,
					},
					body: JSON.stringify(solveImgCaptchaBody),
				},
			);
			const jsonRes = await solveThatCaptcha.json();

			const res = jsonRes as CaptchaSolutionResponse;
			expect(res.status).toBe("You correctly answered the captchas");
		});
	});
});
