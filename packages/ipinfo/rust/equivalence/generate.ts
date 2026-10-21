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

// Runs the TypeScript ipinfo backends on scenarios described as JSON (fake MaxMind readers,
// fake fetch responses) and records results, requests and log lines into vectors.json, which
// equivalence.rs replays against the Rust with the same fakes.

import { writeFileSync } from "node:fs";
import net from "node:net";
import { fileURLToPath } from "node:url";
import type { Asn, City, Country, ReaderModel } from "@maxmind/geoip2-node";
import type { LogRecordFn, Logger } from "@prosopo/logger";
import { IpInfoService, isNonRoutable } from "../../src/IpInfoService.js";
import { IpapiBackend, parseAbuserScore } from "../../src/backends/ipapi.js";
import { MaxMindBackend } from "../../src/backends/maxmind.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** What a fake reader accessor does: return a model (geoip2-node's camelCase shape), or throw. */
type Behaviour = { model: Json } | { throws: { name: string; message: string } } | "unsupported";

type ReaderSpec = { opens: boolean; city?: Behaviour; country?: Behaviour; asn?: Behaviour };

type MaxMindScenario = {
	label: string;
	cityDb?: ReaderSpec;
	asnDb?: ReaderSpec;
	calls: { op: "lookup" | "countryCode"; ip: string }[];
};

type FetchSpec =
	| { status: number; statusText: string; body: string }
	| { networkError: string }
	| { abort: true };

type IpapiScenario = { label: string; apiKey?: string; timeoutMs?: number; ip: string; response: FetchSpec };

type ServiceScenario = {
	label: string;
	maxmind?: MaxMindScenario;
	ipapi?: { response: FetchSpec };
	calls: { op: "lookup" | "country"; ip: string }[];
};

type LogLine = { level: string; msg: string };

const capture = (): { logger: Logger; lines: LogLine[] } => {
	const lines: LogLine[] = [];
	const at = (level: string) => (fn: LogRecordFn) => {
		lines.push({ level, msg: fn().msg ?? "" });
	};
	const logger = {
		info: at("info"),
		debug: at("debug"),
		warn: at("warn"),
		error: at("error"),
		trace: at("trace"),
		fatal: at("fatal"),
	} as unknown as Logger;
	return { logger, lines };
};

const accessor = (behaviour: Behaviour | undefined) => (): unknown => {
	if (behaviour === undefined || behaviour === "unsupported") {
		throw new Error("database does not support this lookup");
	}
	if ("throws" in behaviour) {
		const error = new Error(behaviour.throws.message);
		error.name = behaviour.throws.name;
		throw error;
	}
	return JSON.parse(JSON.stringify(behaviour.model));
};

const fakeReader = (spec: ReaderSpec): ReaderModel =>
	({
		city: accessor(spec.city) as () => City,
		country: accessor(spec.country) as () => Country,
		asn: accessor(spec.asn) as () => Asn,
	}) as unknown as ReaderModel;

const CITY_PATH = "/dbs/geo.mmdb";
const ASN_PATH = "/dbs/asn.mmdb";

const maxmindBackend = (scenario: MaxMindScenario, logger: Logger): MaxMindBackend =>
	new MaxMindBackend({
		cityDbPath: scenario.cityDb ? CITY_PATH : undefined,
		asnDbPath: scenario.asnDb ? ASN_PATH : undefined,
		logger,
		openReader: async (path: string): Promise<ReaderModel> => {
			const spec = path === CITY_PATH ? scenario.cityDb : scenario.asnDb;
			if (!spec?.opens) throw new Error(`no database at ${path}`);
			return fakeReader(spec);
		},
	});

