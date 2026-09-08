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

// End-to-end coverage of the authenticated (Web Bot Auth) fast path, over
// real HTTP against a real provider, Mongo and Redis.
//
// Two halves, because the flow has two independent trust decisions:
//
//   1. Entry. `/captcha/frictionless` returns `captchaType: authenticated`
//      when a non-deferToVerify Allow policy matches the request's user
//      scope. One of the ways to qualify is a verified `Signature-Agent`, so
//      a real RFC 9421 signature is produced here — Ed25519 keypair, JWKS
//      served from a throwaway HTTP origin, signature base built by the same
//      code the verifier consumes. The rest of the qualifiers (IP, JA4, UA,
//      ASN, country) are ordinary access-rule fields and are covered by the
//      user-agent-scoped cases.
//
//   2. Redemption. `/client/authenticated/verify` is the only thing that
//      consumes the session, and it is the entire replay defence: mandatory
//      IP binding, single use, and a captcha-type gate so an ordinary
//      image/pow/puzzle token can't be redeemed on this route. Each of those
//      is asserted against a session that was really minted by the entry
//      path, not a hand-built record — a projection or schema change that
//      silently drops `serverChecked` would let a token verify forever, and
//      that is exactly the class of bug this file exists to catch.

import { createServer } from "node:http";
import type { Server as HttpServer } from "node:http";
import type { Server } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ed25519 } from "@noble/curves/ed25519";
import { stringToU8a, u8aToHex } from "@polkadot/util";
import { ProviderEnvironment } from "@prosopo/env";
import { generateMnemonic, getPair } from "@prosopo/keyring";
import { Tasks, isTlsAvailable, startProviderApi } from "@prosopo/provider";
import {
	ApiParams,
	CaptchaType,
	ClientApiPaths,
	ClientSettingsSchema,
	DatabaseTypes,
	type GetFrictionlessCaptchaChallengeRequestBodyOutput,
	type IPInfoResult,
	ProsopoConfigSchema,
	Tier,
	type VerifySolutionBodyTypeInput,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import {
	AccessPolicyType,
	type AccessRulesStorage,
	accessRuleInput,
} from "@prosopo/user-access-policy";
import { randomAsHex } from "@prosopo/util-crypto";
import { buildSignatureBase } from "@prosopo/web-bot-auth";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getVerdictCache } from "../../api/blacklistRequestInspector.js";
import { reservePort, testFetch } from "./testUtils.js";

const KEY_ID = "web-bot-auth-integration-key";

