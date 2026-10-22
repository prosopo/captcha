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

// Writes image-solution-live-vectors.json: the provider's real app, on a live environment (see
// live-harness.ts), taking image captcha solutions across every branch of
// submitImageCaptchaSolution.ts and imgCaptchaTasks.ts's `dappUserSolution`. The challenges are
// issued by the app's own `captcha/image` route before recording starts, one deadline is moved
// into the past, and the right answers are read from the dataset's stored solutions. Then: right
// and wrong answers, selections that look scripted (a repeated position, a keyboard selection
// with a position, input methods that do not line up), keyboard selections, a checkbox click,
// a resubmission, an expired request, a request hash the captchas do not match, signatures that
// do not check out, a session-backed solve with behavioural data, SIMD readings and client
// metadata, and the parse, test-key and unregistered-site answers. Run on Node 24 with the
// live stores up.
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
import { buildDataset, parseCaptchaDataset } from "@prosopo/datasets";
import { getPair } from "@prosopo/keyring";
import {
	ALWAYS_FAIL_SITE_KEY,
	ALWAYS_PASS_SITE_KEY,
	CaptchaType,
	type IUserDataSlim,
	type Session,
	Tier,
} from "@prosopo/types";
import { embedData, u8aToHex } from "@prosopo/util";
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
const DATABASE = "equivalence_image_solution";

const IMAGE = getPair("//Alice");
const FRICTIONLESS = getPair("//Bob");
const UNREGISTERED = getPair("//Ferdie");
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

const poolDir = mkdtempSync(join(tmpdir(), "image-solution-pool-"));
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
		account: IMAGE.address,
		settings: { ...base, captchaType: "image" },
		tier: Tier.Free,
	},
	{
		account: FRICTIONLESS.address,
		settings: { ...base, captchaType: "frictionless" },
		tier: Tier.Professional,
	},
] as unknown as IUserDataSlim[]);

const ITEMS = Array.from({ length: 9 }, (_, index) => ({
	hash: `0x${(index + 1).toString(16).padStart(64, "0")}`,
	data: `https://cdn.example.com/img/${index}.jpg`,
	type: "image",
}));
const dataset = await buildDataset(
	parseCaptchaDataset({
		format: "SelectAll",
		captchas: Array.from({ length: 8 }, (_, index) => ({
			salt: `0x${index.toString(16).padStart(32, "0")}`,
			items: ITEMS,
			target: "dog",
			solution: index % 2 === 0 ? [1, 4] : [2],
		})),
	} as unknown as JSON),
);
await db.storeDataset(dataset);
env.datasetId = dataset.datasetId as string;

const queue = new RedisWriteQueue(db.getRedisConnection(), env.logger);
const session = {
	sessionId: "s-image",
	createdAt: new Date(Date.now() - 10000),
	token: "token-s-image",
	score: 0.3,
	threshold: 0.5,
	scoreComponents: { baseScore: 0.25 },
	ipAddress: getCompositeIpAddress("203.0.113.7"),
	captchaType: CaptchaType.image,
	webView: false,
	iFrame: false,
	decryptedHeadHash: "head-s-image",
	siteKey: FRICTIONLESS.address,
	bundleId: "bundle-a",
} as Session;
await db.storeSessionRecord(session);
await queue.cacheSession(
	"s-image",
	session as unknown as Record<string, unknown>,
);

const server: Server = await startProviderApi(env, false, 0);
const port = (server.address() as AddressInfo).port;
const json: [string, string] = ["Content-Type", "application/json"];
const origin: [string, string] = ["Origin", "https://example.com"];
const browser: [string, string] = [
	"User-Agent",
	"Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
];
const from = (ip: string): [string, string] => ["X-Forwarded-For", ip];
const account = (dapp: string): [string, string][] => [
	["Prosopo-Site-Key", dapp.length > 40 ? dapp : IMAGE.address],
	["Prosopo-User", USER.address],
];

