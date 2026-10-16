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
// WITHOUT WARRANTIES OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Robustness fuzzer for the provider's client and verify API.
//
// Point it at a disposable provider only: it creates sessions and commitments
// and sends bodies close to the 1MB limit.
//
//   node packages/provider/src/tests/fuzz/apiFuzz.ts \
//     --base-url http://127.0.0.1:9229 \
//     --site-key <registered frictionless site key> \
//     [--image-site-key <key>] [--pow-site-key <key>] [--puzzle-site-key <key>] \
//     [--provider-pid <pid>] [--concurrency 4] [--burst 10] [--only <path part>]
//
// Each challenge endpoint checks the client's captcha type, so pass a site key
// registered for that type or the endpoint answers every case with a 400.
//
// For every endpoint it sends the valid body, whole-body variants (empty, not
// JSON, prototype keys, duplicate keys, wrong content types, a 500KB extra
// field) and every field swapped for each value in VALUE_MUTATIONS (wrong
// types, numeric extremes, NUL and lone surrogates, Mongo operators, 4000-deep
// nesting). Fields that hold arrays also get arrays that fill the body limit.
// The heaviest cases are then replayed in concurrent bursts.
//
// While it runs it times /healthz every 250ms (event-loop stalls) and, with
// --provider-pid, samples the provider's RSS every 10s. It logs one JSON line
// per event and exits 1 when any request got a 5xx or no response.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export type Json =
	| null
	| boolean
	| number
	| string
	| Json[]
	| { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

export interface Target {
	path: string;
	siteKey: string;
	body: JsonObject;
	// Field that may legitimately hold a long array, used for huge-array cases.
	arrayField?: { key: string; item: Json };
}

export interface Case {
	target: string;
	siteKey: string;
	label: string;
	raw: string;
	contentType: string;
}

export interface Result {
	target: string;
	label: string;
	status: number;
	ms: number;
	body: string;
}

export interface SiteKeys {
	image: string;
	pow: string;
	puzzle: string;
	frictionless: string;
}

export interface FuzzOptions {
	baseUrl: string;
	user: string;
	siteKeys: SiteKeys;
	providerPid: string;
	concurrency: number;
	burst: number;
	only: string;
	origin: string;
}

export interface Summary {
	requests: number;
	byStatus: Record<string, number>;
	failures: number;
	uniqueFailures: Result[];
	slowest: string[];
	healthzSamples: number;
	healthzP50: number;
	healthzP99: number;
	healthzMax: number;
	rssKb: number[];
	rssMonotonicGrowth: boolean;
}

// express.json() in the provider is capped at 1MB; stay just under it.
export const MAX_BODY = 1024 * 1024 - 1024;
export const REQUEST_TIMEOUT_MS = 30000;
export const HEALTHZ_TIMEOUT_MS = 10000;
const HEALTHZ_INTERVAL_MS = 250;
const RSS_INTERVAL_MS = 10000;
const CLIENT_PREFIX = "/v1/prosopo/provider/client";
const JSON_TYPE = "application/json";

const hex = (bytes: number): string => `0x${"ab".repeat(bytes)}`;

// A value written verbatim into the body, for inputs JSON.stringify cannot
// produce (lone surrogates, __proto__ keys, deep nesting).
type RawValue = { raw: string };

const deepArray = (depth: number): string =>
	`${"[".repeat(depth)}1${"]".repeat(depth)}`;
const deepObject = (depth: number): string =>
	`${'{"a":'.repeat(depth)}1${"}".repeat(depth)}`;

export const VALUE_MUTATIONS: [string, Json | RawValue][] = [
	["null", null],
	["true", true],
	["zero", 0],
	["negzero", -0],
	["float", 0.1],
	["max", Number.MAX_VALUE],
	["min", -Number.MAX_VALUE],
	["tiny", Number.MIN_VALUE],
	["unsafe-int", { raw: "9007199254740993" }],
	["empty", ""],
	["nul", "\u0000"],
	["nul-mid", "a\u0000b"],
	["lone-surrogate", { raw: '"\\ud800"' }],
	["rtl-emoji", "‮\u{1f600}​"],
	["long-id", "x".repeat(300)],
	["long-token", "x".repeat(140000)],
	["array", [1, 2, 3]],
	["object", { a: 1 }],
	["mongo-op", { $ne: null }],
	["mongo-regex", { $regex: ".*" }],
	["proto-obj", { raw: '{"__proto__":{"polluted":1}}' }],
	["constructor", { constructor: { prototype: { polluted: 1 } } }],
	["deep-array", { raw: deepArray(4000) }],
	["deep-object", { raw: deepObject(4000) }],
	["numstr-huge", "1e400"],
	["hex-odd", "0x123"],
	["hex-empty", "0x"],
];

const isRawValue = (v: Json | RawValue): v is RawValue =>
	v !== null &&
	typeof v === "object" &&
	!Array.isArray(v) &&
	Object.keys(v).length === 1 &&
	typeof v.raw === "string";

export const toRaw = (v: Json | RawValue): string =>
	isRawValue(v) ? v.raw : JSON.stringify(v);

export const buildTargets = (
	user: string,
	keys: SiteKeys,
	now: number,
): Target[] => {
	const sig = {
		user: { timestamp: hex(64) },
		provider: { requestHash: hex(64) },
	};
	const powSig = { user: { timestamp: "1" }, provider: { challenge: hex(64) } };
	const challenge = (key: string): string => `${now}___${user}___${key}___1`;
	const p = CLIENT_PREFIX;
	return [
		{
			path: `${p}/captcha/image`,
			siteKey: keys.image,
			body: { user, dapp: keys.image, datasetId: "0x01", sessionId: "s" },
			arrayField: { key: "datasetId", item: 1 },
		},
		{
			path: `${p}/captcha/pow`,
			siteKey: keys.pow,
			body: { user, dapp: keys.pow },
		},
		{
			path: `${p}/captcha/puzzle`,
			siteKey: keys.puzzle,
			body: { user, dapp: keys.puzzle },
		},
		{
			path: `${p}/captcha/frictionless`,
			siteKey: keys.frictionless,
			body: { user, dapp: keys.frictionless, token: "", headHash: "0x00" },
		},
		{
			path: `${p}/solution`,
			siteKey: keys.image,
			body: {
				user,
				dapp: keys.image,
				captchas: [
					{ captchaId: "c", captchaContentId: "c", solution: ["a"], salt: "s" },
				],
				requestHash: "0x01",
				timestamp: "1",
				signature: sig,
			},
			arrayField: {
				key: "captchas",
				item: {
					captchaId: "c",
					captchaContentId: "c",
					solution: [],
					salt: "s",
				},
			},
		},
		{
			path: `${p}/pow/solution`,
			siteKey: keys.pow,
			body: {
				challenge: challenge(keys.pow),
				difficulty: 4,
				signature: powSig,
				user,
				dapp: keys.pow,
				nonce: 1,
			},
		},
		{
			path: `${p}/puzzle/solution`,
			siteKey: keys.puzzle,
			body: {
				challenge: challenge(keys.puzzle),
				finalX: 1,
				finalY: 1,
				puzzleEvents: [{ x: 1, y: 1, t: 1 }],
				signature: powSig,
				user,
				dapp: keys.puzzle,
			},
			arrayField: { key: "puzzleEvents", item: { x: 1, y: 2, t: 3 } },
		},
		{
			path: `${p}/detector/assign`,
			siteKey: keys.frictionless,
			body: { dapp: keys.frictionless },
		},
		{
			path: `${p}/spam/email`,
			siteKey: keys.frictionless,
			body: { email: "a@b.co", dapp: keys.frictionless },
		},
		...[
			"image/dapp/verify",
			"pow/verify",
			"puzzle/verify",
			"authenticated/verify",
		].map(
			(v): Target => ({
				path: `${p}/${v}`,
				siteKey: keys.frictionless,
				body: { token: hex(40), dappSignature: hex(64), ip: "1.2.3.4" },
			}),
		),
	];
};

// Every key path in a body, depth first, so nested fields get mutated too.
export const nestedKeys = (obj: Json, prefix: string[] = []): string[][] => {
	if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return [];
	const out: string[][] = [];
	for (const [k, v] of Object.entries(obj)) {
		out.push([...prefix, k]);
		out.push(...nestedKeys(v, [...prefix, k]));
	}
	return out;
};

// The body serialised with the value at `path` replaced by `raw` verbatim.
// Returns "" when the path runs through something that is not an object.
export const setPath = (
	body: JsonObject,
	path: string[],
	raw: string,
): string => {
	const placeholder = "__FUZZ_PLACEHOLDER__";
	const clone: JsonObject = JSON.parse(JSON.stringify(body));
	let cur: JsonObject = clone;
	for (const k of path.slice(0, -1)) {
		const next = cur[k];
		if (next === null || typeof next !== "object" || Array.isArray(next))
			return "";
		cur = next;
	}
	const last = path[path.length - 1];
	if (last === undefined) return "";
	cur[last] = placeholder;
	return JSON.stringify(clone).replace(`"${placeholder}"`, () => raw);
};

export const buildCases = (t: Target, maxBody: number = MAX_BODY): Case[] => {
	const cases: Case[] = [];
	const add = (label: string, raw: string, contentType = JSON_TYPE): void => {
		if (raw && raw.length <= maxBody)
			cases.push({
				target: t.path,
				siteKey: t.siteKey,
				label,
				raw,
				contentType,
			});
	};
	const valid = JSON.stringify(t.body);
	add("valid", valid);
	add("empty-object", "{}");
	add("not-json", "{not json");
	add("top-array", "[]");
	add("top-string", '"x"');
	add("top-null", "null");
	add("text-plain", valid, "text/plain");
	add("urlencoded", "user=a&dapp=b", "application/x-www-form-urlencoded");
	add("proto-top", valid.replace(/^\{/, '{"__proto__":{"isAdmin":true},'));
	add(
		"constructor-top",
		JSON.stringify({ ...t.body, constructor: { prototype: { x: 1 } } }),
	);
	add("extra-field", JSON.stringify({ ...t.body, zzz: "x".repeat(500000) }));
	add("dup-keys", valid.replace(/^\{/, '{"user":1,"dapp":2,'));
	for (const path of nestedKeys(t.body)) {
		for (const [name, v] of VALUE_MUTATIONS) {
			add(`${path.join(".")}=${name}`, setPath(t.body, path, toRaw(v)));
		}
		const [only] = path;
		if (path.length === 1 && only !== undefined) {
			const { [only]: _dropped, ...rest } = t.body;
			add(`${only}=missing`, JSON.stringify(rest));
		}
	}
	if (t.arrayField) {
		const { key, item } = t.arrayField;
		const itemLen = JSON.stringify(item).length + 1;
		const n = Math.floor((maxBody - 2000) / itemLen);
		const big = `[${Array.from({ length: n }, () => JSON.stringify(item)).join(",")}]`;
		add(`${key}=huge-array(${n})`, setPath(t.body, [key], big));
		// "null," is five characters; size the wrong-type array on its own.
		const nullCount = Math.floor((maxBody - 2000) / 5);
		const nulls = `[${Array.from({ length: nullCount }, () => "null").join(",")}]`;
		add(`${key}=huge-null-array`, setPath(t.body, [key], nulls));
	}
	return cases;
};

export const isHeavy = (c: Case): boolean =>
	/huge|deep|long-token|extra-field/.test(c.label);

// Run fn over items with at most n in flight, keeping input order.
export const pool = async <T, R>(
	items: T[],
	n: number,
	fn: (item: T) => Promise<R>,
): Promise<R[]> => {
	const out: R[] = [];
	let next = 0;
	const worker = async (): Promise<void> => {
		while (next < items.length) {
			const idx = next++;
			const item = items[idx];
			if (item !== undefined) out[idx] = await fn(item);
		}
	};
	await Promise.all(
		Array.from({ length: Math.max(1, Math.min(n, items.length)) }, worker),
	);
	return out;
};

// True when every sample is at least the one before and the series grew:
// the shape of a leak rather than a warm-up that levels off.
export const isMonotonicGrowth = (samples: number[]): boolean => {
	const valid = samples.filter((s) => s > 0);
	if (valid.length < 3) return false;
	for (let i = 1; i < valid.length; i++) {
		const prev = valid[i - 1];
		const cur = valid[i];
		if (prev === undefined || cur === undefined || cur < prev) return false;
	}
	const first = valid[0] ?? 0;
	const last = valid[valid.length - 1] ?? 0;
	return last > first;
};

const percentile = (sorted: number[], p: number): number =>
	Math.round(
		sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0,
	);

export const isFailure = (r: Result): boolean =>
	r.status >= 500 || r.status === 0;

export const summarise = (
	results: Result[],
	health: number[],
	rss: number[],
): Summary => {
	const byStatus: Record<string, number> = {};
	for (const r of results) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
	const bad = results.filter(isFailure);
	const seen = new Map<string, Result>();
	for (const r of bad) {
		const key = `${r.target} ${r.label}`;
		if (!seen.has(key)) seen.set(key, r);
	}
	const slowest = [...results]
		.sort((a, b) => b.ms - a.ms)
		.slice(0, 5)
		.map((r) => `${r.target} ${r.label} ${Math.round(r.ms)}ms`);
	const sortedHealth = [...health].sort((a, b) => a - b);
	return {
		requests: results.length,
		byStatus,
		failures: bad.length,
		uniqueFailures: [...seen.values()],
		slowest,
		healthzSamples: health.length,
		healthzP50: percentile(sortedHealth, 0.5),
		healthzP99: percentile(sortedHealth, 0.99),
		healthzMax: Math.round(sortedHealth[sortedHealth.length - 1] ?? 0),
		rssKb: rss,
		rssMonotonicGrowth: isMonotonicGrowth(rss),
	};
};

// Resident set size of a local process in KB: 0 when no pid was given, -1
// when it could not be read.
export const rssKb = (pid: string): number => {
	if (!pid) return 0;
	try {
		const m = /VmRSS:\s+(\d+)/.exec(
			readFileSync(`/proc/${pid}/status`, "utf8"),
		);
		return m?.[1] ? Number(m[1]) : -1;
	} catch {
		return -1;
	}
};

export const parseCliArgs = (argv: string[]): FuzzOptions => {
	const { values } = parseArgs({
		args: argv,
		options: {
			"base-url": { type: "string", default: "http://127.0.0.1:9229" },
			"site-key": { type: "string", default: "" },
			"image-site-key": { type: "string", default: "" },
			"pow-site-key": { type: "string", default: "" },
			"puzzle-site-key": { type: "string", default: "" },
			user: {
				type: "string",
				default: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
			},
			"provider-pid": { type: "string", default: "" },
			concurrency: { type: "string", default: "4" },
			burst: { type: "string", default: "10" },
			only: { type: "string", default: "" },
			origin: { type: "string", default: "http://localhost" },
		},
	});
	const fallback = values["site-key"];
	if (!fallback) throw new Error("--site-key is required");
	const positive = (name: string, v: string): number => {
		const n = Number(v);
		if (!Number.isInteger(n) || n < 1)
			throw new Error(`--${name} must be a positive integer, got ${v}`);
		return n;
	};
	return {
		baseUrl: values["base-url"],
		user: values.user,
		siteKeys: {
			image: values["image-site-key"] || fallback,
			pow: values["pow-site-key"] || fallback,
			puzzle: values["puzzle-site-key"] || fallback,
			frictionless: fallback,
		},
		providerPid: values["provider-pid"],
		concurrency: positive("concurrency", values.concurrency),
		burst: positive("burst", values.burst),
		only: values.only,
		origin: values.origin,
	};
};

export const send = async (
	opts: Pick<FuzzOptions, "baseUrl" | "origin" | "user">,
	c: Case,
): Promise<Result> => {
	const start = performance.now();
	const done = (status: number, body: string): Result => ({
		target: c.target,
		label: c.label,
		status,
		ms: performance.now() - start,
		body: body.slice(0, 300),
	});
	try {
		const res = await fetch(`${opts.baseUrl}${c.target}`, {
			method: "POST",
			headers: {
				"content-type": c.contentType,
				origin: opts.origin,
				"prosopo-site-key": c.siteKey,
				"prosopo-user": opts.user,
			},
			body: c.raw,
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
		return done(res.status, await res.text());
	} catch (e) {
		return done(0, String(e));
	}
};

const log = (event: string, data: Record<string, unknown>): void => {
	console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...data }));
};

export const main = async (argv: string[]): Promise<number> => {
	const opts = parseCliArgs(argv);
	const health: number[] = [];
	const rss: number[] = [rssKb(opts.providerPid)];
	let running = true;
	const healthLoop = (async (): Promise<void> => {
		while (running) {
			const s = performance.now();
			try {
				await fetch(`${opts.baseUrl}/healthz`, {
					signal: AbortSignal.timeout(HEALTHZ_TIMEOUT_MS),
				});
				health.push(performance.now() - s);
			} catch {
				health.push(HEALTHZ_TIMEOUT_MS);
			}
			await new Promise<void>((r) => setTimeout(r, HEALTHZ_INTERVAL_MS));
		}
	})();
	const rssTimer = setInterval(() => {
		const kb = rssKb(opts.providerPid);
		rss.push(kb);
		log("rss", { kb });
	}, RSS_INTERVAL_MS);

	const targets = buildTargets(opts.user, opts.siteKeys, Date.now()).filter(
		(t) => !opts.only || t.path.includes(opts.only),
	);
	const cases = targets.flatMap((t) => buildCases(t));
	log("start", { targets: targets.length, cases: cases.length });
	const sendOne = (c: Case): Promise<Result> => send(opts, c);
	const results = await pool(cases, opts.concurrency, sendOne);

	// Concurrent bursts of the heaviest cases, one case at a time.
	for (const c of cases.filter(isHeavy)) {
		log("burst", { target: c.target, label: c.label, n: opts.burst });
		results.push(
			...(await pool(
				Array.from({ length: opts.burst }, () => c),
				opts.burst,
				sendOne,
			)),
		);
	}
	running = false;
	clearInterval(rssTimer);
	await healthLoop;
	rss.push(rssKb(opts.providerPid));

	const summary = summarise(results, health, rss);
	for (const r of summary.uniqueFailures) log("failure", { ...r });
	const { uniqueFailures, ...rest } = summary;
	log("summary", { ...rest, uniqueFailures: uniqueFailures.length });
	return summary.failures ? 1 : 0;
};

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
	process.exitCode = await main(process.argv.slice(2));
}
