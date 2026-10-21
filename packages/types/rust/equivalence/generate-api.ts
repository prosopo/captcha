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

// Records provider/api.ts (paths, rate limits, request and response schemas) into
// api-vectors.json, which api_equivalence.rs replays against the Rust.
//
// Inputs at the array and string caps would make the file huge, so a value may be written
// compactly: {"$repeat": [unit, count]} is a string, {"$array": [item, count]} an array, and
// both nest inside objects and arrays. A large parse output is recorded as the sha256 of its
// JSON.stringify text.

import crypto from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ZodTypeAny } from "zod";
import * as api from "../../src/provider/api.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

type Result =
	| { ok: Json }
	| { okDigest: string }
	| { okUndefined: true }
	| { issues: Json }
	| { throws: string };

const repeat = (unit: string, count: number): Json => ({ $repeat: [unit, count] });
const many = (item: Json, count: number): Json => ({ $array: [item, count] });

const decode = (value: Json): unknown => {
	if (Array.isArray(value)) return value.map(decode);
	if (value !== null && typeof value === "object") {
		const repeated = value.$repeat;
		if (Array.isArray(repeated) && Object.keys(value).length === 1) {
			return String(repeated[0]).repeat(Number(repeated[1]));
		}
		const array = value.$array;
		if (Array.isArray(array) && Object.keys(value).length === 1) {
			return Array.from({ length: Number(array[1]) }, () => decode(array[0] as Json));
		}
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
	}
	return value;
};

const LARGE_OUTPUT = 4096;

// PowChallengeIdSchema calls `val.split` unguarded, so a missing or non-string challenge throws
// a TypeError out of safeParse rather than failing it.
const result = (schema: ZodTypeAny, input: Json | undefined): Result => {
	try {
		return parse(schema, input);
	} catch (error) {
		return { throws: error instanceof Error ? error.name : String(error) };
	}
};

const parse = (schema: ZodTypeAny, input: Json | undefined): Result => {
	const parsed = schema.safeParse(input === undefined ? undefined : decode(input));
	if (!parsed.success) {
		return { issues: JSON.parse(JSON.stringify(parsed.error.issues)) as Json };
	}
	if (parsed.data === undefined) return { okUndefined: true };
	const text = JSON.stringify(parsed.data);
	if (text.length > LARGE_OUTPUT) {
		return { okDigest: crypto.createHash("sha256").update(text).digest("hex") };
	}
	return { ok: JSON.parse(text) as Json };
};

const WRONG_TYPES: Json[] = [null, 1, 0.5, "", "zzz", [], {}, true];

const variants = (base: { [key: string]: Json }): Json[] => {
	const out: Json[] = [base, { ...base, extra: "stripped" }];
	for (const key of Object.keys(base)) {
		const { [key]: _removed, ...rest } = base;
		out.push(rest);
		for (const replacement of WRONG_TYPES) {
			out.push({ ...base, [key]: replacement });
		}
	}
	return out;
};

const around = (limit: number): Json[] => [
	repeat("a", limit),
	repeat("a", limit + 1),
	repeat("😀", Math.floor(limit / 2)),
	{ $repeat: ["é", limit + 1] },
];

const USER = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
const DAPP = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const CHALLENGE = `1700000000000___${USER}___${DAPP}___1`;
const event: Json = { x: 1, y: 2, t: 1700000000000 };
const challengeSignature: Json = { user: { timestamp: "0x01" }, provider: { challenge: "0x02" } };
const clientMetaData: Json = { hp: "honeypot", clientSessionId: "jti-1" };

const captcha = (solution: Json): Json => ({
	captchaId: "0x01",
	captchaContentId: "0x02",
	solution,
	salt: "0x03",
	inputMethods: ["pointer", "keyboard"],
});

const solutionBody = (captchas: Json): { [key: string]: Json } => ({
	user: USER,
	dapp: DAPP,
	captchas,
	requestHash: "0x04",
	timestamp: "1700000000000",
	signature: { user: { timestamp: "0x01" }, provider: { requestHash: "0x02" } },
	behavioralData: "bd",
	simdReadings: "simd",
	clientMetaData,
});