type Served = {
	captchaId: string;
	captchaContentId: string;
	items: { hash: string }[];
};
type Issued = {
	dapp: string;
	captchas: Served[];
	requestHash: string;
	timestamp: string;
	signature: string;
};
const issue = async (dapp: string, sessionId?: string): Promise<Issued> => {
	const response = await send(
		port,
		requestBytes({
			method: "POST",
			path: "/v1/prosopo/provider/client/captcha/image",
			headers: [json, ...account(dapp), origin, browser, from("203.0.113.7")],
			body: JSON.stringify({
				user: USER.address,
				dapp,
				...(sessionId && { sessionId }),
			}),
		}),
	);
	const text = response.toString("utf8");
	const body = JSON.parse(text.slice(text.indexOf("\r\n\r\n") + 4));
	if (body.status !== "ok" || body.captchas.length === 0)
		throw new Error(`no image challenge for ${dapp}: ${text}`);
	return {
		dapp,
		captchas: body.captchas,
		requestHash: body.requestHash,
		timestamp: body.timestamp,
		signature: body.signature.provider.requestHash,
	};
};
const challenges = {
	right: await issue(IMAGE.address),
	wrong: await issue(IMAGE.address),
	repeated: await issue(IMAGE.address),
	keyboard: await issue(IMAGE.address),
	keyboardWithPosition: await issue(IMAGE.address),
	mismatchedMethods: await issue(IMAGE.address),
	checkbox: await issue(IMAGE.address),
	resubmitted: await issue(IMAGE.address),
	expired: await issue(IMAGE.address),
	mismatchedHash: await issue(IMAGE.address),
	tampered: await issue(IMAGE.address),
	otherUser: await issue(IMAGE.address),
	session: await issue(FRICTIONLESS.address, "s-image"),
};
await env
	.getDb()
	.getTables()
	.commitment.updateOne(
		{ requestHash: challenges.expired.requestHash },
		{ $set: { deadlineTimestamp: new Date(Date.now() - 1000) } },
	);
const solutionOf = async (captchaId: string): Promise<string[]> => {
	const record = await db.getSolutionByCaptchaId(captchaId);
	if (!record) throw new Error(`no solution for ${captchaId}`);
	return record.solution as string[];
};
const answers = new Map<string, string[]>();
for (const issued of Object.values(challenges))
	for (const captcha of issued.captchas)
		answers.set(captcha.captchaId, await solutionOf(captcha.captchaId));

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
const cache = await dumpCache();

type Mode =
	| "right"
	| "wrong"
	| "repeated"
	| "keyboard"
	| "keyboardWithPosition"
	| "mismatchedMethods"
	| "checkbox";
const salted = (coords: number[]): string =>
	embedData(`0x${"ab".repeat(60)}`, coords);
const solve = (issued: Issued, mode: Mode): Json[] =>
	issued.captchas.map((captcha, index) => {
		const right = answers.get(captcha.captchaId) ?? [];
		const solution =
			mode === "wrong"
				? captcha.items.slice(6, 7).map((item) => item.hash)
				: right;
		const keyboard = mode === "keyboard" || mode === "keyboardWithPosition";
		const coords = solution.flatMap((_, at) =>
			keyboard && !(mode === "keyboardWithPosition" && index === 0 && at === 0)
				? [0, 0]
				: mode === "repeated"
					? [40, 40]
					: [30 + index * 50 + at * 7, 60 + at * 11],
		);
		const prefix = mode === "checkbox" && index === 0 ? [142, 87] : [];
		const methods =
			mode === "mismatchedMethods"
				? ["pointer"]
				: keyboard
					? [
							...(prefix.length ? ["pointer"] : []),
							...solution.map(() => "keyboard"),
						]
					: undefined;
		return {
			captchaId: captcha.captchaId,
			captchaContentId: captcha.captchaContentId,
			solution,
			salt: salted([...prefix, ...coords]),
			...(methods && { inputMethods: methods }),
		} as unknown as Json;
	});
