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
import { generateMnemonic, getPair } from "@prosopo/keyring";
import { Tasks, isTlsAvailable, startProviderApi } from "@prosopo/provider";
import {
	AdminApiPaths,
	ApiParams,
	CaptchaType,
	ClientSettingsSchema,
	DatabaseTypes,
	DecisionMachineLanguage,
	DecisionMachineRuntime,
	DecisionMachineScope,
	IpAddressType,
	ProsopoConfigSchema,
	Tier,
	encodeCounterKey,
} from "@prosopo/types";
import { randomAsHex } from "@prosopo/util-crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testFetch } from "./testUtils.js";

const REDIS_URL = process.env.REDIS_CONNECTION_URL ?? "redis://localhost:6379";
const REDIS_PASSWORD = process.env.REDIS_CONNECTION_PASSWORD ?? "root";
const MONGO_HOST = process.env.PROSOPO_DATABASE_HOST ?? "127.0.0.1";
const MONGO_PORT = process.env.PROSOPO_DATABASE_PORT ?? "27017";
const MONGO_USER = process.env.PROSOPO_DATABASE_USERNAME ?? "root";
const MONGO_PASS = process.env.PROSOPO_DATABASE_PASSWORD ?? "root";

const ADMIN_MNEMONIC =
	process.env.PROSOPO_ADMIN_MNEMONIC ??
	"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant";

const SAMPLE_USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";

