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

// Records client/settings.ts (and RoutingMachineOutputSchema) into settings-vectors.json:
// every schema over a corpus of settings blobs, JS regex validity, user-agent bucketing, the
// resolver functions and the defaults. settings_equivalence.rs replays it against the Rust.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ZodTypeAny } from "zod";
import { CaptchaType } from "../../src/client/captchaType/captchaType.js";
import * as settings from "../../src/client/settings.js";
import { RoutingMachineOutputSchema } from "../../src/decisionMachine/index.js";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

type Input = { value?: Json };

type Result = { ok: Json } | { okUndefined: true } | { issues: Json };

// Regex syntax and user-agent matching are V8 behaviour, and production runs Node 24.
if (!process.version.startsWith("v24.")) {
	throw new Error(`generate-settings.ts must run on Node 24 (the production runtime), not ${process.version}`);
}

const result = (schema: ZodTypeAny, input: Input): Result => {
	const parsed = schema.safeParse("value" in input ? input.value : undefined);
	if (!parsed.success) {
		return { issues: JSON.parse(JSON.stringify(parsed.error.issues)) as Json };
	}
	if (parsed.data === undefined) return { okUndefined: true };
	return { ok: JSON.parse(JSON.stringify(parsed.data)) as Json };
};

const WRONG_TYPES: Json[] = [null, 1, -1, 0.5, "", "zzz", [], {}, true, false];

const objectVariants = (base: { [key: string]: Json }): Json[] => {
	const variants: Json[] = [base, { ...base, extra: "stripped" }];
	for (const key of Object.keys(base)) {
		const { [key]: _removed, ...rest } = base;
		variants.push(rest);
		for (const replacement of WRONG_TYPES) {
			variants.push({ ...base, [key]: replacement });
		}
	}
	return variants;
};

const numberBounds = (min: number, max: number, isInt: boolean): Json[] => {
	const step = isInt ? 1 : 0.01;
	const values: Json[] = [min - step, min, max, max + step, (min + max) / 2];
	if (isInt) values.push(min + 0.5);
	return values;
};

const puzzle = {
	decoyCount: 7,
	decoyEdgeDarkness: 10,
	decoyBodyBrightness: -5,
	decoyHoleDarken: 0.4,
	holeDarken: 0.6,
	pieceScale: { min: 0.2, max: 0.4 },
};
const audio = {
	digitCount: 6,
	noiseSnrDb: 20,
	babbleGain: 0.3,
	babbleVoices: 3,
	reverbMix: 0.2,
	gapMs: 300,
};
const iconOrder = {
	targetCount: 4,
	decoyCount: 5,
	strokeWidth: 2,
	iconOpacity: 0.5,
	haloOpacity: 0.3,
	backgroundClutter: 12,
};
const policy = {
	action: "challenge",
	captchaType: "puzzle",
	powDifficulty: 6,
	solvedImagesCount: 4,
	puzzleTolerance: 20,
	padBytes: 1024,
	puzzle,
	audio,
	iconOrderTolerance: 1.5,
	iconOrder,
};
const ipValidationRules = {
	enabled: true,
	actions: {
		countryChangeAction: "flag",
		cityChangeAction: "reject",
		ispChangeAction: "allow",
		distanceExceedAction: "flag",
		abuseScoreExceedAction: "allow",
	},
	distanceThresholdKm: 250,
	abuseScoreThreshold: 0.1,
	requireAllConditions: true,
	countryOverrides: {
		GB: { actions: { countryChangeAction: "reject" }, distanceThresholdKm: 10 },
		"10": { actions: {}, requireAllConditions: false },
		US: { actions: {} },
	},
	forceConsistentIp: true,
};
const emailRules = {
	enabled: true,
	maxLocalPartDots: 3,
	normaliseGmail: true,
	useDefaultPatterns: true,
	customRegexBlocklist: ["^spam.*@", "mailinator\\.com$"],
	maxEmailSubmissionCount: 5,
};
const trafficFilter = {
	vpn: policy,
	proxy: { action: "block" },
	tor: { action: "block" },
	abuser: { action: "challenge", captchaType: "image" },
	abuserScoreThreshold: 0.3,
	datacenter: { action: "challenge", powDifficulty: 8 },
	datacenterNameAllowlist: ["Cloudflare", "x"],
	datacenterNameDenylist: ["iCloud Private Relay"],
	skipExtrasOnValidDnsPath: false,
	mobile: { action: "challenge" },
	satellite: { action: "challenge" },
	crawler: { action: "block" },
};
const fullSettings = {
	captchaType: "puzzle",
	domains: ["example.com", "*.example.org"],
	verifiedTimeout: 60000,
	solutionTimeout: 30000,
	frictionlessThreshold: { frictionlessPuzzleThreshold: 0.4, frictionlessImageThreshold: 1.2 },
	frictionlessTypes: { image: false, puzzle: true, iconOrder: false },
	captchaTypeFeatureFlags: { puzzle: true, iconOrder: true, audio: false },
	widgetFeatureFlags: { puzzleImageSwitch: true },
	powDifficulty: 5,
	imageThreshold: 0.7,
	imageMaxRounds: 6,
	imageMinRounds: 3,
	autoBanScoreThreshold: 2.5,
	puzzleTolerance: 25,
	puzzleMaxDifficulty: 2,
	puzzle,
	audio,
	audioAccessibilityEnabled: true,
	iconOrderTolerance: 2,
	iconOrder,
	ipValidationRules,
	disallowWebView: true,
	spamEmailDomainCheckEnabled: true,
	spamFilter: { enabled: true, emailRules },
	trafficFilter,
	storeMetadata: true,
	honeypot: { enabled: true, question: "What is 2+2?", encodingType: "semaphore" },
	allowAgents: true,
	assetOrigin: "https://assets.example.com",
	clientUrl: "/procaptcha",
};