type Overrides = {
	captchas?: Json[];
	providerSignature?: string;
	user?: typeof USER;
	requestHash?: string;
	behavioralData?: string;
	simdReadings?: string;
	clientMetaData?: Json;
};
const submit = (
	issued: Issued,
	mode: Mode,
	overrides: Overrides = {},
): Step => {
	const user = overrides.user ?? USER;
	return {
		method: "POST",
		path: "/v1/prosopo/provider/client/solution",
		headers: [
			json,
			...account(issued.dapp),
			origin,
			browser,
			from("203.0.113.7"),
		],
		body: JSON.stringify({
			user: USER.address,
			dapp: issued.dapp,
			captchas: overrides.captchas ?? solve(issued, mode),
			requestHash: overrides.requestHash ?? issued.requestHash,
			timestamp: issued.timestamp,
			signature: {
				user: { timestamp: u8aToHex(user.sign(issued.timestamp)) },
				provider: {
					requestHash: overrides.providerSignature ?? issued.signature,
				},
			},
			...(overrides.behavioralData && {
				behavioralData: overrides.behavioralData,
			}),
			...(overrides.simdReadings && { simdReadings: overrides.simdReadings }),
			...(overrides.clientMetaData && {
				clientMetaData: overrides.clientMetaData,
			}),
		}),
	};
};
const rightBody = JSON.parse(submit(challenges.right, "right").body as string);
const raw = (dapp: string, body: unknown): Step => ({
	method: "POST",
	path: "/v1/prosopo/provider/client/solution",
	headers: [json, ...account(dapp), origin, browser, from("203.0.113.7")],
	body: JSON.stringify(body),
});

const steps: Step[] = [
	raw(IMAGE.address, { dapp: IMAGE.address }),
	raw(IMAGE.address, { ...rightBody, captchas: "no" }),
	raw(IMAGE.address, { ...rightBody, dapp: "not-an-address" }),
	raw(ALWAYS_PASS_SITE_KEY, { ...rightBody, dapp: ALWAYS_PASS_SITE_KEY }),
	raw(ALWAYS_FAIL_SITE_KEY, { ...rightBody, dapp: ALWAYS_FAIL_SITE_KEY }),
	raw(UNREGISTERED.address, { ...rightBody, dapp: UNREGISTERED.address }),
	submit(challenges.tampered, "right", {
		providerSignature: challenges.right.signature,
	}),
	submit(challenges.otherUser, "right", { user: OTHER_USER }),
	submit(challenges.right, "right", { requestHash: "not-hex" }),
	submit(challenges.right, "right"),
	submit(challenges.wrong, "wrong"),
	submit(challenges.repeated, "repeated"),
	submit(challenges.keyboard, "keyboard"),
	submit(challenges.keyboardWithPosition, "keyboardWithPosition"),
	submit(challenges.mismatchedMethods, "mismatchedMethods"),
	submit(challenges.checkbox, "checkbox"),
	submit(challenges.resubmitted, "right"),
	submit(challenges.resubmitted, "right"),
	submit(challenges.expired, "right"),
	submit(challenges.mismatchedHash, "right", {
		captchas: solve(challenges.mismatchedHash, "right").slice(1),
	}),
	submit(challenges.session, "right", {
		behavioralData: BEHAVIOUR,
		simdReadings: READINGS,
		clientMetaData: { clientSessionId: "client-render-1" },
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
await client.quit();
await new Promise<void>((resolve) => server.close(() => resolve()));
await ipapi.close();
const providerPair = env.pair;
writeFileSync(
	fileURLToPath(new URL("./image-solution-live-vectors.json", import.meta.url)),
	`${JSON.stringify({
		database: DATABASE,
		provider: providerPair?.address ?? null,
		datasetId: dataset.datasetId,
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
		after: {
			usercommitments: after.usercommitments,
			usersolutions: after.usersolutions,
			sessions: after.sessions,
		},
		cacheAfter,
	})}\n`,
);
console.log(
	`wrote image-solution-live-vectors.json (${steps.length} requests)`,
);
process.exit(0);
