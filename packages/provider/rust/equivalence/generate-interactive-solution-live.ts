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

// Writes interactive-solution-live-vectors.json: the provider's real app, on a live environment
// (see live-harness.ts), taking puzzle, audio and icon-order solutions across every branch of
// interactiveCaptchaSolution.ts and interactiveCaptchaManager.ts. The challenges are issued by
// the app's own challenge routes before recording starts, and their answers read back from the
// records. Then for each type: right and wrong answers, a resubmission, unreadable and short
// salts, an expired challenge, an unknown one, signatures that do not check out, a session-backed
// solve with behavioural data, SIMD readings and client metadata, and the parse, test-key and
// unregistered-site answers. After the stores are dumped, two concurrent right answers to one
// fresh puzzle are sent and their verdicts kept as evidence of the TS's unguarded claim; the
// Rust sends the same pair and must grade only one. Run on Node 24 with the live stores up.
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
const DATABASE = "equivalence_interactive_solution";

const PUZZLE = getPair("//Alice");
const ICON = getPair("//Bob");
const AUDIO = getPair("//Charlie");
const PUZZLE_FRICTIONLESS = getPair("//Dave");
const SHORT = getPair("//Eve");
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

const poolDir = mkdtempSync(join(tmpdir(), "interactive-solution-pool-"));
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
		account: PUZZLE.address,
		settings: { ...base, captchaType: "puzzle" },
		tier: Tier.Free,
	},
	{
		account: ICON.address,
		settings: {
			...base,
			captchaType: "iconOrder",
			captchaTypeFeatureFlags: { iconOrder: true },
		},
		tier: Tier.Free,
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
		account: PUZZLE_FRICTIONLESS.address,
		settings: {
			...base,
			captchaType: "frictionless",
			frictionlessTypes: { image: false, puzzle: true },
		},
		tier: Tier.Professional,
	},
	{
		account: SHORT.address,
		settings: { ...base, captchaType: "puzzle", solutionTimeout: 1 },
		tier: Tier.Free,
	},
] as unknown as IUserDataSlim[]);

const queue = new RedisWriteQueue(db.getRedisConnection(), env.logger);
const seedSession = async (
	sessionId: string,
	extra: Partial<Session>,
): Promise<void> => {
	const session = {
		sessionId,
		createdAt: new Date(Date.now() - 10000),
		token: `token-${sessionId}`,
		score: 0.3,
		threshold: 0.5,
		scoreComponents: { baseScore: 0.25 },
		ipAddress: getCompositeIpAddress("203.0.113.7"),
		captchaType: CaptchaType.puzzle,
		webView: false,
		iFrame: false,
		decryptedHeadHash: `head-${sessionId}`,
		siteKey: PUZZLE_FRICTIONLESS.address,
		bundleId: "bundle-a",
		...extra,
	} as Session;
	await db.storeSessionRecord(session);
	await queue.cacheSession(
		sessionId,
		session as unknown as Record<string, unknown>,
	);
};
await seedSession("s-puzzle", {});
await seedSession("s-audio", {
	captchaType: CaptchaType.image,
	siteKey: AUDIO.address,
});
await seedSession("s-audio-wrong", {
	captchaType: CaptchaType.image,
	siteKey: AUDIO.address,
});
await seedSession("s-audio-resubmitted", {
	captchaType: CaptchaType.image,
	siteKey: AUDIO.address,
});

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
	["Prosopo-Site-Key", dapp.length > 40 ? dapp : PUZZLE.address],
	["Prosopo-User", USER.address],
];

