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

// Why this test exists:
//
// A provider can boot with MAINTENANCE_MODE=true (e.g. during a Mongo outage or
// a maintenance window). The captcha request path short-circuits to a "pass" so
// the widget keeps rendering, but operators still need the admin endpoints —
// adding/removing site keys (access rules) and detector keys — to work so they
// can fix state and recover. Previously the admin router was skipped entirely at
// boot in maintenance mode (its DB-backed Tasks couldn't be constructed), so
// every admin call 404'd.
//
// This suite boots the real Express app via startProviderApi against a real
// Mongo + Redis with MAINTENANCE_MODE=true and asserts, over HTTP, that:
//   - the captcha challenge still returns a maintenance dummy (mode is active),
//   - site keys can be registered and removed and the change lands in Mongo,
//   - detector keys can be added and removed,
//   - admin auth is still enforced (401 without a JWT).

import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Server } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ApiEndpointResponseStatus } from "@prosopo/api-route";
import { ProviderEnvironment } from "@prosopo/env";
import { generateMnemonic } from "@prosopo/keyring";
import { isTlsAvailable, startProviderApi } from "@prosopo/provider";
import {
	AdminApiPaths,
	CaptchaType,
	ClientApiPaths,
	ClientSettingsSchema,
	DatabaseTypes,
	type GetPowCaptchaChallengeRequestBodyType,
	type GetPowCaptchaResponse,
	ProsopoConfigSchema,
	type RegisterSitekeyBodyTypeOutput,
	Tier,
} from "@prosopo/types";
import { randomAsHex } from "@prosopo/util-crypto";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { Agent, fetch } from "undici";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

interface AdminResponse {
	status: ApiEndpointResponseStatus;
	data?: { activeDetectorKeys?: string[] };
	error?: string;
}

// The provider serves HTTPS with the repo's self-signed cert when it is present
// (see startProviderApi/isTlsAvailable). Build a dispatcher that trusts THAT
// cert as a CA — proper certificate validation, not a bypass. Returns undefined
// when there is no cert (the server runs over plain HTTP, e.g. in CI).
const certPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../../../certs/server.crt",
);
const buildDispatcher = (): Agent | undefined => {
	if (!isTlsAvailable()) {
		return undefined;
	}
	return new Agent({ connect: { ca: readFileSync(certPath, "utf8") } });
};

// A valid detector key is the base64 of a PEM (pkcs8) private key — that's what
// ClientTaskManager.updateDetectorKey validates before storing.
const makeDetectorKey = (): string => {
	const { privateKey } = generateKeyPairSync("ed25519");
	const pem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
	return Buffer.from(pem).toString("base64");
};

const waitFor = async (
	predicate: () => boolean,
	timeoutMs: number,
	intervalMs = 100,
): Promise<void> => {
	const start = Date.now();
	while (!predicate()) {
		if (Date.now() - start > timeoutMs) {
			throw new Error("Timed out waiting for condition");
		}
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}
};

