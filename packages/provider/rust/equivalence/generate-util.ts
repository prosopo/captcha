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

// Writes util-vectors.json: what the provider's IP helpers, IP comparison and hashes return in
// the TS, over the inputs its unit tests use and seeded random ones. Run on Node 24.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getLogger } from "@prosopo/logger";
import {
	type CompositeIpAddress,
	type IIPValidationRules,
	type IPComparisonResult,
	type IPInfoResponse,
	IPValidationAction,
	IpAddressType,
} from "@prosopo/types";
import type { IIpInfoService } from "@prosopo/types-env";
import { getIPAddress as utilGetIPAddress } from "@prosopo/util";
import { getCompositeIpAddress, getIpAddressFromComposite, isSameIpOrigin } from "../../src/compositeIpAddress.js";
import { compareIPs } from "../../src/services/ipComparison.js";
import {
	deepValidateIpAddress,
	encodeStringAddress,
	evaluateIpValidationRules,
	getIPAddress,
	getIPAddressFromBigInt,
	validateIpAddress,
} from "../../src/util.js";
import { isClientSessionMismatch, toStoredClientMetaData } from "../../src/utils/clientMetaData.js";
import { hashUserAgent } from "../../src/utils/hashUserAgent.js";
import { hashUserIp } from "../../src/utils/hashUserIp.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

let seed = 0x5eed1234;
const random = (): number => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = seed;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (n: number): number => Math.floor(random() * n);
const pick = <T>(items: readonly T[]): T => items[int(items.length)] as T;

const quiet = getLogger("error", "equivalence");
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const plain = (value: unknown): Json =>
	JSON.parse(JSON.stringify(value, (_key, inner) => (typeof inner === "bigint" ? { $bigint: inner.toString() } : inner))) as Json;
const outcome = (run: () => unknown): Json => {
	try {
		return { ok: plain(run()) };
	} catch (error) {
		const e = error as { translationKey?: string; message?: string };
		return { error: e.translationKey ?? e.message ?? String(error) };
	}
};
const addressOf = (ip: { address: string; correctForm(): string; bigInt(): bigint; v4: boolean }) => ({
	address: ip.address,
	correctForm: ip.correctForm(),
	bigInt: ip.bigInt().toString(),
	v4: ip.v4,
});

// The IPs the unit tests use, and odd forms.
const testIps = [
	"0.0.0.0", "0000:0000:0000:0000:0000:0000:0000:0001", "1.1.1.1", "10.0.0.1", "127.0.0.1", "192.168.1.1", "192.168.1.100",
	"2001:0db8:0000:0000:0000:0000:0000:0001", "2001:0db8:85a3:0000:0000:8a2e:0370:7334", "2001:db8:85a3::8a2e:370:7334",
	"2001:db8::1", "2001:db8:abcd:1234:9f3a:2b01:cc:77", "2001:db8:abcd:1234::1", "2001:db8:abcd:5678::1", "203.0.113.1",
	"203.0.113.108", "203.0.113.109", "203.0.113.254", "203.0.113.255", "203.0.113.7", "203.0.114.0", "203.0.114.7",
	"255.255.255.255", "3405803783", "8.8.8.8", "9.9.9.9", "::1", "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
	"::ffff:192.168.1.1", "::ffff:c0a8:101", "fe80::1%eth0", "1.2.3", "1.2.3.4.5", "256.1.1.1", "", "not an ip", "01.02.03.004",
	"::", "1::", "2001:db8::/32", "10.0.0.0/8", " 1.1.1.1", "1.1.1.1 ",
];
const randomV4 = (): string => [int(256), int(256), int(256), int(256)].join(".");
const randomV6 = (): string => Array.from({ length: 8 }, () => int(65536).toString(16)).join(":");
const ips: string[] = [...testIps, ...Array.from({ length: 150 }, randomV4), ...Array.from({ length: 150 }, randomV6)];

