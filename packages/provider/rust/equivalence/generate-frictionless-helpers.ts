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

// Writes frictionless-helpers-vectors.json: the frictionless route's pure helpers from the TS
// on Node 24. `encodeHoneypotQuestion` in both encodings over mixed text (JS whitespace, case
// mapping that grows a string, characters with no code); `checkLangRules` over header shapes
// and keys an object's prototype answers; `timestampDecayFunction` with the clock pinned;
// `derivePath` and `buildDnsEventUrl`; the puzzle-to-image switches; `isImageSwitchRequestValid`;
// `resolveSiteAllowedCaptchaTypes`; and `getRoundsFromTriggeredDetectors`.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CaptchaType, EncodingType } from "@prosopo/types";
import {
	getRoundsFromTriggeredDetectors,
	resolveSiteAllowedCaptchaTypes,
} from "../../src/api/captcha/getFrictionlessCaptchaChallenge/constants.js";
import { isImageSwitchRequestValid } from "../../src/api/captcha/getFrictionlessCaptchaChallenge/refreshLineage.js";
import { buildDnsEventUrl, derivePath } from "../../src/api/dnsEventUrl.js";
import { checkLangRules } from "../../src/rules/lang.js";
import {
	switchTypeAfterRefreshes,
	switchTypeOnUserRequest,
} from "../../src/tasks/captchaTypeSelection.js";
import { timestampDecayFunction } from "../../src/tasks/frictionless/frictionlessTasksUtils.js";
import { encodeHoneypotQuestion } from "../../src/utils/honeypot/encoders.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(
		`this generator must run on Node 24 (the production runtime), not ${process.version}`,
	);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const outcome = (run: () => unknown): Json => {
	try {
		const value = run();
		return {
			ok: (value === undefined
				? null
				: typeof value === "string" ||
						typeof value === "number" ||
						typeof value === "boolean"
					? value
					: (value as Json)) as Json,
		};
	} catch (error) {
		return { thrown: String((error as Error).message) };
	}
};

const texts = [
	"What is two plus two",
	"",
	"   ",
	"HELLO world 42",
	"a b c﻿d\u0085e",
	"İstanbul ÇAĞ",
	"Straße ŉ",
	"!!! ?? 7",
	"x\ty\nz",
	"ΣΑΣ σας",
	"abc😀def",
];
const honeypot: Json[] = texts.flatMap((text) =>
	[EncodingType.morse, EncodingType.semaphore, "other"].map((encoding) => ({
		text,
		encoding,
		result: encodeHoneypotQuestion(text, encoding as EncodingType),
	})),
);

const rules = { en: 0.1, "en-GB": 0.2, de: -0.05, zero: 0 };
const headers = [
	"",
	"en",
	"en-GB,en;q=0.9",
	" de , fr;q=0.5,en",
	"xx",
	"en,en,en",
	";q=1",
	",,,",
	"zero,en",
	"constructor",
	"toString,en",
	"__proto__",
	"hasOwnProperty",
];
const lang: Json[] = headers.flatMap((header) => [
	{
		rules,
		header,
		result: outcome(() => checkLangRules({ lRules: rules } as never, header)),
	},
	{
		rules: null,
		header,
		result: outcome(() => checkLangRules({} as never, header)),
	},
]);

const NOW = 1_800_000_000_000;
const RealDate = Date;
class PinnedDate extends RealDate {
	constructor(...args: unknown[]) {
		if (args.length === 0) super(NOW);
		else super(...(args as [number]));
	}
	static now(): number {
		return NOW;
	}
}
globalThis.Date = PinnedDate as DateConstructor;
const decay: Json[] = [
	0,
	1000,
	59_000,
	600_001,
	1_800_000,
	3_599_999,
	3_600_001,
	86_400_000,
	-5000,
	NOW,
].flatMap((age) =>
	[1, 2, 5, 12, 32].map((max) => ({
		timestamp: NOW - age,
		imageMaxRounds: max,
		now: NOW,
		result: timestampDecayFunction(NOW - age, max),
	})),
);
globalThis.Date = RealDate;

