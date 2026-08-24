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
import { describe, expect, it } from "vitest";
import type { output } from "zod";
import {
	DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
	DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
} from "../config/timeouts.js";
import { CaptchaType } from "./captchaType/captchaType.js";
import {
	ClientSettingsSchema,
	ContextConfigSchema,
	ContextType,
	DeviceType,
	EmailSpamRulesSchema,
	EncodingType,
	HoneypotSettingsSchema,
	IPValidationAction,
	IPValidationRulesSchema,
	SpamFilterRulesSchema,
	TrafficFilterSchema,
	abuseScoreThresholdDefault,
	captchaTypeDefault,
	contextAwareThresholdDefault,
	contextTypeFor,
	deviceContextTypes,
	deviceTypeFromUserAgent,
	distanceThresholdKmDefault,
	expandContexts,
	frictionlessThresholdDefault,
	honeypotEncodingTypeDefault,
	imageMaxRoundsDefault,
	imageThresholdDefault,
	powDifficultyDefault,
	puzzleToleranceDefault,
	trafficFilterAbuserScoreThresholdDefault,
} from "./settings.js";

type Settings = output<typeof ClientSettingsSchema>;

const parse = (input: unknown): Settings => ClientSettingsSchema.parse(input);

const minimal = { domains: ["example.com"] };

describe("ClientSettingsSchema", () => {
	it("requires at least one domain", () => {
		expect(ClientSettingsSchema.safeParse({ domains: [] }).success).toBe(false);
		expect(ClientSettingsSchema.safeParse({}).success).toBe(false);
	});

	it("fills in every default from a bare domain list", () => {
		const settings = parse(minimal);
		expect(settings.captchaType).toBe(captchaTypeDefault);
		expect(settings.verifiedTimeout).toBe(DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT);
		expect(settings.solutionTimeout).toBe(DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT);
		expect(settings.frictionlessThreshold).toBe(frictionlessThresholdDefault);
		expect(settings.powDifficulty).toBe(powDifficultyDefault);
		expect(settings.imageThreshold).toBe(imageThresholdDefault);
		expect(settings.imageMaxRounds).toBe(imageMaxRoundsDefault);
		expect(settings.puzzleTolerance).toBe(puzzleToleranceDefault);
		expect(settings.disallowWebView).toBe(false);
	});

	it("defaults the captcha type to frictionless", () => {
		expect(captchaTypeDefault).toBe(CaptchaType.frictionless);
	});

	it("leaves the optional sub-settings absent rather than defaulted", () => {
		const settings = parse(minimal);
		expect(settings.ipValidationRules).toBeUndefined();
		expect(settings.trafficFilter).toBeUndefined();
		expect(settings.spamFilter).toBeUndefined();
		expect(settings.honeypot).toBeUndefined();
		expect(settings.autoBanScoreThreshold).toBeUndefined();
		expect(settings.storeMetadata).toBeUndefined();
	});

	it("accepts every captcha type", () => {
		for (const captchaType of Object.values(CaptchaType)) {
			expect(parse({ ...minimal, captchaType }).captchaType).toBe(captchaType);
		}
	});

	it("rejects an unknown captcha type", () => {
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, captchaType: "nope" })
				.success,
		).toBe(false);
	});

	it.each([
		["verifiedTimeout", 1000, 600000],
		["solutionTimeout", 1000, 600000],
	])("bounds %s to [%i, %i]", (key: string, min: number, max: number) => {
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, [key]: min }).success,
		).toBe(true);
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, [key]: max }).success,
		).toBe(true);
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, [key]: min - 1 }).success,
		).toBe(false);
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, [key]: max + 1 }).success,
		).toBe(false);
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, [key]: min + 0.5 }).success,
		).toBe(false);
	});

	it("bounds frictionlessThreshold to a probability", () => {
		expect(
			parse({ ...minimal, frictionlessThreshold: 0 }).frictionlessThreshold,
		).toBe(0);
		expect(
			parse({ ...minimal, frictionlessThreshold: 1 }).frictionlessThreshold,
		).toBe(1);
		expect(
			ClientSettingsSchema.safeParse({
				...minimal,
				frictionlessThreshold: -0.1,
			}).success,
		).toBe(false);
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, frictionlessThreshold: 1.1 })
				.success,
		).toBe(false);
	});

	it("bounds powDifficulty to [1, 10]", () => {
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, powDifficulty: 1 }).success,
		).toBe(true);
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, powDifficulty: 10 }).success,
		).toBe(true);
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, powDifficulty: 0 }).success,
		).toBe(false);
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, powDifficulty: 11 }).success,
		).toBe(false);
	});

	it("allows a fractional powDifficulty, which the miner interpolates", () => {
		expect(parse({ ...minimal, powDifficulty: 4.5 }).powDifficulty).toBe(4.5);
	});

	it("requires at least two image rounds", () => {
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, imageMaxRounds: 1 }).success,
		).toBe(false);
		expect(parse({ ...minimal, imageMaxRounds: 2 }).imageMaxRounds).toBe(2);
	});

	it("rejects a fractional image round count", () => {
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, imageMaxRounds: 2.5 })
				.success,
		).toBe(false);
	});

	it("bounds puzzleTolerance to [5, 1000]", () => {
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, puzzleTolerance: 4 })
				.success,
		).toBe(false);
		expect(parse({ ...minimal, puzzleTolerance: 5 }).puzzleTolerance).toBe(5);
		expect(parse({ ...minimal, puzzleTolerance: 1000 }).puzzleTolerance).toBe(
			1000,
		);
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, puzzleTolerance: 1001 })
				.success,
		).toBe(false);
	});

	it("allows a zero autoBanScoreThreshold, which bans everything", () => {
		expect(
			parse({ ...minimal, autoBanScoreThreshold: 0 }).autoBanScoreThreshold,
		).toBe(0);
	});

	it("rejects a negative autoBanScoreThreshold", () => {
		expect(
			ClientSettingsSchema.safeParse({ ...minimal, autoBanScoreThreshold: -1 })
				.success,
		).toBe(false);
	});

	it("accepts many domains and does not deduplicate them", () => {
		expect(parse({ domains: ["a.com", "a.com", "b.com"] }).domains).toEqual([
			"a.com",
			"a.com",
			"b.com",
		]);
	});
});