const composites = ips.map((ip) => ({ ip, composite: plain(getCompositeIpAddress(ip)) }));
const fromComposite: { composite: Json; outcome: Json }[] = [];
for (const ip of ips) {
	const composite: CompositeIpAddress = getCompositeIpAddress(ip);
	fromComposite.push({ composite: plain(composite), outcome: outcome(() => addressOf(getIpAddressFromComposite(composite))) });
}
for (const lower of [0n, 1n, 4294967295n, 4294967296n, 2n ** 64n - 1n]) {
	for (const type of [IpAddressType.v4, IpAddressType.v6]) {
		const composite: CompositeIpAddress = type === IpAddressType.v6 ? { lower, upper: 7n, type } : { lower, type };
		fromComposite.push({ composite: plain(composite), outcome: outcome(() => addressOf(getIpAddressFromComposite(composite))) });
	}
}
const sameOrigin: { a: Json; b: Json; same: boolean }[] = [];
for (let i = 0; i < 300; i++) {
	const v6 = random() < 0.5;
	const base = v6 ? randomV6() : randomV4();
	const near = v6
		? `${base.split(":").slice(0, 4).join(":")}:${randomV6().split(":").slice(4).join(":")}`
		: `${base.split(".").slice(0, 3).join(".")}.${int(256)}`;
	const other = pick([near, base, v6 ? randomV6() : randomV4(), "0.0.0.0", v6 ? randomV4() : randomV6()]);
	const a = getCompositeIpAddress(base);
	const b = getCompositeIpAddress(other);
	sameOrigin.push({ a: plain(a), b: plain(b), same: isSameIpOrigin(a, b) });
}
const providerIp = ips.map((ip) => ({ ip, outcome: outcome(() => addressOf(getIPAddress(ip))) }));
const fromBigInt = ["0", "1", "4228250626", "4228250627", "4294967295", "4294967296", "340282366920938463463374607431768211455", "340282366920938463463374607431768211456"].map(
	(value) => ({ value, outcome: outcome(() => addressOf(getIPAddressFromBigInt(BigInt(value)))) }),
);

const validations: { ip: Json; challenge: string; outcome: Json }[] = [];
for (let i = 0; i < 250; i++) {
	const challenge = pick([...testIps.slice(0, 28), randomV4(), randomV6(), "::ffff:192.168.1.1"]);
	let challengeAddress;
	try {
		challengeAddress = utilGetIPAddress(challenge);
	} catch {
		continue;
	}
	const ip = pick([undefined, "", challenge, pick(testIps), randomV4(), randomV6(), "192.168.1.1", "::ffff:192.168.1.1"]);
	validations.push({ ip: ip ?? null, challenge, outcome: outcome(() => validateIpAddress(ip, challengeAddress, quiet)) });
}

const actions = [IPValidationAction.Allow, IPValidationAction.Reject, IPValidationAction.Flag];
const randomRules = (): IIPValidationRules => {
	const rules: IIPValidationRules = {
		enabled: true,
		actions: {
			countryChangeAction: pick(actions),
			cityChangeAction: pick(actions),
			ispChangeAction: pick(actions),
			distanceExceedAction: pick(actions),
			abuseScoreExceedAction: pick(actions),
		},
		distanceThresholdKm: pick([0, 100, 500, 1000, 12.5]),
		abuseScoreThreshold: pick([0, 0.005, 0.01, 0.5]),
		requireAllConditions: random() < 0.4,
		forceConsistentIp: random() < 0.2,
	};
	if (random() < 0.4) {
		rules.countryOverrides = {
			[pick(["GB", "US", "DE"])]: {
				actions: random() < 0.5 ? { cityChangeAction: pick(actions) } : { countryChangeAction: pick(actions), ispChangeAction: pick(actions) },
				...(random() < 0.5 ? { distanceThresholdKm: pick([50, 2000]) } : {}),
				...(random() < 0.3 ? { abuseScoreThreshold: 0.2 } : {}),
				...(random() < 0.3 ? { requireAllConditions: random() < 0.5 } : {}),
			},
		};
	}
	return rules;
};
const countries = [["United Kingdom", "GB"], ["United States", "US"], ["Germany", "DE"], [undefined, undefined]] as const;
const randomInfo = (ip: string): IPInfoResponse => {
	if (random() < 0.1) return { isValid: false, error: pick(["lookup failed", "not found"]), ip };
	const [country, countryCode] = pick(countries);
	const located = random() < 0.85;
	return {
		isValid: true,
		ip,
		isVPN: random() < 0.2,
		isTor: random() < 0.05,
		isProxy: random() < 0.1,
		isDatacenter: random() < 0.2,
		isAbuser: random() < 0.1,
		isMobile: random() < 0.2,
		isSatellite: random() < 0.05,
		isCrawler: false,
		...(random() < 0.8 ? { providerName: pick(["AT&T", "BT", "Comcast", "Hetzner"]) } : {}),
		...(random() < 0.5 ? { asnOrganization: pick(["AS7922", "AS2856"]) } : {}),
		...(random() < 0.8 ? { providerType: pick(["isp", "hosting", "business", "education", "government", "banking"]) } : {}),
		...(country ? { country, countryCode } : {}),
		...(random() < 0.8 ? { city: pick(["London", "Leeds", "Berlin", "Austin"]) } : {}),
		...(located ? { latitude: (random() - 0.5) * 180, longitude: (random() - 0.5) * 360 } : {}),
		...(random() < 0.7 ? { abuserScore: pick([0, 0.001, 0.0123, 0.5, 0.97]) } : {}),
	} as IPInfoResponse;
};
const infoService = (infos: Record<string, IPInfoResponse>): IIpInfoService => ({
	initialize: async () => {},
	lookup: async (ip: string) => infos[ip] ?? { isValid: false, error: "unknown", ip },
	country: () => undefined,
	isAvailable: () => true,
});

