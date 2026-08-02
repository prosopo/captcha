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

import {
	CaptchaType,
	ContextType,
	DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
	DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
	abuseScoreThresholdDefault,
	captchaTypeDefault,
	distanceThresholdKmDefault,
	frictionlessThresholdDefault,
	imageMaxRoundsDefault,
	imageThresholdDefault,
	powDifficultyDefault,
	requireAllConditionsDefault,
} from "@prosopo/types";
import mongoose from "mongoose";
import { describe, expect, test } from "vitest";
import {
	AccountSchema,
	IPValidationRulesSchema,
	UserDataSchema,
	UserSettingsSchema,
} from "../types/client.js";

// Mongoose only applies defaults and validators through a model, and models
// are global to the connection, so each schema is registered once here under a
// name no production code uses.
const settings = mongoose.model("test-user-settings", UserSettingsSchema);
const ipRules = mongoose.model("test-ip-rules", IPValidationRulesSchema);
const userData = mongoose.model("test-user-data", UserDataSchema);
const account = mongoose.model("test-account", AccountSchema);

type SettingsDoc = ReturnType<typeof settings.prototype.toObject>;

const defaults = (): SettingsDoc => new settings({}).toObject();

describe("what a client gets when it sets nothing", () => {
	test("is served the default captcha type", () => {
		expect(defaults().captchaType).toBe(captchaTypeDefault);
	});

	test("inherits the shared proof-of-work timeouts", () => {
		// These are the only place the stored value can come from, so a drift
		// from the shared constant silently changes how long a token lives.
		const doc = defaults();
		expect(doc.verifiedTimeout).toBe(DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT);
		expect(doc.solutionTimeout).toBe(DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT);
	});

	test("inherits the shared difficulty and thresholds", () => {
		const doc = defaults();
		expect(doc.powDifficulty).toBe(powDifficultyDefault);
		expect(doc.frictionlessThreshold).toBe(frictionlessThresholdDefault);
		expect(doc.imageThreshold).toBe(imageThresholdDefault);
		expect(doc.imageMaxRounds).toBe(imageMaxRoundsDefault);
	});

	test("has no domain allowlist entries of its own", () => {
		expect(defaults().domains).toEqual([]);
	});

	test("has no puzzle tolerance, so the caller must decide", () => {
		expect(defaults().puzzleTolerance).toBeUndefined();
	});
});

describe("the protections a client has to opt into", () => {
	test("web views are allowed until they are disallowed", () => {
		expect(defaults().disallowWebView).toBe(false);
	});

	test("context awareness is off but pre-populated", () => {
		// The contexts map is defaulted even while disabled so that enabling it
		// does not also require sending thresholds.
		const doc = defaults();
		expect(doc.contextAware.enabled).toBe(false);
		expect(doc.contextAware.contexts[ContextType.Default].type).toBe(
			ContextType.Default,
		);
		expect(doc.contextAware.contexts[ContextType.Webview].type).toBe(
			ContextType.Webview,
		);
	});

	test("spam email domain checking is off", () => {
		expect(defaults().spamEmailDomainCheckEnabled).toBe(false);
	});

	test("the spam filter and its email rules are both off", () => {
		const doc = defaults();
		expect(doc.spamFilter.enabled).toBe(false);
		expect(doc.spamFilter.emailRules.enabled).toBe(false);
		expect(doc.spamFilter.emailRules.normaliseGmail).toBe(false);
		expect(doc.spamFilter.emailRules.useDefaultPatterns).toBe(false);
		expect(doc.spamFilter.emailRules.customRegexBlocklist).toEqual([]);
	});

	test("metadata is not stored", () => {
		expect(defaults().storeMetadata).toBe(false);
	});

	test("the honeypot is off and encodes as morse when enabled", () => {
		const doc = defaults();
		expect(doc.honeypot.enabled).toBe(false);
		expect(doc.honeypot.encodingType).toBe("morse");
	});

	test("rejects an encoding the widget cannot render", () => {
		const doc = new settings({ honeypot: { encodingType: "braille" } });
		expect(doc.validateSync()?.errors["honeypot.encodingType"]).toBeDefined();
	});

	test("rejects a captcha type that is not one of the known ones", () => {
		expect(
			new settings({ captchaType: "sudoku" }).validateSync()?.errors
				.captchaType,
		).toBeDefined();
	});

	test("accepts every captcha type the shared enum defines", () => {
		for (const type of Object.values(CaptchaType)) {
			expect(
				new settings({ captchaType: type }).validateSync(),
			).toBeUndefined();
		}
	});
});