describe("IPValidationRulesSchema", () => {
	it("defaults to disabled with permissive actions", () => {
		const rules = IPValidationRulesSchema.parse({ actions: {} });
		expect(rules.enabled).toBe(false);
		expect(rules.actions.countryChangeAction).toBe(IPValidationAction.Allow);
		expect(rules.actions.cityChangeAction).toBe(IPValidationAction.Allow);
		expect(rules.actions.ispChangeAction).toBe(IPValidationAction.Allow);
	});

	it("rejects a distance or abuse breach by default", () => {
		const rules = IPValidationRulesSchema.parse({ actions: {} });
		expect(rules.actions.distanceExceedAction).toBe(IPValidationAction.Reject);
		expect(rules.actions.abuseScoreExceedAction).toBe(
			IPValidationAction.Reject,
		);
	});

	it("defaults the thresholds and the conjunction flag", () => {
		const rules = IPValidationRulesSchema.parse({ actions: {} });
		expect(rules.distanceThresholdKm).toBe(distanceThresholdKmDefault);
		expect(rules.abuseScoreThreshold).toBe(abuseScoreThresholdDefault);
		expect(rules.requireAllConditions).toBe(false);
		expect(rules.forceConsistentIp).toBe(false);
	});

	it("requires the actions object, even when empty", () => {
		expect(IPValidationRulesSchema.safeParse({}).success).toBe(false);
	});

	it("rejects a non-positive threshold", () => {
		expect(
			IPValidationRulesSchema.safeParse({ actions: {}, distanceThresholdKm: 0 })
				.success,
		).toBe(false);
		expect(
			IPValidationRulesSchema.safeParse({ actions: {}, abuseScoreThreshold: 0 })
				.success,
		).toBe(false);
	});

	it("rejects an unknown action", () => {
		expect(
			IPValidationRulesSchema.safeParse({
				actions: { countryChangeAction: "quarantine" },
			}).success,
		).toBe(false);
	});

	it("accepts per-country overrides, which do not inherit the defaults", () => {
		const rules = IPValidationRulesSchema.parse({
			actions: {},
			countryOverrides: {
				GB: { actions: { countryChangeAction: IPValidationAction.Flag } },
			},
		});
		expect(rules.countryOverrides?.GB?.actions.countryChangeAction).toBe(
			IPValidationAction.Flag,
		);
		// the override schema is deliberately non-recursive, so unset fields
		// stay undefined rather than picking up the top level defaults
		expect(rules.countryOverrides?.GB?.distanceThresholdKm).toBeUndefined();
	});
});