const puzzleBody = (puzzleEvents: Json): { [key: string]: Json } => ({
	challenge: CHALLENGE,
	finalX: 10.5,
	finalY: 20,
	puzzleEvents,
	signature: challengeSignature,
	user: USER,
	dapp: DAPP,
	behavioralData: "bd",
	salt: "s",
	simdReadings: "simd",
	clientMetaData,
});

const audioBody = (overrides: { [key: string]: Json }): { [key: string]: Json } => ({
	challenge: CHALLENGE,
	answer: "12345",
	replays: 2,
	audioEvents: [{ kind: "play", t: 1 }, { kind: "key", t: 2 }],
	signature: challengeSignature,
	user: USER,
	dapp: DAPP,
	...overrides,
});

const iconOrderBody = (clicks: Json, iconOrderEvents: Json): { [key: string]: Json } => ({
	challenge: CHALLENGE,
	clicks,
	iconOrderEvents,
	signature: challengeSignature,
	user: USER,
	dapp: DAPP,
});

const decisionMachine: { [key: string]: Json } = {
	_id: "dm1",
	scope: "dapp",
	dappAccount: DAPP,
	kind: "routing",
	runtime: "node",
	language: "ts",
	name: "n",
	version: "1",
	captchaType: "puzzle",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-02T00:00:00.000Z",
};

const firstPath = api.ClientApiPaths.GetImageCaptchaChallenge;

