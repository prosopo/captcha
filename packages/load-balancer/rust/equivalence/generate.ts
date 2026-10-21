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


// Records the load balancer's server-side behaviour into vectors.json, which equivalence.rs
// replays against the Rust.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { EnvironmentTypes } from "@prosopo/types";
import {
	type IpMode,
	convertHostedProvider,
	getLoadBalancerUrl,
	getProviderHostname,
	getProviderListOverride,
	loadBalancer,
} from "../../src/balancer.js";
import { getDevelopmentProviderUrl } from "../../src/developmentProviderUrl.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const outcome = (fn: () => Json): Json => {
	try {
		return { result: fn() };
	} catch (e) {
		return { error: (e as Error).message, name: (e as Error).name };
	}
};

const asyncOutcome = async (fn: () => Promise<Json>): Promise<Json> => {
	try {
		return { result: await fn() };
	} catch (e) {
		return { error: (e as Error).message, name: (e as Error).name };
	}
};

let seed = 0x1b0a;
const random = (): number => {
	seed = (seed * 1103515245 + 12345) & 0x7fffffff;
	return seed / 0x7fffffff;
};

const printable = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
const randomString = (alphabet: string, maxLength: number): string =>
	Array.from({ length: Math.floor(random() * (maxLength + 1)) }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");

const COMPARE_PAIRS: [string, string][] = [
	["https://pronode16.prosopo.io", "https://pronode6.prosopo.io"],
	["https://a.io:8080", "https://a.io/x"],
	["https://a-b.io", "https://a.b.io"],
	["https://B.io", "https://a.io"],
	["https://a.io", "https://A.io"],
	["https://A.io", "https://a.io"],
	["aB", "Ab"],
	["a", "a"],
	["", "a"],
	["a", "ab"],
	["A", "ab"],
	["_", "-"],
	["~", "$"],
	["9", "a"],
	["é", "e"],
	["z", "é"],
	...Array.from({ length: 3000 }, (): [string, string] => [randomString("abAB01-._/:~%?=&#+ ", 6), randomString("abAB01-._/:~%?=&#+ ", 6)]),
	...Array.from({ length: 3000 }, (): [string, string] => [randomString(printable, 10), randomString(printable, 10)]),
];
const localeCompare = COMPARE_PAIRS.map(([a, b]) => [a, b, Math.sign(a.localeCompare(b))]);

const entry = (host: string, extra: { [key: string]: Json } = {}): Json => ({
	url: `https://${host}.prosopo.io`,
	datasetId: "0xd",
	address: "5A",
	...extra,
});

const production = {
	ipv4: { pronode6: entry("ipv4.pronode6"), pronode16: entry("ipv4.pronode16") },
	ipv6: { pronode6: entry("ipv6.pronode6"), pronode16: entry("ipv6.pronode16") },
	pronode6: entry("pronode6"),
	pronode7: entry("pronode7"),
	pronode16: entry("pronode16"),
};

const CONVERT: string[] = [
	JSON.stringify(production),
	JSON.stringify({ a: entry("a", { weight: 0 }), b: entry("b", { weight: 0.5 }), c: entry("c", { weight: 1.5 }), d: entry("d", { weight: 2.5 }), e: entry("e", { weight: -3 }), f: entry("f", { weight: 150 }), g: entry("g", { weight: 99.5 }), h: entry("h", { weight: -0.5 }) }),
	'{"a":{"url":"https://a","datasetId":"0x","address":"5","weight":1e400}}',
	'{"a":{"url":"https://a","datasetId":"0x","address":"5","weight":-1e400}}',
	JSON.stringify({ a: entry("a", { weight: "3" }) }),
	JSON.stringify({ a: entry("a", { weight: null }) }),
	JSON.stringify({ a: entry("a", { url: 5 }) }),
	JSON.stringify({ a: { url: "https://x", datasetId: "0x" } }),
	'{"a":{"url":"https://x","weight":1.0,"n":1e21,"m":-0,"s":"\\u0001é","l":[1,{"10":1,"2":2,"b":3}]}}',
	// Raw text, so integer-like keys arrive out of order, as a hand-written list could have them.
	`{"z":${JSON.stringify(entry("z"))},"10":${JSON.stringify(entry("ten"))},"2":${JSON.stringify(entry("two"))},"a":${JSON.stringify(entry("a"))}}`,
	'{"10":{"url":1},"2":{"url":2}}',
	'{"b":{"url":"https://same","datasetId":"0x","address":"5B"},"10":{"url":"https://same","datasetId":"0x","address":"5Ten"}}',
	'{"a":{"url":"https://first","datasetId":"0x","address":"5"},"a":{"url":"https://second","datasetId":"0x","address":"5"}}',
	JSON.stringify([entry("x"), entry("y")]),
	JSON.stringify([entry("x"), 5]),
	JSON.stringify({ ipv4: [entry("v4a"), entry("v4b")], dual: entry("dual") }),
	JSON.stringify({ ipv4: "not a list", dual: entry("dual") }),
	JSON.stringify({ ipv4: null, dual: entry("dual") }),
	JSON.stringify({ ipv4: { ipv6: entry("nested"), inner: entry("inner") } }),
	JSON.stringify({ a: "string entry" }),
	JSON.stringify({ a: [1] }),
	JSON.stringify({ a: entry("x", { url: "https://a.io:8080" }), b: entry("x", { url: "https://a.io/x" }), c: entry("x", { url: "https://A.io" }), d: entry("x", { url: "https://a.io" }), e: entry("x", { url: "https://_x" }) }),
	JSON.stringify({ a: entry("same"), b: entry("same", { address: "5B" }) }),
	'"ab"',
	'""',
	'"😀"',
	"5",
	"true",
	"null",
	"[]",
	"{}",
];
const IP_MODES: (IpMode | undefined)[] = [undefined, "ipv4", "ipv6"];
const convert = CONVERT.flatMap((text) =>
	IP_MODES.map((ipMode) => ({ text, ipMode: ipMode ?? null, ...(outcome(() => convertHostedProvider(JSON.parse(text), ipMode) as unknown as Json) as object) })),
);

const HOSTNAMES = [
	"https://ipv4.pronode1.prosopo.io",
	"https://ipv6.pronode1.prosopo.io:8443/path",
	"https://IPV4.Example.COM",
	"https://ipv4.ipv6.x.io",
	"https://ipv5.x.io",
	"http://[::1]:80",
	"http://192.168.0.1",
	"foo://Bar/x",
	"file:///etc/passwd",
	"https://xn--nxasmq6b.example",
	"https://ελληνικά.example",
	"not a url",
	"",
];
const hostnames = HOSTNAMES.map((url) => ({ url, ...(outcome(() => getProviderHostname({ url, address: "", datasetId: "", weight: 1 })) as object) }));

const OVERRIDES: (string | undefined)[] = [
	undefined,
	"",
	"   ",
	"https://captcha.example.com",
	"https://captcha.example.com/",
	"https://captcha.example.com//",
	" https://one.example.com , https://two.example.com/ ,, ",
	" https://nbsp.example.com﻿",
	"/",
	",",
	JSON.stringify({ one: { address: "5P1", url: "https://one.example.com/", datasetId: "0xabc", weight: 3 }, two: { address: "5P2", url: "https://two.example.com", datasetId: "0xdef" } }),
	JSON.stringify({ dual: { address: "5D", url: "https://dual.example.com", datasetId: "0x1" }, ipv4: { four: { address: "5F", url: "https://v4.example.com/", datasetId: "0x2" } } }),
	"{not json",
	'{"one":{"url":"missing-other-fields"}}',
	"  {}  ",
	"[1]",
	'{"a":{"url":"https://x//","datasetId":"0x","address":"5"}}',
];
const overrides = OVERRIDES.flatMap((raw) => IP_MODES.map((ipMode) => ({ raw: raw ?? null, ipMode: ipMode ?? null, result: getProviderListOverride(raw, ipMode) as unknown as Json })));

const DEVELOPMENT: (string | undefined)[] = [undefined, "", "   ", "https://192.0.2.10:9229", "https://192.0.2.10:9229/", " https://x// ", "/", "\t\n"];
const development = DEVELOPMENT.map((value) => ({ override: value ?? null, result: getDevelopmentProviderUrl(value) }));

const loadBalancerUrls = (["development", "staging", "production"] as EnvironmentTypes[]).map((environment) => {
	try {
		return { environment, result: getLoadBalancerUrl(environment) };
	} catch (e) {
		const error = e as Error & { translationKey?: string; context?: { [key: string]: Json } };
		return { environment, envError: { message: error.message, translationKey: error.translationKey ?? null, context: error.context ?? null } };
	}
});

type Scenario = {
	label: string;
	environment: EnvironmentTypes;
	ipMode?: IpMode;
	timeoutMs?: number;
	listOverride?: string;
	developmentOverride?: string;
	body?: string;
	bodyBase64?: string;
	status?: number;
	stall?: boolean;
};
const SCENARIOS: Scenario[] = [
	{ label: "production", environment: "production", body: JSON.stringify(production) },
	{ label: "production ipv4", environment: "production", ipMode: "ipv4", body: JSON.stringify(production) },
	{ label: "staging", environment: "staging", body: JSON.stringify(production) },
	{ label: "404 with a json body", environment: "production", status: 404, body: JSON.stringify({ a: entry("a") }) },
	{ label: "byte order mark", environment: "production", bodyBase64: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(JSON.stringify({ a: entry("a") }))]).toString("base64") },
	{ label: "invalid utf-8", environment: "production", bodyBase64: Buffer.concat([Buffer.from('{"a":{"url":"https://'), Buffer.from([0xff]), Buffer.from('","datasetId":"0x","address":"5"}}')]).toString("base64") },
	{ label: "null body", environment: "production", body: "null" },
	{ label: "null body ipv6", environment: "production", ipMode: "ipv6", body: "null" },
	{ label: "malformed entry", environment: "production", body: JSON.stringify({ a: { url: "x" } }) },
	{ label: "not json", environment: "production", body: "not json" },
	{ label: "empty body", environment: "production", body: "" },
	{ label: "stalls", environment: "production", stall: true, timeoutMs: 50 },
	{ label: "development", environment: "development" },
	{ label: "development override", environment: "development", developmentOverride: "https://192.0.2.10:9229/" },
	{ label: "development blank override", environment: "development", developmentOverride: "  " },
	{ label: "list override in production", environment: "production", listOverride: "https://captcha.example.com/" },
	{ label: "list override in development", environment: "development", listOverride: "https://captcha.example.com" },
	{ label: "list override ignores ipMode", environment: "staging", ipMode: "ipv4", listOverride: "https://captcha.example.com" },
	{ label: "json list override with ipMode", environment: "production", ipMode: "ipv4", listOverride: JSON.stringify({ d: entry("d"), ipv4: { f: entry("ipv4.f") } }) },
	{ label: "malformed list override falls through", environment: "production", listOverride: "{oops", body: JSON.stringify({ a: entry("a") }) },
	{ label: "blank list override falls through", environment: "development", listOverride: " " },
];