describe("ContextConfigSchema", () => {
	it("defaults the threshold", () => {
		expect(
			ContextConfigSchema.parse({ type: ContextType.Default }).threshold,
		).toBe(contextAwareThresholdDefault);
	});

	it("allows the threshold to move 0.2 either way but no further", () => {
		const low = Number((contextAwareThresholdDefault - 0.2).toFixed(2));
		const high = Number((contextAwareThresholdDefault + 0.2).toFixed(2));
		expect(
			ContextConfigSchema.safeParse({
				type: ContextType.Default,
				threshold: low,
			}).success,
		).toBe(true);
		expect(
			ContextConfigSchema.safeParse({
				type: ContextType.Default,
				threshold: high,
			}).success,
		).toBe(true);
		expect(
			ContextConfigSchema.safeParse({
				type: ContextType.Default,
				threshold: low - 0.01,
			}).success,
		).toBe(false);
		expect(
			ContextConfigSchema.safeParse({
				type: ContextType.Default,
				threshold: high + 0.01,
			}).success,
		).toBe(false);
	});

	it("requires a known context type", () => {
		expect(ContextConfigSchema.safeParse({ type: "native" }).success).toBe(
			false,
		);
		expect(
			ContextConfigSchema.safeParse({ type: ContextType.Webview }).success,
		).toBe(true);
	});
});

describe("deviceTypeFromUserAgent", () => {
	const cases: Array<[string, string, DeviceType]> = [
		[
			"macOS Chrome",
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			DeviceType.Desktop,
		],
		[
			"Windows Firefox",
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
			DeviceType.Desktop,
		],
		[
			"iPhone Safari",
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			DeviceType.Mobile,
		],
		[
			"Android phone Chrome",
			"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
			DeviceType.Mobile,
		],
		[
			// Carries a `Mobile/<build>` token, so it must be matched as a
			// tablet before the phone patterns get a look at it.
			"iPad Safari",
			"Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			DeviceType.Tablet,
		],
		[
			// "Android without Mobile" is the only thing separating this from
			// the phone above.
			"Android tablet Chrome",
			"Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			DeviceType.Tablet,
		],
	];

	for (const [name, userAgent, expected] of cases) {
		it(`classifies ${name} as ${expected}`, () => {
			expect(deviceTypeFromUserAgent(userAgent)).toBe(expected);
		});
	}

	it("falls back to desktop for a missing or unrecognised user agent", () => {
		expect(deviceTypeFromUserAgent(undefined)).toBe(DeviceType.Desktop);
		expect(deviceTypeFromUserAgent("")).toBe(DeviceType.Desktop);
		expect(deviceTypeFromUserAgent("curl/8.4.0")).toBe(DeviceType.Desktop);
	});
});

describe("contextTypeFor", () => {
	it("crosses each device family with the webview flag", () => {
		expect(contextTypeFor(DeviceType.Desktop, false)).toBe(ContextType.Desktop);
		expect(contextTypeFor(DeviceType.Desktop, true)).toBe(
			ContextType.DesktopWebview,
		);
		expect(contextTypeFor(DeviceType.Mobile, false)).toBe(ContextType.Mobile);
		expect(contextTypeFor(DeviceType.Mobile, true)).toBe(
			ContextType.MobileWebview,
		);
		expect(contextTypeFor(DeviceType.Tablet, false)).toBe(ContextType.Tablet);
		expect(contextTypeFor(DeviceType.Tablet, true)).toBe(
			ContextType.TabletWebview,
		);
	});

	it("covers every device context exactly once", () => {
		const produced = Object.values(DeviceType).flatMap((device) => [
			contextTypeFor(device, false),
			contextTypeFor(device, true),
		]);
		expect(new Set(produced)).toEqual(new Set(deviceContextTypes));
		expect(produced).toHaveLength(deviceContextTypes.length);
	});
});

