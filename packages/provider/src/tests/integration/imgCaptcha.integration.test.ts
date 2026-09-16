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
import {
	CaptchaMerkleTree,
	buildDataset,
	computeCaptchaSolutionHash,
	datasetWithSolutionHashes,
	parseAndSortCaptchaSolutions,
} from "@prosopo/datasets";
import { ProviderEnvironment } from "@prosopo/env";
import { generateMnemonic, getPair } from "@prosopo/keyring";
import { Tasks, isTlsAvailable, startProviderApi } from "@prosopo/provider";
import {
	ApiParams,
	type Captcha,
	type CaptchaRequestBodyType,
	type CaptchaResponseBody,
	type CaptchaSolutionBodyType,
	type CaptchaSolutionResponse,
	CaptchaType,
	ClientApiPaths,
	ClientSettingsSchema,
	DatabaseTypes,
	type ImageVerificationResponse,
	type KeyringPair,
	ProsopoConfigSchema,
	Tier,
	type VerifySolutionBodyTypeInput,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import { embedData } from "@prosopo/util";
import { randomAsHex } from "@prosopo/util-crypto";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dummyUserAccount } from "./mocks/solvedTestCaptchas.js";
import { reservePort } from "./testUtils.js";

const solutions = datasetWithSolutionHashes;
const userAccount = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
const origin = "https://localhost";

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
	let redisContainer: StartedTestContainer | undefined;
	let server: Server | undefined;
	let dappAccount: string;
	let mnemonic: string;
	let tasks: Tasks;
	let testPort: number;
	let baseUrl: string;
	let builtDataset: Awaited<ReturnType<typeof buildDataset>>;

	// --- Shared challenge/solve/verify helpers -------------------------------
	// The image captcha flow is always the same three calls (request a
	// challenge, submit a solution, have the dapp verify the result), so the
	// tests below drive it through these rather than repeating the fetches.

	/**
	 * Correct solution and full item hash list for each captcha, keyed by the
	 * content ID the provider serves.
	 *
	 * We read from builtDataset (not datasetWithSolutionHashes) because
	 * buildDataset recomputes captchaContentId via merkle tree hashing, so the
	 * IDs stored in the DB differ from the pre-set ones in the static fixture.
	 */
	const getCaptchaInfo = (): Map<
		string,
		{ solution: string[]; itemHashes: string[] }
	> =>
		new Map(
			(builtDataset.captchas as Captcha[])
				.filter((captcha) => captcha.solution)
				.map((captcha) => [
					captcha.captchaContentId,
					{
						solution: captcha.solution?.map((s) => s.toString()) ?? [],
						itemHashes: captcha.items.map((item) => item.hash),
					},
				]),
		);

	const requestChallenge = async (
		siteKey: string,
		user: string,
	): Promise<CaptchaResponseBody> => {
		const body: CaptchaRequestBodyType = {
			[ApiParams.dapp]: siteKey,
			[ApiParams.user]: user,
			[ApiParams.datasetId]: solutions.datasetId,
		};
		const response = await fetch(
			`${baseUrl}${ClientApiPaths.GetImageCaptchaChallenge}`,
			{
				method: "POST",
				body: JSON.stringify(body),
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": siteKey,
					"Prosopo-User": user,
				},
			},
		);

		expect(response.status).toBe(200);

		return (await response.json()) as CaptchaResponseBody;
	};

	/**
	 * Build a solution body for a challenge. "correct" picks the images in the
	 * dataset solution; "incorrect" deliberately picks every image that is NOT
	 * in the solution, which guarantees 0% correctness and so a disapproval.
	 */
	const buildSolution = (
		challenge: CaptchaResponseBody,
		siteKey: string,
		user: string,
		userPair: KeyringPair,
		answer: "correct" | "incorrect",
	): CaptchaSolutionBodyType => {
		const captchaInfo = getCaptchaInfo();

		return {
			[ApiParams.captchas]: challenge.captchas.map((captcha, index) => {
				const info = captchaInfo.get(captcha.captchaContentId);
				if (!info) {
					throw new Error(
						`Captcha info not found for captchaContentId: ${captcha.captchaContentId}`,
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
					solution:
						answer === "correct"
							? info.solution
							: info.itemHashes.filter((hash) => !info.solution.includes(hash)),
				};
			}),
			[ApiParams.dapp]: siteKey,
			[ApiParams.requestHash]: challenge.requestHash,
			[ApiParams.signature]: {
				[ApiParams.user]: {
					[ApiParams.timestamp]: u8aToHex(
						userPair.sign(stringToU8a(challenge.timestamp)),
					),
				},
				[ApiParams.provider]:
					challenge[ApiParams.signature][ApiParams.provider],
			},
			[ApiParams.timestamp]: challenge.timestamp,
			[ApiParams.user]: user,
		};
	};

	const submitSolution = async (
		solution: CaptchaSolutionBodyType,
		siteKey: string,
		user: string,
	): Promise<CaptchaSolutionResponse> => {
		const response = await fetch(
			`${baseUrl}${ClientApiPaths.SubmitImageCaptchaSolution}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": siteKey,
					"Prosopo-User": user,
				},
				body: JSON.stringify(solution),
			},
		);

		expect(response.status).toBe(200);

		return (await response.json()) as CaptchaSolutionResponse;
	};

	/**
	 * The commitment ID the provider stored for a solution. The widget derives
	 * it client-side from the solutions it submitted (it is never returned by
	 * the API) and puts it in the procaptcha token, so the test does the same.
	 */
	const getCommitmentId = (solution: CaptchaSolutionBodyType): string => {
		const tree = new CaptchaMerkleTree();
		tree.build(
			parseAndSortCaptchaSolutions(solution[ApiParams.captchas]).map(
				(captcha) => computeCaptchaSolutionHash(captcha),
			),
		);
		return tree.getRoot().hash;
	};

	/**
	 * Verify the challenge the way a dapp's server would. Without a commitment
	 * ID the provider falls back to looking up the latest approved commitment
	 * for this user and site key, which is what a challenge that never got as
	 * far as storing a commitment has to be checked against.
	 */
	const dappVerify = async (
		siteKey: string,
		siteKeyMnemonic: string,
		user: string,
		commitmentId?: string,
	): Promise<ImageVerificationResponse> => {
		const dappPair = getPair(siteKeyMnemonic);
		const verifyTimestamp = Date.now().toString();
		const token = encodeProcaptchaOutput({
			[ApiParams.dapp]: siteKey,
			[ApiParams.user]: user,
			...(commitmentId ? { [ApiParams.commitmentId]: commitmentId } : {}),
			[ApiParams.timestamp]: verifyTimestamp,
			[ApiParams.signature]: {
				[ApiParams.provider]: {},
				[ApiParams.user]: {},
			},
		});
		const verifyBody: VerifySolutionBodyTypeInput = {
			[ApiParams.token]: token,
			[ApiParams.dappSignature]: u8aToHex(
				dappPair.sign(stringToU8a(verifyTimestamp)),
			),
		};

		const response = await fetch(
			`${baseUrl}${ClientApiPaths.VerifyImageCaptchaSolutionDapp}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: origin,
					"Prosopo-Site-Key": siteKey,
					"Prosopo-User": user,
				},
				body: JSON.stringify(verifyBody),
			},
		);

		expect(response.status).toBe(200);

		return (await response.json()) as ImageVerificationResponse;
	};
	// ------------------------------------------------------------------------

	beforeAll(async () => {
		testPort = await reservePort();
		const protocol = isTlsAvailable() ? "https" : "http";
		baseUrl = `${protocol}://localhost:${testPort}`;

		// Start MongoDB container
		mongoContainer = await new GenericContainer("mongo:6.0.28")
			.withExposedPorts(27017)
			.withEnvironment({
				MONGO_INITDB_ROOT_USERNAME: "root",
				MONGO_INITDB_ROOT_PASSWORD: "root",
				MONGO_INITDB_DATABASE: "prosopo_test",
			})
			.start();

		const mongoHost = mongoContainer.getHost();
		const mongoPort = mongoContainer.getMappedPort(27017);

		// Make Redis optional - can be disabled by setting SKIP_REDIS=true in environment
		const skipRedis = process.env.SKIP_REDIS === "true";
		let redisHost = "localhost";
		let redisPort = 6379;

		if (!skipRedis) {
			try {
				// Start Redis container
				redisContainer = await new GenericContainer("redis/redis-stack:latest")
					.withExposedPorts(6379)
					.withEnvironment({
						REDIS_ARGS: "--requirepass root",
					})
					.start();

				redisHost = redisContainer.getHost();
				redisPort = redisContainer.getMappedPort(6379);
			} catch (error) {
				console.warn(
					"Failed to start Redis container, continuing without Redis:",
					error,
				);
			}
		}

		const config = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: `${protocol}://localhost:${testPort}`,
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
			// Only configure Redis if container is available
			...(redisContainer
				? {
						redisConnection: {
							url: `redis://:${encodeURIComponent("root")}@${redisHost}:${redisPort}`,
							password: "root",
							indexName: randomAsHex(16),
						},
					}
				: {}),
			ipApi: {
				baseUrl: "https://dummyUrl.com",
				apiKey: "dummyKey",
			},
			server: {
				baseURL: `${protocol}://localhost`,
				port: testPort,
			},
		});

		env = new ProviderEnvironment(config);
		await env.isReady();

		const db = env.getDb();

		// wait until Redis is ready (only if Redis container was started)
		if (redisContainer) {
			try {
				await db.getRedisAccessRulesConnection().getClient();
			} catch (error) {
				console.warn(
					"Redis connection failed, continuing without Redis:",
					error,
				);
			}
		}

		// Setup provider dataset - this is critical for the tests to work
		// This mimics the setup script's setupProvider functionality
		tasks = new Tasks(env);
		env.logger.info(() => ({ msg: "Setting up provider dataset" }));
		await tasks.datasetManager.providerSetDataset(datasetWithSolutionHashes);
		builtDataset = await buildDataset(datasetWithSolutionHashes);

		// Start the provider API server. This mimics the CLI start functionality.
		env.logger.info(() => ({
			msg: `Starting provider API on port ${testPort}`,
		}));
		server = await startProviderApi(env, true, testPort);
	}, 120_000);

	beforeEach(async () => {
		// Create a new site key to avoid conflicts with other tests
		[mnemonic, dappAccount] = await generateMnemonic();
		await registerSiteKeyInDb(env, dappAccount, CaptchaType.image);
	});

	afterAll(async () => {
		// Close server first
		if (server) {
			await new Promise<void>((resolve) => {
				server?.close((err) => {
					if (err) {
						console.error("Error closing server:", err);
					}
					resolve();
				});
			});

			// Give the server time to fully release the port
			await new Promise((resolve) => setTimeout(resolve, 500));
			server = undefined;
		}

		// Close database connections
		if (env) {
			try {
				await env.getDb().close();
			} catch (error) {
				console.error("Error closing database:", error);
			}
		}

		// Stop containers
		if (mongoContainer) {
			try {
				await mongoContainer.stop();
			} catch (error) {
				console.error("Error stopping mongo container:", error);
			}
		}
		if (redisContainer) {
			try {
				await redisContainer.stop();
			} catch (error) {
				console.error("Error stopping redis container:", error);
			}
		}
	});

	describe("GetImageCaptchaChallenge", () => {
		it("should supply an image captcha challenge to a Dapp User", async () => {
			const origin = "https://localhost";
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
			const origin = "https://localhost";
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
			const origin = "https://localhost";
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
			const origin = "https://localhost";
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
			const origin = "https://localhost";
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
			const origin = "https://localhost";
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
			expect(data.error?.message).toBe("Tipo de CAPTCHA incorrecto");
			expect(data.error?.code).toBe(400);
		});
	});
	it("should return an error if the captcha type is set to frictionless and no sessionID is sent", async () => {
		const origin = "https://localhost";
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
		// Use dummyUserAccount for signing, but dappAccount (registered in
		// beforeEach) as the site key.
		const getUser = (): { pair: KeyringPair; userAccount: string } => ({
			pair: getPair(dummyUserAccount.seed, undefined, "sr25519", 42),
			userAccount: dummyUserAccount.address,
		});

		it("should verify a correctly completed image captcha as true", async () => {
			const { pair, userAccount } = getUser();

			const challenge = await requestChallenge(dappAccount, userAccount);

			const res = await submitSolution(
				buildSolution(challenge, dappAccount, userAccount, pair, "correct"),
				dappAccount,
				userAccount,
			);

			expect(res.status).toBe("You correctly answered the captchas");
		});

		it("should mark an incorrectly completed image captcha as disapproved, and the dapp should verify the challenge as disapproved", async () => {
			const { pair, userAccount } = getUser();

			const challenge = await requestChallenge(dappAccount, userAccount);

			// Select the wrong images and submit within the time limit.
			const solution = buildSolution(
				challenge,
				dappAccount,
				userAccount,
				pair,
				"incorrect",
			);
			const res = await submitSolution(solution, dappAccount, userAccount);

			// The provider marks the solution as disapproved.
			expect(res.verified).toBe(false);
			expect(res.status).toBe(
				"You answered one or more captchas incorrectly. Please try again",
			);

			// The dapp verifies the challenge and is told it is disapproved.
			const verifyResult = await dappVerify(
				dappAccount,
				mnemonic,
				userAccount,
				getCommitmentId(solution),
			);
			expect(verifyResult.verified).toBe(false);
		});

		it("should allow a successful challenge after a failed one", async () => {
			const { pair, userAccount } = getUser();

			// Fail a challenge first.
			const failedChallenge = await requestChallenge(dappAccount, userAccount);
			const failedRes = await submitSolution(
				buildSolution(
					failedChallenge,
					dappAccount,
					userAccount,
					pair,
					"incorrect",
				),
				dappAccount,
				userAccount,
			);
			expect(failedRes.verified).toBe(false);

			// Nothing is left in a broken state: the same user can request a fresh
			// challenge, solve it, and have the dapp verify it as approved.
			const challenge = await requestChallenge(dappAccount, userAccount);
			const solution = buildSolution(
				challenge,
				dappAccount,
				userAccount,
				pair,
				"correct",
			);
			const res = await submitSolution(solution, dappAccount, userAccount);
			expect(res.verified).toBe(true);
			expect(res.status).toBe("You correctly answered the captchas");

			const verifyResult = await dappVerify(
				dappAccount,
				mnemonic,
				userAccount,
				getCommitmentId(solution),
			);
			expect(verifyResult.verified).toBe(true);
		});

		it("should disapprove a correct solution submitted after the time limit, and the dapp should verify the challenge as disapproved", async () => {
			const { pair, userAccount } = getUser();

			const challenge = await requestChallenge(dappAccount, userAccount);

			// Force the solution time limit to be exceeded by pushing the stored
			// deadline for this pending commitment into the past, so the subsequent
			// (correct) solution is treated as submitted too late. This avoids having
			// to actually wait out the real timeout. Mirrors the expired-deadline
			// setup in imgCaptchaTasks.unit.test.ts.
			const expireResult = await env
				.getDb()
				.getTables()
				.commitment.updateOne(
					{ requestHash: challenge.requestHash, pending: true },
					{ $set: { deadlineTimestamp: new Date(Date.now() - 60 * 1000) } },
				);
			expect(expireResult.modifiedCount).toBe(1);

			// The provider disapproves the correct solution because the time limit
			// has been exceeded.
			const solution = buildSolution(
				challenge,
				dappAccount,
				userAccount,
				pair,
				"correct",
			);
			const solutionResult = await submitSolution(
				solution,
				dappAccount,
				userAccount,
			);
			expect(solutionResult.verified).toBe(false);
			expect(solutionResult.status).toBe(
				"You answered one or more captchas incorrectly. Please try again",
			);

			// The dapp verifies the challenge and is told it is disapproved: the
			// late solution is rejected before a commitment is stored, so there is
			// no approved commitment for this user/site key.
			const verifyResult = await dappVerify(dappAccount, mnemonic, userAccount);
			expect(verifyResult.verified).toBe(false);
		});
	});
});