const URLS: Json[] = [
	"https://assets.example.com",
	"http://localhost:9230",
	"https://例え.jp",
	"ftp://x",
	"mailto:a@b.co",
	"//no-scheme",
	"/relative",
	"not a url",
	"https://",
	"https://exa mple.com",
	"http://[::1]:80/",
	"http://256.256.256.256",
	"javascript:alert(1)",
	"data:,x",
	"",
];

const CLIENT_URLS: Json[] = ["/procaptcha", "//cdn.example.com", "/", "", "procaptcha", "https://x/"];

const SCHEMAS: [string, ZodTypeAny, Json[]][] = [
	[
		"clientSettings",
		settings.ClientSettingsSchema,
		[
			{ domains: ["a"] },
			{ domains: [] },
			{ domains: ["a"], frictionlessThreshold: 0.7 },
			{ domains: ["a"], frictionlessThreshold: 1.5 },
			{ domains: ["a"], frictionlessThreshold: { frictionlessImageThreshold: 0.2 } },
			{ domains: ["a"], imageMinRounds: 40 },
			{ domains: ["a"], imageMinRounds: 40, imageMaxRounds: 1 },
			{ domains: ["a"], captchaType: "audio" },
			{ domains: ["a"], captchaType: "frictionless" },
			...objectVariants(fullSettings),
			...URLS.map((assetOrigin) => ({ domains: ["a"], assetOrigin })),
			...CLIENT_URLS.map((clientUrl) => ({ domains: ["a"], clientUrl })),
			...numberBounds(1000, 600000, true).map((verifiedTimeout) => ({ domains: ["a"], verifiedTimeout })),
			...numberBounds(1, 10, false).map((powDifficulty) => ({ domains: ["a"], powDifficulty })),
			...numberBounds(5, 1000, true).map((puzzleTolerance) => ({ domains: ["a"], puzzleTolerance })),
			...numberBounds(0, 4, true).map((puzzleMaxDifficulty) => ({ domains: ["a"], puzzleMaxDifficulty })),
		],
	],
	[
		"frictionlessThreshold",
		settings.FrictionlessThresholdSchema,
		[0, 0.5, 1, 1.5, -0.1, { frictionlessPuzzleThreshold: 0.9 }, { frictionlessPuzzleThreshold: 0.9, frictionlessImageThreshold: 0.8 }, { frictionlessImageThreshold: 3 }, { frictionlessPuzzleThreshold: "0.2" }],
	],
	["frictionlessTypes", settings.FrictionlessTypesSchema, objectVariants({ image: false, puzzle: false, iconOrder: true })],
	["captchaTypeFeatureFlags", settings.CaptchaTypeFeatureFlagsSchema, objectVariants({ puzzle: false, iconOrder: true, audio: true })],
	["widgetFeatureFlags", settings.WidgetFeatureFlagsSchema, objectVariants({ puzzleImageSwitch: true })],
	["audioSettings", settings.AudioSettingsSchema, [...objectVariants(audio), ...numberBounds(3, 8, true).map((digitCount) => ({ digitCount }))]],
	["puzzlePieceScale", settings.PuzzlePieceScaleSchema, [...objectVariants({ min: 0.2, max: 0.4 }), { min: 0.5, max: 0.4 }, { min: 0.9 }, { max: 0.1 }, ...numberBounds(0.05, 0.95, false).map((min) => ({ min }))]],
	["puzzleSettings", settings.PuzzleSettingsSchema, [...objectVariants(puzzle), ...numberBounds(-20, 20, true).map((decoyBodyBrightness) => ({ decoyBodyBrightness }))]],
	[
		"iconOrderSettings",
		settings.IconOrderSettingsSchema,
		[...objectVariants(iconOrder), { targetCount: 6, decoyCount: 4 }, { targetCount: 6, decoyCount: 5 }, { targetCount: 6 }, { decoyCount: 8 }, { targetCount: 2, decoyCount: 8 }, ...numberBounds(0.1, 12, false).map((strokeWidth) => ({ strokeWidth }))],
	],
	["ipValidationRules", settings.IPValidationRulesSchema, [...objectVariants(ipValidationRules), { actions: {} }, { actions: { countryChangeAction: "nope" } }, { actions: {}, countryOverrides: { GB: { actions: { cityChangeAction: "maybe" } } } }]],
	[
		"emailSpamRules",
		settings.EmailSpamRulesSchema,
		[...objectVariants(emailRules), { customRegexBlocklist: ["(?=x)", "(", "{1234}", "a".repeat(257)] }, { customRegexBlocklist: Array.from({ length: 51 }, () => "a") }],
	],
	["spamFilterRules", settings.SpamFilterRulesSchema, objectVariants({ enabled: true, emailRules })],
	["trafficCategoryPolicy", settings.TrafficCategoryPolicySchema, [...objectVariants(policy), ...numberBounds(0, 5 * 1024 * 1024, true).map((padBytes) => ({ action: "block", padBytes }))]],
	["trafficFilter", settings.TrafficFilterSchema, [...objectVariants(trafficFilter), { datacenterNameAllowlist: [""] }, { datacenterNameAllowlist: ["x".repeat(129)] }, { datacenterNameDenylist: Array.from({ length: 51 }, () => "x") }]],
	["honeypotSettings", settings.HoneypotSettingsSchema, objectVariants({ enabled: true, question: "q", encodingType: "morse" })],
	[
		"routingMachineOutput",
		RoutingMachineOutputSchema,
		[
			...objectVariants({ captchaType: "puzzle", solvedImagesCount: 3, powDifficulty: 4.5, reason: "r", puzzleTolerance: 20, puzzle, iconOrderTolerance: 1, iconOrder }),
			{ captchaType: "image" },
			{ captchaType: "frictionless" },
			{ captchaType: "image", solvedImagesCount: 0 },
			{ captchaType: "image", solvedImagesCount: 1.5 },
			{ captchaType: "pow", powDifficulty: 0 },
			{},
		],
	],
];

