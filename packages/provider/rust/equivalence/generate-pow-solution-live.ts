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

// Writes pow-solution-live-vectors.json: the provider's real app, on a live environment (see
// live-harness.ts), taking PoW solutions across every branch of submitPoWCaptchaSolution.ts.
// Its challenges are issued by the app's own `captcha/pow` route before recording starts, so
// the records and the sessions they consumed are the app's. Then each submission: the parse,
// address and test-key answers, signatures that do not check out, unknown and resubmitted
// challenges, salts that cannot be read, expired challenges, wrong nonces, solves with and
// without a session, the escalations for missing coordinates and a changed address (to image,
// coerced to puzzle with and without a raised level, and coerced away entirely), and the
// behavioural data, SIMD readings and client metadata a solve carries. What the shipped
// decoders read out of each payload is recorded for the Rust's stand-in decoder. An escalated
// session's id and its puzzle draws are random, so the Rust masks them and checks them
// instead. Run on Node 24 with the live stores up.
import { RSA_PKCS1_OAEP_PADDING } from "node:constants";
import {
	createCipheriv,
	generateKeyPairSync,
	publicEncrypt,
	randomBytes,
} from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RedisWriteQueue } from "@prosopo/database";
import { getPair } from "@prosopo/keyring";
import {
	ALWAYS_FAIL_SITE_KEY,
	ALWAYS_PASS_SITE_KEY,
	CaptchaType,
	type IUserDataSlim,
	type Session,
	Tier,
} from "@prosopo/types";
import { embedData, solvePoW, u8aToHex } from "@prosopo/util";
import { startProviderApi } from "../../src/api/startProviderApi.js";
import { getCompositeIpAddress } from "../../src/compositeIpAddress.js";
import decodeBehavior from "../../src/tasks/detection/decodeBehavior.js";
import decodeSimd from "../../src/tasks/detection/decodeSimd.js";
import {
	type IpapiTable,
	type Json,
	type Step,
	dumpDatabase,
	dumpRedisHashes,
	fakeIpapi,
	liveEnvironment,
	liveVariables,
	requestBytes,
	resetStores,
	send,
} from "./live-harness.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(
		`this generator must run on Node 24 (the production runtime), not ${process.version}`,
	);
}

process.env.NODE_ENV = "production";
Reflect.deleteProperty(process.env, "MAINTENANCE_MODE");
const DATABASE = "equivalence_pow_solution";

const POW = getPair("//Alice");
const FRICTIONLESS = getPair("//Bob");
const NO_IMAGE = getPair("//Charlie");
const NO_INTERACTIVE = getPair("//Dave");
const SHORT = getPair("//Eve");
const UNREGISTERED = getPair("//Ferdie");
const LEGACY = getPair("//Legacy");
const USER = getPair("//User");
const OTHER_USER = getPair("//Other");

const answer = (ip: string): Json => ({
	ip,
	is_bogon: false,
	is_mobile: false,
	is_satellite: false,
	is_crawler: false,
	is_datacenter: false,
	is_tor: false,
	is_proxy: false,
	is_vpn: false,
	is_abuser: false,
	company: {
		name: "Example ISP",
		abuser_score: "0.0034 (Low)",
		domain: "example.net",
		type: "isp",
	},
	asn: {
		asn: 3320,
		org: "AS3320 Org",
		type: "isp",
		abuser_score: "0.0012 (Low)",
	},
	location: {
		country: "Germany",
		country_code: "DE",
		state: "S",
		city: "Berlin",
		latitude: 52.52,
		longitude: 13.405,
		timezone: "UTC",
	},
});
const IPAPI: IpapiTable = {
	"203.0.113.7": answer("203.0.113.7"),
	"198.51.100.9": answer("198.51.100.9"),
};

