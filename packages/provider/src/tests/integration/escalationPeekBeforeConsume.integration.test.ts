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
import { datasetWithSolutionHashes } from "@prosopo/datasets";
import { ProviderEnvironment } from "@prosopo/env";
import { generateMnemonic } from "@prosopo/keyring";
import { Tasks, isTlsAvailable, startProviderApi } from "@prosopo/provider";
import {
	CaptchaType,
	ClientApiPaths,
	ClientSettingsSchema,
	DatabaseTypes,
	type GetPowCaptchaChallengeRequestBodyType,
	IpAddressType,
	ProsopoConfigSchema,
	Tier,
} from "@prosopo/types";
import { randomAsHex } from "@prosopo/util-crypto";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { testFetch } from "./testUtils.js";

// Reproduces the production NO_SESSION_FOUND → INCORRECT_CAPTCHA_TYPE
// follow-on bug. The /captcha/pow handler calls `isValidRequest`, which
// looks up the Redis `cache:session:escalation:{origin}` mapping when
// the origin session is gone. The fix added here: peek the escalation
// session read-only first; only consume it when its captchaType matches
// what the widget is asking for. On mismatch, leave the session intact
// so a well-behaved widget can still recover via /captcha/{escalationType}
// with the escalation sessionId returned in the PoW-submit envelope.
describe("Escalation peek-before-consume integration test", () => {
	let env: ProviderEnvironment;
	let mongoContainer: StartedTestContainer;
	let redisContainer: StartedTestContainer;
	let server: Server | undefined;
	let tasks: Tasks;
	let testPort: number;
	let baseUrl: string;

	beforeAll(async () => {
		testPort = 30000 + (process.pid % 10000) + Math.floor(Math.random() * 5000);
		const protocol = isTlsAvailable() ? "https" : "http";
		baseUrl = `${protocol}://localhost:${testPort}`;

		// Mongo + Redis are both required: the fix lives in the Redis
		// origin → escalation pointer + Mongo `getSessionRecordBySessionId`
		// peek + conditional `checkAndRemoveSession` consume. Skipping Redis
		// would not exercise the fix at all.
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

		redisContainer = await new GenericContainer("redis/redis-stack:latest")
			.withExposedPorts(6379)
			.withEnvironment({ REDIS_ARGS: "--requirepass root" })
			.start();
		const redisHost = redisContainer.getHost();
		const redisPort = redisContainer.getMappedPort(6379);

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
			redisConnection: {
				url: `redis://:${encodeURIComponent("root")}@${redisHost}:${redisPort}`,
				password: "root",
				indexName: randomAsHex(16),
			},
			ipApi: { baseUrl: "https://dummyUrl.com", apiKey: "dummyKey" },
			server: {
				baseURL: `${protocol}://localhost`,
				port: testPort,
			},
		});

		env = new ProviderEnvironment(config);
		await env.isReady();

		tasks = new Tasks(env);
		await tasks.datasetManager.providerSetDataset(datasetWithSolutionHashes);

		server = await startProviderApi(env, true, testPort);
		await new Promise<void>((resolve, reject) => {
			const checkInterval = setInterval(() => {
				if (server?.listening) {
					clearInterval(checkInterval);
					resolve();
				}
			}, 100);
			setTimeout(() => {
				clearInterval(checkInterval);
				if (!server?.listening) {
					reject(new Error("Server failed to start listening within timeout"));
				}
			}, 5000);
		});
	}, 120_000);

	afterAll(async () => {
		if (server) {
			await new Promise<void>((resolve) => {
				server?.close(() => resolve());
			});
			server = undefined;
		}
		if (env) {
			try {
				await env.getDb().close();
			} catch {}
		}
		if (mongoContainer) {
			try {
				await mongoContainer.stop();
			} catch {}
		}
		if (redisContainer) {
			try {
				await redisContainer.stop();
			} catch {}
		}
	});

	describe("/captcha/pow with origin sessionId after type-mismatched escalation", () => {
		let siteKey: string;
		let userId: string;

		beforeEach(async () => {
			// Fresh siteKey per test so escalation sessions don't bleed between cases.
			[, siteKey] = await generateMnemonic();
			await tasks.clientTaskManager.registerSiteKey(
				siteKey,
				Tier.Free,
				ClientSettingsSchema.parse({
					// `frictionless` lets us issue both pow and image sessions
					// against the same siteKey, matching the production setup
					// where the decision machine routes between them.
					captchaType: CaptchaType.frictionless,
					domains: ["localhost", "0.0.0.0", "127.0.0.0", "example.com"],
					frictionlessThreshold: 0.5,
					powDifficulty: 1,
				}),
			);
			[, userId] = await generateMnemonic();
		});

		// Helpers to build the production-shape `origin → escalation` state
		// without relying on the decision machine actually firing. Mirrors
		// what `submitPoWCaptchaSolution.buildEscalation` does in prod after
		// a successful PoW + route()-says-escalate sequence.
		const seedConsumedOriginPlusLiveEscalation = async (params: {
			escalationCaptchaType: CaptchaType;
		}) => {
			const originSession = await tasks.frictionlessManager.createSession(
				`token-origin-${Math.random()}`,
				0.2,
				0.5,
				{ baseScore: 0.2 },
				{ lower: 0n, type: IpAddressType.v4 },
				CaptchaType.pow,
				siteKey,
				undefined,
				1,
				`hash-origin-${Math.random()}`,
				false,
				false,
				"head-origin",
			);
			// Simulate the preceding /captcha/pow having consumed the origin
			// session — this is the prod state when the widget retries.
			const consumed = await env
				.getDb()
				.checkAndRemoveSession(originSession.sessionId);
			expect(consumed?.sessionId).toBe(originSession.sessionId);

			const escalationSession = await tasks.frictionlessManager.createSession(
				`token-escalation-${Math.random()}`,
				0.2,
				0.5,
				{ baseScore: 0.2 },
				{ lower: 0n, type: IpAddressType.v4 },
				params.escalationCaptchaType,
				siteKey,
				undefined,
				undefined,
				`hash-escalation-${Math.random()}`,
				false,
				false,
				"head-escalation",
			);

			// Sanity-check that storeSessionRecord actually wrote the
			// escalation session synchronously — without this, race
			// conditions in `createSession` would show up as a test-only
			// failure instead of a fix-level failure.
			const sanityCheck = await env
				.getDb()
				.getSessionRecordBySessionId(escalationSession.sessionId);
			expect(sanityCheck?.sessionId).toBe(escalationSession.sessionId);

			// Write the production-shape pointer. The widget will keep calling
			// with `originSession.sessionId`; the fallback in `isValidRequest`
			// reads this and considers the escalation.
			if (!tasks.writeQueue) {
				throw new Error("test requires writeQueue / Redis");
			}
			const cached = await tasks.writeQueue.cacheSessionEscalation(
				originSession.sessionId,
				escalationSession.sessionId,
			);
			expect(cached).toBe(true);

			return {
				originSessionId: originSession.sessionId,
				escalationSessionId: escalationSession.sessionId,
			};
		};

		it("returns INCORRECT_CAPTCHA_TYPE *and preserves the escalation session* when /captcha/pow is called against an image-typed escalation", async () => {
			const { originSessionId, escalationSessionId } =
				await seedConsumedOriginPlusLiveEscalation({
					escalationCaptchaType: CaptchaType.image,
				});

			const body: GetPowCaptchaChallengeRequestBodyType = {
				user: userId,
				dapp: siteKey,
				sessionId: originSessionId,
			};
			const response = await testFetch(
				`${baseUrl}${ClientApiPaths.GetPowCaptchaChallenge}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
						Origin: "https://localhost",
						"Prosopo-Site-Key": siteKey,
						"Prosopo-User": userId,
					},
					body: JSON.stringify(body),
				},
			);
			const json = (await response.json()) as {
				error?: { code?: number; key?: string };
			};

			// Surface the new behaviour: the widget gets an explicit type
			// mismatch rather than NO_SESSION_FOUND. The error envelope
			// places the translation key (matching `ResultReason.INCORRECT_CAPTCHA_TYPE`)
			// under `.error.key`; `.error.code` carries the HTTP status.
			expect(response.status).toBe(400);
			expect(json.error?.key).toBe("API.INCORRECT_CAPTCHA_TYPE");

			// Pin the contract this PR is fixing: the escalation session
			// must still be present in Mongo AND still consumable. Before
			// the fix this call would consume the escalation session,
			// leaving the widget no recovery path. With the fix the
			// escalation session survives the mismatched /captcha/pow
			// call so /captcha/image with `escalationSessionId` can
			// still proceed.
			const survivor = await env
				.getDb()
				.getSessionRecordBySessionId(escalationSessionId);
			expect(survivor).toBeDefined();
			expect(survivor?.sessionId).toBe(escalationSessionId);
			expect(survivor?.captchaType).toBe(CaptchaType.image);
			// Crucially, a subsequent /captcha/image call would still be
			// able to consume the escalation session — modelled here by
			// calling checkAndRemoveSession directly (which is what the
			// /captcha/image handler reaches through `isValidRequest`).
			const recoveryConsume = await env
				.getDb()
				.checkAndRemoveSession(escalationSessionId);
			expect(recoveryConsume?.sessionId).toBe(escalationSessionId);

			// Single-use pointer was followed; subsequent retries on the
			// origin sessionId fall through cleanly to NO_SESSION_FOUND.
			if (!tasks.writeQueue) throw new Error("writeQueue missing");
			const pointerAfter =
				await tasks.writeQueue.getCachedSessionEscalation(originSessionId);
			expect(pointerAfter).toBeNull();
		});

		it("still consumes the escalation session when the requested type matches (regression guard for the happy path)", async () => {
			// Same setup, but the escalation is also a `pow` session so
			// the existing /captcha/pow path should resolve it through.
			// This guards against a regression where the peek branch
			// stops consuming on the match path.
			const { originSessionId, escalationSessionId } =
				await seedConsumedOriginPlusLiveEscalation({
					escalationCaptchaType: CaptchaType.pow,
				});

			const body: GetPowCaptchaChallengeRequestBodyType = {
				user: userId,
				dapp: siteKey,
				sessionId: originSessionId,
			};
			const response = await testFetch(
				`${baseUrl}${ClientApiPaths.GetPowCaptchaChallenge}`,
				{
					method: "POST",
					headers: {
						Connection: "close",
						"Content-Type": "application/json",
						Origin: "https://localhost",
						"Prosopo-Site-Key": siteKey,
						"Prosopo-User": userId,
					},
					body: JSON.stringify(body),
				},
			);
			expect(response.status).toBe(200);
			const challenge = (await response.json()) as { challenge?: string };
			expect(challenge.challenge).toBeDefined();

			// Escalation session was consumed (match path). `checkAndRemoveSession`
			// uses Mongo's `findOneAndUpdate({deleted: {$exists: false}}, {deleted: true})`
			// pattern, so the doc lingers but a second consume attempt
			// returns undefined — that's the canonical "session is gone"
			// check throughout the provider.
			const secondConsume = await env
				.getDb()
				.checkAndRemoveSession(escalationSessionId);
			expect(secondConsume).toBeUndefined();
		});
	});
});
