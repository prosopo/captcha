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

// Writes frictionless-live-vectors.json: the provider's real app, on a live environment (see
// live-harness.ts), answering `captcha/frictionless` across its branches: the parse, test-key,
// reused-token and unregistered-site answers; sites pinned to each captcha type; access rules
// that block, restrict to each type and allow; a traffic filter; reuse of a session for the
// same user, address and site, and its eviction; a refresh that asks for an image; and every
// rung of the decision ladder (no token, no head hash, a payload that cannot be read, a user
// agent that does not match, a web view, an old payload, an auto-ban score, the puzzle band,
// a score above the threshold, no page URL, and the default PoW), with a honeypot site and the
// language penalty. The detector payloads and SIMD readings are opaque to the provider: the
// decoders are swapped, through a loader hook, for stand-ins that answer from a table the
// generator writes, and the Rust gets the same table. Session ids and puzzle draws are random,
// so the Rust masks and checks them. Run on Node 24 with the live stores up.
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import { register } from "node:module";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RedisWriteQueue } from "@prosopo/database";
import { getPair } from "@prosopo/keyring";
import { ALWAYS_PASS_SITE_KEY, type IUserDataSlim, Tier } from "@prosopo/types";
import {
	type AccessRuleEntry,
	accessRuleInput,
} from "@prosopo/user-access-policy";
import { startProviderApi } from "../../src/api/startProviderApi.js";
import { hashUserAgent } from "../../src/utils/hashUserAgent.js";
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

const STAND_IN = (table: string) =>
	`data:text/javascript,${encodeURIComponent(`export default async (payload) => { const found = globalThis.${table}?.[payload]; if (found === undefined) throw new Error("not a payload the generator made"); return structuredClone(found); };`)}`;
register(
	`data:text/javascript,${encodeURIComponent(`
export async function resolve(specifier, context, next) {
	if (specifier.endsWith("/decodePayload.js")) return { url: ${JSON.stringify(STAND_IN("__PROSOPO_PAYLOADS"))}, shortCircuit: true };
	if (specifier.endsWith("/decodeSimd.js")) return { url: ${JSON.stringify(STAND_IN("__PROSOPO_SIMD"))}, shortCircuit: true };
	return next(specifier, context);
}`)}`,
);

process.env.NODE_ENV = "production";
process.env.PROSOPO_DECODER_WORKERS = "0";
Reflect.deleteProperty(process.env, "MAINTENANCE_MODE");
const DATABASE = "equivalence_frictionless";

const FRICTIONLESS = getPair("//Alice");
const LADDER = getPair("//Bob");
const WEBVIEW = getPair("//Charlie");
const AUTOBAN = getPair("//Dave");
const PIN_POW = getPair("//Eve");
const PIN_IMAGE = getPair("//PinImage");
const PIN_PUZZLE = getPair("//PinPuzzle");
const PIN_ICON = getPair("//PinIcon");
const TRAFFIC = getPair("//Traffic");
const NO_IMAGE = getPair("//NoImage");
const HONEYPOT = getPair("//Honeypot");
const AUDIO = getPair("//Audio");
const UNREGISTERED = getPair("//Ferdie");
const USER = getPair("//User").address;
const BLOCKED_USER = getPair("//Blocked").address;
const IMAGE_USER = getPair("//ImageUser").address;
const POW_USER = getPair("//PowUser").address;
const PUZZLE_USER = getPair("//PuzzleUser").address;
const SCORE_USER = getPair("//ScoreUser").address;
const ALLOWED_USER = getPair("//AllowedUser").address;
const REUSE_USER = getPair("//ReuseUser").address;
const BOUNDARY_USER = getPair("//BoundaryUser").address;

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
	"198.51.100.40": answer("198.51.100.40", { is_mobile: true }),
};

const poolDir = mkdtempSync(join(tmpdir(), "frictionless-pool-"));
for (const id of ["bundle-a", "bundle-b"]) {
	writeFileSync(join(poolDir, `${id}.js`), `/* detector ${id} */`);
	writeFileSync(
		join(poolDir, `${id}.json`),
		JSON.stringify({
			privateKey: `pk-${id}`,
			innerConfig: `cfg-${id}`,
			payloadLayout: "TFY=",
			keyMap: "km",
		}),
	);
}
const poolFiles: Record<string, string> = {};
for (const name of readdirSync(poolDir))
	poolFiles[name] = readFileSync(join(poolDir, name), "utf8");