const poolDir = mkdtempSync(join(tmpdir(), "pow-solution-pool-"));
const bundleKeys = generateKeyPairSync("rsa", {
	modulusLength: 2048,
	publicKeyEncoding: { type: "spki", format: "pem" },
	privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
const bundlePrivateKey = Buffer.from(bundleKeys.privateKey, "ascii").toString(
	"base64",
);
writeFileSync(join(poolDir, "bundle-a.js"), "/* detector */");
writeFileSync(
	join(poolDir, "bundle-a.json"),
	JSON.stringify({ privateKey: bundlePrivateKey, innerConfig: "" }),
);
const poolFiles: Record<string, string> = {};
for (const name of readdirSync(poolDir))
	poolFiles[name] = readFileSync(join(poolDir, name), "utf8");

const sealToBundle = (plaintext: string): string => {
	const aesKey = randomBytes(32);
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
	const data = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
		cipher.getAuthTag(),
	]);
	const key = publicEncrypt(
		{
			key: bundleKeys.publicKey,
			padding: RSA_PKCS1_OAEP_PADDING,
			oaepHash: "sha256",
		},
		aesKey,
	);
	return JSON.stringify({
		key: key.toString("base64"),
		data: data.toString("base64"),
		iv: iv.toString("base64"),
	});
};
const BEHAVIOUR = sealToBundle(
	JSON.stringify({
		collector1: [
			{ x: 10, y: 20, t: 30 },
			{ x: 11, y: 21, t: 31 },
		],
		collector2: [{ x: 1, y: 2, t: 3 }],
		collector3: [],
		deviceCapability: "touch",
		timestamp: 1,
	}),
);
const BEHAVIOUR_NO_FOURTH = sealToBundle(
	JSON.stringify({
		collector1: [],
		collector2: [],
		collector3: [{ x: 5, y: 6, t: 7 }],
		collector4: [{ dy: 3, t: 8 }],
		deviceCapability: "mouse",
		timestamp: 2,
	}),
);
const READINGS = sealToBundle(
	JSON.stringify({
		supported: true,
		schema: 1,
		runsPerOp: 3,
		ops: [{ name: "f32x4_div", bestNs: 2.01 }],
	}),
);
const GARBAGE = "not a payload";
const decoded: Json[] = [];
for (const [ciphertext, decode] of [
	[BEHAVIOUR, decodeBehavior],
	[BEHAVIOUR_NO_FOURTH, decodeBehavior],
	[READINGS, decodeSimd],
	[GARBAGE, decodeSimd],
] as const) {
	try {
		decoded.push({
			ciphertext,
			readings: (await decode(
				ciphertext,
				bundlePrivateKey,
				"",
			)) as unknown as Json,
		});
	} catch (err) {
		decoded.push({
			ciphertext,
			error: err instanceof Error ? err.message : String(err),
		});
	}
}

await resetStores(DATABASE);
const ipapi = await fakeIpapi(IPAPI);
const variables = liveVariables(DATABASE, ipapi.url, {
	PROSOPO_DETECTOR_POOL_DIR: poolDir,
});
process.env.PROSOPO_DETECTOR_POOL_DIR = poolDir;
const env = await liveEnvironment(variables);
const db = env.getDb();

const base = {
	domains: ["example.com"],
	verifiedTimeout: 600000,
	solutionTimeout: 600000,
};
await db.updateClientRecords([
	{
		account: POW.address,
		settings: { ...base, captchaType: "pow" },
		tier: Tier.Free,
	},
	{
		account: FRICTIONLESS.address,
		settings: { ...base, captchaType: "frictionless" },
		tier: Tier.Professional,
	},
	{
		account: NO_IMAGE.address,
		settings: {
			...base,
			captchaType: "frictionless",
			frictionlessTypes: { image: false, puzzle: true },
			puzzleMaxDifficulty: 4,
		},
		tier: Tier.Professional,
	},
	{
		account: NO_INTERACTIVE.address,
		settings: {
			...base,
			captchaType: "frictionless",
			frictionlessTypes: { image: false, puzzle: false },
		},
		tier: Tier.Professional,
	},
	{
		account: SHORT.address,
		settings: { ...base, captchaType: "pow", solutionTimeout: 1 },
		tier: Tier.Free,
	},
	{
		account: LEGACY.address,
		settings: {
			domains: ["example.com"],
			captchaType: "pow",
			verifiedTimeout: 600000,
		},
		tier: Tier.Free,
	},
] as unknown as IUserDataSlim[]);
await env
	.getDb()
	.getTables()
	.client.updateOne(
		{ account: LEGACY.address },
		{ $unset: { "settings.solutionTimeout": "" } },
	);