describe("Routing Decision Machines (live local Mongo + Redis)", () => {
	let env: ProviderEnvironment;
	let tasks: Tasks;
	let server: Server | undefined;
	let testPort: number;
	let baseUrl: string;
	let dappAccount: string;
	let adminJwt: string;

	beforeAll(async () => {
		testPort = 20000 + (process.pid % 10000) + Math.floor(Math.random() * 5000);
		const protocol = isTlsAvailable() ? "https" : "http";
		baseUrl = `${protocol}://localhost:${testPort}`;

		const dbName = `prosopo_routing_test_${process.pid}_${Date.now()}`;
		const config = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: `${protocol}://localhost:${testPort}`,
			account: { secret: ADMIN_MNEMONIC },
			authAccount: { secret: ADMIN_MNEMONIC },
			database: {
				development: {
					type: DatabaseTypes.enum.provider,
					endpoint: `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}`,
					dbname: dbName,
					authSource: "admin",
				},
			},
			redisConnection: {
				url: REDIS_URL,
				password: REDIS_PASSWORD,
				indexName: randomAsHex(16),
			},
			ipApi: { baseUrl: "https://dummyUrl.com", apiKey: "dummyKey" },
			server: { baseURL: `${protocol}://localhost`, port: testPort },
		});

		env = new ProviderEnvironment(config);
		await env.isReady();

		tasks = new Tasks(env);
		await tasks.datasetManager.providerSetDataset(datasetWithSolutionHashes);
		[, dappAccount] = await generateMnemonic();
		await tasks.clientTaskManager.registerSiteKey(
			dappAccount,
			Tier.Free,
			ClientSettingsSchema.parse({
				captchaType: CaptchaType.frictionless,
				domains: ["localhost", "example.com"],
				frictionlessThreshold: 0.5,
				powDifficulty: 4,
				imageMaxRounds: 5,
			}),
		);
		const adminPair = getPair(ADMIN_MNEMONIC, undefined, "sr25519", 42);
		adminJwt = adminPair.jwtIssue();

		server = await startProviderApi(env, true, testPort);
		await new Promise<void>((resolve, reject) => {
			const t = setTimeout(
				() => reject(new Error("Provider start timeout")),
				5000,
			);
			const ck = setInterval(() => {
				if (server?.listening) {
					clearTimeout(t);
					clearInterval(ck);
					resolve();
				}
			}, 100);
		});
	}, 60_000);

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
	});

	const putMachine = async (source: string, name: string): Promise<Response> =>
		testFetch(`${baseUrl}${AdminApiPaths.UpdateDecisionMachine}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Prosopo-Site-Key": dappAccount,
				Authorization: `Bearer ${adminJwt}`,
			},
			body: JSON.stringify({
				[ApiParams.decisionMachineScope]: DecisionMachineScope.Global,
				[ApiParams.decisionMachineRuntime]: DecisionMachineRuntime.Node,
				[ApiParams.decisionMachineSource]: source,
				[ApiParams.decisionMachineLanguage]: DecisionMachineLanguage.JavaScript,
				[ApiParams.decisionMachineName]: name,
				[ApiParams.decisionMachineVersion]: "1.0.0",
			}),
		});

	const removeAll = async (): Promise<Response> =>
		testFetch(`${baseUrl}${AdminApiPaths.RemoveAllDecisionMachines}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Prosopo-Site-Key": dappAccount,
				Authorization: `Bearer ${adminJwt}`,
			},
			body: JSON.stringify({}),
		});

	const sendCaptchaViaRouter = async (
		baselineType: CaptchaType.image | CaptchaType.pow | CaptchaType.puzzle,
	) => {
		// Drive the FrictionlessManager directly — the routing-machine path is
		// what we care about, not the bot-detection ladder upstream of it.
		tasks.frictionlessManager.setSessionParams({
			token: `tok-${Date.now()}`,
			score: 0.4,
			threshold: 0.5,
			scoreComponents: { baseScore: 0.4 },
			providerSelectEntropy: 0,
			ipAddress: { lower: 16909060n, type: IpAddressType.v4 },
			webView: false,
			iFrame: false,
			decryptedHeadHash: "",
			siteKey: dappAccount,
			countryCode: "GB",
			headers: {},
		});
		tasks.frictionlessManager.setRoutingContext({
			dappAccount,
			userAccount: "0xroutetestuser",
			ip: "1.2.3.4",
			countryCode: "GB",
			score: 0.4,
			platform: { isApple: false, isWebView: false, isMobile: false },
			raw: { headers: {}, userAgent: SAMPLE_USER_AGENT },
		});
		switch (baselineType) {
			case CaptchaType.image:
				return tasks.frictionlessManager.sendImageCaptcha({
					solvedImagesCount: 5,
				});
			case CaptchaType.pow:
				return tasks.frictionlessManager.sendPowCaptcha({ powDifficulty: 4 });
			case CaptchaType.puzzle:
				return tasks.frictionlessManager.sendPuzzleCaptcha({});
		}
	};

	it("routes baseline to machine output", async () => {
		await removeAll();
		const source = `module.exports.route = function(input) {
			return { captchaType: 'image', solvedImagesCount: 2 };
		};`;
		const res = await putMachine(source, "force-image");
		expect(res.status).toBe(200);
		const response = await sendCaptchaViaRouter(CaptchaType.pow);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.image);
	});

	it("passes baseline through when machine returns undefined / no route", async () => {
		await removeAll();
		const source = "module.exports.unrelated = function() { return null; };";
		const res = await putMachine(source, "no-route");
		expect(res.status).toBe(200);
		const response = await sendCaptchaViaRouter(CaptchaType.pow);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.pow);
	});

	it("falls back to baseline when machine throws", async () => {
		await removeAll();
		const source = `module.exports.route = function() {
			throw new Error('intentional');
		};`;
		const res = await putMachine(source, "throwing");
		expect(res.status).toBe(200);
		const response = await sendCaptchaViaRouter(CaptchaType.pow);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.pow);
	});

	it("requiredCounters are fetched, exposed to route, and influence its choice", async () => {
		await removeAll();
		const source = `
			module.exports.requiredCounters = function(input) {
				return [{
					kind: 'served',
					captchaType: 'pow',
					dimension: 'ip',
					window: '10m'
				}];
			};
			module.exports.route = function(input) {
				var count = input.counters['cnt:' + input.dappAccount + ':served:pow:ip:' + input.ip + ':10m'] || 0;
				if (count >= 3) return { captchaType: 'image', solvedImagesCount: 2 };
				return { captchaType: 'pow', powDifficulty: 4 };
			};
		`;
		const res = await putMachine(source, "counter-based");
		expect(res.status).toBe(200);

		// Seed the counter to >=3 manually
		if (tasks.usageCounters) {
			for (let i = 0; i < 3; i++) {
				await tasks.usageCounters.incr(
					dappAccount,
					{
						kind: "served",
						captchaType: CaptchaType.pow,
						dimension: "ip",
						window: "10m",
					},
					"1.2.3.4",
				);
			}
		}

		const response = await sendCaptchaViaRouter(CaptchaType.pow);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.image);

		// Cleanup: zero out the seeded counter
		if (tasks.usageCounters) {
			const client = await env.getDb().getRedisConnection().getClient();
			await client.del(
				encodeCounterKey(
					dappAccount,
					{
						kind: "served",
						captchaType: CaptchaType.pow,
						dimension: "ip",
						window: "10m",
					},
					"1.2.3.4",
				),
			);
		}
	});

	it("admin PUT propagates immediately (cache invalidated on update)", async () => {
		await removeAll();

		const sourceA = `module.exports.route = function() {
			return { captchaType: 'image', solvedImagesCount: 2 };
		};`;
		expect((await putMachine(sourceA, "v-A")).status).toBe(200);
		const before = await sendCaptchaViaRouter(CaptchaType.pow);
		expect(before[ApiParams.captchaType]).toBe(CaptchaType.image);

		const sourceB = `module.exports.route = function() {
			return { captchaType: 'puzzle' };
		};`;
		expect((await putMachine(sourceB, "v-B")).status).toBe(200);
		// No sleep — cache should be invalidated by the PUT.
		const after = await sendCaptchaViaRouter(CaptchaType.pow);
		expect(after[ApiParams.captchaType]).toBe(CaptchaType.puzzle);
	});

	it("a single artifact exporting both verify and route is honoured for routing", async () => {
		await removeAll();
		// Dual-export source: verify() veto behaviour (unused by this test) +
		// route() that picks puzzle. Confirms the runner's findExport logic
		// can locate the right named export per phase.
		const source = `
			module.exports.verify = function() { return { decision: 'allow' }; };
			module.exports.route = function() { return { captchaType: 'puzzle' }; };
		`;
		const res = await putMachine(source, "dual-export");
		expect(res.status).toBe(200);
		const response = await sendCaptchaViaRouter(CaptchaType.pow);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.puzzle);
	});

	it("served counters are incremented after the response (fire-and-forget)", async () => {
		await removeAll();
		const response = await sendCaptchaViaRouter(CaptchaType.pow);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.pow);

		// Allow the fire-and-forget INCR to flush
		await new Promise((r) => setTimeout(r, 200));

		const result = await tasks.usageCounters?.batchGet(dappAccount, [
			{
				spec: {
					kind: "served",
					captchaType: CaptchaType.pow,
					dimension: "ip",
					window: "10m",
				},
				value: "1.2.3.4",
			},
			{
				spec: {
					kind: "served",
					captchaType: CaptchaType.pow,
					dimension: "userAccount",
					window: "10m",
				},
				value: "0xroutetestuser",
			},
		]);
		expect(result).not.toBeNull();
		const values = Object.values(result ?? {});
		expect(values).toHaveLength(2);
		for (const v of values) {
			expect(v).toBeGreaterThanOrEqual(1);
		}
	});
});