const cleanIpInfo = (ip: string): IPInfoResult => ({
	ip,
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

const toBase64 = (bytes: Uint8Array): string => {
	let bin = "";
	for (let i = 0; i < bytes.length; i++)
		bin += String.fromCharCode(bytes[i] as number);
	return btoa(bin);
};
const toBase64Url = (bytes: Uint8Array): string =>
	toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

interface FrictionlessResponse {
	captchaType?: string;
	sessionId?: string;
	status?: string;
	agent?: string;
}

interface VerifyResponse {
	status?: string;
	verified?: boolean;
}

describe("Web Bot Auth authenticated flow (integration)", () => {
	let env: ProviderEnvironment;
	let tasks: Tasks;
	let accessRulesStorage: AccessRulesStorage;
	let mongoContainer: StartedTestContainer;
	let redisContainer: StartedTestContainer;
	let server: Server | undefined;
	let jwksServer: HttpServer | undefined;
	let baseUrl: string;
	let testPort: number;
	let authority: string;
	// The signer origin the Signature-Agent header names. http:// rather than
	// https:// so the JWKS can be served without a cert; the verifier accepts
	// either scheme and the provider fetches the directory with global fetch.
	let signerUrl: string;
	let privateKey: Uint8Array;
	let publicKey: Uint8Array;
	let jwksRequests = 0;
	const previousPoolDir = process.env.PROSOPO_DETECTOR_POOL_DIR;

	beforeAll(async () => {
		testPort = await reservePort();
		const protocol = isTlsAvailable() ? "https" : "http";
		baseUrl = `${protocol}://localhost:${testPort}`;
		authority = `localhost:${testPort}`;

		privateKey = ed25519.utils.randomPrivateKey();
		publicKey = ed25519.getPublicKey(privateKey);

		// Throwaway origin publishing the signer's JWKS at the well-known
		// directory path. Nothing is stubbed: the provider resolves this over
		// the network exactly as it would resolve chatgpt.com's.
		const jwksPort = await reservePort();
		signerUrl = `http://localhost:${jwksPort}`;
		jwksServer = createServer((req, res) => {
			if (req.url === "/.well-known/http-message-signatures-directory") {
				jwksRequests += 1;
				res.writeHead(200, {
					"content-type": "application/json",
					// Short TTL so the module-level JWKS cache can't leak a key
					// across suites in a long-lived worker.
					"cache-control": "max-age=1",
				});
				res.end(
					JSON.stringify({
						keys: [
							{
								kty: "OKP",
								crv: "Ed25519",
								alg: "EdDSA",
								kid: KEY_ID,
								x: toBase64Url(publicKey),
							},
						],
					}),
				);
				return;
			}
			res.writeHead(404).end();
		});
		await new Promise<void>((resolve) =>
			jwksServer?.listen(jwksPort, "127.0.0.1", resolve),
		);

		mongoContainer = await new GenericContainer("mongo:6.0.28")
			.withExposedPorts(27017)
			.withEnvironment({
				MONGO_INITDB_ROOT_USERNAME: "root",
				MONGO_INITDB_ROOT_PASSWORD: "root",
				MONGO_INITDB_DATABASE: "prosopo_test",
			})
			.start();

		// Unconditional, unlike the other integration suites' optional Redis:
		// the Allow policy this whole flow keys off is only reachable through
		// the Redis-backed rule index, so without it there is nothing to test.
		redisContainer = await new GenericContainer("redis/redis-stack:latest")
			.withExposedPorts(6379)
			.withEnvironment({ REDIS_ARGS: "--requirepass root" })
			.start();

		const config = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: baseUrl,
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
					endpoint: `mongodb://root:root@${mongoContainer.getHost()}:${mongoContainer.getMappedPort(27017)}`,
					dbname: `prosopo_web_bot_auth_test_${Date.now()}`,
					authSource: "admin",
				},
			},
			redisConnection: {
				url: `redis://:${encodeURIComponent("root")}@${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`,
				password: "root",
				indexName: randomAsHex(16),
			},
			ipApi: { baseUrl: "https://dummyUrl.com", apiKey: "dummyKey" },
			server: { baseURL: `${protocol}://localhost`, port: testPort },
		});

		env = new ProviderEnvironment(config);
		await env.isReady();
		env.ipInfoService = {
			initialize: async () => {},
			isAvailable: () => true,
			lookup: async (ip: string) => cleanIpInfo(ip),
		};

		// The authenticated fast path sits *after* the empty-detector-pool PoW
		// fallback, so an empty pool would short-circuit every request to PoW
		// and the Allow rule would never be consulted. Point at the committed
		// throwaway fixture the CI job uses for the same reason.
		process.env.PROSOPO_DETECTOR_POOL_DIR = join(
			dirname(fileURLToPath(import.meta.url)),
			"../../../fixtures/detector-pool",
		);

		tasks = new Tasks(env);
		accessRulesStorage = env.getDb().getUserAccessRulesStorage();
		await env.getDb().getRedisAccessRulesConnection().getClient();
		server = await startProviderApi(env, true, testPort);
	}, 180_000);

	afterAll(async () => {
		process.env.PROSOPO_DETECTOR_POOL_DIR = previousPoolDir;
		if (jwksServer) {
			await new Promise<void>((resolve) => jwksServer?.close(() => resolve()));
		}
		if (server) {
			await new Promise<void>((resolve) => server?.close(() => resolve()));
		}
		try {
			await env?.getDb().close();
		} catch {}
		try {
			await redisContainer?.stop();
		} catch {}
		try {
			await mongoContainer?.stop();
		} catch {}
	});

	beforeEach(async () => {
		await accessRulesStorage.deleteAllRules();
		// The verdict cache is process-wide and survives deleteAllRules, so a
		// previous case's "no rule" verdict would mask the rule this one just
		// wrote.
		getVerdictCache().clear();
	});

	const registerSite = async (): Promise<[string, string]> => {
		const [mnemonic, siteKey] = await generateMnemonic();
		await tasks.clientTaskManager.registerSiteKey(
			siteKey,
			Tier.Professional,
			ClientSettingsSchema.parse({
				captchaType: CaptchaType.frictionless,
				domains: ["localhost", "example.com"],
			}),
		);
		return [mnemonic, siteKey];
	};

	/** RFC 9421 headers for a request this suite's keypair has signed. */
	const signedHeaders = (expiresInSeconds = 300): Record<string, string> => {
		const created = Math.floor(Date.now() / 1000);
		const expires = created + expiresInSeconds;
		const signatureAgent = `"${signerUrl}"`;
		const params = `("@authority" "signature-agent");created=${created};expires=${expires};keyid="${KEY_ID}";alg="ed25519";tag="web-bot-auth"`;
		const base = buildSignatureBase(
			["@authority", "signature-agent"],
			{ authority, signatureAgent },
			params,
		);
		const signature = ed25519.sign(new TextEncoder().encode(base), privateKey);
		return {
			"Signature-Agent": signatureAgent,
			"Signature-Input": `sig1=${params}`,
			Signature: `sig1=:${toBase64(signature)}:`,
		};
	};

	const frictionless = async (
		siteKey: string,
		options: {
			userId: string;
			ip: string;
			userAgent: string;
			extraHeaders?: Record<string, string>;
			clientSessionId?: string;
		},
	): Promise<{ status: number; body: FrictionlessResponse }> => {
		const body: GetFrictionlessCaptchaChallengeRequestBodyOutput = {
			[ApiParams.dapp]: siteKey,
			[ApiParams.token]: randomAsHex(16),
			[ApiParams.user]: options.userId,
			[ApiParams.headHash]: randomAsHex(16),
			...(options.clientSessionId && {
				[ApiParams.clientSessionId]: options.clientSessionId,
			}),
		};
		const response = await testFetch(
			`${baseUrl}${ClientApiPaths.GetFrictionlessCaptchaChallenge}`,
			{
				method: "POST",
				headers: {
					Connection: "close",
					"Content-Type": "application/json",
					Origin: "https://localhost",
					"Prosopo-Site-Key": siteKey,
					"Prosopo-User": options.userId,
					"User-Agent": options.userAgent,
					"X-Forwarded-For": options.ip,
					...options.extraHeaders,
				},
				body: JSON.stringify(body),
			},
		);
		return {
			status: response.status,
			body: response.status === 200 ? await response.json() : {},
		};
	};

	/** Redeem a session the way an operator's server would. */
	const authenticatedVerify = async (
		siteKey: string,
		siteKeyMnemonic: string,
		userId: string,
		sessionId: string | undefined,
		extra: { ip?: string; clientSessionId?: string } = {},
	): Promise<VerifyResponse> => {
		const timestamp = Date.now().toString();
		const token = encodeProcaptchaOutput({
			[ApiParams.dapp]: siteKey,
			[ApiParams.user]: userId,
			...(sessionId ? { [ApiParams.commitmentId]: sessionId } : {}),
			[ApiParams.timestamp]: timestamp,
			[ApiParams.signature]: {
				[ApiParams.provider]: {},
				[ApiParams.user]: {},
			},
		});
		const body: VerifySolutionBodyTypeInput = {
			[ApiParams.token]: token,
			[ApiParams.dappSignature]: u8aToHex(
				getPair(siteKeyMnemonic).sign(stringToU8a(timestamp)),
			),
			...(extra.ip !== undefined && { [ApiParams.ip]: extra.ip }),
			...(extra.clientSessionId !== undefined && {
				[ApiParams.clientSessionId]: extra.clientSessionId,
			}),
		};
		const response = await testFetch(
			`${baseUrl}${ClientApiPaths.VerifyAuthenticatedSession}`,
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
		return (await response.json()) as VerifyResponse;
	};

	const allowRule = async (
		siteKey: string,
		fields: Record<string, unknown>,
	): Promise<void> => {
		await accessRulesStorage.insertRules([
			{
				rule: accessRuleInput.parse({
					type: AccessPolicyType.Allow,
					clientId: siteKey,
					...fields,
				}),
			},
		]);
	};

	describe("frictionless entry", () => {
		it("mints an authenticated session for a request a verified Web Bot Auth signer is allowed on", async () => {
			const [, siteKey] = await registerSite();
			const [, userId] = await generateMnemonic();
			await allowRule(siteKey, { webBotAuthAgent: signerUrl });

			const before = jwksRequests;
			const { status, body } = await frictionless(siteKey, {
				userId,
				ip: "203.0.113.7",
				userAgent: "IntegrationAgent/1.0",
				extraHeaders: signedHeaders(),
			});

			expect(status).toBe(200);
			expect(body.captchaType).toBe(CaptchaType.authenticated);
			expect(body.sessionId).toBeTruthy();
			// The canonical signer URL is echoed only when the pass was earned
			// by a signature, which is how an operator tells "verified signer"
			// from "trusted IP" on the same endpoint.
			expect(body.agent).toBe(signerUrl);
			// The directory really was fetched — this is the whole trust chain,
			// so a verifier that silently trusted the header would show up as a
			// pass with no JWKS request.
			expect(jwksRequests).toBeGreaterThan(before);

			const session = await env
				.getDb()
				.getSessionRecordBySessionId(body.sessionId as string);
			expect(session?.captchaType).toBe(CaptchaType.authenticated);
			expect(session?.serverChecked).toBe(false);
		});

		it("does not mint an authenticated session when the signature is expired", async () => {
			const [, siteKey] = await registerSite();
			const [, userId] = await generateMnemonic();
			await allowRule(siteKey, { webBotAuthAgent: signerUrl });

			const { status, body } = await frictionless(siteKey, {
				userId,
				ip: "203.0.113.8",
				userAgent: "IntegrationAgent/1.0",
				// expires in the past: the replay defence in the verifier
				extraHeaders: signedHeaders(-60),
			});

			expect(status).toBe(200);
			expect(body.captchaType).not.toBe(CaptchaType.authenticated);
		});

		it("does not mint an authenticated session for an unsigned request carrying only the Signature-Agent header", async () => {
			const [, siteKey] = await registerSite();
			const [, userId] = await generateMnemonic();
			await allowRule(siteKey, { webBotAuthAgent: signerUrl });

			const { status, body } = await frictionless(siteKey, {
				userId,
				ip: "203.0.113.9",
				userAgent: "IntegrationAgent/1.0",
				extraHeaders: { "Signature-Agent": `"${signerUrl}"` },
			});

			expect(status).toBe(200);
			expect(body.captchaType).not.toBe(CaptchaType.authenticated);
		});

		it("mints an authenticated session for a non-signature qualifier (user agent)", async () => {
			const [, siteKey] = await registerSite();
			const [, userId] = await generateMnemonic();
			const userAgent = `TrustedPartnerAgent/${randomAsHex(4)}`;
			await allowRule(siteKey, { userAgent });

			const { status, body } = await frictionless(siteKey, {
				userId,
				ip: "203.0.113.10",
				userAgent,
			});

			expect(status).toBe(200);
			expect(body.captchaType).toBe(CaptchaType.authenticated);
			// No signature was presented, so nothing is claimed about a signer.
			expect(body.agent).toBeUndefined();
		});

		it("lets a Block on the same scope beat the Allow", async () => {
			const [, siteKey] = await registerSite();
			const [, userId] = await generateMnemonic();
			const userAgent = `TrustedPartnerAgent/${randomAsHex(4)}`;
			await allowRule(siteKey, { userAgent });
			await accessRulesStorage.insertRules([
				{
					rule: accessRuleInput.parse({
						type: AccessPolicyType.Block,
						clientId: siteKey,
						userAgent,
					}),
				},
			]);

			const { status, body } = await frictionless(siteKey, {
				userId,
				ip: "203.0.113.11",
				userAgent,
			});

			expect(body.captchaType).not.toBe(CaptchaType.authenticated);
			// Severity outranks Allow, so the operator's block is what applies.
			expect(status).not.toBe(200);
		});

		it("ignores a deferToVerify Allow at frictionless entry", async () => {
			const [, siteKey] = await registerSite();
			const [, userId] = await generateMnemonic();
			const userAgent = `DeferredPartnerAgent/${randomAsHex(4)}`;
			await allowRule(siteKey, { userAgent, deferToVerify: true });

			const { status, body } = await frictionless(siteKey, {
				userId,
				ip: "203.0.113.12",
				userAgent,
			});

			expect(status).toBe(200);
			expect(body.captchaType).not.toBe(CaptchaType.authenticated);
		});

		it("does not mint an authenticated session when no Allow rule matches", async () => {
			const [, siteKey] = await registerSite();
			const [, userId] = await generateMnemonic();
			await allowRule(siteKey, { userAgent: "SomeOtherAgent/9.9" });

			const { status, body } = await frictionless(siteKey, {
				userId,
				ip: "203.0.113.13",
				userAgent: "IntegrationAgent/1.0",
			});

			expect(status).toBe(200);
			expect(body.captchaType).not.toBe(CaptchaType.authenticated);
		});
	});

	describe("/client/authenticated/verify", () => {
		const AGENT_IP = "203.0.113.20";

		const mintSession = async (
			clientSessionId?: string,
		): Promise<{
			siteKey: string;
			siteKeyMnemonic: string;
			userId: string;
			sessionId: string;
		}> => {
			const [siteKeyMnemonic, siteKey] = await registerSite();
			const [, userId] = await generateMnemonic();
			const userAgent = `TrustedPartnerAgent/${randomAsHex(4)}`;
			await allowRule(siteKey, { userAgent });
			const { body } = await frictionless(siteKey, {
				userId,
				ip: AGENT_IP,
				userAgent,
				clientSessionId,
			});
			expect(body.captchaType).toBe(CaptchaType.authenticated);
			return {
				siteKey,
				siteKeyMnemonic,
				userId,
				sessionId: body.sessionId as string,
			};
		};

		it("verifies once and refuses the second redemption", async () => {
			const { siteKey, siteKeyMnemonic, userId, sessionId } =
				await mintSession();

			const first = await authenticatedVerify(
				siteKey,
				siteKeyMnemonic,
				userId,
				sessionId,
				{ ip: AGENT_IP },
			);
			expect(first).toEqual({ verified: true, status: "API.USER_VERIFIED" });

			// Single use. This is the assertion that fails if `serverChecked`
			// ever falls out of the session projection: the read would come
			// back undefined and the token would verify forever.
			const second = await authenticatedVerify(
				siteKey,
				siteKeyMnemonic,
				userId,
				sessionId,
				{ ip: AGENT_IP },
			);
			expect(second.verified).toBe(false);
			expect(second.status).toBe("API.USER_ALREADY_VERIFIED");
		});

		it("refuses when the operator forwards no IP", async () => {
			const { siteKey, siteKeyMnemonic, userId, sessionId } =
				await mintSession();

			const result = await authenticatedVerify(
				siteKey,
				siteKeyMnemonic,
				userId,
				sessionId,
			);
			expect(result.verified).toBe(false);
			expect(result.status).toBe("API.AUTHENTICATED_IP_REQUIRED");
		});

		it("refuses when the forwarded IP is not the one the session was issued to", async () => {
			const { siteKey, siteKeyMnemonic, userId, sessionId } =
				await mintSession();

			const result = await authenticatedVerify(
				siteKey,
				siteKeyMnemonic,
				userId,
				sessionId,
				{ ip: "198.51.100.44" },
			);
			expect(result.verified).toBe(false);
			expect(result.status).toBe("API.AUTHENTICATED_IP_MISMATCH");
		});

		it("leaves the session redeemable after a rejected verify", async () => {
			const { siteKey, siteKeyMnemonic, userId, sessionId } =
				await mintSession();

			// A wrong-IP attempt must not consume the session — otherwise one
			// misconfigured operator call would burn a legitimate agent's pass.
			await authenticatedVerify(siteKey, siteKeyMnemonic, userId, sessionId, {
				ip: "198.51.100.44",
			});
			const result = await authenticatedVerify(
				siteKey,
				siteKeyMnemonic,
				userId,
				sessionId,
				{ ip: AGENT_IP },
			);
			expect(result).toEqual({ verified: true, status: "API.USER_VERIFIED" });
		});

		it("refuses when the forwarded clientSessionId is not the one the session was minted with", async () => {
			const { siteKey, siteKeyMnemonic, userId, sessionId } =
				await mintSession("render-session-a");

			const result = await authenticatedVerify(
				siteKey,
				siteKeyMnemonic,
				userId,
				sessionId,
				{ ip: AGENT_IP, clientSessionId: "render-session-b" },
			);
			expect(result.verified).toBe(false);
			expect(result.status).toBe("API.CLIENT_SESSION_MISMATCH");
		});

		it("verifies when the forwarded clientSessionId matches", async () => {
			const { siteKey, siteKeyMnemonic, userId, sessionId } =
				await mintSession("render-session-a");

			const result = await authenticatedVerify(
				siteKey,
				siteKeyMnemonic,
				userId,
				sessionId,
				{ ip: AGENT_IP, clientSessionId: "render-session-a" },
			);
			expect(result).toEqual({ verified: true, status: "API.USER_VERIFIED" });
		});

		it("refuses a session that was not minted as authenticated", async () => {
			// A pow session routed to this endpoint. Without the captchaType
			// gate an ordinary captcha token would be redeemable here, which
			// skips every check the pow verify path performs.
			const [siteKeyMnemonic, siteKey] = await registerSite();
			const [, userId] = await generateMnemonic();
			const { body } = await frictionless(siteKey, {
				userId,
				ip: AGENT_IP,
				userAgent: "IntegrationAgent/1.0",
			});
			expect(body.captchaType).not.toBe(CaptchaType.authenticated);

			const result = await authenticatedVerify(
				siteKey,
				siteKeyMnemonic,
				userId,
				body.sessionId,
				{ ip: AGENT_IP },
			);
			expect(result.verified).toBe(false);
			expect(result.status).toBe("API.INCORRECT_CAPTCHA_TYPE");
		});

		it("refuses a token carrying no session id", async () => {
			const [siteKeyMnemonic, siteKey] = await registerSite();
			const [, userId] = await generateMnemonic();

			const result = await authenticatedVerify(
				siteKey,
				siteKeyMnemonic,
				userId,
				undefined,
				{ ip: AGENT_IP },
			);
			expect(result.verified).toBe(false);
			expect(result.status).toBe("API.USER_NOT_VERIFIED_NO_SOLUTION");
		});
	});
});