const fakeFetch = (spec: FetchSpec, requests: Json[]) =>
	async (url: string, init: RequestInit): Promise<Response> => {
		requests.push({
			url,
			method: init.method ?? null,
			headers: init.headers as Json,
			body: String(init.body),
		});
		if ("networkError" in spec) throw new TypeError(spec.networkError);
		if ("abort" in spec) {
			const error = new Error("This operation was aborted");
			error.name = "AbortError";
			throw error;
		}
		return new Response(spec.body, { status: spec.status, statusText: spec.statusText });
	};

const city = (overrides: { [key: string]: Json } = {}): Json => ({
	country: { isoCode: "US", names: { en: "United States" } },
	city: { names: { en: "Mountain View" } },
	subdivisions: [{ names: { en: "California" } }, { names: { en: "Santa Clara" } }],
	location: { latitude: 37.4, longitude: -122.1, timeZone: "America/Los_Angeles" },
	traits: {},
	...overrides,
});

const country = (overrides: { [key: string]: Json } = {}): Json => ({
	country: { isoCode: "DE", names: { en: "Germany" } },
	traits: {},
	...overrides,
});

const asn = (overrides: { [key: string]: Json } = {}): Json => ({
	autonomousSystemNumber: 15169,
	autonomousSystemOrganization: "Google LLC",
	...overrides,
});

const badMethod: Behaviour = { throws: { name: "BadMethodCallError", message: "The city() method cannot be used with the GeoLite2-Country database" } };
const notFound: Behaviour = { throws: { name: "AddressNotFoundError", message: "The address 8.8.8.8 is not in the database" } };
const invalid: Behaviour = { throws: { name: "ValueError", message: "x is invalid" } };

const USER_TYPES = ["business", "cafe", "cellular", "college", "consumer_privacy_network", "content_delivery_network", "dialup", "government", "hosting", "library", "military", "residential", "router", "school", "search_engine_spider", "traveler", "unknown_type"];

const twice = (ip: string): MaxMindScenario["calls"] => [
	{ op: "lookup", ip },
	{ op: "countryCode", ip },
	{ op: "lookup", ip },
	{ op: "countryCode", ip },
];

const maxmindScenarios: MaxMindScenario[] = [
	{ label: "nothing configured", calls: twice("8.8.8.8") },
	{ label: "city db", cityDb: { opens: true, city: { model: city() } }, calls: twice("8.8.8.8") },
	{ label: "city db that fails to open", cityDb: { opens: false }, calls: twice("8.8.8.8") },
	{ label: "country db behind cityDbPath", cityDb: { opens: true, city: badMethod, country: { model: country() } }, calls: twice("8.8.8.8") },
	{ label: "country db, country fails", cityDb: { opens: true, city: badMethod, country: notFound }, calls: twice("8.8.8.8") },
	{ label: "city not found", cityDb: { opens: true, city: notFound, country: { model: country() } }, calls: twice("8.8.8.8") },
	{ label: "city invalid address", cityDb: { opens: true, city: invalid }, calls: twice("x") },
	{ label: "asn only", asnDb: { opens: true, asn: { model: asn() } }, calls: twice("8.8.8.8") },
	{ label: "asn fails", asnDb: { opens: true, asn: notFound }, calls: twice("8.8.8.8") },
	{ label: "both", cityDb: { opens: true, city: { model: city() } }, asnDb: { opens: true, asn: { model: asn() } }, calls: twice("8.8.8.8") },
	{ label: "both, asn db fails to open", cityDb: { opens: true, city: { model: city() } }, asnDb: { opens: false }, calls: twice("8.8.8.8") },
	{
		label: "traits from geo win over asn",
		cityDb: { opens: true, city: { model: city({ traits: { autonomousSystemNumber: 1, autonomousSystemOrganization: "Geo Org", userType: "hosting", isAnonymousVpn: true, isTorExitNode: true, isPublicProxy: false, isResidentialProxy: true, isHostingProvider: true, isSatelliteProvider: true } }) } },
		asnDb: { opens: true, asn: { model: asn() } },
		calls: twice("8.8.8.8"),
	},
	{ label: "empty city model", cityDb: { opens: true, city: { model: {} } }, calls: twice("1.1.1.1") },
	{ label: "city without traits", cityDb: { opens: true, city: { model: { country: { isoCode: "FR" } } } }, calls: twice("1.1.1.1") },
	{ label: "city without subdivisions", cityDb: { opens: true, city: { model: city({ subdivisions: [] }) } }, calls: twice("1.1.1.1") },
	{ label: "country without names", cityDb: { opens: true, city: badMethod, country: { model: { country: {} } } }, calls: twice("1.1.1.1") },
	...USER_TYPES.map((userType): MaxMindScenario => ({
		label: `user type ${userType}`,
		cityDb: { opens: true, city: { model: city({ traits: { userType } }) } },
		calls: [{ op: "lookup", ip: "8.8.4.4" }],
	})),
];