const SCHEMAS: [string, ZodTypeAny, Json[]][] = [
	[
		"providerDetails",
		api.providerDetailsSchema,
		variants({ version: "1.0.0", message: "ok", host: "h", redis: [{ actor: "General", isReady: true, awaitingTimeSeconds: 0 }] }),
	],
	[
		"captchaRequestBody",
		api.CaptchaRequestBody,
		[
			...variants({ user: USER, dapp: DAPP, datasetId: "0xabc", sessionId: "s", simdReadings: "r" }),
			{ user: USER, dapp: DAPP, datasetId: many(1, 32) },
			{ user: USER, dapp: DAPP, datasetId: many(1, 64) },
			{ user: USER, dapp: DAPP, datasetId: many(1, 65) },
			{ user: USER, dapp: DAPP, datasetId: many("x", 150000) },
			{ user: USER, dapp: DAPP, datasetId: [1.5, -1] },
			...around(256).map((user): Json => ({ user, dapp: DAPP })),
		],
	],
	["clientMetaData", api.ClientMetaDataSchema, [...variants(clientMetaData as { [key: string]: Json }), { hp: "a\u0000b" }, { hp: "a\nb" }]],
	[
		"captchaSolutionBody",
		api.CaptchaSolutionBody,
		[
			...variants(solutionBody([captcha(["0x05"])])),
			solutionBody(many(captcha(["0x05"]), 256)),
			solutionBody(many(captcha(["0x05"]), 257)),
			solutionBody([captcha(many("0x05", 64))]),
			solutionBody([captcha(many("0x05", 65))]),
			solutionBody([{ captchaId: "0x01", captchaContentId: "0x02", solution: [], salt: "0x03", inputMethods: many("pointer", 256) }]),
			solutionBody([{ captchaId: "0x01", captchaContentId: "0x02", solution: [], salt: "0x03", inputMethods: many("pointer", 257) }]),
			solutionBody([{ captchaId: "0x01", captchaContentId: "0x02", solution: [], salt: "0x03", inputMethods: ["stylus"] }]),
			solutionBody([{ captchaId: "0x01", captchaContentId: "0x02", solution: [], salt: "0x03" }]),
		],
	],
	[
		"verifySolutionBody",
		api.VerifySolutionBody,
		[
			...variants({ token: "0xabc", dappSignature: "sig", maxVerifiedTime: 1000, ip: "1.2.3.4", email: "a@b.co", clientSessionId: "c" }),
			{ token: "0xabc", dappSignature: "sig" },
			{ token: "abc", dappSignature: "sig" },
			{ token: { $repeat: ["0", 131073] }, dappSignature: "sig" },
			{ token: "0xabc", dappSignature: "sig", email: "not an email" },
		],
	],
	[
		"serverCaptchaVerifyRequestBody",
		api.ServerPowCaptchaVerifyRequestBody,
		[
			...variants({ token: "0xabc", dappSignature: "sig", ip: "1.2.3.4", email: "a@b.co", clientSessionId: "c" }),
			...["a@b", "user.name+tag@ex-ample.co.uk", ".a@b.co", "a..b@c.io", "A@B.CO", "ſ@x.io", repeat("a", 321)].map(
				(email): Json => ({ token: "0xabc", dappSignature: "sig", email }),
			),
		],
	],
	["dnsEventKind", api.DnsEventKindSchema, ["dns", "http", "dns\n", "DNS", "https", " dns", "http\r"]],
	[
		"dnsEvent",
		api.DnsEventSchema,
		[
			...variants({ kind: "dns", ts: "2026-01-01T00:00:00Z", src_ip: "1.2.3.4", jti: "j", site_key: "k", subzone: "z", qname: "q", qtype: "A", sni: "s", path: "/p", user_agent: "ua", path_valid: true }),
			{ kind: "http", ts: "t", src_ip: "ip", user_agent: "a\nb" },
			{ kind: "http", ts: "t", src_ip: "ip", path: repeat("p", 2049) },
		],
	],
	["dnsEventBatch", api.DnsEventBatchSchema, [{ events: [] }, { events: [{ kind: "dns", ts: "t", src_ip: "i" }, { kind: "x", ts: "t", src_ip: "i" }] }, { events: "x" }]],
	["dnsEventIngestBatch", api.DnsEventIngestBatchSchema, [{ events: [1, "x", null, {}] }, { events: {} }]],
	["getChallengeRequestBody", api.GetPowCaptchaChallengeRequestBody, variants({ user: USER, dapp: DAPP, sessionId: "s", simdReadings: "r" })],
	[
		"submitPowCaptchaSolutionBody",
		api.SubmitPowCaptchaSolutionBody,
		[
			...variants({ challenge: CHALLENGE, difficulty: 4, signature: challengeSignature, user: USER, dapp: DAPP, nonce: 123, behavioralData: "b", salt: "s", simdReadings: "r", clientMetaData, fingerprintProof: "f" }),
			{ challenge: "a___b___c", difficulty: 4, signature: challengeSignature, user: USER, dapp: DAPP, nonce: 1 },
			{ challenge: CHALLENGE, difficulty: 4.5, signature: challengeSignature, user: USER, dapp: DAPP, nonce: -1.5 },
		],
	],
	[
		"getFrictionlessCaptchaChallengeRequestBody",
		api.GetFrictionlessCaptchaChallengeRequestBody,
		[
			...variants({ dapp: DAPP, token: "t", user: USER, headHash: "h", mode: "invisible", simdReadings: "r", detectorSessionId: "d", currentUrl: "https://x/p", iframeUrl: "https://y/", clientSessionId: "c", refreshOf: "s", switchToImage: true }),
			{ dapp: DAPP, token: "", user: USER, headHash: "", mode: "hidden" },
			{ dapp: DAPP, token: "", user: USER, headHash: "", currentUrl: repeat("u", 2049) },
		],
	],
	["assignDetectorBundleRequestBody", api.AssignDetectorBundleRequestBody, [{ dapp: "d" }, { dapp: 1 }]],
	[
		"replaceDetectorPoolBody",
		api.ReplaceDetectorPoolBody,
		[
			{ bundles: { b: { js: "x", privateKey: "k", innerConfig: "c", release: "3.6.64", payloadLayout: "l", keyMap: "m", extra: "x" }, "10": { js: "", privateKey: "", innerConfig: "" }, "2": { js: "j", privateKey: "p", innerConfig: "i" } } },
			{ bundles: { b: { js: "x" } } },
			{ bundles: [] },
		],
	],
	["puzzleEvent", api.PuzzleEventSchema, variants({ x: 1, y: 2.5, t: 3 })],
	[
		"submitPuzzleCaptchaSolutionBody",
		api.SubmitPuzzleCaptchaSolutionBody,
		[
			...variants(puzzleBody([event])),
			puzzleBody(many(event, 10000)),
			puzzleBody(many(event, 10001)),
			puzzleBody(many(null, 150000)),
			puzzleBody([event, null, { x: "1", y: 2, t: 3 }]),
		],
	],
	["audioEvent", api.AudioEventSchema, [...variants({ kind: "replay", t: 5 }), { kind: "stop", t: 1 }, { kind: "pause", t: "1" }]],
	[
		"submitAudioCaptchaSolutionBody",
		api.SubmitAudioCaptchaSolutionBody,
		[
			...variants(audioBody({})),
			audioBody({ answer: repeat("1", 32) }),
			audioBody({ answer: repeat("1", 33) }),
			audioBody({ replays: -1 }),
			audioBody({ replays: 1000 }),
			audioBody({ replays: 1001 }),
			audioBody({ replays: 1.5 }),
			audioBody({ audioEvents: many({ kind: "key", t: 1 }, 512) }),
			audioBody({ audioEvents: many({ kind: "key", t: 1 }, 513) }),
			audioBody({ audioEvents: many(null, 150000) }),
		],
	],
	["iconClick", api.IconClickSchema, variants({ x: 1.25, y: 2 })],
	[
		"submitIconOrderCaptchaSolutionBody",
		api.SubmitIconOrderCaptchaSolutionBody,
		[
			...variants(iconOrderBody([{ x: 1, y: 1 }], [event])),
			iconOrderBody(many({ x: 1, y: 1 }, 10), []),
			iconOrderBody(many({ x: 1, y: 1 }, 11), []),
			iconOrderBody([], many(event, 10000)),
			iconOrderBody([], many(event, 10001)),
		],
	],
	["verifyPowCaptchaSolutionBody", api.VerifyPowCaptchaSolutionBody, variants({ siteKey: DAPP })],
	[
		"registerSitekeyBody",
		api.RegisterSitekeyBody,
		[
			...variants({ siteKey: DAPP, tier: "professional", settings: { domains: ["a.com"], powDifficulty: 5 } }),
			{ siteKey: DAPP, tier: "gold" },
			{ siteKey: DAPP, tier: "free", settings: { domains: [] } },
		],
	],
	["registerSitekeysBody", api.RegisterSitekeysBody, [[], [{ siteKey: DAPP, tier: "free" }, { siteKey: USER, tier: "enterprise", settings: { domains: ["b"] } }], [{ siteKey: DAPP }], {}]],
	["removeSitekeyBody", api.RemoveSitekeyBody, variants({ siteKey: DAPP })],
	["removeSitekeysBody", api.RemoveSitekeysBody, [[], [{ siteKey: DAPP }, { siteKey: 1 }], [{ siteKey: DAPP }]]],
	[
		"updateDecisionMachineBody",
		api.UpdateDecisionMachineBody,
		[
			...variants({ decisionMachineScope: "dapp", decisionMachineRuntime: "node", decisionMachineSource: "export default () => 1", decisionMachineLanguage: "js", decisionMachineName: "n", decisionMachineVersion: "1", decisionMachineCaptchaType: "image", decisionMachineKind: "decision", dapp: DAPP }),
			{ decisionMachineScope: "global", decisionMachineRuntime: "node", decisionMachineSource: "a\u0001b" },
			{ decisionMachineScope: "global", decisionMachineRuntime: "node", decisionMachineSource: "x", decisionMachineName: "a\nb" },
			{ decisionMachineScope: "global", decisionMachineRuntime: "node", decisionMachineSource: "x", decisionMachineCaptchaType: "frictionless" },
			{ decisionMachineScope: "global", decisionMachineRuntime: "node", decisionMachineSource: repeat("s", 65537) },
		],
	],
	["decisionMachineIdBody", api.GetDecisionMachineBody, variants({ id: "abc" })],
	["emptyBody", api.GetAllDecisionMachinesBody, [{}, { x: 1 }]],
	["clearAllCountersBody", api.ClearAllCountersBody, variants({ dapp: DAPP })],
	["clearAllCountersResponse", api.ClearAllCountersResponse, variants({ success: true, deletedCount: 3, scope: "dapp" })],
	["decisionMachineSummary", api.DecisionMachineSummarySchema, [...variants(decisionMachine), { ...decisionMachine, dappAccount: null, kind: null, language: null, name: null, version: null, captchaType: null }]],
	["getDecisionMachineResponse", api.GetDecisionMachineResponse, variants({ ...decisionMachine, source: "src" })],
	["getAllDecisionMachinesResponse", api.GetAllDecisionMachinesResponse, [[], [{ ...decisionMachine, source: "s" }], [decisionMachine]]],
	["removeDecisionMachineResponse", api.RemoveDecisionMachineResponse, variants({ success: false, deletedId: "x" })],
	["removeAllDecisionMachinesResponse", api.RemoveAllDecisionMachinesResponse, variants({ success: true, deletedCount: 0 })],
	["toggleMaintenanceModeBody", api.ToggleMaintenanceModeBody, [...variants({ enabled: true, siteKeys: [DAPP] }), { enabled: false, siteKeys: [1] }]],
	["getSessionBody", api.GetSessionBody, variants({ sessionId: "s" })],
	[
		"prosopoCaptchaCountConfig",
		api.ProsopoCaptchaCountConfigSchema,
		[{ solved: { count: 0 } }, { solved: { count: 3 }, unsolved: { count: 0 } }, { unsolved: { count: -1 } }, { solved: {} }],
	],
	["blockRuleSpec", api.BlockRuleSpec, [...variants({ global: true, hardBlock: false, type: "userAccount", dappAccount: DAPP, captchaConfig: { solved: { count: 1 } } }), { global: true, hardBlock: true, type: "ipAddress" }]],
	["dappDomainRequestBody", api.DappDomainRequestBody, [{ dapp: "x" }]],
	[
		"apiPathRateLimits",
		api.ApiPathRateLimits,
		[
			{ [firstPath]: { windowMs: "1000", limit: "abc" } },
			{ [firstPath]: { windowMs: null, limit: "" } },
			{ [firstPath]: { windowMs: "0x10", limit: " 7 " } },
			{ [firstPath]: { windowMs: [5], limit: true } },
			{ [firstPath]: { windowMs: 1e3, limit: "1e3" } },
			{ [firstPath]: "x" },
			{ [api.AdminApiPaths.DnsEvent]: {} },
		],
	],
];

