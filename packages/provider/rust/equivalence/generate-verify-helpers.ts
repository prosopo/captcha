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

// Writes verify-helpers-vectors.json: the pure functions server-side verification leans on
// (the traffic filter, a site's email rules, DNS path asymmetry, the frictionless score), run
// over a seeded spread of inputs. Run on Node 24.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { IEmailSpamRules, IPInfoResponse, ITrafficCategoryPolicy, ITrafficFilter } from "@prosopo/types";
import { computeDnsAsymmetry, extraIpInfosFromEnrichedDnsEvent, getIpInfoAsn } from "../../src/tasks/dnsEvent/enrichDnsEvent.js";
import { computeFrictionlessScore } from "../../src/tasks/frictionless/frictionlessTasksUtils.js";
import { checkTrafficFilter, resolveChallengePolicy, resolvePadBytes } from "../../src/tasks/spam/checkTrafficFilter.js";
import { evaluateEmailSpamRules, normaliseEmailForMatching, normaliseGmailAddress } from "../../src/tasks/spam/evaluateEmailSpamRules.js";
import { deriveTrafficPolicies } from "../../src/utils/devicePlatform.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

let seed = 0x2545f491;
const random = (): number => {
	seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
	return seed / 2 ** 32;
};
const chance = (p: number): boolean => random() < p;
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;

const NAMES = ["iCloud Private Relay", " icloud private relay ", "Amazon", "AMAZON ", "Hetzner", "Comcast", "", "  "];
const CATEGORIES = ["vpn", "proxy", "tor", "abuser", "datacenter", "mobile", "satellite", "crawler"] as const;

const ipInfo = (): IPInfoResponse => {
	if (chance(0.08)) return { isValid: false, error: "lookup failed", ip: "192.0.2.1" };
	const info: IPInfoResponse = {
		ip: "192.0.2.1",
		isValid: true,
		isVPN: chance(0.15),
		isTor: chance(0.1),
		isProxy: chance(0.15),
		isDatacenter: chance(0.45),
		isAbuser: chance(0.35),
		isMobile: chance(0.25),
		isSatellite: chance(0.15),
		isCrawler: chance(0.2),
	};
	if (chance(0.6)) info.providerType = pick(["hosting", "isp", "business", "education"] as const);
	if (chance(0.5)) info.providerName = pick(NAMES);
	if (chance(0.4)) info.datacenterName = pick(NAMES);
	if (chance(0.4)) info.asnOrganization = pick(NAMES);
	if (chance(0.6)) info.asnNumber = pick([13335, 16509, 7922, 0]);
	if (chance(0.7)) info.abuserScore = pick([0, 0.0012, 0.1, 0.2, 0.35, 0.9]);
	if (chance(0.5)) info.companyAbuserScore = pick([0, 0.05, 0.19999, 0.2, 0.5]);
	return info;
};

const policy = (): ITrafficCategoryPolicy => {
	const out: ITrafficCategoryPolicy = { action: chance(0.4) ? "block" : "challenge" } as ITrafficCategoryPolicy;
	if (chance(0.6)) out.captchaType = pick(["pow", "image", "puzzle"] as const) as ITrafficCategoryPolicy["captchaType"];
	if (chance(0.4)) out.powDifficulty = pick([2, 4, 5, 7]);
	if (chance(0.3)) out.solvedImagesCount = pick([1, 3, 5]);
	if (chance(0.3)) out.puzzleTolerance = pick([4, 10, 25]);
	if (chance(0.3)) out.padBytes = pick([0, 1024, 65536]);
	if (chance(0.25)) out.puzzle = chance(0.5) ? { decoyCount: pick([1, 3]) } : { holeDarken: 0.5, decoyCount: 2 };
	if (chance(0.2)) out.audio = { digitCount: pick([4, 6]) };
	if (chance(0.25)) out.iconOrderTolerance = pick([0.1, 0.3]);
	if (chance(0.2)) out.iconOrder = chance(0.5) ? { targetCount: 3 } : { strokeWidth: 2, targetCount: 4 };
	return out;
};

const filter = (): Partial<ITrafficFilter> => {
	const out: Partial<ITrafficFilter> = {};
	for (const category of CATEGORIES) if (chance(0.45)) out[category] = policy();
	if (chance(0.4)) out.abuserScoreThreshold = pick([0, 0.1, 0.2, 0.5]);
	if (chance(0.3)) out.datacenterNameAllowlist = [pick(NAMES), pick(NAMES)];
	if (chance(0.3)) out.datacenterNameDenylist = chance(0.5) ? [pick(NAMES)] : [];
	if (chance(0.5)) out.skipExtrasOnValidDnsPath = chance(0.5);
	return out;
};