const UA =
	"Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0";
const now = Date.now();
const detected = (extra: Record<string, unknown>): Record<string, unknown> => ({
	score: 0.1,
	timestamp: now,
	providerSelectEntropy: 7,
	userId: USER,
	userAgent: hashUserAgent(UA),
	isWebView: false,
	isIframe: false,
	decryptedHeadHash: "head-ok",
	triggeredDetectors: [],
	shadowDomPenalty: false,
	d: { wd: 0, plugins: 3 },
	...extra,
});
const PAYLOADS: Record<string, Record<string, unknown>> = {
	"tok-clean": detected({}),
	"tok-clean-2": detected({}),
	"tok-clean-3": detected({}),
	"tok-clean-4": detected({}),
	"tok-clean-5": detected({}),
	"tok-clean-6": detected({}),
	"tok-clean-7": detected({}),
	"tok-clean-8": detected({}),
	"tok-clean-9": detected({}),
	"tok-clean-10": detected({}),
	"tok-clean-11": detected({}),
	"tok-clean-12": detected({}),
	"tok-clean-13": detected({}),
	"tok-high": detected({
		score: 0.9,
		triggeredDetectors: [1, 4, 9],
		shadowDomPenalty: true,
	}),
	"tok-band": detected({ score: 0.6 }),
	"tok-at-puzzle": detected({ score: 0.5, userId: BOUNDARY_USER }),
	"tok-at-image": detected({ score: 0.8, userId: BOUNDARY_USER }),
	"tok-at-autoban": detected({ score: 0.9, userId: BOUNDARY_USER }),
	"tok-ladder-pow": detected({ score: 0.3 }),
	"tok-webview": detected({ isWebView: true }),
	"tok-old": detected({ timestamp: now - 20 * 60 * 1000 }),
	"tok-mismatch": detected({ userAgent: "0".repeat(32) }),
	"tok-autoban": detected({ score: 0.95 }),
	"tok-no-score": detected({ score: undefined }),
	"tok-iframe": detected({ isIframe: true, d: { "x.y": 1, ok: true } }),
	"tok-lang": detected({}),
	"tok-mobile": detected({}),
};
for (const value of Object.values(PAYLOADS))
	if (value.score === undefined) Reflect.deleteProperty(value, "score");
const SIMD: Record<string, Record<string, unknown>> = {
	"simd-1": {
		supported: true,
		schema: 1,
		runsPerOp: 3,
		ops: [{ name: "f32x4_div", bestNs: 2.01 }],
		timestamp: 5,
	},
};
Object.assign(globalThis, {
	__PROSOPO_PAYLOADS: PAYLOADS,
	__PROSOPO_SIMD: SIMD,
});
// A token is single use, so each request gets its own copy of the payload it names.
let minted = 0;
const tok = (template: string): string => {
	const token = `${template}#${minted++}`;
	const found = PAYLOADS[template];
	if (found) PAYLOADS[token] = structuredClone(found);
	return token;
};