const comparisons: { ip1: string; ip2: string; infos: Json; outcome: Json }[] = [];
for (const [lat1, lon1, lat2, lon2] of [
	[51.5074, -0.1278, 53.8008, -1.5491],
	[0, 0, 0, 0],
	[90, 0, -90, 0],
	[0, 180, 0, -180],
	[40.7128, -74.006, 34.0522, -118.2437],
	[1e-9, 1e-9, -1e-9, -1e-9],
]) {
	const infos = {
		"1.1.1.1": { isValid: true, ip: "1.1.1.1", latitude: lat1, longitude: lon1, isVPN: false, isTor: false, isProxy: false } as IPInfoResponse,
		"2.2.2.2": { isValid: true, ip: "2.2.2.2", latitude: lat2, longitude: lon2, isVPN: false, isTor: false, isProxy: false } as IPInfoResponse,
	};
	comparisons.push({ ip1: "1.1.1.1", ip2: "2.2.2.2", infos: plain(infos), outcome: plain(await compareIPs("1.1.1.1", "2.2.2.2", infoService(infos))) });
}
for (let i = 0; i < 400; i++) {
	const ip1 = randomV4();
	const ip2 = random() < 0.05 ? ip1 : randomV4();
	const infos = { [ip1]: randomInfo(ip1), [ip2]: randomInfo(ip2) };
	const asked = random() < 0.02 ? "" : ip2;
	comparisons.push({ ip1, ip2: asked, infos: plain(infos), outcome: plain(await compareIPs(ip1, asked, infoService(infos))) });
}
const ruleEvaluations: { comparison: Json; rules: Json; outcome: Json }[] = [];
for (const comparison of comparisons) {
	const result = comparison.outcome as unknown as IPComparisonResult;
	if (!("comparison" in result)) continue;
	for (let i = 0; i < 4; i++) {
		const rules = randomRules();
		ruleEvaluations.push({ comparison: plain(result), rules: plain(rules), outcome: plain(evaluateIpValidationRules(result, rules, quiet)) });
	}
}
const deepValidations: { ip: string; challenge: string; infos: Json; rules: Json; dnsPeerIp: Json; outcome: Json }[] = [];
for (let i = 0; i < 300; i++) {
	const challenge = pick([randomV4(), "203.0.113.7", "2001:db8::1"]);
	const ip = pick([challenge, randomV4(), "203.0.113.8", "not an ip", "2001:db8::2"]);
	const infos = { [challenge]: randomInfo(challenge), [ip]: randomInfo(ip) };
	const rules = random() < 0.25 ? undefined : randomRules();
	const dnsPeerIp = pick([undefined, undefined, ip, randomV4()]);
	const result = await deepValidateIpAddress(ip, utilGetIPAddress(challenge), quiet, infoService(infos), rules, dnsPeerIp);
	deepValidations.push({ ip, challenge, infos: plain(infos), rules: plain(rules ?? null), dnsPeerIp: dnsPeerIp ?? null, outcome: plain(result) });
}

const strings = ["", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "ünïcödé 😀", "a".repeat(1000), "line\nbreak"];
const hashes = {
	userAgent: strings.map((input) => ({ input, hash: hashUserAgent(input) })),
	userIp: strings.flatMap((user) => ["1.1.1.1", "", "::1"].map((ip) => ({ user, ip, sitekey: "5Site", hash: hashUserIp(user, ip, "5Site") }))),
};
const addresses = [
	"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
	"0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d",
	"0xd435",
	"not an address",
	"",
	"1",
].map((input) => ({ input, outcome: outcome(() => encodeStringAddress(input)) }));
const clientMetaData = [undefined, {}, { hp: "" }, { hp: "x" }, { clientSessionId: "s" }, { hp: "x", clientSessionId: "s" }, { hp: "", clientSessionId: "" }].map(
	(input) => ({ input: plain(input ?? null), stored: plain(toStoredClientMetaData(input) ?? null) }),
);
const sessionMismatch = [[undefined, undefined], ["a", undefined], [undefined, "a"], ["a", "a"], ["a", "b"], ["", "b"]].map(([expected, recorded]) => ({
	expected: expected ?? null,
	recorded: recorded ?? null,
	mismatch: isClientSessionMismatch(expected, recorded),
}));

writeFileSync(
	fileURLToPath(new URL("./util-vectors.json", import.meta.url)),
	`${JSON.stringify({ composites, fromComposite, sameOrigin, providerIp, fromBigInt, validations, comparisons, ruleEvaluations, deepValidations, hashes, addresses, clientMetaData, sessionMismatch })}\n`,
);
console.log(
	`wrote util-vectors.json (${composites.length} composites, ${sameOrigin.length} origins, ${validations.length} validations, ${comparisons.length} comparisons, ${ruleEvaluations.length} rule evaluations, ${deepValidations.length} deep validations)`,
);
