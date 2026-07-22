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
import { AdminApiPaths, ClientApiPaths, PublicApiPaths } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRateLimitConfig } from "../RateLimiter.js";

// getRateLimitConfig reads process.env at call time (not module load), so
// mutating env between calls exercises the branch used at runtime.
const RATE_ENV_KEYS: readonly string[] = [
	"PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_WINDOW",
	"PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_LIMIT",
	"PROSOPO_GET_POW_CAPTCHA_CHALLENGE_WINDOW",
	"PROSOPO_GET_POW_CAPTCHA_CHALLENGE_LIMIT",
	"PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_WINDOW",
	"PROSOPO_SUBMIT_IMAGE_CAPTCHA_SOLUTION_LIMIT",
	"PROSOPO_SUBMIT_POW_CAPTCHA_SOLUTION_WINDOW",
	"PROSOPO_SUBMIT_POW_CAPTCHA_SOLUTION_LIMIT",
	"PROSOPO_VERIFY_POW_CAPTCHA_SOLUTION_WINDOW",
	"PROSOPO_VERIFY_POW_CAPTCHA_SOLUTION_LIMIT",
	"PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_DAPP_WINDOW",
	"PROSOPO_VERIFY_IMAGE_CAPTCHA_SOLUTION_DAPP_LIMIT",
	"PROSOPO_CHECK_SPAM_EMAIL_WINDOW",
	"PROSOPO_CHECK_SPAM_EMAIL_LIMIT",
	"PROSOPO_GET_PROVIDER_STATUS_WINDOW",
	"PROSOPO_GET_PROVIDER_STATUS_LIMIT",
	"PROSOPO_GET_PROVIDER_DETAILS_WINDOW",
	"PROSOPO_GET_PROVIDER_DETAILS_LIMIT",
	"PROSOPO_SUBMIT_USER_EVENTS_WINDOW",
	"PROSOPO_SUBMIT_USER_EVENTS_LIMIT",
	"PROSOPO_SITE_KEY_REGISTER_WINDOW",
	"PROSOPO_SITE_KEY_REGISTER_LIMIT",
	"PROSOPO_SITE_KEYS_REGISTER_WINDOW",
	"PROSOPO_SITE_KEYS_REGISTER_LIMIT",
	"PROSOPO_SITE_KEY_REMOVE_WINDOW",
	"PROSOPO_SITE_KEY_REMOVE_LIMIT",
	"PROSOPO_SITE_KEYS_REMOVE_WINDOW",
	"PROSOPO_SITE_KEYS_REMOVE_LIMIT",
	"PROSOPO_UPDATE_DETECTOR_KEY_WINDOW",
	"PROSOPO_UPDATE_DETECTOR_KEY_LIMIT",
	"PROSOPO_REMOVE_DETECTOR_KEY_WINDOW",
	"PROSOPO_REMOVE_DETECTOR_KEY_LIMIT",
	"PROSOPO_TOGGLE_MAINTENANCE_MODE_WINDOW",
	"PROSOPO_TOGGLE_MAINTENANCE_MODE_LIMIT",
	"PROSOPO_UPDATE_DECISION_MACHINE_WINDOW",
	"PROSOPO_UPDATE_DECISION_MACHINE_LIMIT",
	"PROSOPO_GET_FR_CAPTCHA_CHALLENGE_WINDOW",
	"PROSOPO_GET_FR_CAPTCHA_CHALLENGE_LIMIT",
	"PROSOPO_GET_DECISION_MACHINE_WINDOW",
	"PROSOPO_GET_DECISION_MACHINE_LIMIT",
	"PROSOPO_GET_ALL_DECISION_MACHINES_WINDOW",
	"PROSOPO_GET_ALL_DECISION_MACHINES_LIMIT",
	"PROSOPO_REMOVE_ALL_DECISION_MACHINES_WINDOW",
	"PROSOPO_REMOVE_ALL_DECISION_MACHINES_LIMIT",
	"PROSOPO_REMOVE_DECISION_MACHINE_WINDOW",
	"PROSOPO_REMOVE_DECISION_MACHINE_LIMIT",
	"PROSOPO_CLEAR_ALL_COUNTERS_WINDOW",
	"PROSOPO_CLEAR_ALL_COUNTERS_LIMIT",
	"PROSOPO_GET_PUZZLE_CAPTCHA_CHALLENGE_WINDOW",
	"PROSOPO_GET_PUZZLE_CAPTCHA_CHALLENGE_LIMIT",
	"PROSOPO_SUBMIT_PUZZLE_CAPTCHA_SOLUTION_WINDOW",
	"PROSOPO_SUBMIT_PUZZLE_CAPTCHA_SOLUTION_LIMIT",
	"PROSOPO_VERIFY_PUZZLE_CAPTCHA_SOLUTION_WINDOW",
	"PROSOPO_VERIFY_PUZZLE_CAPTCHA_SOLUTION_LIMIT",
	"PROSOPO_DNS_EVENT_WINDOW",
	"PROSOPO_DNS_EVENT_LIMIT",
];