const json = (value: Json): string => JSON.stringify(value);

const fullResponse = {
	ip: "8.8.8.8",
	rir: "ARIN",
	is_bogon: false,
	is_mobile: false,
	is_satellite: false,
	is_crawler: false,
	is_datacenter: true,
	is_tor: false,
	is_proxy: false,
	is_vpn: true,
	is_abuser: false,
	datacenter: { datacenter: "Google", network: "8.8.8.0/24" },
	company: { name: "Google LLC", abuser_score: "0.0012 (Low)", domain: "google.com", type: "hosting", network: "8.8.8.0/24", whois: "" },
	asn: { asn: 15169, abuser_score: "0.004 (Low)", route: "8.8.8.0/24", descr: "GOOGLE", country: "us", active: true, org: "Google LLC", domain: "google.com", abuse: "", type: "business", created: "", updated: "", rir: "arin", whois: "" },
	location: { is_eu_member: false, calling_code: "1", currency_code: "USD", continent: "NA", country: "United States", country_code: "US", state: "California", city: "Mountain View", latitude: 37.4, longitude: -122.1, zip: "", timezone: "America/Los_Angeles", local_time: "", local_time_unix: 0, is_dst: false },
	vpn: { ip: "8.8.8.8", service: "SomeVPN", url: "", type: "exit_node", last_seen: 0, last_seen_str: "", country_code: "US", city_name: "", latitude: 0, longitude: 0 },
	elapsed_ms: 1.2,
};

const ok = (body: Json): FetchSpec => ({ status: 200, statusText: "OK", body: json(body) });

const ipapiScenarios: IpapiScenario[] = [
	{ label: "full", ip: "8.8.8.8", apiKey: "secret", response: ok(fullResponse) },
	{ label: "no key", ip: "8.8.8.8", response: ok(fullResponse) },
	{ label: "empty key", ip: "8.8.8.8", apiKey: "", response: ok(fullResponse) },
	{ label: "minimal", ip: "1.1.1.1", response: ok({ ip: "1.1.1.1" }) },
	{ label: "bogon", ip: "10.0.0.1", response: ok({ ...fullResponse, is_bogon: true }) },
	{ label: "empty company name falls back to datacenter", ip: "8.8.8.8", response: ok({ ...fullResponse, company: { ...fullResponse.company, name: "" } }) },
	{ label: "no company", ip: "8.8.8.8", response: ok({ ...fullResponse, company: undefined }) },
	{ label: "no asn", ip: "8.8.8.8", response: ok({ ...fullResponse, asn: undefined }) },
	{ label: "scores", ip: "8.8.8.8", response: ok({ ...fullResponse, asn: { ...fullResponse.asn, abuser_score: "1e-3 (Low)" }, company: { ...fullResponse.company, abuser_score: " 0.5" } }) },
	{ label: "score not a number", ip: "8.8.8.8", response: ok({ ...fullResponse, asn: { ...fullResponse.asn, abuser_score: "n/a" } }) },
	{ label: "score null", ip: "8.8.8.8", response: ok({ ...fullResponse, asn: { ...fullResponse.asn, abuser_score: null } }) },
	{ label: "score is a number", ip: "8.8.8.8", response: ok({ ...fullResponse, asn: { ...fullResponse.asn, abuser_score: 0.5 } }) },
	{ label: "server error", ip: "8.8.8.8", response: { status: 500, statusText: "Internal Server Error", body: "oops" } },
	{ label: "rate limited", ip: "8.8.8.8", response: { status: 429, statusText: "Too Many Requests", body: "" } },
	{ label: "teapot", ip: "8.8.8.8", response: { status: 418, statusText: "I'm a Teapot", body: "" } },
	{ label: "network error", ip: "8.8.8.8", response: { networkError: "fetch failed" } },
	{ label: "timeout", ip: "8.8.8.8", timeoutMs: 250, response: { abort: true } },
	{ label: "empty ip", ip: "", response: ok(fullResponse) },
	{ label: "unicode ip", ip: "é ", response: ok({ ...fullResponse, ip: "é" }) },
];