const queue = new RedisWriteQueue(db.getRedisConnection(), env.logger);
const seedSession = async (
	sessionId: string,
	extra: Partial<Session> = {},
): Promise<void> => {
	const session = {
		sessionId,
		createdAt: new Date(Date.now() - 10000),
		token: `token-${sessionId}`,
		score: 0.3,
		threshold: 0.5,
		scoreComponents: { baseScore: 0.25, lScore: 0.05 },
		ipAddress: getCompositeIpAddress("203.0.113.7"),
		captchaType: CaptchaType.pow,
		webView: false,
		iFrame: false,
		decryptedHeadHash: `head-${sessionId}`,
		siteKey: FRICTIONLESS.address,
		bundleId: "bundle-a",
		headers: {
			"user-agent": "Mozilla/5.0 (X11; Linux x86_64)",
			"accept-language": "en-GB",
		},
		ipInfo: {
			isValid: true,
			ip: "203.0.113.7",
			countryCode: "DE",
			isMobile: false,
		},
		userSitekeyIpHash: `hash-${sessionId}`,
		reason: "score-above-threshold",
		currentUrl: "https://example.com/checkout",
		d: { wd: 0, plugins: 3 },
		mode: "visible",
		tcpMss: 1460,
		clientMetaData: { clientSessionId: `client-${sessionId}` },
		...extra,
	} as Session;
	await db.storeSessionRecord(session);
	await queue.cacheSession(
		sessionId,
		session as unknown as Record<string, unknown>,
	);
};
await seedSession("s-plain");
await seedSession("s-escalate-coords");
await seedSession("s-escalate-ip");
await seedSession("s-rounds", { solvedImagesCount: 7 } as Partial<Session>);
await seedSession("s-no-image", {
	siteKey: NO_IMAGE.address,
	solvedImagesCount: 9,
	webView: true,
} as Partial<Session>);
await seedSession("s-no-image-level-0", {
	siteKey: NO_IMAGE.address,
} as Partial<Session>);
await seedSession("s-no-interactive", {
	siteKey: NO_INTERACTIVE.address,
} as Partial<Session>);
await seedSession("s-bare", {
	bundleId: undefined,
	headers: undefined,
	ipInfo: undefined,
	d: undefined,
	mode: undefined,
	tcpMss: undefined,
	clientMetaData: undefined,
	reason: undefined,
	currentUrl: undefined,
	userSitekeyIpHash: undefined,
} as Partial<Session>);
await seedSession("s-garbage");

const server: Server = await startProviderApi(env, false, 0);
const port = (server.address() as AddressInfo).port;
const json: [string, string] = ["Content-Type", "application/json"];
const origin: [string, string] = ["Origin", "https://example.com"];
const browser: [string, string] = [
	"User-Agent",
	"Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
];
const from = (ip: string): [string, string] => ["X-Forwarded-For", ip];
const account = (dapp: string, user: string): [string, string][] => [
	["Prosopo-Site-Key", dapp.length > 40 ? dapp : POW.address],
	["Prosopo-User", user.length > 40 ? user : USER.address],
];

type Issued = {
	challenge: string;
	difficulty: number;
	signature: string;
	timestamp: string;
};
const issue = async (
	dapp: string,
	sessionId?: string,
	user = USER.address,
): Promise<Issued> => {
	const response = await send(
		port,
		requestBytes({
			method: "POST",
			path: "/v1/prosopo/provider/client/captcha/pow",
			headers: [
				json,
				...account(dapp, user),
				origin,
				browser,
				from("203.0.113.7"),
			],
			body: JSON.stringify({ user, dapp, ...(sessionId && { sessionId }) }),
		}),
	);
	const text = response.toString("utf8");
	const body = JSON.parse(text.slice(text.indexOf("\r\n\r\n") + 4));
	if (body.status !== "ok")
		throw new Error(`no challenge for ${dapp}: ${text}`);
	return {
		challenge: body.challenge,
		difficulty: body.difficulty,
		signature: body.signature.provider.challenge,
		timestamp: body.timestamp,
	};
};

const challenges = {
	plain: await issue(POW.address),
	resubmitted: await issue(POW.address),
	wrongNonce: await issue(POW.address),
	badSalt: await issue(POW.address),
	expired: await issue(SHORT.address),
	legacy: await issue(LEGACY.address),
	tamperedProvider: await issue(POW.address),
	badUserSignature: await issue(POW.address),
	otherUserSignature: await issue(POW.address),
	session: await issue(FRICTIONLESS.address, "s-plain"),
	escalateCoords: await issue(FRICTIONLESS.address, "s-escalate-coords"),
	escalateIp: await issue(FRICTIONLESS.address, "s-escalate-ip"),
	rounds: await issue(FRICTIONLESS.address, "s-rounds"),
	noImage: await issue(NO_IMAGE.address, "s-no-image"),
	noImageLevel0: await issue(NO_IMAGE.address, "s-no-image-level-0"),
	noInteractive: await issue(NO_INTERACTIVE.address, "s-no-interactive"),
	bare: await issue(FRICTIONLESS.address, "s-bare"),
	garbage: await issue(FRICTIONLESS.address, "s-garbage"),
	shortSalt: await issue(POW.address),
	zeroCoords: await issue(POW.address),
};
const providerPair = env.pair;
if (!providerPair) throw new Error("no provider pair");
const unknownChallenge = `${Date.now()}___${USER.address}___${POW.address}___42`;
const unknownSignature = u8aToHex(providerPair.sign(unknownChallenge));