const GENERIC: Json[] = [null, true, 0, 1, "", "x", [], {}];

const REGEX_PATTERNS: string[] = [
	"a", "", "(", ")", "[", "]", "{", "}", "a{", "a{1", "a{1,", "a{1,2", "a{2,1}", "a{1}{2}", "x{,5}", "{5}", "{5,}", "a{99999999999}",
	"*", "+a", "?", "a**", "a??", "a+*", "^*", "$+", "\\b*", "(?:a)", "(?=a)", "(?!a)", "(?<=a)", "(?<!a)", "(?=a)*", "(?<=a)*",
	"(?<n>a)\\k<n>", "\\k<n>", "\\k", "(?<n>a)\\k", "(?<n>a)(?<n>b)", "(?<n>a)|(?<n>b)", "(?<a-b>x)", "(?<😀>a)", "(?<$>a)", "(?<_a1>a)", "(?<1a>a)", "(?<>a)",
	"\\1", "(a)\\1", "(a)\\2", "\\8", "\\9", "\\0", "\\00", "\\07", "\\377", "\\400", "[\\1]", "[\\8]",
	"\\c", "\\cA", "\\ca", "\\c1", "\\c_", "[\\c1]", "[\\c_]", "[\\c]",
	"\\x", "\\x1", "\\xZZ", "\\x41", "\\u", "\\u12", "\\u004", "\\u0041", "\\u{1F600}", "\\u{110000}",
	"\\p{L}", "\\P{L}", "\\p", "\\p{", "\\q", "\\e", "\\Z", "\\A", "\\-", "\\/", "/", "\\", "a\\", "[\\q]", "[\\-]",
	"[a-z]", "[z-a]", "[\\d-z]", "[a-\\d]", "[\\w-\\d]", "[]", "[^]", "[a", "a]", "[[]", "[]]", "[\\]]", "[\\b]", "[--]", "[a-]",
	"\\b", "\\B", ".*", ".+?", "a|", "|", "||", "((a)", "(a))", "(?", "(?:", "(?P<n>a)", "(?P=n)", "(?i:a)", "(?i)a", "(?-i:a)", "(?im-s:a)", "(?ii:a)", "(?i-i:a)", "(?x:a)",
	"\\s\\S\\w\\W\\d\\D", "^.*@mailinator\\.com$", ".+\\+.+@", "^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$", "(a+)+$", "(?:a|b)*c", "^\\d{3}-\\d{4}$",
	"\u0000", "\n", "😀+", "[😀-😂]", "[\\u{1F600}-\\u{1F602}]", "\\uD83D\\uDE00", "[\\uD83D\\uDE00]",
];