const PARSE_SCORES: (string | undefined)[] = [undefined, "", " ", "0.0012 (Low)", "0.0012", "1", "-0.5 (x)", ".5", "5.", "1e3", "1e", "1e+2", "Infinity", "-Infinity (x)", "abc", "0x10", "1,5", " 0.3", "\t0.3", " 0.3", "0.3abc", "+.7", "-", "."];

const ROUTABILITY: string[] = [
	"127.0.0.1", "10.1.2.3", "192.168.0.1", "169.254.1.1", "0.0.0.0", "172.15.0.1", "172.16.0.1", "172.31.255.255", "172.32.0.1", "172.", "172.abc",
	"172.016.0.1", "172. 20.0.1", "172.+20.0.1", "172.-20.0.1", "8.8.8.8", "::1", "::", "::ffff:127.0.0.1", "::FFFF:10.0.0.1", "::ffff:8.8.8.8",
	"fc00::1", "FD00::1", "fe80::1", "FEBF::1", "fec0::1", "fcxyz", "2001:db8::1", "", "127", "1.2.3.4", "::ffff:", "::ffff:fe80::1",
];

const ADDRESSES: string[] = [
	...ROUTABILITY, "1.2.3", "1.2.3.4.5", "256.1.1.1", "01.2.3.4", "1.2.3.04", " 1.2.3.4", "1.2.3.4 ", "::ffff:1.2.3.4", "1::", "1:2:3:4:5:6:7:8", "1:2:3:4:5:6:7:8:9",
	"fe80::1%eth0", "fe80::1%", "fe80::1%en0.1", "fe80::1%a b", "::1.2.3.4", "1:2:3:4:5:6:1.2.3.4", "g::1", "12345::1", "1:::2", ":1:2::", "[::1]", "::0:0:0:0:0:0:0", "localhost",
];