describe("expandContexts", () => {
	const config = (type: ContextType, threshold: number) => ({
		type,
		threshold,
	});

	it("returns nothing for undefined or empty contexts", () => {
		expect(expandContexts(undefined)).toEqual({});
		expect(expandContexts({})).toEqual({});
	});

	it("passes device contexts through untouched", () => {
		const expanded = expandContexts({
			[ContextType.Mobile]: config(ContextType.Mobile, 0.8),
		});

		expect(expanded).toEqual({
			[ContextType.Mobile]: config(ContextType.Mobile, 0.8),
		});
	});

	it("spreads a legacy default across the non-webview families only", () => {
		const expanded = expandContexts({
			[ContextType.Default]: config(ContextType.Default, 0.75),
		});

		expect(Object.keys(expanded).sort()).toEqual(
			[ContextType.Desktop, ContextType.Mobile, ContextType.Tablet].sort(),
		);
		expect(expanded[ContextType.Desktop]?.threshold).toBe(0.75);
	});

	it("spreads a legacy webview across the webview families only", () => {
		const expanded = expandContexts({
			[ContextType.Webview]: config(ContextType.Webview, 0.65),
		});

		expect(Object.keys(expanded).sort()).toEqual(
			[
				ContextType.DesktopWebview,
				ContextType.MobileWebview,
				ContextType.TabletWebview,
			].sort(),
		);
		expect(expanded[ContextType.MobileWebview]?.threshold).toBe(0.65);
	});

	it("lets an explicit device context override the legacy entry covering it", () => {
		const expanded = expandContexts({
			[ContextType.Default]: config(ContextType.Default, 0.75),
			[ContextType.Mobile]: config(ContextType.Mobile, 0.6),
		});

		expect(expanded[ContextType.Mobile]?.threshold).toBe(0.6);
		expect(expanded[ContextType.Desktop]?.threshold).toBe(0.75);
		expect(expanded[ContextType.Tablet]?.threshold).toBe(0.75);
	});

	it("never emits a legacy key", () => {
		const expanded = expandContexts({
			[ContextType.Default]: config(ContextType.Default, 0.75),
			[ContextType.Webview]: config(ContextType.Webview, 0.65),
		});

		expect(expanded).not.toHaveProperty(ContextType.Default);
		expect(expanded).not.toHaveProperty(ContextType.Webview);
		expect(Object.keys(expanded)).toHaveLength(deviceContextTypes.length);
	});
});

describe("ContextsSchema round-trip", () => {
	it("accepts a legacy contexts map so stored settings keep parsing", () => {
		const parsed = ClientSettingsSchema.safeParse({
			...minimal,
			contextAware: {
				enabled: true,
				contexts: {
					[ContextType.Default]: { type: ContextType.Default, threshold: 0.7 },
					[ContextType.Webview]: { type: ContextType.Webview, threshold: 0.7 },
				},
			},
		});
		expect(parsed.success).toBe(true);
	});

	it("accepts a device contexts map", () => {
		const parsed = ClientSettingsSchema.safeParse({
			...minimal,
			contextAware: {
				enabled: true,
				contexts: {
					[ContextType.MobileWebview]: {
						type: ContextType.MobileWebview,
						threshold: 0.7,
					},
				},
			},
		});
		expect(parsed.success).toBe(true);
	});

	it("rejects a context key that is not a known context type", () => {
		const parsed = ClientSettingsSchema.safeParse({
			...minimal,
			contextAware: {
				enabled: true,
				contexts: { smartfridge: { type: "smartfridge", threshold: 0.7 } },
			},
		});
		expect(parsed.success).toBe(false);
	});
});

describe("EmailSpamRulesSchema", () => {
	it("is off by default with an empty blocklist", () => {
		const rules = EmailSpamRulesSchema.parse({});
		expect(rules.enabled).toBe(false);
		expect(rules.normaliseGmail).toBe(false);
		expect(rules.useDefaultPatterns).toBe(false);
		expect(rules.customRegexBlocklist).toEqual([]);
	});

	it("allows zero local part dots", () => {
		expect(
			EmailSpamRulesSchema.parse({ maxLocalPartDots: 0 }).maxLocalPartDots,
		).toBe(0);
	});

	it("rejects a negative or fractional dot count", () => {
		expect(
			EmailSpamRulesSchema.safeParse({ maxLocalPartDots: -1 }).success,
		).toBe(false);
		expect(
			EmailSpamRulesSchema.safeParse({ maxLocalPartDots: 1.5 }).success,
		).toBe(false);
	});

	it("accepts a simple pattern", () => {
		expect(
			EmailSpamRulesSchema.safeParse({ customRegexBlocklist: ["^spam"] })
				.success,
		).toBe(true);
	});

	it("rejects a syntactically invalid pattern", () => {
		expect(
			EmailSpamRulesSchema.safeParse({ customRegexBlocklist: ["("] }).success,
		).toBe(false);
	});

	it.each([
		["a lookahead", "(?=evil)"],
		["a lookbehind", "(?<=evil)"],
		["a negative lookahead", "(?!evil)"],
		["a large quantifier", "a{1000}"],
	])("rejects %s, which can hang the matcher", (_n: string, value: string) => {
		expect(
			EmailSpamRulesSchema.safeParse({ customRegexBlocklist: [value] }).success,
		).toBe(false);
	});

	it("caps the pattern length", () => {
		expect(
			EmailSpamRulesSchema.safeParse({
				customRegexBlocklist: ["a".repeat(257)],
			}).success,
		).toBe(false);
		expect(
			EmailSpamRulesSchema.safeParse({
				customRegexBlocklist: ["a".repeat(256)],
			}).success,
		).toBe(true);
	});

	it("caps the number of patterns", () => {
		expect(
			EmailSpamRulesSchema.safeParse({
				customRegexBlocklist: new Array(51).fill("a"),
			}).success,
		).toBe(false);
		expect(
			EmailSpamRulesSchema.safeParse({
				customRegexBlocklist: new Array(50).fill("a"),
			}).success,
		).toBe(true);
	});
});