const dns: Json[] = [];
for (const sessionId of ["pronode1-abc", "local-0", "s"]) {
	for (const secret of ["k", "a-longer-secret"]) {
		for (const env of [
			{},
			{ DNS_EVENT_SUBZONE: "dns.example" },
			{ DNS_EVENT_SUBZONE: "dns.example", DNS_EVENT_HMAC_SECRET: secret },
			{
				DNS_EVENT_SUBZONE: "dns.example",
				DNS_EVENT_HMAC_SECRET: secret,
				DNS_EVENT_PORT: "8443",
			},
		]) {
			for (const key of [
				"DNS_EVENT_SUBZONE",
				"DNS_EVENT_HMAC_SECRET",
				"DNS_EVENT_PORT",
			])
				Reflect.deleteProperty(process.env, key);
			Object.assign(process.env, env);
			dns.push({
				sessionId,
				secret,
				env,
				path: derivePath(sessionId, secret),
				url: buildDnsEventUrl(sessionId) ?? null,
			});
		}
	}
}

const types = [
	CaptchaType.pow,
	CaptchaType.image,
	CaptchaType.puzzle,
	CaptchaType.iconOrder,
];
const alloweds = [
	undefined,
	{ image: false },
	{ image: true, puzzle: false },
	{},
];
const switches: Json[] = [];
for (const resolved of types)
	for (const allowed of alloweds) {
		for (const count of [undefined, 0, 2, 3, 9])
			switches.push({
				kind: "refreshes",
				resolved,
				value: count ?? null,
				allowed: allowed ?? null,
				result: switchTypeAfterRefreshes(resolved, count, allowed),
			});
		for (const asked of [undefined, false, true])
			switches.push({
				kind: "user",
				resolved,
				value: asked ?? null,
				allowed: allowed ?? null,
				result: switchTypeOnUserRequest(resolved, asked, allowed),
			});
	}

const imageSwitch: Json[] = [];
for (const asked of [undefined, false, true])
	for (const replaced of [undefined, CaptchaType.puzzle, CaptchaType.image])
		for (const enabled of [false, true])
			imageSwitch.push({
				asked: asked ?? null,
				replaced: replaced ?? null,
				enabled,
				result: isImageSwitchRequestValid(
					asked,
					replaced
						? {
								lineage: {
									refreshOf: "x",
									refreshCount: 1,
									refreshedAfterMs: 0,
								},
								replacedCaptchaType: replaced,
							}
						: undefined,
					enabled,
				),
			});

const settingsCases = [
	{},
	{ captchaType: "frictionless", frictionlessTypes: { image: false } },
	{ captchaType: "pow", frictionlessTypes: { image: false } },
	{ captchaType: "", frictionlessTypes: { puzzle: false } },
	{
		frictionlessTypes: { iconOrder: true },
		captchaTypeFeatureFlags: { iconOrder: true },
	},
	{
		captchaType: "image",
		captchaTypeFeatureFlags: { puzzle: false, iconOrder: true },
	},
	{ captchaTypeFeatureFlags: { puzzle: false } },
];
const allowedTypes: Json[] = settingsCases.map((settings) => ({
	settings,
	result: resolveSiteAllowedCaptchaTypes(settings as never) as unknown as Json,
}));

const rounds: Json[] = [];
for (const base of [0, 2, 5])
	for (const triggered of [
		undefined,
		[],
		[1],
		[1, 2, 3],
		[1, 2, 3, 4, 5, 6, 7, 8],
	])
		rounds.push({
			base,
			triggered: triggered ?? null,
			result: getRoundsFromTriggeredDetectors(base, triggered),
		});

const out = fileURLToPath(
	new URL("frictionless-helpers-vectors.json", import.meta.url),
);
writeFileSync(
	out,
	`${JSON.stringify({ node: process.version, honeypot, lang, decay, dns, switches, imageSwitch, allowedTypes, rounds }, null, "\t")}\n`,
);
console.log(`wrote ${out}`);
