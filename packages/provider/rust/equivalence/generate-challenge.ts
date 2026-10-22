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

// Writes challenge-vectors.json: the provider's real app, on a live environment (see
// live-harness.ts), issuing PoW challenges across what decides one: the site's type, the
// session consumed (and the escalation it may point to), access rules, the traffic filter and
// every source of a difficulty, the SIMD readings attached to the session, and the refusals.
// Each issued answer's time is recorded as the time the Rust runs at. A challenge's nonce is
// `Math.random`, and its signature sr25519, so both differ on every run: the Rust checks each
// signature against the provider's key and compares the rest with the two masked. The detector pool holds one bundle with no inner cipher, and what the shipped
// decodeSimd.js reads out of each SIMD payload is recorded for the Rust's stand-in decoder.
// Run on Node 24 with the live stores up.
import { RSA_PKCS1_OAEP_PADDING } from "node:constants";
import {
	createCipheriv,
	generateKeyPairSync,
	publicEncrypt,
	randomBytes,
} from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import { createRequire, syncBuiltinESMExports } from "node:module";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RedisWriteQueue } from "@prosopo/database";
import { getPair } from "@prosopo/keyring";
import {
	ALWAYS_PASS_SITE_KEY,
	CaptchaType,
	type IUserDataSlim,
	type Session,
	Tier,
} from "@prosopo/types";
import {
	type AccessRuleEntry,
	accessRuleInput,
} from "@prosopo/user-access-policy";
import { startProviderApi } from "../../src/api/startProviderApi.js";
import { getCompositeIpAddress } from "../../src/compositeIpAddress.js";
import { resolveAudioRenderSettings } from "../../src/tasks/audio/audioRenderer.js";
import decodeSimd from "../../src/tasks/detection/decodeSimd.js";
import { resolveIconOrderRenderSettings } from "../../src/tasks/iconOrder/iconOrderRenderer.js";
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
const DATABASE = "equivalence_challenge";

const POW = getPair("//Alice");
const FRICTIONLESS = getPair("//Bob");
const IMAGE = getPair("//Charlie");
const TRAFFIC = getPair("//Dave");
const DIFFICULT = getPair("//Eve");
const UNREGISTERED = getPair("//Ferdie");
// Every stored site gets mongoose's default difficulty of 4; only a site set to 0 reaches the
// handler's own default.
const ZERO = getPair("//Zero");
const ICON = getPair("//Icon");
const ICON_FRICTIONLESS = getPair("//IconFrictionless");
const ICON_TRAFFIC = getPair("//IconTraffic");
const AUDIO = getPair("//Audio");
const AUDIO_TRAFFIC = getPair("//AudioTraffic");
const USER = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const RESTRICTED_USER = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy";
const RULED_USER = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw";
const DEFERRED_USER = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";