describe("RateLimiter.getRateLimitConfig", () => {
	// Snapshot every env we touch so the suite doesn't leak state into other
	// tests that read the same PROSOPO_* vars (e.g. an integration test that
	// spins up a real limiter).
	const originalEnv: Record<string, string | undefined> = {};

	beforeEach(() => {
		for (const key of RATE_ENV_KEYS) {
			originalEnv[key] = process.env[key];
			delete process.env[key];
		}
	});

	afterEach(() => {
		for (const key of RATE_ENV_KEYS) {
			if (originalEnv[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = originalEnv[key];
			}
		}
	});

	it("returns undefined windowMs/limit for every route when no env vars are set", () => {
		const cfg = getRateLimitConfig();
		for (const [route, entry] of Object.entries(cfg)) {
			expect(
				entry.windowMs,
				`${route}.windowMs should be undefined when env missing`,
			).toBeUndefined();
			expect(
				entry.limit,
				`${route}.limit should be undefined when env missing`,
			).toBeUndefined();
		}
	});

	it("exposes an entry for every ClientApiPaths route referenced in the source", () => {
		const cfg = getRateLimitConfig();
		const expected = [
			ClientApiPaths.GetImageCaptchaChallenge,
			ClientApiPaths.GetPowCaptchaChallenge,
			ClientApiPaths.SubmitImageCaptchaSolution,
			ClientApiPaths.SubmitPowCaptchaSolution,
			ClientApiPaths.VerifyPowCaptchaSolution,
			ClientApiPaths.VerifyImageCaptchaSolutionDapp,
			ClientApiPaths.CheckSpamEmail,
			ClientApiPaths.GetProviderStatus,
			ClientApiPaths.SubmitUserEvents,
			ClientApiPaths.GetFrictionlessCaptchaChallenge,
			ClientApiPaths.GetPuzzleCaptchaChallenge,
			ClientApiPaths.SubmitPuzzleCaptchaSolution,
			ClientApiPaths.VerifyPuzzleCaptchaSolution,
		];
		for (const route of expected) {
			expect(cfg).toHaveProperty(route);
		}
	});

	it("exposes an entry for every AdminApiPaths route referenced in the source", () => {
		const cfg = getRateLimitConfig();
		const expected = [
			AdminApiPaths.SiteKeyRegister,
			AdminApiPaths.SiteKeysRegister,
			AdminApiPaths.SiteKeyRemove,
			AdminApiPaths.SiteKeysRemove,
			AdminApiPaths.UpdateDetectorKey,
			AdminApiPaths.RemoveDetectorKey,
			AdminApiPaths.ToggleMaintenanceMode,
			AdminApiPaths.UpdateDecisionMachine,
			AdminApiPaths.GetDecisionMachine,
			AdminApiPaths.GetAllDecisionMachines,
			AdminApiPaths.RemoveAllDecisionMachines,
			AdminApiPaths.RemoveDecisionMachine,
			AdminApiPaths.ClearAllCounters,
			AdminApiPaths.DnsEvent,
		];
		for (const route of expected) {
			expect(cfg).toHaveProperty(route);
		}
	});

	it("exposes an entry for every PublicApiPaths route referenced in the source", () => {
		const cfg = getRateLimitConfig();
		expect(cfg).toHaveProperty(PublicApiPaths.GetProviderDetails);
	});

	it("propagates env vars verbatim to the mapped route (strings)", () => {
		process.env.PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_WINDOW = "60000";
		process.env.PROSOPO_GET_IMAGE_CAPTCHA_CHALLENGE_LIMIT = "10";
		const cfg = getRateLimitConfig();
		expect(cfg[ClientApiPaths.GetImageCaptchaChallenge]).toEqual({
			windowMs: "60000",
			limit: "10",
		});
		// Other routes untouched.
		expect(cfg[ClientApiPaths.CheckSpamEmail].windowMs).toBeUndefined();
		expect(cfg[ClientApiPaths.CheckSpamEmail].limit).toBeUndefined();
	});

	it("wires WINDOW and LIMIT env vars to distinct fields (no crossover)", () => {
		process.env.PROSOPO_CHECK_SPAM_EMAIL_WINDOW = "WINDOW_MARKER";
		process.env.PROSOPO_CHECK_SPAM_EMAIL_LIMIT = "LIMIT_MARKER";
		const entry = getRateLimitConfig()[ClientApiPaths.CheckSpamEmail];
		expect(entry.windowMs).toBe("WINDOW_MARKER");
		expect(entry.limit).toBe("LIMIT_MARKER");
	});

	it("re-reads process.env on every invocation (no module-load caching)", () => {
		process.env.PROSOPO_DNS_EVENT_WINDOW = "first";
		expect(getRateLimitConfig()[AdminApiPaths.DnsEvent].windowMs).toBe("first");
		process.env.PROSOPO_DNS_EVENT_WINDOW = "second";
		expect(getRateLimitConfig()[AdminApiPaths.DnsEvent].windowMs).toBe(
			"second",
		);
		// Real delete — assigning undefined to process.env coerces to the
		// literal string "undefined", which would defeat the test.
		// biome-ignore lint/performance/noDelete: intentional — test needs the key removed
		delete process.env.PROSOPO_DNS_EVENT_WINDOW;
		expect(
			getRateLimitConfig()[AdminApiPaths.DnsEvent].windowMs,
		).toBeUndefined();
	});
});
