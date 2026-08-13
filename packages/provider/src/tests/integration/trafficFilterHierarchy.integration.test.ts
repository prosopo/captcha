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

// Covers the captcha-type-and-params selection hierarchy end-to-end. The
// four-tier ordering (AccessPolicy > TrafficFilter > DecisionMachine >
// site default) is enforced by the frictionless handler; the request-time
// parameter cascade (TrafficFilter → session → AccessPolicy → siteSettings)
// is enforced by the direct pow/image/puzzle handlers.
//
// The pow endpoint is exercised as the representative direct handler
// because the trafficFilter integration is identical across pow/image/
// puzzle (all three call `applyTrafficFilterAtRequestTime` before the
// parameter cascade). Full frictionless-flow coverage of the AccessPolicy
// vs TrafficFilter ordering lives in the unit tests for the individual
// dispatchers (`handleFrictionlessTrafficFilter.unit.test.ts`).

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
	type IPInfoResponse,
	type IPInfoResult,
	type ITrafficFilter,
	ProsopoConfigSchema,
	Tier,
	TrafficFilterAction,
} from "@prosopo/types";
import { randomAsHex } from "@prosopo/util-crypto";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { reservePort, testFetch } from "./testUtils.js";

const clean = (): IPInfoResult => ({
	ip: "1.2.3.4",
	isValid: true,
	isVPN: false,
	isTor: false,
	isProxy: false,
	isDatacenter: false,
	isAbuser: false,
	isMobile: false,
	isSatellite: false,
	isCrawler: false,
});

const vpn = (): IPInfoResult => ({ ...clean(), isVPN: true });

