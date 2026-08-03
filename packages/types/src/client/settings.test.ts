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
	distanceThresholdKmDefault,
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
	it("blocks abusers by default and nothing else", () => {
		const filter = TrafficFilterSchema.parse({});
		expect(filter.blockAbuser).toBe(true);
		expect(filter.blockVpn).toBe(false);
		expect(filter.blockProxy).toBe(false);
		expect(filter.blockTor).toBe(false);
		expect(filter.blockDatacenter).toBe(false);
		expect(filter.blockMobile).toBe(false);
		expect(filter.blockSatellite).toBe(false);
		expect(filter.blockCrawler).toBe(false);
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