const GENERIC: Json[] = [null, true, 0, "", [], {}];

const schemaVectors: { schema: string; input?: Json; result: Result }[] = [];
for (const [name, schema, specific] of SCHEMAS) {
	schemaVectors.push({ schema: name, result: result(schema, undefined) });
	for (const input of [...GENERIC, ...specific]) {
		schemaVectors.push({ schema: name, input, result: result(schema, input) });
	}
}

const vectors = {
	apiPrefix: api.ApiPrefix,
	defaultSolvedCount: api.DEFAULT_SOLVED_COUNT,
	defaultUnsolvedCount: api.DEFAULT_UNSOLVED_COUNT,
	clientApiPaths: Object.entries(api.ClientApiPaths),
	publicApiPaths: Object.entries(api.PublicApiPaths),
	adminApiPaths: Object.entries(api.AdminApiPaths),
	blockRuleType: Object.entries(api.BlockRuleType),
	providerDefaultRateLimits: Object.entries(api.ProviderDefaultRateLimits).map(([path, limit]) => [path, limit.windowMs, limit.limit]),
	requestArrayLimits: Object.entries(api.REQUEST_ARRAY_LIMITS),
	maxIconClicks: api.MAX_ICON_CLICKS,
	schemas: SCHEMAS.map(([name]) => name),
	schemaVectors,
};

const output = fileURLToPath(new URL("./api-vectors.json", import.meta.url));
writeFileSync(output, `${JSON.stringify(vectors, null, "\t")}\n`);
process.stdout.write(`wrote ${schemaVectors.length} api schema vectors\n`);
