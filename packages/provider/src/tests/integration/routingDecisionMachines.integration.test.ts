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
import { reservePort, testFetch } from "./testUtils.js";

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
		testPort = await reservePort();
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

	// Raw routing signals a test wants to vary. Cast at the call site because
	// the tcp-probe / trafficPolicies fields are optional additions to
	// RoutingMachineRawSignals.
	type ExtraRawSignals = Partial<
		Record<"tcpOptsOrder" | "tcpWscale" | "tcpMss", number>
	> & {
		trafficPolicies?: Record<
			string,
			{ action: string } & Record<string, unknown>
		>;
		ipInfo?: Record<string, unknown>;
	};

	const sendCaptchaViaRouter = async (
		baselineType: CaptchaType.image | CaptchaType.pow | CaptchaType.puzzle,
		extraRaw: ExtraRawSignals = {},
		userAgent: string = SAMPLE_USER_AGENT,
	) => {
		// Drive the FrictionlessManager directly — the routing-machine path is
		// what we care about, not the bot-detection ladder upstream of it.
		tasks.frictionlessManager.setSessionParams({
			token: `tok-${Date.now()}`,
			score: 0.4,
			threshold: 0.5,
			scoreComponents: { baseScore: 0.4 },
			ipAddress: { lower: 16909060n, type: IpAddressType.v4 },
			webView: false,
			iFrame: false,
			decryptedHeadHash: "",
			siteKey: dappAccount,
			// Session now stores the full IPInfoResponse instead of a
			// flat countryCode string.
			ipInfo: {
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
				countryCode: "GB",
			},
			headers: {},
		});
		tasks.frictionlessManager.setRoutingContext({
			dappAccount,
			userAccount: "0xroutetestuser",
			ip: "1.2.3.4",
			countryCode: "GB",
			score: 0.4,
			imageMaxRounds: 5,
			platform: { isApple: true, isWebView: false, isMobile: false },
			raw: {
				headers: {},
				userAgent,
				...extraRaw,
			} as unknown as Parameters<
				typeof tasks.frictionlessManager.setRoutingContext
			>[0]["raw"],
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

	// ------------------------------------------------------------------
	// Router-supplied puzzle render overrides.
	//
	// A router that inherits a trafficFilter `challenge` policy has to be able
	// to reproduce it exactly, and those policies carry puzzle tunables.
	// getPuzzleCaptchaChallenge re-derives its overrides from a live
	// trafficFilter verdict, which a router-chosen puzzle has no counterpart
	// for — so the values ride on RoutingMachineOutput, get persisted on the
	// session, and are read back at challenge time.
	// ------------------------------------------------------------------

	// `sessionId` is optional on the response type but always present on the
	// captcha-serving paths these tests drive; assert rather than widen the
	// helper, so a missing id fails loudly instead of silently skipping.
	const latestSession = async (sessionId: string | undefined) => {
		expect(sessionId).toBeDefined();
		return env.getDb().getSessionRecordBySessionId(sessionId as string);
	};

	it("persists router-supplied puzzleTolerance and puzzle settings on the session", async () => {
		await removeAll();
		const source = `module.exports.route = function() {
			return {
				captchaType: 'puzzle',
				puzzleTolerance: 7,
				puzzle: { decoyCount: 14, pieceScale: { min: 0.2, max: 0.35 } }
			};
		};`;
		expect((await putMachine(source, "puzzle-overrides")).status).toBe(200);

		const response = await sendCaptchaViaRouter(CaptchaType.pow);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.puzzle);

		const session = await latestSession(response[ApiParams.sessionId]);
		expect(session?.puzzleTolerance).toBe(7);
		expect(session?.puzzle).toEqual({
			decoyCount: 14,
			pieceScale: { min: 0.2, max: 0.35 },
		});
	});

	it("accepts a partial puzzle override without filling in the rest", async () => {
		await removeAll();
		const source = `module.exports.route = function() {
			return { captchaType: 'puzzle', puzzle: { decoyCount: 30 } };
		};`;
		expect((await putMachine(source, "puzzle-partial")).status).toBe(200);

		const response = await sendCaptchaViaRouter(CaptchaType.pow);
		const session = await latestSession(response[ApiParams.sessionId]);
		expect(session?.puzzle).toEqual({ decoyCount: 30 });
		expect(session?.puzzleTolerance).toBeUndefined();
	});

	it("does not persist puzzle overrides on a non-puzzle session", async () => {
		await removeAll();
		const source = `module.exports.route = function() {
			return {
				captchaType: 'image',
				solvedImagesCount: 2,
				puzzleTolerance: 7,
				puzzle: { decoyCount: 14 }
			};
		};`;
		expect((await putMachine(source, "puzzle-on-image")).status).toBe(200);

		const response = await sendCaptchaViaRouter(CaptchaType.pow);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.image);
		const session = await latestSession(response[ApiParams.sessionId]);
		expect(session?.puzzleTolerance).toBeUndefined();
		expect(session?.puzzle).toBeUndefined();
	});

	// RoutingMachineOutputSchema reuses the site-wide field validators, so a
	// machine cannot hand the renderer a value the portal would reject. An
	// invalid output fails validation and the whole route falls back to
	// baseline.
	it("rejects an out-of-bounds puzzleTolerance and falls back to baseline", async () => {
		await removeAll();
		const source = `module.exports.route = function() {
			return { captchaType: 'puzzle', puzzleTolerance: 100000 };
		};`;
		expect((await putMachine(source, "puzzle-bad-tolerance")).status).toBe(200);

		const response = await sendCaptchaViaRouter(CaptchaType.pow);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.pow);
	});

	it("rejects an out-of-bounds decoyCount and falls back to baseline", async () => {
		await removeAll();
		const source = `module.exports.route = function() {
			return { captchaType: 'puzzle', puzzle: { decoyCount: 9999 } };
		};`;
		expect((await putMachine(source, "puzzle-bad-decoy")).status).toBe(200);

		const response = await sendCaptchaViaRouter(CaptchaType.pow);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.pow);
	});

	// ------------------------------------------------------------------
	// trafficPolicies reach the machine, and the undeclared-middlebox rule
	// behaves as designed end to end.
	// ------------------------------------------------------------------

	const IPHONE_UA =
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
	const CLEAN_IPINFO = {
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
		countryCode: "GB",
	};
	// Arbitrary sentinel SYN values. These tests exist to prove the provider
	// plumbs `trafficPolicies` and the puzzle overrides through to a routing
	// machine and back onto the session — NOT to test any particular
	// fingerprint. The real signature values are operator-authored detection
	// content and live with the machines, not in this repo.
	const SENTINEL_MATCH_STACK = { tcpOptsOrder: 111111, tcpWscale: 99 };
	const SENTINEL_MISS_STACK = { tcpOptsOrder: 222222, tcpWscale: 98 };

	// Stands in for any egress-classifying machine: it reads a raw TCP signal
	// and, when the signal matches and the intel feed says the IP is clean,
	// inherits whichever of the site's vpn / datacenter policies is strictest.
	const POLICY_INHERITING_MACHINE = `
		module.exports.route = function(input) {
			var raw = input.raw || {};
			var ip = raw.ipInfo || {};
			if (!ip.isValid) return undefined;
			if (ip.isVPN || ip.isProxy || ip.isDatacenter) return undefined;
			if (raw.tcpOptsOrder !== ${SENTINEL_MATCH_STACK.tcpOptsOrder}) return undefined;
			if (raw.tcpWscale !== ${SENTINEL_MATCH_STACK.tcpWscale}) return undefined;
			var p = raw.trafficPolicies || {};
			var candidates = [p.vpn, p.datacenter].filter(Boolean);
			var blocking = candidates.filter(function (c) { return c.action === 'block'; });
			if (blocking.length) return undefined;
			var challenge = candidates.filter(function (c) { return c.action === 'challenge'; })[0];
			if (!challenge || !challenge.captchaType) return undefined;
			var out = { captchaType: challenge.captchaType, reason: 'TEST_POLICY_INHERITED' };
			if (challenge.puzzleTolerance !== undefined) out.puzzleTolerance = challenge.puzzleTolerance;
			if (challenge.puzzle) out.puzzle = challenge.puzzle;
			if (challenge.solvedImagesCount !== undefined) out.solvedImagesCount = challenge.solvedImagesCount;
			return out;
		};
	`;

	it("forwards trafficPolicies to the machine and inherits the challenge policy end to end", async () => {
		await removeAll();
		expect(
			(await putMachine(POLICY_INHERITING_MACHINE, "undeclared-middlebox"))
				.status,
		).toBe(200);

		const response = await sendCaptchaViaRouter(
			CaptchaType.pow,
			{
				...SENTINEL_MATCH_STACK,
				ipInfo: CLEAN_IPINFO,
				trafficPolicies: {
					vpn: {
						action: "challenge",
						captchaType: "puzzle",
						puzzleTolerance: 6,
						puzzle: { decoyCount: 20 },
					},
				},
			},
			IPHONE_UA,
		);

		expect(response[ApiParams.captchaType]).toBe(CaptchaType.puzzle);
		const session = await latestSession(response[ApiParams.sessionId]);
		expect(session?.reason).toBe("TEST_POLICY_INHERITED");
		expect(session?.puzzleTolerance).toBe(6);
		expect(session?.puzzle).toEqual({ decoyCount: 20 });
	});

	it("leaves the baseline alone when the site configured no VPN or datacenter policy", async () => {
		await removeAll();
		expect(
			(await putMachine(POLICY_INHERITING_MACHINE, "undeclared-no-policy"))
				.status,
		).toBe(200);

		const response = await sendCaptchaViaRouter(
			CaptchaType.pow,
			{ ...SENTINEL_MATCH_STACK, ipInfo: CLEAN_IPINFO },
			IPHONE_UA,
		);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.pow);
	});

	it("leaves the baseline alone when the TCP signal does not match", async () => {
		await removeAll();
		expect(
			(await putMachine(POLICY_INHERITING_MACHINE, "undeclared-native")).status,
		).toBe(200);

		const response = await sendCaptchaViaRouter(
			CaptchaType.pow,
			{
				...SENTINEL_MISS_STACK,
				ipInfo: CLEAN_IPINFO,
				trafficPolicies: {
					vpn: { action: "challenge", captchaType: "puzzle" },
				},
			},
			IPHONE_UA,
		);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.pow);
	});

	it("defers to the verify-time deny rule when the policy is block", async () => {
		await removeAll();
		expect(
			(await putMachine(POLICY_INHERITING_MACHINE, "undeclared-block")).status,
		).toBe(200);

		const response = await sendCaptchaViaRouter(
			CaptchaType.pow,
			{
				...SENTINEL_MATCH_STACK,
				ipInfo: CLEAN_IPINFO,
				trafficPolicies: { vpn: { action: "block" } },
			},
			IPHONE_UA,
		);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.pow);
	});

	it("inherits the datacenter policy when only datacenter is configured", async () => {
		await removeAll();
		expect(
			(await putMachine(POLICY_INHERITING_MACHINE, "undeclared-dc")).status,
		).toBe(200);

		const response = await sendCaptchaViaRouter(
			CaptchaType.pow,
			{
				...SENTINEL_MATCH_STACK,
				ipInfo: CLEAN_IPINFO,
				trafficPolicies: {
					datacenter: {
						action: "challenge",
						captchaType: "image",
						solvedImagesCount: 3,
					},
				},
			},
			IPHONE_UA,
		);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.image);
		const session = await latestSession(response[ApiParams.sessionId]);
		expect(session?.solvedImagesCount).toBe(3);
	});

	// The machine consults vpn / datacenter only; a proxy-only policy must
	// not be borrowed.
	it("ignores a proxy-only policy for the middlebox signature", async () => {
		await removeAll();
		expect(
			(await putMachine(POLICY_INHERITING_MACHINE, "undeclared-proxy-only"))
				.status,
		).toBe(200);

		const response = await sendCaptchaViaRouter(
			CaptchaType.pow,
			{
				...SENTINEL_MATCH_STACK,
				ipInfo: CLEAN_IPINFO,
				trafficPolicies: {
					proxy: { action: "challenge", captchaType: "puzzle" },
				},
			},
			IPHONE_UA,
		);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.pow);
	});

	it("does not fire when the intel feed already tagged the IP", async () => {
		await removeAll();
		expect(
			(await putMachine(POLICY_INHERITING_MACHINE, "undeclared-tagged")).status,
		).toBe(200);

		const response = await sendCaptchaViaRouter(
			CaptchaType.pow,
			{
				...SENTINEL_MATCH_STACK,
				ipInfo: { ...CLEAN_IPINFO, isVPN: true },
				trafficPolicies: {
					vpn: { action: "challenge", captchaType: "puzzle" },
				},
			},
			IPHONE_UA,
		);
		expect(response[ApiParams.captchaType]).toBe(CaptchaType.pow);
	});

	// ------------------------------------------------------------------
	// Projection regression guard.
	//
	// getSessionRecordBySessionId projects an explicit field list. Three
	// separate features have silently degraded because a field was written to
	// Mongo but never selected on the way back out, so the reader saw
	// `undefined` with no error anywhere. The return type is now derived from
	// the projection (ProjectedSession), which catches new cases at compile
	// time — this test covers the runtime half: that the fields really do
	// round-trip through Mongo.
	// ------------------------------------------------------------------
	it("round-trips every field a caller reads off a session record", async () => {
		await removeAll();
		const source = `module.exports.route = function() {
			return { captchaType: 'puzzle', puzzleTolerance: 9, puzzle: { decoyCount: 11 } };
		};`;
		expect((await putMachine(source, "projection-roundtrip")).status).toBe(200);

		const response = await sendCaptchaViaRouter(
			CaptchaType.pow,
			{ ...SENTINEL_MATCH_STACK, tcpMss: 1460, ipInfo: CLEAN_IPINFO },
			IPHONE_UA,
		);
		const sessionId = response[ApiParams.sessionId];
		// tcp-probe signals reach the record through setSessionParams, not the
		// routing context, so write them the way the middleware does.
		await env.getDb().updateSessionRecord(sessionId as string, {
			...SENTINEL_MATCH_STACK,
			tcpMss: 1460,
		});
		const session = await latestSession(sessionId);
		expect(session).toBeDefined();

		// Router-chosen puzzle tunables.
		expect(session?.puzzleTolerance).toBe(9);
		expect(session?.puzzle).toEqual({ decoyCount: 11 });
		// tcp-probe signals the verify-time decide rules gate on.
		expect(session?.tcpOptsOrder).toBe(111111);
		expect(session?.tcpWscale).toBe(99);
		expect(session?.tcpMss).toBe(1460);
		// Core identity / scoring fields.
		expect(session?.sessionId).toBe(response[ApiParams.sessionId]);
		expect(session?.siteKey).toBe(dappAccount);
		expect(session?.score).toBe(0.4);
		expect(session?.ipInfo?.isValid).toBe(true);
	});

	// The entropy fingerprints and the compact g/i/sw/md/bn/fs flags were
	// written but never projected, so `getSessionRecordWithOriginFallback`
	// saw every one as undefined: it always believed the escalation session
	// was missing them, always issued a second query for the origin, and
	// always copied nothing back because the origin read as undefined too.
	it("projects the entropy fingerprints and capability flags", async () => {
		await removeAll();
		tasks.frictionlessManager.setSessionParams({
			token: `tok-entropy-${Date.now()}`,
			score: 0.4,
			threshold: 0.5,
			scoreComponents: { baseScore: 0.4 },
			ipAddress: { lower: 16909060n, type: IpAddressType.v4 },
			webView: false,
			iFrame: false,
			decryptedHeadHash: "",
			siteKey: dappAccount,
			headers: {},
			entropyMathRandomFingerprint: "mathfp",
			entropyCryptoFingerprint: "cryptofp",
			entropyWallClockOffsetMs: 42,
			entropyMathRandomFirst: 0.5,
			g: "gval",
			i: true,
			sw: true,
			md: true,
			bn: true,
			fs: true,
			isProtect: true,
		});
		const response = await tasks.frictionlessManager.sendPowCaptcha({
			powDifficulty: 7,
		});
		// `ruleType` is written by the access-policy path
		// (blacklistRequestInspector), not by setSessionParams — set it the
		// same way that path would so the projection is what is under test.
		await env
			.getDb()
			.updateSessionRecord(response[ApiParams.sessionId] as string, {
				ruleType: ["some-rule"],
			});
		const session = await latestSession(response[ApiParams.sessionId]);

		expect(session?.entropyMathRandomFingerprint).toBe("mathfp");
		expect(session?.entropyCryptoFingerprint).toBe("cryptofp");
		expect(session?.entropyWallClockOffsetMs).toBe(42);
		expect(session?.entropyMathRandomFirst).toBe(0.5);
		expect(session?.g).toBe("gval");
		expect(session?.i).toBe(true);
		expect(session?.sw).toBe(true);
		expect(session?.md).toBe(true);
		expect(session?.bn).toBe(true);
		expect(session?.fs).toBe(true);
		expect(session?.isProtect).toBe(true);
		expect(session?.ruleType).toEqual(["some-rule"]);
		expect(session?.powDifficulty).toBe(7);
	});
});