// Let every fire-and-forget write of the issuance settle before the stores are dumped.
await new Promise<void>((resolve) => setTimeout(resolve, 1500));
const database = await dumpDatabase(DATABASE);
const redis = await dumpRedisHashes();
const client = await db.getRedisConnection().getClient();
const dumpCache = async (): Promise<Json[]> => {
	const out: Json[] = [];
	for (const key of (await client.keys("cache:session:*")).sort())
		out.push({ key, raw: (await client.get(key)) ?? null });
	return out;
};
const dumpCounters = async (): Promise<Json[]> => {
	const out: Json[] = [];
	for (const key of (await client.keys("cnt:*")).sort())
		out.push({
			key,
			value: (await client.get(key)) ?? null,
			ttl: (await client.ttl(key)) > 0,
		});
	return out;
};
const cache = await dumpCache();
const counters = await dumpCounters();

const path = "/v1/prosopo/provider/client/pow/solution";
const SALT = embedData(`0x${"ab".repeat(32)}`, [120, 45]);
const ZERO_SALT = embedData(`0x${"cd".repeat(32)}`, [0, 0]);
type Submission = {
	issued: Issued;
	dapp: string;
	user?: typeof USER;
	nonce?: number;
	salt?: string | null;
	behavioralData?: string;
	simdReadings?: string;
	clientMetaData?: Json;
	fingerprintProof?: string;
	providerSignature?: string;
	userSignature?: string;
	ip?: string;
};
const submit = async (submission: Submission): Promise<Step> => {
	const user = submission.user ?? USER;
	const nonce =
		submission.nonce ??
		(await solvePoW(submission.issued.challenge, submission.issued.difficulty));
	const body = {
		challenge: submission.issued.challenge,
		difficulty: submission.issued.difficulty,
		signature: {
			user: {
				timestamp:
					submission.userSignature ??
					u8aToHex(user.sign(submission.issued.timestamp)),
			},
			provider: {
				challenge: submission.providerSignature ?? submission.issued.signature,
			},
		},
		user: USER.address,
		dapp: submission.dapp,
		nonce,
		...(submission.salt !== null && { salt: submission.salt ?? SALT }),
		...(submission.behavioralData && {
			behavioralData: submission.behavioralData,
		}),
		...(submission.simdReadings && { simdReadings: submission.simdReadings }),
		...(submission.clientMetaData && {
			clientMetaData: submission.clientMetaData,
		}),
		...(submission.fingerprintProof && {
			fingerprintProof: submission.fingerprintProof,
		}),
	};
	return {
		method: "POST",
		path,
		headers: [
			json,
			...account(submission.dapp, USER.address),
			origin,
			browser,
			from(submission.ip ?? "203.0.113.7"),
		],
		body: JSON.stringify(body),
	};
};
const raw = (dapp: string, body: unknown): Step => ({
	method: "POST",
	path,
	headers: [
		json,
		...account(dapp, USER.address),
		origin,
		browser,
		from("203.0.113.7"),
	],
	body: JSON.stringify(body),
});
const plainBody = (
	await submit({ issued: challenges.plain, dapp: POW.address })
).body as string;