await resetStores(DATABASE);
const ipapi = await fakeIpapi(IPAPI);
const variables = liveVariables(DATABASE, ipapi.url, {
	PROSOPO_DETECTOR_POOL_DIR: poolDir,
	PROSOPO_DECODER_WORKERS: "0",
	L_RULES: JSON.stringify({ en: 0.05, "en-GB": 0.1 }),
	DNS_EVENT_SUBZONE: "dns.example",
	DNS_EVENT_HMAC_SECRET: "dns-secret",
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
		account: FRICTIONLESS.address,
		settings: { ...base, captchaType: "frictionless" },
		tier: Tier.Professional,
	},
	{
		account: LADDER.address,
		settings: {
			...base,
			captchaType: "frictionless",
			frictionlessThreshold: {
				frictionlessPuzzleThreshold: 0.5,
				frictionlessImageThreshold: 0.8,
			},
			imageMaxRounds: 6,
		},
		tier: Tier.Professional,
	},
	{
		account: WEBVIEW.address,
		settings: { ...base, captchaType: "frictionless", disallowWebView: true },
		tier: Tier.Professional,
	},
	{
		account: AUTOBAN.address,
		settings: {
			...base,
			captchaType: "frictionless",
			autoBanScoreThreshold: 0.9,
		},
		tier: Tier.Professional,
	},
	{
		account: PIN_POW.address,
		settings: { ...base, captchaType: "pow" },
		tier: Tier.Free,
	},
	{
		account: PIN_IMAGE.address,
		settings: { ...base, captchaType: "image", imageMaxRounds: 3 },
		tier: Tier.Free,
	},
	{
		account: PIN_PUZZLE.address,
		settings: { ...base, captchaType: "puzzle" },
		tier: Tier.Free,
	},
	{
		account: PIN_ICON.address,
		settings: {
			...base,
			captchaType: "iconOrder",
			captchaTypeFeatureFlags: { iconOrder: true },
		},
		tier: Tier.Free,
	},
	{
		account: TRAFFIC.address,
		settings: {
			...base,
			captchaType: "frictionless",
			trafficFilter: {
				vpn: {
					action: "challenge",
					captchaType: "image",
					solvedImagesCount: 4,
				},
			},
		},
		tier: Tier.Enterprise,
	},
	{
		account: NO_IMAGE.address,
		settings: {
			...base,
			captchaType: "frictionless",
			frictionlessTypes: { image: false, puzzle: true },
			widgetFeatureFlags: { puzzleImageSwitch: true },
		},
		tier: Tier.Professional,
	},
	{
		account: HONEYPOT.address,
		settings: {
			...base,
			captchaType: "frictionless",
			honeypot: {
				enabled: true,
				question: "what is two plus two",
				encodingType: "morse",
			},
		},
		tier: Tier.Professional,
	},
	{
		account: AUDIO.address,
		settings: {
			...base,
			captchaType: "frictionless",
			audioAccessibilityEnabled: true,
			captchaTypeFeatureFlags: { audio: true },
		},
		tier: Tier.Professional,
	},
] as unknown as IUserDataSlim[]);
const rules: unknown[] = [
	{ type: "block", userId: BLOCKED_USER },
	{
		type: "restrict",
		userId: IMAGE_USER,
		captchaType: "image",
		solvedImagesCount: 3,
	},
	{ type: "restrict", userId: POW_USER, captchaType: "pow" },
	{
		type: "restrict",
		userId: PUZZLE_USER,
		captchaType: "puzzle",
		solvedImagesCount: 7,
	},
	{ type: "restrict", userId: SCORE_USER, frictionlessScore: 0.5 },
	{ type: "allow", userId: ALLOWED_USER },
];
await db
	.getUserAccessRulesStorage()
	.insertRules(
		rules.map(
			(rule) => ({ rule: accessRuleInput.parse(rule) }) as AccessRuleEntry,
		),
	);
const queue = new RedisWriteQueue(db.getRedisConnection(), env.logger);
for (const [id, bundle] of [
	["det-a", "bundle-a"],
	["det-b", "bundle-b"],
	["det-gone", "bundle-missing"],
])
	await queue.cacheDetectorBundle(id as string, bundle as string);
await db.storeSessionRecord({
	sessionId: "s-used-token",
	createdAt: new Date(now - 10000),
	token: "tok-used",
	score: 0.1,
	threshold: 0.5,
	scoreComponents: { baseScore: 0.1 },
	ipAddress: { lower: 1n, type: "v4" },
	captchaType: "pow",
	webView: false,
	iFrame: false,
	decryptedHeadHash: "",
} as never);
await db.storeSessionRecord({
	sessionId: "s-refreshed-puzzle",
	createdAt: new Date(now - 30000),
	token: "tok-refreshed",
	score: 0.1,
	threshold: 0.5,
	scoreComponents: { baseScore: 0.1 },
	ipAddress: { lower: 1n, type: "v4" },
	captchaType: "puzzle",
	webView: false,
	iFrame: false,
	decryptedHeadHash: "",
	siteKey: NO_IMAGE.address,
	refreshCount: 1,
} as never);

const seedClient = await db.getRedisConnection().getClient();
const seedStrings: Json[] = [];
for (const key of (await seedClient.keys("*")).sort())
	if ((await seedClient.type(key)) === "string")
		seedStrings.push({ key, raw: (await seedClient.get(key)) ?? null });
const seed = await dumpDatabase(DATABASE);
const redis = await dumpRedisHashes();