describe("Maintenance mode — admin endpoints stay available", () => {
	let env: ProviderEnvironment;
	let mongoContainer: StartedTestContainer;
	let redisContainer: StartedTestContainer | undefined;
	let server: Server | undefined;
	let testPort: number;
	let baseUrl: string;
	let adminAccount: string;
	let adminJwt: string;
	// undici dispatcher that trusts the provider's own self-signed cert (only
	// set when the server is serving HTTPS). We pin the cert as a trusted CA
	// rather than disabling certificate validation.
	let dispatcher: Agent | undefined;

	beforeAll(async () => {
		// Boot the provider process already in maintenance mode. Read at request
		// time by the handlers and (now) drives the background DB connect.
		process.env.MAINTENANCE_MODE = "true";

		testPort = 30000 + (process.pid % 10000) + Math.floor(Math.random() * 5000);
		const protocol = isTlsAvailable() ? "https" : "http";
		baseUrl = `${protocol}://localhost:${testPort}`;
		dispatcher = buildDispatcher();

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

		let redisHost = "localhost";
		let redisPort = 6379;
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
					dbname: "prosopo_test",
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

		// isReady() kicks off the DB connection in the background in maintenance
		// mode. Wait for it to settle so the admin writes below are deterministic.
		await waitFor(() => env.getDb().connected === true, 30_000);

		const pair = env.getPair();
		adminAccount = pair.address;
		adminJwt = pair.jwtIssue();

		server = await startProviderApi(env, true, testPort);
		await waitFor(() => server?.listening === true, 10_000);
	}, 120_000);

	afterAll(async () => {
		if (server) {
			await new Promise<void>((resolve) => server?.close(() => resolve()));
			server = undefined;
		}
		if (env) {
			try {
				await env.getDb().close();
			} catch (error) {
				console.error("Error closing database:", error);
			}
		}
		if (redisContainer) {
			try {
				await redisContainer.stop();
			} catch (error) {
				console.error("Error stopping redis container:", error);
			}
		}
		if (mongoContainer) {
			try {
				await mongoContainer.stop();
			} catch (error) {
				console.error("Error stopping mongo container:", error);
			}
		}
		if (dispatcher) {
			await dispatcher.close();
		}
		process.env.MAINTENANCE_MODE = undefined;
	});

	const adminHeaders = (): Record<string, string> => ({
		"Content-Type": "application/json",
		"Prosopo-Site-Key": adminAccount,
		Authorization: `Bearer ${adminJwt}`,
	});

	const minimalSettings = () =>
		ClientSettingsSchema.parse({
			captchaType: CaptchaType.pow,
			domains: ["localhost", "example.com"],
			frictionlessThreshold: 0.5,
			powDifficulty: 1,
		});

	it("still serves the captcha challenge as a maintenance dummy", async () => {
		const [, siteKey] = await generateMnemonic();
		const [, userId] = await generateMnemonic();
		const body: GetPowCaptchaChallengeRequestBodyType = {
			user: userId,
			dapp: siteKey,
		};

		const response = await fetch(
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
				dispatcher,
			},
		);

		expect(response.status).toBe(200);
		const data = (await response.json()) as GetPowCaptchaResponse;
		// The maintenance dummy has difficulty 1 and an empty provider signature.
		expect(data.difficulty).toBe(1);
		expect(data.signature.provider.challenge).toBe("");
	});

	it("registers a site key (access rule) via the admin API and persists it to Mongo", async () => {
		const [, siteKey] = await generateMnemonic();
		const registerBody: RegisterSitekeyBodyTypeOutput = {
			siteKey,
			tier: Tier.Free,
			settings: minimalSettings(),
		};

		const response = await fetch(`${baseUrl}${AdminApiPaths.SiteKeyRegister}`, {
			method: "POST",
			headers: adminHeaders(),
			body: JSON.stringify(registerBody),
			dispatcher,
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as AdminResponse;
		expect(data.status).toBe(ApiEndpointResponseStatus.SUCCESS);

		// The write must have reached Mongo — not been silently skipped.
		const record = await env.getDb().getClientRecord(siteKey);
		expect(record).toBeDefined();
		expect(record?.account).toBe(siteKey);
	});

	it("removes a site key (access rule) via the admin API and deletes it from Mongo", async () => {
		const [, siteKey] = await generateMnemonic();
		await fetch(`${baseUrl}${AdminApiPaths.SiteKeyRegister}`, {
			method: "POST",
			headers: adminHeaders(),
			body: JSON.stringify({
				siteKey,
				tier: Tier.Free,
				settings: minimalSettings(),
			}),
			dispatcher,
		});
		expect(await env.getDb().getClientRecord(siteKey)).toBeDefined();

		const response = await fetch(`${baseUrl}${AdminApiPaths.SiteKeyRemove}`, {
			method: "POST",
			headers: adminHeaders(),
			body: JSON.stringify({ siteKey }),
			dispatcher,
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as AdminResponse;
		expect(data.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(await env.getDb().getClientRecord(siteKey)).toBeUndefined();
	});

	it("adds and removes a detector key via the admin API", async () => {
		const detectorKey = makeDetectorKey();

		const addResponse = await fetch(
			`${baseUrl}${AdminApiPaths.UpdateDetectorKey}`,
			{
				method: "POST",
				headers: adminHeaders(),
				body: JSON.stringify({ detectorKey }),
				dispatcher,
			},
		);
		expect(addResponse.status).toBe(200);
		const addData = (await addResponse.json()) as AdminResponse;
		expect(addData.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(addData.data?.activeDetectorKeys).toContain(detectorKey);

		const removeResponse = await fetch(
			`${baseUrl}${AdminApiPaths.RemoveDetectorKey}`,
			{
				method: "POST",
				headers: adminHeaders(),
				body: JSON.stringify({ detectorKey }),
				dispatcher,
			},
		);
		expect(removeResponse.status).toBe(200);
		const removeData = (await removeResponse.json()) as AdminResponse;
		expect(removeData.status).toBe(ApiEndpointResponseStatus.SUCCESS);
	});

	it("still rejects unauthenticated admin requests with 401", async () => {
		const [, siteKey] = await generateMnemonic();
		const response = await fetch(`${baseUrl}${AdminApiPaths.SiteKeyRegister}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ siteKey, tier: Tier.Free }),
			dispatcher,
		});

		expect(response.status).toBe(401);
	});
});