const USER_AGENTS: string[] = [
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
	"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
	"Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Linux; Android 11; KFTRWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/124.3.1 like Chrome/124.0.6367.219 Safari/537.36",
	"Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML, like Gecko) Version/7.2.1.0 Safari/536.2+",
	"Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+",
	"BlackBerry9700/5.0.0.862 Profile/MIDP-2.1 Configuration/CLDC-1.1 VendorID/331",
	"Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Mobile Safari/537.36 Edge/15.14977",
	"Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 920)",
	"Opera/9.80 (J2ME/MIDP; Opera Mini/9.80 (S60; SymbOS; Opera Mobi/23.348; U; en) Presto/2.5.25 Version/10.54",
	"Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0",
	"Mozilla/5.0 (Android 14; Tablet; rv:125.0) Gecko/125.0 Firefox/125.0",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.207 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
	"Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
	"curl/8.6.0",
	"Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 [FBAN/EMA;FBLC/en_US;FBAV/400.0.0.10.111;]",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0",
	"",
	"ANDROID",
	"android mobile",
	"Android Mobile",
	"Androidx",
	"XAndroid",
	"Android\nMobile",
	"Android Mobile",
	"Android Mobilex",
	"Android xMobile",
	"IPAD",
	"ipad",
	"İPAD",
	"ıpad",
	"MOBİLE",
	"MobIle",
	"Mobility",
	"Mobi",
	"Mobi;",
	"SILK/1.0",
	"ſilk",
	"Tablet PC",
	"TabletPC",
	"WINDOWS PHONE",
	"Windows  Phone",
	"BB10",
	"bb10",
	"OPERA MINI",
	"iPhone",
	"iPhoneX",
	"_iPhone",
	"é iPad é",
	"Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
	"Mozilla/5.0 (Linux; Android 9; SHIELD Android TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

const NUMERIC_REQUESTS: Json[] = [0, 1, 1.5, 2.5, -2.5, 0.49999999999999994, -0.5, 3, 31.5, 32.4999, 40, -7, 1e300, "NaN", "Infinity", "-Infinity"];

const asNumber = (value: Json): number =>
	value === "NaN" ? Number.NaN : value === "Infinity" ? Number.POSITIVE_INFINITY : value === "-Infinity" ? Number.NEGATIVE_INFINITY : (value as number);

const BOUNDS: settings.ImageRoundsBounds[] = [{}, { imageMinRounds: 3 }, { imageMaxRounds: 5 }, { imageMinRounds: 10, imageMaxRounds: 4 }, { imageMinRounds: 1, imageMaxRounds: 2 }, { imageMinRounds: -10, imageMaxRounds: 10 }];

const FLAG_SETS: (Json | undefined)[] = [undefined, null, {}, { puzzle: false }, { iconOrder: true }, { audio: true, puzzle: true, iconOrder: false }];
const TYPE_SETS: (Json | undefined)[] = [undefined, null, {}, { image: false }, { puzzle: false, iconOrder: false }, { image: true, puzzle: true, iconOrder: true }];
const THRESHOLDS: (Json | undefined)[] = [undefined, null, 0.3, 0, 1.4, {}, { frictionlessPuzzleThreshold: 0.7 }, { frictionlessImageThreshold: 0.2 }, { frictionlessPuzzleThreshold: 0.6, frictionlessImageThreshold: 0.4 }, { frictionlessPuzzleThreshold: 0.2, frictionlessImageThreshold: 2 }];

const schemaVectors: { schema: string; input: Input; result: Result }[] = [];
for (const [name, schema, specific] of SCHEMAS) {
	for (const input of [{}, ...[...GENERIC, ...specific].map((value: Json): Input => ({ value }))] as Input[]) {
		schemaVectors.push({ schema: name, input, result: result(schema, input) });
	}
}

const REGEX_TOKENS: string[] = [
	"a", "b", "(", ")", "[", "]", "[^", "{", "}", "{2}", "{2,1}", "{1,}", "{1,3}", ",", "*", "+", "?", "|", "^", "$", ".", "-",
	"\\", "\\b", "\\B", "\\d", "\\w", "\\k", "\\k<n>", "\\k<m>", "(?<n>", "(?<m>", "(?<n", "(?:", "(?=", "(?!", "(?<=", "(?<!",
	"(?i:", "(?-m:", "(?is-m:", "(?ii:", "(?-:", "(?", "\\c", "\\cA", "\\c1", "\\c_", "\\x4", "\\x41", "\\u004", "\\u0041",
	"\\u{41}", "\\1", "\\2", "\\8", "\\0", "\\07", "😀", "\\uD83D", "\\uDE00", "0", "9", "z", "\\-", "\\]", "\\p{L}",
];

const regexRandom = ((seed: number) => () => {
	seed = (seed * 1103515245 + 12345) % 2147483648;
	return seed / 2147483648;
})(424242);

const regexFuzz: [string, boolean][] = [];
for (let i = 0; i < 6000; i++) {
	const length = 1 + Math.floor(regexRandom() * 8);
	let pattern = "";
	for (let t = 0; t < length; t++) {
		pattern += REGEX_TOKENS[Math.floor(regexRandom() * REGEX_TOKENS.length)];
	}
	let valid = true;
	try {
		new RegExp(pattern, "i");
	} catch {
		valid = false;
	}
	regexFuzz.push([pattern, valid]);
}

const vectors = {
	regexFuzz,
	schemas: SCHEMAS.map(([name]) => name),
	schemaVectors,
	regexValidity: REGEX_PATTERNS.map((pattern: string) => {
		let valid = true;
		try {
			new RegExp(pattern, "i");
		} catch {
			valid = false;
		}
		return { pattern, valid };
	}),
	userAgents: USER_AGENTS.map((userAgent: string) => ({
		userAgent,
		deviceType: settings.deviceTypeFromUserAgent(userAgent),
		browser: settings.contextTypeFromSession(userAgent, false),
		webview: settings.contextTypeFromSession(userAgent, true),
	})),
	undefinedUserAgent: settings.deviceTypeFromUserAgent(undefined),
	frictionlessTypes: TYPE_SETS.map((configured) => ({
		configured: configured ?? "undefined",
		resolved: settings.resolveFrictionlessTypes(configured as settings.IFrictionlessTypes | undefined),
	})),
	featureEnabled: Object.values(CaptchaType).flatMap((captchaType) =>
		FLAG_SETS.map((flags) => ({
			captchaType,
			flags: flags ?? "undefined",
			enabled: settings.isCaptchaTypeFeatureEnabled(captchaType, flags as settings.ICaptchaTypeFeatureFlags | undefined),
		})),
	),
	allowedTypes: TYPE_SETS.flatMap((frictionlessTypes) =>
		FLAG_SETS.map((captchaTypeFeatureFlags) => {
			const configured = { frictionlessTypes, captchaTypeFeatureFlags } as Parameters<typeof settings.resolveAllowedCaptchaTypes>[0];
			return {
				settings: JSON.parse(JSON.stringify(configured)) as Json,
				resolved: settings.resolveAllowedCaptchaTypes(configured),
			};
		}),
	),
	widgetFeature: [undefined, null, {}, { puzzleImageSwitch: true }, { puzzleImageSwitch: false }].map((flags) => ({
		flags: flags ?? "undefined",
		enabled: settings.isWidgetFeatureEnabled("puzzleImageSwitch", flags as settings.IWidgetFeatureFlags | undefined),
	})),
	thresholds: THRESHOLDS.map((configured) => ({
		configured: configured ?? "undefined",
		resolved: settings.resolveFrictionlessThreshold(configured as settings.IFrictionlessThreshold | undefined),
	})),
	imageRounds: BOUNDS.flatMap((bounds) =>
		NUMERIC_REQUESTS.map((requested) => ({
			bounds,
			requested,
			resolved: settings.resolveImageRoundsBounds(bounds),
			clamped: settings.clampImageRounds(asNumber(requested), bounds),
		})),
	),
	defaults: Object.fromEntries(
		Object.entries(settings).filter(([, value]) => typeof value === "number" || typeof value === "string" || typeof value === "boolean"),
	),
	objectDefaults: {
		frictionlessThresholdDefault: settings.frictionlessThresholdDefault,
		frictionlessTypesDefault: settings.frictionlessTypesDefault,
		captchaTypeFeatureFlagDefaults: settings.captchaTypeFeatureFlagDefaults,
		widgetFeatureFlagDefaults: settings.widgetFeatureFlagDefaults,
		deviceContextTypes: settings.deviceContextTypes,
		domainsDefault: settings.domainsDefault,
	},
	enums: Object.fromEntries(
		Object.entries({
			IPValidationAction: settings.IPValidationAction,
			DeviceType: settings.DeviceType,
			ContextType: settings.ContextType,
			TrafficFilterAction: settings.TrafficFilterAction,
			EncodingType: settings.EncodingType,
		}).map(([name, values]) => [name, Object.entries(values)]),
	),
};

const output = fileURLToPath(new URL("./settings-vectors.json", import.meta.url));
writeFileSync(output, `${JSON.stringify(vectors, null, "\t")}\n`);
process.stdout.write(`wrote ${schemaVectors.length} settings schema vectors\n`);