describe("the traffic filter defaults", () => {
	test("blocks known abusers and nothing else", () => {
		// Abusers are the one category with a low enough false-positive rate to
		// be on for everybody; the rest would lock out legitimate users.
		const filter = defaults().trafficFilter;
		expect(filter.blockAbuser).toBe(true);
		expect(filter.blockVpn).toBe(false);
		expect(filter.blockProxy).toBe(false);
		expect(filter.blockTor).toBe(false);
		expect(filter.blockDatacenter).toBe(false);
		expect(filter.blockMobile).toBe(false);
		expect(filter.blockSatellite).toBe(false);
		expect(filter.blockCrawler).toBe(false);
	});

	test("starts the abuser score at zero, so any score counts", () => {
		expect(defaults().trafficFilter.abuserScoreThreshold).toBe(0);
	});

	test("skips the extra checks once DNS has already vouched for the client", () => {
		expect(defaults().trafficFilter.skipExtrasOnValidDnsPath).toBe(true);
	});

	test("keeps the abuser score inside the zero-to-one range it is scored on", () => {
		expect(
			new settings({
				trafficFilter: { abuserScoreThreshold: 1.5 },
			}).validateSync()?.errors["trafficFilter.abuserScoreThreshold"],
		).toBeDefined();
		expect(
			new settings({
				trafficFilter: { abuserScoreThreshold: -0.1 },
			}).validateSync()?.errors["trafficFilter.abuserScoreThreshold"],
		).toBeDefined();
		expect(
			new settings({
				trafficFilter: { abuserScoreThreshold: 1 },
			}).validateSync(),
		).toBeUndefined();
	});

	test("starts the datacenter allow and deny lists empty", () => {
		// Empty rather than absent, so a caller can push a name without first
		// having to create the array.
		const filter = defaults().trafficFilter;
		expect(filter.datacenterNameAllowlist).toEqual([]);
		expect(filter.datacenterNameDenylist).toEqual([]);
	});
});

describe("the ip validation rules", () => {
	test("are off until switched on", () => {
		expect(new ipRules({}).toObject().enabled).toBe(false);
	});

	test("carry the shared defaults for every action", () => {
		const doc = new ipRules({}).toObject();
		expect(doc.distanceThresholdKm).toBe(distanceThresholdKmDefault);
		expect(doc.abuseScoreThreshold).toBe(abuseScoreThresholdDefault);
		expect(doc.requireAllConditions).toBe(requireAllConditionsDefault);
	});

	test("do not force a consistent ip by default", () => {
		// Mobile clients change IP mid-session routinely.
		expect(new ipRules({}).toObject().forceConsistentIp).toBe(false);
	});

	test("have no country overrides at all, rather than an empty map", () => {
		// An empty map and "no overrides" have to stay distinguishable, because
		// the read path treats a present map as an intentional override set.
		expect(new ipRules({}).toObject().countryOverrides).toBeUndefined();
	});

	test("reject negative distances and abuse scores", () => {
		expect(
			new ipRules({ distanceThresholdKm: -1 }).validateSync()?.errors
				.distanceThresholdKm,
		).toBeDefined();
		expect(
			new ipRules({ abuseScoreThreshold: -1 }).validateSync()?.errors
				.abuseScoreThreshold,
		).toBeDefined();
	});

	test("accept a per-country override of the global thresholds", () => {
		const doc = new ipRules({
			countryOverrides: { GB: { distanceThresholdKm: 5 } },
		});
		expect(doc.validateSync()).toBeUndefined();
		expect(
			doc.toObject().countryOverrides?.get("GB")?.distanceThresholdKm,
		).toBe(5);
	});

	test("are attached to a client's settings", () => {
		const doc = new settings({ ipValidationRules: { enabled: true } });
		expect(doc.toObject().ipValidationRules?.enabled).toBe(true);
	});
});

describe("user and account records", () => {
	test("a user may exist before it has any settings", () => {
		// Signup writes the user first; settings arrive with the first site.
		const doc = new userData({ email: "a@b.com", account: "acc" });
		expect(doc.validateSync()).toBeUndefined();
		expect(doc.toObject().settings).toBeUndefined();
	});

	test("a user's settings are defaulted once the object exists", () => {
		const doc = new userData({ account: "acc", settings: {} });
		expect(doc.toObject().settings.captchaType).toBe(captchaTypeDefault);
	});

	test("an account carries no users or sites until they are added", () => {
		const doc = new account({ signupEmail: "a@b.com" }).toObject();
		expect(doc.users).toEqual([]);
		expect(doc.sites).toEqual([]);
	});

	test("a site keeps its own copy of the ip rules", () => {
		const doc = new account({
			sites: [{ siteKey: "key", settings: { ipValidationRules: {} } }],
		}).toObject();
		expect(doc.sites?.[0]?.settings?.ipValidationRules?.enabled).toBe(false);
	});

	test("account timestamps are numbers, not dates", () => {
		// They are compared against epoch millis in the billing queries.
		const doc = new account({ createdAt: 1700000000000 }).toObject();
		expect(typeof doc.createdAt).toBe("number");
	});
});