describe("Captcha type + params selection hierarchy (integration)", () => {
	let env: ProviderEnvironment;
	let mongoContainer: StartedTestContainer;
	let redisContainer: StartedTestContainer | undefined;
	let server: Server | undefined;
	let tasks: Tasks;
	let testPort: number;
	let baseUrl: string;
	// Mutable stub that individual `it` blocks swap out before each request
	// to control what ipInfoMiddleware sees.
	let currentIpInfo: IPInfoResponse = clean();

	beforeAll(async () => {
		testPort = await reservePort();
		const protocol = isTlsAvailable() ? "https" : "http";
		baseUrl = `${protocol}://localhost:${testPort}`;

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

		const skipRedis = process.env.SKIP_REDIS === "true";
		let redisHost = "localhost";
		let redisPort = 6379;
		if (!skipRedis) {
			try {
				redisContainer = await new GenericContainer("redis/redis-stack:latest")
					.withExposedPorts(6379)
					.withEnvironment({ REDIS_ARGS: "--requirepass root" })
					.start();
				redisHost = redisContainer.getHost();
				redisPort = redisContainer.getMappedPort(6379);
			} catch (error) {
				console.warn("Failed to start Redis container:", error);
			}
		}

		const config = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: `${protocol}://localhost:${testPort}`,
			account: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			authAccount: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			database: {
				development: {
					type: DatabaseTypes.enum.provider,
					endpoint: `mongodb://root:root@${mongoHost}:${mongoPort}`,
					dbname: `prosopo_hierarchy_test_${Date.now()}`,
					authSource: "admin",
				},
			},
			...(redisContainer
				? {
						redisConnection: {
							url: `redis://:${encodeURIComponent("root")}@${redisHost}:${redisPort}`,
							password: "root",
							indexName: randomAsHex(16),
						},
					}
				: {}),
			ipApi: { baseUrl: "https://dummyUrl.com", apiKey: "dummyKey" },
			server: { baseURL: `${protocol}://localhost`, port: testPort },
		});

		env = new ProviderEnvironment(config);
		await env.isReady();

		// Stub the ipInfoService before requests hit the middleware. Returns
		// whatever the current test has set in `currentIpInfo` — bypasses the
		// upstream sidecar entirely.
		env.ipInfoService = {
			initialize: async () => {},
			isAvailable: () => true,
			lookup: async () => currentIpInfo,
		};

		tasks = new Tasks(env);
		await tasks.datasetManager.providerSetDataset(datasetWithSolutionHashes);
		server = await startProviderApi(env, true, testPort);
	}, 120_000);

	afterAll(async () => {
		if (server) {
			await new Promise<void>((resolve) => {
				server?.close(() => resolve());
			});
		}
		if (env) {
			try {
				await env.getDb().close();
			} catch {}
		}
		if (redisContainer) {
			try {
				await redisContainer.stop();
			} catch {}
		}
		if (mongoContainer) {
			try {
				await mongoContainer.stop();
			} catch {}
		}
	});

	const registerSite = async (
		trafficFilter?: Partial<ITrafficFilter>,
		powDifficulty = 3,
	): Promise<string> => {
		const [, siteKey] = await generateMnemonic();
		await tasks.clientTaskManager.registerSiteKey(
			siteKey,
			Tier.Professional,
			ClientSettingsSchema.parse({
				captchaType: CaptchaType.pow,
				domains: ["localhost", "example.com"],
				powDifficulty,
				...(trafficFilter && { trafficFilter }),
			}),
		);
		return siteKey;
	};

	const getPow = async (
		siteKey: string,
	): Promise<{ status: number; body: unknown }> => {
		const [, userId] = await generateMnemonic();
		const body: GetPowCaptchaChallengeRequestBodyType = {
			user: userId,
			dapp: siteKey,
		};
		const res = await testFetch(
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
		const parsed = res.status === 200 ? await res.json() : null;
		return { status: res.status, body: parsed };
	};

	describe("Tier 4: site default (no trafficFilter, no matching policy)", () => {
		it("serves the pow difficulty from clientSettings.powDifficulty", async () => {
			currentIpInfo = clean();
			const siteKey = await registerSite(undefined, 3);
			const { status, body } = await getPow(siteKey);
			expect(status).toBe(200);
			expect((body as { difficulty: number }).difficulty).toBe(3);
		});
	});

	describe("Tier 2: TrafficFilter — challenge action overrides site default", () => {
		it("serves the trafficFilter powDifficulty when the request IP matches a challenge category", async () => {
			currentIpInfo = vpn();
			const siteKey = await registerSite(
				{
					vpn: {
						action: TrafficFilterAction.Challenge,
						captchaType: CaptchaType.pow,
						powDifficulty: 8,
					},
				},
				3, // site default; should be beaten by the trafficFilter override
			);
			const { status, body } = await getPow(siteKey);
			expect(status).toBe(200);
			expect((body as { difficulty: number }).difficulty).toBe(8);
		});

		it("returns 401 when the request IP matches a block category", async () => {
			currentIpInfo = vpn();
			const siteKey = await registerSite({
				vpn: { action: TrafficFilterAction.Block },
			});
			const { status } = await getPow(siteKey);
			expect(status).toBe(401);
		});

		it("falls through to site default when the request IP does not match the trafficFilter category", async () => {
			currentIpInfo = clean(); // no isVPN — the vpn category will not fire
			const siteKey = await registerSite(
				{
					vpn: {
						action: TrafficFilterAction.Challenge,
						captchaType: CaptchaType.pow,
						powDifficulty: 8,
					},
				},
				3,
			);
			const { status, body } = await getPow(siteKey);
			expect(status).toBe(200);
			expect((body as { difficulty: number }).difficulty).toBe(3);
		});

		it("applies the abuser default (implicit block) even without an explicit trafficFilter entry", async () => {
			const abuser: IPInfoResult = {
				...clean(),
				isAbuser: true,
				abuserScore: 0.9,
				companyAbuserScore: 0.9,
			};
			currentIpInfo = abuser;
			// Site has an empty trafficFilter — abuser default fires from
			// resolveTrafficFilterCheck at the request-time helper.
			const siteKey = await registerSite({});
			const { status } = await getPow(siteKey);
			expect(status).toBe(401);
		});
	});
});