const run = async (): Promise<void> => {
	const maxmind = [];
	for (const scenario of maxmindScenarios) {
		const { logger, lines } = capture();
		const backend = maxmindBackend(scenario, logger);
		await backend.initialize();
		const results: Json[] = [];
		for (const call of scenario.calls) {
			results.push(
				call.op === "lookup"
					? json((await backend.lookup(call.ip)) as unknown as Json)
					: (backend.countryCode(call.ip) ?? null),
			);
		}
		maxmind.push({ scenario, available: backend.isAvailable(), results, logs: lines });
	}

	const ipapi = [];
	for (const scenario of ipapiScenarios) {
		const requests: Json[] = [];
		const backend = new IpapiBackend({
			baseUrl: "https://ipapi.example/api",
			apiKey: scenario.apiKey,
			timeoutMs: scenario.timeoutMs,
			fetch: fakeFetch(scenario.response, requests),
		});
		const result = await backend.lookup(scenario.ip);
		ipapi.push({ scenario, result: json(result as unknown as Json), requests });
	}

	const serviceScenarios: ServiceScenario[] = [];
	for (const [index, maxmindScenario] of [undefined, ...maxmindScenarios.slice(0, 12)].entries()) {
		for (const ipapiResponse of [undefined, ok(fullResponse), { status: 500, statusText: "Internal Server Error", body: "" }, ok({ ...fullResponse, is_bogon: true })] as (FetchSpec | undefined)[]) {
			serviceScenarios.push({
				label: `maxmind ${index} ipapi ${ipapiResponse ? ("status" in ipapiResponse ? ipapiResponse.status : "x") : "none"}`,
				maxmind: maxmindScenario,
				ipapi: ipapiResponse ? { response: ipapiResponse } : undefined,
				calls: [
					{ op: "lookup", ip: "8.8.8.8" },
					{ op: "country", ip: "8.8.8.8" },
					{ op: "lookup", ip: "10.0.0.1" },
					{ op: "country", ip: "fe80::1" },
					{ op: "lookup", ip: "8.8.8.8" },
				],
			});
		}
	}

	const service = [];
	for (const scenario of serviceScenarios) {
		const { logger, lines } = capture();
		const requests: Json[] = [];
		const ipInfo = new IpInfoService(
			{ logger },
			{
				maxmind: scenario.maxmind ? maxmindBackend(scenario.maxmind, logger) : null,
				ipapi: scenario.ipapi
					? new IpapiBackend({ baseUrl: "https://ipapi.example/api", fetch: fakeFetch(scenario.ipapi.response, requests) })
					: null,
			},
		);
		await ipInfo.initialize();
		const results: Json[] = [];
		for (const call of scenario.calls) {
			results.push(
				call.op === "lookup"
					? json((await ipInfo.lookup(call.ip)) as unknown as Json)
					: (ipInfo.country(call.ip) ?? null),
			);
		}
		service.push({ scenario, available: ipInfo.isAvailable(), results, logs: lines });
	}

	// Built from config rather than injected; a non-empty ipapi URL is only checked for
	// availability, since a lookup would go to the network.
	const PATHS: (string | undefined)[] = [undefined, "", "/nonexistent/prosopo-equivalence/db.mmdb"];
	const configured = [];
	for (const cityPath of PATHS) {
		for (const asnPath of PATHS) {
			for (const ipapiUrl of [undefined, "", "https://ipapi.example/api"]) {
				const { logger, lines } = capture();
				const ipInfo = new IpInfoService({
					logger,
					maxmindCityDbPath: cityPath,
					maxmindAsnDbPath: asnPath,
					ipapiUrl,
				});
				const availableBefore = ipInfo.isAvailable();
				await ipInfo.initialize();
				const result = ipapiUrl ? null : json((await ipInfo.lookup("8.8.8.8")) as unknown as Json);
				configured.push({
					config: { cityPath: cityPath ?? null, asnPath: asnPath ?? null, ipapiUrl: ipapiUrl ?? null },
					availableBefore,
					available: ipInfo.isAvailable(),
					result,
					logs: lines,
				});
			}
		}
	}

	const vectors = {
		nonRoutable: ROUTABILITY.map((ip) => [ip, isNonRoutable(ip)]),
		isIp: ADDRESSES.map((ip) => [ip, net.isIP(ip) !== 0]),
		// Non-finite scores travel as strings, which JSON can hold.
		parseAbuserScore: PARSE_SCORES.map((score) => {
			const parsed = parseAbuserScore(score);
			return [score ?? null, parsed === undefined ? null : Number.isFinite(parsed) ? parsed : String(parsed)];
		}),
		maxmind,
		ipapi,
		service,
		configured,
	};
	const output = fileURLToPath(new URL("./vectors.json", import.meta.url));
	writeFileSync(output, `${JSON.stringify(vectors, null, "\t")}\n`);
	process.stdout.write(`wrote ${maxmind.length} maxmind, ${ipapi.length} ipapi and ${service.length} service and ${configured.length} configured scenarios\n`);
};

await run();