const withEnv = async (vars: { [key: string]: string | undefined }, fn: () => Promise<Json>): Promise<Json> => {
	const saved = Object.fromEntries(Object.keys(vars).map((key) => [key, process.env[key]]));
	for (const [key, value] of Object.entries(vars)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	try {
		return await fn();
	} finally {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
};

const loads: Json[] = [];
for (const scenario of SCENARIOS) {
	const requests: string[] = [];
	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		requests.push(String(input));
		if (scenario.stall) {
			return new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
			});
		}
		const body = scenario.bodyBase64 ? Buffer.from(scenario.bodyBase64, "base64") : (scenario.body ?? "");
		return new Response(body, { status: scenario.status ?? 200 });
	}) as typeof fetch;
	// AbortSignal.timeout's timer does not hold the event loop open by itself.
	const keepAlive = setInterval(() => undefined, 1_000);
	const result = await withEnv(
		{ PROSOPO_PROVIDER_LIST: scenario.listOverride, PROSOPO_PROVIDER_URL_DEVELOPMENT: scenario.developmentOverride },
		() => asyncOutcome(async () => (await loadBalancer(scenario.environment, scenario.ipMode, scenario.timeoutMs)) as unknown as Json),
	);
	clearInterval(keepAlive);
	loads.push({ scenario: scenario as unknown as Json, requests, ...(result as object) });
}

const output = fileURLToPath(new URL("./vectors.json", import.meta.url));
writeFileSync(output, `${JSON.stringify({ localeCompare, convert, hostnames, overrides, development, loadBalancerUrls, loads }, null, "\t")}\n`);
process.stdout.write(
	`wrote ${localeCompare.length} localeCompare, ${convert.length} convert, ${hostnames.length} hostname, ${overrides.length} override, ${development.length} development and ${loads.length} loadBalancer vectors\n`,
);