const server: Server = await startProviderApi(env, false, 0);
const port = (server.address() as AddressInfo).port;
type Ask = {
	dapp: string;
	user?: string;
	token?: string;
	headHash?: string;
	detector?: string;
	currentUrl?: string | null;
	ip?: string;
	language?: string;
	extra?: Record<string, unknown>;
	userAgent?: string;
};
const frictionless = (ask: Ask): Step => {
	const user = ask.user ?? USER;
	return {
		method: "POST",
		path: "/v1/prosopo/provider/client/captcha/frictionless",
		headers: [
			["Content-Type", "application/json"],
			["Origin", "https://example.com"],
			[
				"Prosopo-Site-Key",
				ask.dapp.length > 40 ? ask.dapp : FRICTIONLESS.address,
			],
			["Prosopo-User", user],
			["User-Agent", ask.userAgent ?? UA],
			["X-Forwarded-For", ask.ip ?? "203.0.113.7"],
			...(ask.language
				? ([["Accept-Language", ask.language]] as [string, string][])
				: []),
		],
		body: JSON.stringify({
			dapp: ask.dapp,
			user,
			token: ask.token ?? "",
			headHash: ask.headHash ?? (ask.token ? "head" : ""),
			...(ask.detector && { detectorSessionId: ask.detector }),
			...(ask.currentUrl !== null && {
				currentUrl: ask.currentUrl ?? "https://example.com/checkout?secret=1#x",
			}),
			...ask.extra,
		}),
	};
};
const users = Array.from(
	{ length: 40 },
	(_, i) => getPair(`//Frictionless${i}`).address,
);
let next = 0;
const fresh = (): string => users[next++] as string;
const steps: Step[] = [
	{
		...frictionless({ dapp: FRICTIONLESS.address }),
		body: JSON.stringify({ dapp: FRICTIONLESS.address }),
	},
	frictionless({ dapp: ALWAYS_PASS_SITE_KEY, user: fresh() }),
	frictionless({
		dapp: UNREGISTERED.address,
		user: fresh(),
		token: tok("tok-clean"),
		detector: "det-a",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: fresh(),
		token: "tok-used",
		detector: "det-a",
	}),
	frictionless({ dapp: FRICTIONLESS.address, user: fresh() }),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: fresh(),
		token: tok("tok-clean-2"),
		headHash: "",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: fresh(),
		token: tok("tok-clean-3"),
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: fresh(),
		token: tok("tok-clean-4"),
		detector: "det-gone",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: fresh(),
		token: tok("tok-unknown"),
		detector: "det-a",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: fresh(),
		token: tok("tok-no-score"),
		detector: "det-a",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: USER,
		token: tok("tok-clean-5"),
		detector: "det-a",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: USER,
		token: tok("tok-mismatch"),
		detector: "det-b",
		ip: "198.51.100.40",
	}),
	frictionless({
		dapp: WEBVIEW.address,
		user: USER,
		token: tok("tok-webview"),
		detector: "det-a",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: USER,
		token: tok("tok-old"),
		detector: "det-a",
		ip: "192.0.2.1",
	}),
	frictionless({
		dapp: AUTOBAN.address,
		user: USER,
		token: tok("tok-autoban"),
		detector: "det-a",
	}),
	frictionless({
		dapp: LADDER.address,
		user: USER,
		token: tok("tok-band"),
		detector: "det-a",
	}),
	frictionless({
		dapp: LADDER.address,
		user: USER,
		token: tok("tok-ladder-pow"),
		detector: "det-a",
		ip: "192.0.2.2",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: USER,
		token: tok("tok-high"),
		detector: "det-a",
		ip: "192.0.2.3",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: USER,
		token: tok("tok-clean-6"),
		detector: "det-a",
		currentUrl: null,
		ip: "192.0.2.4",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: USER,
		token: tok("tok-iframe"),
		detector: "det-a",
		ip: "192.0.2.5",
		extra: {
			simdReadings: "simd-1",
			iframeUrl: "https://widget.example.com/x?y",
			clientSessionId: "client-1",
			mode: "invisible",
		},
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: USER,
		token: tok("tok-lang"),
		detector: "det-a",
		ip: "192.0.2.6",
		language: "en-GB,en;q=0.9",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: USER,
		token: tok("tok-clean-7"),
		detector: "det-a",
		ip: "192.0.2.7",
		language: "constructor",
	}),
	frictionless({ dapp: PIN_POW.address, user: fresh(), detector: "det-a" }),
	frictionless({ dapp: PIN_IMAGE.address, user: fresh() }),
	frictionless({ dapp: PIN_PUZZLE.address, user: fresh() }),
	frictionless({ dapp: PIN_ICON.address, user: fresh() }),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: BLOCKED_USER,
		token: tok("tok-clean-8"),
		detector: "det-a",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: IMAGE_USER,
		token: tok("tok-clean-9"),
		detector: "det-a",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: POW_USER,
		token: tok("tok-clean-10"),
		detector: "det-a",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: PUZZLE_USER,
		token: tok("tok-clean-11"),
		detector: "det-a",
	}),
	frictionless({
		dapp: AUTOBAN.address,
		user: SCORE_USER,
		token: tok("tok-band"),
		detector: "det-a",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: ALLOWED_USER,
		token: tok("tok-clean-12"),
		detector: "det-a",
	}),
	frictionless({
		dapp: TRAFFIC.address,
		user: fresh(),
		token: tok("tok-clean-13"),
		detector: "det-a",
		ip: "198.51.100.30",
	}),
	frictionless({
		dapp: HONEYPOT.address,
		user: fresh(),
		token: tok("tok-high"),
		detector: "det-a",
	}),
	frictionless({
		dapp: AUDIO.address,
		user: fresh(),
		token: tok("tok-high"),
		detector: "det-a",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: REUSE_USER,
		token: "tok-reuse-1",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: REUSE_USER,
		token: "tok-reuse-2",
	}),
	frictionless({
		dapp: FRICTIONLESS.address,
		user: REUSE_USER,
		token: "tok-reuse-3",
		detector: "det-b",
	}),
	frictionless({
		dapp: NO_IMAGE.address,
		user: fresh(),
		token: tok("tok-high"),
		detector: "det-a",
		extra: { refreshOf: "s-refreshed-puzzle", switchToImage: true },
	}),
	frictionless({
		dapp: NO_IMAGE.address,
		user: fresh(),
		token: tok("tok-band"),
		detector: "det-a",
		ip: "198.51.100.40",
	}),
	frictionless({
		dapp: LADDER.address,
		user: BOUNDARY_USER,
		token: tok("tok-at-puzzle"),
		detector: "det-a",
		ip: "192.0.2.20",
	}),
	frictionless({
		dapp: LADDER.address,
		user: BOUNDARY_USER,
		token: tok("tok-at-image"),
		detector: "det-a",
		ip: "192.0.2.21",
	}),
	frictionless({
		dapp: AUTOBAN.address,
		user: BOUNDARY_USER,
		token: tok("tok-at-autoban"),
		detector: "det-a",
		ip: "192.0.2.22",
	}),
];
const exchanges: Json[] = [];
for (const step of steps) {
	const bytes = requestBytes(step);
	const sentAt = Date.now();
	exchanges.push({
		request: bytes.toString("base64"),
		response: (await send(port, bytes)).toString("base64"),
		at: sentAt,
	});
}
await new Promise<void>((resolve) => setTimeout(resolve, 1500));
const client = await db.getRedisConnection().getClient();
const dumpStrings = async (): Promise<Json[]> => {
	const out: Json[] = [];
	for (const key of (await client.keys("*")).sort()) {
		if ((await client.type(key)) !== "string") continue;
		out.push({ key, raw: (await client.get(key)) ?? null });
	}
	return out;
};
const after = await dumpDatabase(DATABASE);
const stringsAfter = await dumpStrings();
await client.quit();
await new Promise<void>((resolve) => server.close(() => resolve()));
await ipapi.close();
writeFileSync(
	fileURLToPath(new URL("./frictionless-live-vectors.json", import.meta.url)),
	`${JSON.stringify({
		database: DATABASE,
		variables: {
			...variables,
			PROSOPO_IPAPI_URL: "{{IPAPI_URL}}",
			PROSOPO_DETECTOR_POOL_DIR: "{{POOL_DIR}}",
		},
		ipapi: IPAPI,
		poolFiles,
		seed,
		redis,
		seedStrings,
		payloads: PAYLOADS,
		simd: SIMD,
		now,
		exchanges,
		after: { sessions: after.sessions },
		stringsAfter,
	})}\n`,
);
console.log(`wrote frictionless-live-vectors.json (${steps.length} requests)`);
process.exit(0);