const answer = (ip: string, flags: Record<string, boolean> = {}): Json => ({
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
	...flags,
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
	"198.51.100.30": answer("198.51.100.30", { is_vpn: true }),
	"198.51.100.31": answer("198.51.100.31", { is_proxy: true }),
	"192.0.2.53": answer("192.0.2.53", { is_datacenter: true }),
};

// A pool of one bundle, without the inner cipher, whose key the SIMD payloads are sealed to.
const poolDir = mkdtempSync(join(tmpdir(), "challenge-pool-"));
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
const READINGS = sealToBundle(
	JSON.stringify({
		supported: true,
		schema: 1,
		runsPerOp: 3,
		ops: [{ name: "f32x4_div", bestNs: 2.01 }],
	}),
);
const OTHER_READINGS = sealToBundle(
	JSON.stringify({ supported: false, reason: "wasm-simd-unsupported" }),
);
const GARBAGE_READINGS = "not a payload";
const decoded: Json[] = [];
for (const ciphertext of [READINGS, OTHER_READINGS, GARBAGE_READINGS]) {
	try {
		decoded.push({
			ciphertext,
			readings: (await decodeSimd(
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
const records = [
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
		account: IMAGE.address,
		settings: { ...base, captchaType: "image" },
		tier: Tier.Free,
	},
	{
		account: TRAFFIC.address,
		settings: {
			...base,
			captchaType: "pow",
			trafficFilter: {
				vpn: { action: "challenge", powDifficulty: 7, padBytes: 64 },
				proxy: {
					action: "challenge",
					captchaType: "image",
					solvedImagesCount: 3,
				},
				datacenter: { action: "block" },
			},
		},
		tier: Tier.Enterprise,
	},
	{
		account: DIFFICULT.address,
		settings: { ...base, captchaType: "pow", powDifficulty: 6 },
		tier: Tier.Free,
	},
	{
		account: ZERO.address,
		settings: { ...base, captchaType: "pow", powDifficulty: 0 },
		tier: Tier.Free,
	},
	{
		account: ICON.address,
		settings: {
			...base,
			captchaType: "iconOrder",
			captchaTypeFeatureFlags: { iconOrder: true },
			iconOrderTolerance: 0.6,
			iconOrder: { targetCount: 4 },
		},
		tier: Tier.Free,
	},
	{
		account: ICON_FRICTIONLESS.address,
		settings: {
			...base,
			captchaType: "frictionless",
			captchaTypeFeatureFlags: { iconOrder: true },
		},
		tier: Tier.Professional,
	},
	{
		account: ICON_TRAFFIC.address,
		settings: {
			...base,
			captchaType: "iconOrder",
			captchaTypeFeatureFlags: { iconOrder: true },
			trafficFilter: {
				vpn: {
					action: "challenge",
					iconOrderTolerance: 0.4,
					iconOrder: { targetCount: 2, decoyCount: 9 },
				},
			},
		},
		tier: Tier.Enterprise,
	},
	{
		account: AUDIO.address,
		settings: {
			...base,
			captchaType: "frictionless",
			audioAccessibilityEnabled: true,
			captchaTypeFeatureFlags: { audio: true, iconOrder: true },
			audio: { digitCount: 4 },
		},
		tier: Tier.Professional,
	},
	{
		account: AUDIO_TRAFFIC.address,
		settings: {
			...base,
			captchaType: "frictionless",
			audioAccessibilityEnabled: true,
			captchaTypeFeatureFlags: { audio: true },
			audio: { digitCount: 4, gapMs: 200 },
			trafficFilter: {
				vpn: { action: "challenge", audio: { digitCount: 5 } },
			},
		},
		tier: Tier.Enterprise,
	},
] as unknown as IUserDataSlim[];
await db.updateClientRecords(records);

const rules: unknown[] = [
	{ type: "restrict", userId: RESTRICTED_USER, captchaType: "image" },
	{ type: "restrict", userId: RULED_USER, powDifficulty: 9 },
	{
		type: "restrict",
		userId: DEFERRED_USER,
		powDifficulty: 11,
		deferToVerify: true,
	},
	{ type: "restrict", headHash: "head-ruled", powDifficulty: 13 },
	{ type: "block", ip: "203.0.113.66", description: "a hard block" },
];
await db
	.getUserAccessRulesStorage()
	.insertRules(
		rules.map(
			(rule) => ({ rule: accessRuleInput.parse(rule) }) as AccessRuleEntry,
		),
	);

const seedSession = async (
	sessionId: string,
	extra: Partial<Session> = {},
): Promise<Session> => {
	const session = {
		sessionId,
		createdAt: new Date(Date.now() - 10000),
		token: `token-${sessionId}`,
		score: 0.3,
		threshold: 0.5,
		scoreComponents: { baseScore: 0.25 },
		ipAddress: getCompositeIpAddress("203.0.113.7"),
		captchaType: CaptchaType.pow,
		webView: false,
		iFrame: false,
		decryptedHeadHash: `head-${sessionId}`,
		siteKey: FRICTIONLESS.address,
		...extra,
	} as Session;
	await db.storeSessionRecord(session);
	return session;
};
const queue = new RedisWriteQueue(db.getRedisConnection(), env.logger);
const cached = await seedSession("s-pow", {
	userSitekeyIpHash: "hash-pow",
} as Partial<Session>);
await queue.cacheSession("s-pow", cached as unknown as Record<string, unknown>);
await queue.cacheSessionByHash("hash-pow", "s-pow");
await seedSession("s-image", { captchaType: CaptchaType.image });
await seedSession("s-other-site", { siteKey: POW.address });
await seedSession("s-no-site", { siteKey: undefined } as Partial<Session>);
await seedSession("s-difficult", { powDifficulty: 12 } as Partial<Session>);
await seedSession("s-ruled", { decryptedHeadHash: "head-ruled" });
await seedSession("s-escalation");
await queue.cacheSessionEscalation("s-origin-gone", "s-escalation");
await seedSession("s-escalation-image", { captchaType: CaptchaType.image });
await queue.cacheSessionEscalation("s-origin-gone-2", "s-escalation-image");
await seedSession("s-simd", { bundleId: "bundle-a" } as Partial<Session>);
await seedSession("s-simd-unsupported", {
	bundleId: "bundle-a",
} as Partial<Session>);
await seedSession("s-simd-gone", {
	bundleId: "bundle-gone",
} as Partial<Session>);
await seedSession("s-simd-garbage", {
	bundleId: "bundle-a",
} as Partial<Session>);
const viaCache = await seedSession("s-simd-cached");
await queue.cacheSession("s-simd-cached", {
	...(viaCache as unknown as Record<string, unknown>),
	bundleId: "bundle-a",
});
await seedSession("s-no-origin");
await seedSession("s-icon", {
	captchaType: CaptchaType.iconOrder,
	siteKey: ICON_FRICTIONLESS.address,
	iconOrderTolerance: 0.9,
	iconOrder: { decoyCount: 2 },
} as Partial<Session>);
await seedSession("s-icon-plain", {
	captchaType: CaptchaType.iconOrder,
	siteKey: ICON_FRICTIONLESS.address,
	bundleId: "bundle-a",
} as Partial<Session>);
await seedSession("s-icon-on-pow-site", { captchaType: CaptchaType.iconOrder });
await seedSession("s-audio-image", {
	captchaType: CaptchaType.image,
	siteKey: AUDIO.address,
});
await seedSession("s-audio-icon", {
	captchaType: CaptchaType.iconOrder,
	siteKey: AUDIO.address,
});
await seedSession("s-audio-pow", {
	captchaType: CaptchaType.pow,
	siteKey: AUDIO.address,
});
await seedSession("s-audio-traffic", {
	captchaType: CaptchaType.image,
	siteKey: AUDIO_TRAFFIC.address,
});
await seedSession("s-audio-off", {
	captchaType: CaptchaType.image,
	siteKey: FRICTIONLESS.address,
});

const database = await dumpDatabase(DATABASE);
const redis = await dumpRedisHashes();
const client = await db.getRedisConnection().getClient();
const dumpCache = async (): Promise<Json[]> => {
	const out: Json[] = [];
	for (const key of (await client.keys("cache:session:*")).sort())
		out.push({ key, raw: (await client.get(key)) ?? null });
	return out;
};
const cache = await dumpCache();

const path = "/v1/prosopo/provider/client/captcha/pow";
const iconPath = "/v1/prosopo/provider/client/captcha/icon-order";
const audioPath = "/v1/prosopo/provider/client/captcha/audio";
const json: [string, string] = ["Content-Type", "application/json"];
const origin: [string, string] = ["Origin", "https://example.com"];
const browser: [string, string] = [
	"User-Agent",
	"Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
];
const from = (ip: string): [string, string] => ["X-Forwarded-For", ip];
type Ask = {
	dapp: string;
	user?: string;
	sessionId?: string;
	simdReadings?: string;
};
// The client routes' header check wants a valid account in both headers; a case about an
// invalid body value keeps a valid one there, so it reaches the handler.
const isAddress = (text: string): boolean => text.length > 40;
const account = (dapp: string, user: string): [string, string][] => [
	["Prosopo-Site-Key", isAddress(dapp) ? dapp : POW.address],
	["Prosopo-User", isAddress(user) ? user : USER],
];
const pow = (
	ask: Ask,
	headers: [string, string][] = [origin, browser, from("203.0.113.7")],
	at = path,
): Step & { padded?: boolean } => ({
	method: "POST",
	path: at,
	headers: [json, ...account(ask.dapp, ask.user ?? USER), ...headers],
	body: JSON.stringify({
		user: ask.user ?? USER,
		dapp: ask.dapp,
		...(ask.sessionId && { sessionId: ask.sessionId }),
		...(ask.simdReadings && { simdReadings: ask.simdReadings }),
	}),
});
const steps: (Step & { padded?: boolean })[] = [
	pow({ dapp: POW.address }),
	pow({ dapp: DIFFICULT.address }),
	pow({ dapp: ZERO.address }),
	pow({ dapp: POW.address }, [
		origin,
		browser,
		from("203.0.113.7"),
		["Cookie", "a=1"],
		["Cookie", "b=2"],
		["Set-Cookie", "s=1"],
		["Set-Cookie", "s=2"],
		["X-Dup", "1"],
		["X-Dup", "2"],
		["User-Agent", "second"],
	]),
	pow({ dapp: FRICTIONLESS.address }),
	pow({ dapp: IMAGE.address }),
	pow({ dapp: FRICTIONLESS.address, sessionId: "s-pow" }),
	pow({ dapp: FRICTIONLESS.address, sessionId: "s-pow" }),
	pow({ dapp: FRICTIONLESS.address, sessionId: "s-image" }),
	pow({ dapp: FRICTIONLESS.address, sessionId: "s-other-site" }),
	pow({ dapp: FRICTIONLESS.address, sessionId: "s-no-site" }),
	pow({ dapp: FRICTIONLESS.address, sessionId: "s-difficult" }),
	pow({ dapp: FRICTIONLESS.address, sessionId: "s-ruled" }),
	pow({ dapp: FRICTIONLESS.address, sessionId: "s-origin-gone" }),
	pow({ dapp: FRICTIONLESS.address, sessionId: "s-origin-gone-2" }),
	pow({ dapp: FRICTIONLESS.address, sessionId: "never-minted" }),
	pow({ dapp: POW.address, user: RESTRICTED_USER }),
	pow({ dapp: POW.address, user: RULED_USER }),
	pow({ dapp: POW.address, user: DEFERRED_USER }),
	pow({ dapp: DIFFICULT.address, user: RULED_USER }),
	{
		...pow({ dapp: TRAFFIC.address }, [origin, browser, from("198.51.100.30")]),
		padded: true,
	},
	pow({ dapp: TRAFFIC.address }, [origin, browser, from("198.51.100.31")]),
	pow({ dapp: TRAFFIC.address }, [origin, browser, from("192.0.2.53")]),
	pow({ dapp: TRAFFIC.address }),
	pow({
		dapp: FRICTIONLESS.address,
		sessionId: "s-simd",
		simdReadings: READINGS,
	}),
	pow({
		dapp: FRICTIONLESS.address,
		sessionId: "s-simd-unsupported",
		simdReadings: OTHER_READINGS,
	}),
	pow({
		dapp: FRICTIONLESS.address,
		sessionId: "s-simd-gone",
		simdReadings: READINGS,
	}),
	pow({
		dapp: FRICTIONLESS.address,
		sessionId: "s-simd-garbage",
		simdReadings: GARBAGE_READINGS,
	}),
	pow({
		dapp: FRICTIONLESS.address,
		sessionId: "s-simd-cached",
		simdReadings: READINGS,
	}),
	pow({ dapp: POW.address, simdReadings: READINGS }),
	pow({ dapp: FRICTIONLESS.address, sessionId: "s-no-origin" }, [
		browser,
		from("203.0.113.7"),
	]),
	pow({ dapp: POW.address }, [browser, from("203.0.113.7")]),
	pow({ dapp: UNREGISTERED.address }),
	pow({ dapp: POW.address, user: "not-an-address" }),
	pow({ dapp: "not-a-site-key" }),
	{
		method: "POST",
		path,
		headers: [json, ...account(POW.address, USER), origin],
		body: JSON.stringify({ dapp: POW.address }),
	},
	{
		method: "POST",
		path,
		headers: [json, ...account(POW.address, USER), origin],
		body: JSON.stringify({ dapp: POW.address, user: USER, sessionId: 7 }),
	},
	pow({ dapp: POW.address }, [origin, browser, from("203.0.113.66")]),
	pow({ dapp: UNREGISTERED.address }, [
		origin,
		browser,
		from("203.0.113.7"),
		["Accept-Language", "es"],
	]),
	pow(
		{ dapp: POW.address },
		[origin, browser, from("203.0.113.7")],
		`${path}/`,
	),
	pow(
		{ dapp: POW.address },
		[origin, browser, from("203.0.113.7")],
		path.toUpperCase(),
	),
	{ method: "GET", path, headers: [json, ...account(POW.address, USER)] },
	{
		method: "POST",
		path,
		headers: [json, origin],
		body: JSON.stringify({ dapp: POW.address, user: USER }),
	},
	{ ...pow({ dapp: ALWAYS_PASS_SITE_KEY }), compare: false },
	pow({ dapp: ICON.address }, undefined, iconPath),
	pow(
		{ dapp: ICON_FRICTIONLESS.address, sessionId: "s-icon" },
		undefined,
		iconPath,
	),
	pow(
		{
			dapp: ICON_FRICTIONLESS.address,
			sessionId: "s-icon-plain",
			simdReadings: READINGS,
		},
		undefined,
		iconPath,
	),
	pow(
		{ dapp: FRICTIONLESS.address, sessionId: "s-icon-on-pow-site" },
		undefined,
		iconPath,
	),
	pow({ dapp: POW.address }, undefined, iconPath),
	{
		...pow(
			{ dapp: ICON_TRAFFIC.address },
			[origin, browser, from("198.51.100.30")],
			iconPath,
		),
		padded: false,
	},
	pow({ dapp: ICON_TRAFFIC.address }, undefined, iconPath),
	pow({ dapp: UNREGISTERED.address }, undefined, iconPath),
	{
		...pow({ dapp: ALWAYS_PASS_SITE_KEY }, undefined, iconPath),
		compare: false,
	},
	pow(
		{ dapp: AUDIO.address, sessionId: "s-audio-image" },
		undefined,
		audioPath,
	),
	pow({ dapp: AUDIO.address, sessionId: "s-audio-icon" }, undefined, audioPath),
	pow({ dapp: AUDIO.address, sessionId: "s-audio-pow" }, undefined, audioPath),
	pow({ dapp: AUDIO.address }, undefined, audioPath),
	pow(
		{ dapp: FRICTIONLESS.address, sessionId: "s-audio-off" },
		undefined,
		audioPath,
	),
	pow(
		{ dapp: AUDIO_TRAFFIC.address, sessionId: "s-audio-traffic" },
		[origin, browser, from("198.51.100.30")],
		audioPath,
	),
	{
		...pow({ dapp: ALWAYS_PASS_SITE_KEY }, undefined, audioPath),
		compare: false,
	},
];

// Each icon-order render's seed, in the order the renders draw them, for the Rust to replay: the
// renderers draw them from `createSeed` (puzzle-assets/src/prng.ts). Audio clips come from a
// buffer the TS fills ahead and on a timer, so which seed a served clip came from is timing and
// cannot be replayed; the audio cases are compared on everything but the clip and its answer.
// The builtin's own exports object: an `import` of it here may be a copy, which patching
// would not reach.
const builtinCrypto = createRequire(import.meta.url)("node:crypto") as {
	randomBytes: (size: number, ...rest: unknown[]) => Buffer;
};
const seeds: string[] = [];
const drawBytes = builtinCrypto.randomBytes;
builtinCrypto.randomBytes = (size: number, ...rest: unknown[]) => {
	const drawn = drawBytes(size, ...rest);
	const stack = new Error().stack ?? "";
	if (stack.includes("createSeed") && stack.includes("renderIconOrder"))
		seeds.push(drawn.toString("hex"));
	return drawn;
};
syncBuiltinESMExports();
const server: Server = await startProviderApi(env, false, 0);
const port = (server.address() as AddressInfo).port;
const exchanges: Json[] = [];
for (const step of steps) {
	const bytes = requestBytes(step);
	const sentAt = Date.now();
	const response = await send(port, bytes);
	const text = response.toString("utf8");
	const body = text.slice(text.indexOf("\r\n\r\n") + 4);
	const issuedAt = /"timestamp":"(\d+)"/.exec(body)?.[1];
	exchanges.push({
		request: bytes.toString("base64"),
		response: response.toString("base64"),
		compare: step.compare !== false,
		padded: step.padded === true,
		at: issuedAt === undefined ? sentAt : Number(issuedAt),
	});
}
const metrics = (
	await send(port, requestBytes({ method: "GET", path: "/metrics" }))
)
	.toString("utf8")
	.split("\n")
	.filter(
		(line) =>
			line.startsWith("prosopo_captcha_issued") ||
			line.startsWith("prosopo_captcha_issue_errors"),
	)
	.sort();
await new Promise<void>((resolve) => setTimeout(resolve, 1500));
const after = await dumpDatabase(DATABASE);
const cacheAfter = await dumpCache();
await client.quit();
await new Promise<void>((resolve) => server.close(() => resolve()));
await ipapi.close();
// resolveIconOrderRenderSettings over the overrides a site, a traffic category and a session
// can give, including the decoy cut, which only changes the background and so is checked here.
const iconOrderOverrides: (Record<string, unknown> | undefined | null)[] = [
	undefined,
	{},
	{ targetCount: 4 },
	{ decoyCount: 9 },
	{ targetCount: 2, decoyCount: 9 },
	{ targetCount: 6, decoyCount: 6 },
	{ targetCount: 12 },
	{ strokeWidth: 0, iconOpacity: 0.5, haloOpacity: null, backgroundClutter: 0 },
	{ targetCount: 0, decoyCount: 0 },
];
const iconOrderSettings: Json[] = [];
for (const site of iconOrderOverrides) {
	for (const other of iconOrderOverrides) {
		iconOrderSettings.push({
			site: site ?? null,
			other: other ?? null,
			resolved: resolveIconOrderRenderSettings(
				site ?? undefined,
				other ?? undefined,
			) as unknown as Json,
		});
	}
}
writeFileSync(
	fileURLToPath(new URL("./icon-order-settings-vectors.json", import.meta.url)),
	`${JSON.stringify(iconOrderSettings, null, "\t")}\n`,
);
const audioOverrides: (Record<string, unknown> | undefined | null)[] = [
	undefined,
	{},
	{ digitCount: 6 },
	{ digitCount: null, noiseSnrDb: 9 },
	{ noiseSnrDb: 0, babbleGain: 0, babbleVoices: 0, reverbMix: 0, gapMs: 0 },
	{ digitCount: 4, gapMs: 200, reverbMix: 0.35 },
];
const audioSettings: Json[] = [];
for (const site of audioOverrides) {
	for (const other of audioOverrides) {
		audioSettings.push({
			site: site ?? null,
			other: other ?? null,
			resolved: resolveAudioRenderSettings(
				(site ?? undefined) as never,
				(other ?? undefined) as never,
			) as unknown as Json,
		});
	}
}
writeFileSync(
	fileURLToPath(new URL("./audio-settings-vectors.json", import.meta.url)),
	`${JSON.stringify(audioSettings, null, "\t")}\n`,
);
writeFileSync(
	fileURLToPath(new URL("./challenge-vectors.json", import.meta.url)),
	`${JSON.stringify({
		database: DATABASE,
		provider: env.pair?.address ?? null,
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
		exchanges,
		metrics,
		seeds,
		after: {
			powcaptchas: after.powcaptchas,
			iconordercaptchas: after.iconordercaptchas,
			audiocaptchas: after.audiocaptchas,
			sessions: after.sessions,
		},
		cacheAfter,
	})}\n`,
);
console.log(`wrote challenge-vectors.json (${steps.length} requests)`);
process.exit(0);