describe("SpamFilterRulesSchema", () => {
	it("is off by default with no email rules", () => {
		const rules = SpamFilterRulesSchema.parse({});
		expect(rules.enabled).toBe(false);
		expect(rules.emailRules).toBeUndefined();
	});

	it("defaults the nested email rules once they are present", () => {
		const rules = SpamFilterRulesSchema.parse({
			enabled: true,
			emailRules: {},
		});
		expect(rules.emailRules?.enabled).toBe(false);
	});
});

describe("TrafficFilterSchema", () => {
	it("leaves every category unconfigured by default (submit-time abuser default is applied by resolveTrafficFilterCheck)", () => {
		const filter = TrafficFilterSchema.parse({});
		expect(filter.vpn).toBeUndefined();
		expect(filter.proxy).toBeUndefined();
		expect(filter.tor).toBeUndefined();
		expect(filter.abuser).toBeUndefined();
		expect(filter.datacenter).toBeUndefined();
		expect(filter.mobile).toBeUndefined();
		expect(filter.satellite).toBeUndefined();
		expect(filter.crawler).toBeUndefined();
	});

	it("skips the extras check on a validated dns path by default", () => {
		// otherwise every user on a public DoH resolver trips the rule
		expect(TrafficFilterSchema.parse({}).skipExtrasOnValidDnsPath).toBe(true);
	});

	it("defaults the abuser score threshold", () => {
		expect(TrafficFilterSchema.parse({}).abuserScoreThreshold).toBe(
			trafficFilterAbuserScoreThresholdDefault,
		);
	});

	it("bounds the abuser score threshold to a probability", () => {
		expect(
			TrafficFilterSchema.safeParse({ abuserScoreThreshold: 0 }).success,
		).toBe(true);
		expect(
			TrafficFilterSchema.safeParse({ abuserScoreThreshold: 1 }).success,
		).toBe(true);
		expect(
			TrafficFilterSchema.safeParse({ abuserScoreThreshold: 1.01 }).success,
		).toBe(false);
	});

	it("leaves the allow and deny lists absent by default", () => {
		const filter = TrafficFilterSchema.parse({});
		expect(filter.datacenterNameAllowlist).toBeUndefined();
		expect(filter.datacenterNameDenylist).toBeUndefined();
	});

	it.each(["datacenterNameAllowlist", "datacenterNameDenylist"])(
		"rejects an empty or overlong entry in %s",
		(key: string) => {
			expect(TrafficFilterSchema.safeParse({ [key]: [""] }).success).toBe(
				false,
			);
			expect(
				TrafficFilterSchema.safeParse({ [key]: ["a".repeat(129)] }).success,
			).toBe(false);
			expect(
				TrafficFilterSchema.safeParse({ [key]: new Array(51).fill("a") })
					.success,
			).toBe(false);
			expect(TrafficFilterSchema.safeParse({ [key]: [] }).success).toBe(true);
		},
	);
});

describe("HoneypotSettingsSchema", () => {
	it("is off by default and encodes with morse", () => {
		const honeypot = HoneypotSettingsSchema.parse({});
		expect(honeypot.enabled).toBe(false);
		expect(honeypot.encodingType).toBe(honeypotEncodingTypeDefault);
		expect(honeypotEncodingTypeDefault).toBe(EncodingType.morse);
		expect(honeypot.question).toBeUndefined();
	});

	it("accepts every encoding", () => {
		for (const encodingType of Object.values(EncodingType)) {
			expect(HoneypotSettingsSchema.parse({ encodingType }).encodingType).toBe(
				encodingType,
			);
		}
	});

	it("rejects an unknown encoding", () => {
		expect(
			HoneypotSettingsSchema.safeParse({ encodingType: "rot13" }).success,
		).toBe(false);
	});
});