const traffic = [];
for (let i = 0; i < 1500; i++) {
	const client = chance(0.9) ? ipInfo() : undefined;
	const site = filter();
	const enriched = chance(0.85)
		? {
				...(chance(0.8) ? { peerIp: "198.51.100.1" } : {}),
				...(chance(0.8) ? { resolverIp: "198.51.100.2" } : {}),
				...(chance(0.7) ? { pathValid: chance(0.5) } : {}),
				...(chance(0.7) ? { peerIpInfo: ipInfo() } : {}),
				...(chance(0.7) ? { resolverIpInfo: ipInfo() } : {}),
			}
		: undefined;
	const extras = extraIpInfosFromEnrichedDnsEvent(enriched);
	const check = checkTrafficFilter(client, site, extras, enriched?.pathValid);
	traffic.push({
		client,
		filter: site,
		enriched,
		extras,
		check,
		challenge: resolveChallengePolicy(check.matches),
		padBytes: resolvePadBytes(check.matches),
		policies: deriveTrafficPolicies(site),
		asymmetry: computeDnsAsymmetry(enriched, client, site),
		asymmetryUnfiltered: computeDnsAsymmetry(enriched, client),
		asn: getIpInfoAsn(client),
	});
}

const EMAILS = [
	"",
	"user@example.com",
	" User@Example.COM ",
	" a.b@gmail.com﻿",
	"\u0085a@example.com",
	"a.b.c.d.e@example.com",
	"a.b.c.d@example.com",
	"john.doe+vkd38uoukd5@gmail.com",
	"john.doe+abc@googlemail.com",
	"JOHN+ABCDEF1@GMAIL.COM",
	"+tag@example.com",
	"+tag@gmail.com",
	"...+x@gmail.com",
	"@example.com",
	"user@",
	"noat",
	"a@b@c.com",
	"spam123@mailinator.com",
	"ĳ.ǅ@example.com",
	"İstanbul@example.com",
	"ΣΑΣ@example.com",
	"𝒜.b@example.com",
	"x𝒜x@example.com",
	"𝒜𝒜@example.com",
	"uu@example.com",
	"u{61}@example.com",
	"\\u{61}@example.com",
	"é@example.com",
	"a b@example.com",
	"buy.now.cheap@spam.ru",
];
const RULES: (IEmailSpamRules | undefined)[] = [
	undefined,
	{ enabled: false, normaliseGmail: true, useDefaultPatterns: true, customRegexBlocklist: [".*"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: [] },
	{ enabled: true, maxLocalPartDots: 0, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: [] },
	{ enabled: true, maxLocalPartDots: 2, normaliseGmail: true, useDefaultPatterns: true, customRegexBlocklist: [] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: true, customRegexBlocklist: [] },
	{ enabled: true, normaliseGmail: true, useDefaultPatterns: false, customRegexBlocklist: ["^johndoe@gmail\\.com$", "mailinator"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["(", "SPAM\\d+", "\\.ru$", "^[^@]{1,2}@"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["\\u0130", "^.@", "[\\ud835]", "σας", "\\w+\\.\\w+@", "(?<n>a)\\k<n>"] },
	{ enabled: true, normaliseGmail: true, useDefaultPatterns: false, customRegexBlocklist: ["\\bnow\\b", "^\\s", "[^\\x00-\\x7f]"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["\\b*", "\\u{61}", "user"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["[\\ud835\\udc9c]x"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["[\\udc9c]\\."] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["[𝒜]"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["^[^𝒜]\\."] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["\\ud835\\udc9c\\."] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["[\\ud800-\\udbff][\\udc00-\\udfff]"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["𝒜{2}"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["\\u{2}"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["[\\u{61}]"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["\\\\u{61}"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["\\u00e9|\\u0130"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["\\u{zz}"] },
	{ enabled: true, normaliseGmail: false, useDefaultPatterns: false, customRegexBlocklist: ["[^\\ud835]\\.b"] },
];
const email = EMAILS.map((address) => ({
	email: address,
	gmail: normaliseGmailAddress(address),
	matching: normaliseEmailForMatching(address),
	results: RULES.map((rules) => evaluateEmailSpamRules(address, rules)),
}));

const scores: { components: number[]; score: number }[] = [];
for (let i = 0; i < 400; i++) {
	const components = Array.from({ length: 1 + Math.floor(random() * 7) }, () => pick([0, 0.005, 0.1, 0.2, 0.3, 0.125, 0.335, 0.4, 0.7, 1, 0.045, 0.015]));
	scores.push({ components, score: computeFrictionlessScore(Object.fromEntries(components.map((value, key) => [`k${key}`, value]))) });
}

writeFileSync(
	fileURLToPath(new URL("./verify-helpers-vectors.json", import.meta.url)),
	`${JSON.stringify({ traffic, emailRules: RULES.map((rules) => rules ?? null), email, scores })}\n`,
);
console.log(`wrote verify-helpers-vectors.json (${traffic.length} traffic cases, ${email.length} emails, ${scores.length} scores)`);