const steps: Step[] = [
	raw(POW.address, { dapp: POW.address }),
	raw(POW.address, { ...JSON.parse(plainBody), nonce: "1" }),
	raw(POW.address, { ...JSON.parse(plainBody), dapp: "not-an-address" }),
	raw(POW.address, { ...JSON.parse(plainBody), user: "not-an-address" }),
	raw(ALWAYS_PASS_SITE_KEY, {
		...JSON.parse(plainBody),
		dapp: ALWAYS_PASS_SITE_KEY,
	}),
	raw(ALWAYS_FAIL_SITE_KEY, {
		...JSON.parse(plainBody),
		dapp: ALWAYS_FAIL_SITE_KEY,
	}),
	raw(UNREGISTERED.address, {
		...JSON.parse(plainBody),
		dapp: UNREGISTERED.address,
	}),
	await submit({
		issued: challenges.tamperedProvider,
		dapp: POW.address,
		providerSignature: challenges.plain.signature,
	}),
	await submit({
		issued: challenges.badUserSignature,
		dapp: POW.address,
		userSignature: "0x1234",
	}),
	await submit({
		issued: challenges.otherUserSignature,
		dapp: POW.address,
		user: OTHER_USER,
	}),
	await submit({
		issued: {
			challenge: unknownChallenge,
			difficulty: 1,
			signature: unknownSignature,
			timestamp: unknownChallenge.split("___")[0] as string,
		},
		dapp: POW.address,
	}),
	await submit({ issued: challenges.plain, dapp: POW.address }),
	await submit({ issued: challenges.resubmitted, dapp: POW.address }),
	await submit({ issued: challenges.resubmitted, dapp: POW.address }),
	await submit({ issued: challenges.wrongNonce, dapp: POW.address, nonce: -7 }),
	await submit({ issued: challenges.badSalt, dapp: POW.address, salt: "0xzz" }),
	await submit({
		issued: challenges.shortSalt,
		dapp: POW.address,
		salt: embedData(`0x${"ef".repeat(32)}`, [9]),
	}),
	await submit({
		issued: challenges.zeroCoords,
		dapp: POW.address,
		salt: ZERO_SALT,
	}),
	await submit({ issued: challenges.expired, dapp: SHORT.address }),
	await submit({ issued: challenges.legacy, dapp: LEGACY.address }),
	await submit({
		issued: challenges.session,
		dapp: FRICTIONLESS.address,
		behavioralData: BEHAVIOUR,
		simdReadings: READINGS,
		clientMetaData: { clientSessionId: "client-render-1" },
		fingerprintProof: "proof",
	}),
	await submit({
		issued: challenges.escalateCoords,
		dapp: FRICTIONLESS.address,
		salt: null,
		behavioralData: BEHAVIOUR_NO_FOURTH,
	}),
	await submit({
		issued: challenges.escalateIp,
		dapp: FRICTIONLESS.address,
		ip: "198.51.100.9",
	}),
	await submit({
		issued: challenges.rounds,
		dapp: FRICTIONLESS.address,
		salt: null,
	}),
	await submit({
		issued: challenges.noImage,
		dapp: NO_IMAGE.address,
		salt: null,
		behavioralData: BEHAVIOUR,
	}),
	await submit({
		issued: challenges.noImageLevel0,
		dapp: NO_IMAGE.address,
		salt: null,
	}),
	await submit({
		issued: challenges.noInteractive,
		dapp: NO_INTERACTIVE.address,
		salt: null,
	}),
	await submit({
		issued: challenges.bare,
		dapp: FRICTIONLESS.address,
		salt: null,
	}),
	await submit({
		issued: challenges.garbage,
		dapp: FRICTIONLESS.address,
		behavioralData: GARBAGE,
		simdReadings: GARBAGE,
	}),
];

const exchanges: Json[] = [];
for (const step of steps) {
	const bytes = requestBytes(step);
	const sentAt = Date.now();
	const response = await send(port, bytes);
	exchanges.push({
		request: bytes.toString("base64"),
		response: response.toString("base64"),
		at: sentAt,
	});
}
await new Promise<void>((resolve) => setTimeout(resolve, 1500));
const after = await dumpDatabase(DATABASE);
const cacheAfter = await dumpCache();
const countersAfter = await dumpCounters();
await client.quit();
await new Promise<void>((resolve) => server.close(() => resolve()));
await ipapi.close();
writeFileSync(
	fileURLToPath(new URL("./pow-solution-live-vectors.json", import.meta.url)),
	`${JSON.stringify({
		database: DATABASE,
		provider: providerPair.address,
		variables: {
			...variables,
			PROSOPO_IPAPI_URL: "{{IPAPI_URL}}",
			PROSOPO_DETECTOR_POOL_DIR: "{{POOL_DIR}}",
		},
		ipapi: IPAPI,
		poolFiles,
		decoded,
		seed: database,
		redis,
		cache,
		counters,
		exchanges,
		after: { powcaptchas: after.powcaptchas, sessions: after.sessions },
		cacheAfter,
		countersAfter,
	})}\n`,
);
console.log(`wrote pow-solution-live-vectors.json (${steps.length} requests)`);
process.exit(0);