type Kind = "puzzle" | "audio" | "icon-order";
type Issued = {
	kind: Kind;
	dapp: string;
	challenge: string;
	signature: string;
	timestamp: string;
	record: Record<string, unknown>;
};
const issue = async (
	kind: Kind,
	dapp: string,
	sessionId?: string,
): Promise<Issued> => {
	const response = await send(
		port,
		requestBytes({
			method: "POST",
			path: `/v1/prosopo/provider/client/captcha/${kind}`,
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
	if (body.status !== "ok")
		throw new Error(`no ${kind} challenge for ${dapp}: ${text}`);
	const read =
		kind === "puzzle"
			? db.getPuzzleCaptchaRecordByChallenge(body.challenge)
			: kind === "audio"
				? db.getAudioCaptchaRecordByChallenge(body.challenge)
				: db.getIconOrderCaptchaRecordByChallenge(body.challenge);
	const record = (await read) as unknown as Record<string, unknown>;
	return {
		kind,
		dapp,
		challenge: body.challenge,
		signature: body.signature.provider.challenge,
		timestamp: body.timestamp,
		record,
	};
};

const puzzles = {
	right: await issue("puzzle", PUZZLE.address),
	wrong: await issue("puzzle", PUZZLE.address),
	resubmitted: await issue("puzzle", PUZZLE.address),
	badSalt: await issue("puzzle", PUZZLE.address),
	shortSalt: await issue("puzzle", PUZZLE.address),
	expired: await issue("puzzle", SHORT.address),
	tampered: await issue("puzzle", PUZZLE.address),
	otherUser: await issue("puzzle", PUZZLE.address),
	session: await issue("puzzle", PUZZLE_FRICTIONLESS.address, "s-puzzle"),
	race: await issue("puzzle", PUZZLE.address),
};
const audios = {
	right: await issue("audio", AUDIO.address, "s-audio"),
	wrong: await issue("audio", AUDIO.address, "s-audio-wrong"),
	resubmitted: await issue("audio", AUDIO.address, "s-audio-resubmitted"),
};
const icons = {
	right: await issue("icon-order", ICON.address),
	wrong: await issue("icon-order", ICON.address),
	resubmitted: await issue("icon-order", ICON.address),
	tooFew: await issue("icon-order", ICON.address),
	badSalt: await issue("icon-order", ICON.address),
};
const providerPair = env.pair;
if (!providerPair) throw new Error("no provider pair");
const unknownChallenge = `${Date.now()}___${USER.address}___${PUZZLE.address}___42`;
const unknown: Issued = {
	kind: "puzzle",
	dapp: PUZZLE.address,
	challenge: unknownChallenge,
	signature: u8aToHex(providerPair.sign(unknownChallenge)),
	timestamp: unknownChallenge.split("___")[0] as string,
	record: { targetX: 0, targetY: 0 },
};

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
		out.push({ key, value: (await client.get(key)) ?? null });
	return out;
};
const cache = await dumpCache();
const counters = await dumpCounters();

const SALT = embedData(`0x${"ab".repeat(32)}`, [120, 45]);
type Overrides = {
	answer?: Record<string, unknown>;
	salt?: string | null;
	providerSignature?: string;
	userSignature?: string;
	user?: typeof USER;
	behavioralData?: string;
	simdReadings?: string;
	clientMetaData?: Json;
};
const rightAnswer = (issued: Issued): Record<string, unknown> => {
	const record = issued.record;
	if (issued.kind === "puzzle")
		return {
			finalX: record.targetX,
			finalY: record.targetY,
			puzzleEvents: [
				{ x: 1, y: 2, t: 0 },
				{
					x: Number(record.targetX),
					y: Number(record.targetY),
					t: 640,
					extra: true,
				},
			],
		};
	if (issued.kind === "audio")
		return {
			answer: String(record.answer).split("").join(" "),
			replays: 2,
			audioEvents: [
				{ kind: "play", t: 0 },
				{ kind: "key", t: 900 },
			],
		};
	const targets = record.targets as { x: number; y: number }[];
	return {
		clicks: targets.map(({ x, y }) => ({ x, y })),
		iconOrderEvents: [{ x: 5, y: 5, t: 10 }],
	};
};
const submit = (issued: Issued, overrides: Overrides = {}): Step => {
	const user = overrides.user ?? USER;
	const body = {
		challenge: issued.challenge,
		...(overrides.answer ?? rightAnswer(issued)),
		signature: {
			user: {
				timestamp:
					overrides.userSignature ?? u8aToHex(user.sign(issued.timestamp)),
			},
			provider: { challenge: overrides.providerSignature ?? issued.signature },
		},
		user: USER.address,
		dapp: issued.dapp,
		...(overrides.salt !== null && { salt: overrides.salt ?? SALT }),
		...(overrides.behavioralData && {
			behavioralData: overrides.behavioralData,
		}),
		...(overrides.simdReadings && { simdReadings: overrides.simdReadings }),
		...(overrides.clientMetaData && {
			clientMetaData: overrides.clientMetaData,
		}),
	};
	return {
		method: "POST",
		path: `/v1/prosopo/provider/client/${issued.kind}/solution`,
		headers: [
			json,
			...account(issued.dapp),
			origin,
			browser,
			from("203.0.113.7"),
		],
		body: JSON.stringify(body),
	};
};
const raw = (kind: Kind, dapp: string, body: unknown): Step => ({
	method: "POST",
	path: `/v1/prosopo/provider/client/${kind}/solution`,
	headers: [json, ...account(dapp), origin, browser, from("203.0.113.7")],
	body: JSON.stringify(body),
});
const rightPuzzle = JSON.parse(submit(puzzles.right).body as string);
const wrongPuzzle = {
	finalX:
		Number(puzzles.wrong.record.targetX) +
		Number(puzzles.wrong.record.tolerance) +
		5,
	finalY: puzzles.wrong.record.targetY,
	puzzleEvents: [],
};
const iconTargets = icons.wrong.record.targets as { x: number; y: number }[];

const steps: Step[] = [
	raw("puzzle", PUZZLE.address, { dapp: PUZZLE.address }),
	raw("puzzle", PUZZLE.address, { ...rightPuzzle, finalX: "1" }),
	raw("audio", AUDIO.address, { ...rightPuzzle, answer: 7 }),
	raw("icon-order", ICON.address, { ...rightPuzzle, clicks: "no" }),
	raw("puzzle", PUZZLE.address, { ...rightPuzzle, dapp: "not-an-address" }),
	raw("puzzle", ALWAYS_PASS_SITE_KEY, {
		...rightPuzzle,
		dapp: ALWAYS_PASS_SITE_KEY,
	}),
	raw("icon-order", ALWAYS_FAIL_SITE_KEY, {
		...rightPuzzle,
		clicks: [],
		iconOrderEvents: [],
		dapp: ALWAYS_FAIL_SITE_KEY,
	}),
	raw("puzzle", UNREGISTERED.address, {
		...rightPuzzle,
		dapp: UNREGISTERED.address,
	}),
	submit(puzzles.tampered, { providerSignature: puzzles.right.signature }),
	submit(puzzles.otherUser, { user: OTHER_USER }),
	submit(unknown),
	submit(puzzles.right),
	submit(puzzles.wrong, { answer: wrongPuzzle }),
	submit(puzzles.resubmitted),
	submit(puzzles.resubmitted),
	submit(puzzles.badSalt, { salt: "0xzz" }),
	submit(puzzles.shortSalt, { salt: embedData(`0x${"ef".repeat(32)}`, [9]) }),
	submit(puzzles.expired),
	submit(puzzles.session, {
		behavioralData: BEHAVIOUR,
		simdReadings: READINGS,
		clientMetaData: { clientSessionId: "client-render-1" },
		salt: null,
	}),
	submit(audios.right, { behavioralData: BEHAVIOUR_NO_FOURTH }),
	submit(audios.wrong, { answer: { answer: "0000-x", replays: 0 } }),
	submit(audios.resubmitted, { answer: { answer: "" } }),
	submit(audios.resubmitted),
	submit(icons.right, { simdReadings: GARBAGE, behavioralData: GARBAGE }),
	submit(icons.wrong, {
		answer: {
			clicks: [...iconTargets].reverse().map(({ x, y }) => ({ x, y })),
			iconOrderEvents: [],
		},
	}),
	submit(icons.resubmitted),
	submit(icons.resubmitted),
	submit(icons.tooFew, {
		answer: {
			clicks: iconTargets.slice(1).map(({ x, y }) => ({ x, y })),
			iconOrderEvents: [],
		},
	}),
	submit(icons.badSalt, { salt: "0x01" }),
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

const raceRequest = requestBytes(submit(puzzles.race));
const raceVerdicts = (
	await Promise.all([send(port, raceRequest), send(port, raceRequest)])
).map((response) => {
	const text = response.toString("utf8");
	return JSON.parse(text.slice(text.indexOf("\r\n\r\n") + 4))
		.verified as boolean;
});

await client.quit();
await new Promise<void>((resolve) => server.close(() => resolve()));
await ipapi.close();
writeFileSync(
	fileURLToPath(
		new URL("./interactive-solution-live-vectors.json", import.meta.url),
	),
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
		after: {
			puzzlecaptchas: after.puzzlecaptchas,
			audiocaptchas: after.audiocaptchas,
			iconordercaptchas: after.iconordercaptchas,
			sessions: after.sessions,
		},
		cacheAfter,
		countersAfter,
		race: { request: raceRequest.toString("base64"), verdicts: raceVerdicts },
	})}\n`,
);
console.log(
	`wrote interactive-solution-live-vectors.json (${steps.length} requests; race verdicts ${raceVerdicts})`,
);
process.exit(0);
