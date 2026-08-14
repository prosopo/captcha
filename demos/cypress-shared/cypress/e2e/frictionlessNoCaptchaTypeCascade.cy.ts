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
/// <reference types="cypress" />

// Regression guard for the widget-side cascade that turned every
// bare-string 401 on `/frictionless` into a downstream
// INCORRECT_CAPTCHA_TYPE 400. In prod (traced 2026-08-14) ~865 of 883
// hourly INCORRECT_CAPTCHA_TYPE errors on frictionless-configured
// sitekeys followed this shape:
//
//   1. /frictionless short-circuits (access-policy hard-block,
//      decision-machine autoBan, domain / header middleware
//      rejections — the trafficFilter path used to be here too but
//      was moved back to verify-time; see the comment on
//      `applyTrafficFilterAtRequestTime`) and returns 401 with a
//      bare-string body `{"error":"Unauthorized"}`.
//   2. HttpClientBase does not throw on 4xx JSON — it hands the body
//      back verbatim as a `GetFrictionlessCaptchaResponse`.
//   3. Widget's `result.error?.message` check misses (the error is a
//      string, not `{ message }`) and falls through to
//      `renderForCaptchaType(undefined, ...)`.
//   4. The default arm mounts ProcaptchaPow with undefined sessionId.
//   5. ProcaptchaPow calls /captcha/pow → 400 INCORRECT_CAPTCHA_TYPE
//      because the sitekey is frictionless-configured.
//
// The guard (`evaluateFrictionlessResult` in ProcaptchaFrictionless)
// halts at step 3 when `captchaType` is missing. This spec forces
// step 1 via cy.intercept and asserts /captcha/pow never fires.

import "@cypress/xpath";
import { CaptchaType } from "@prosopo/types";

describe("Frictionless response missing captchaType does not cascade to a pow call", () => {
	const siteKey: string = Cypress.env(
		`PROSOPO_SITE_KEY_${CaptchaType.frictionless.toUpperCase()}`,
	);

	before(() => {
		if (!siteKey) {
			throw new Error(
				"PROSOPO_SITE_KEY_FRICTIONLESS must be set for the no-captchaType-cascade test.",
			);
		}
	});

	beforeEach(() => {
		cy.registerSiteKey(CaptchaType.frictionless).then((response) => {
			expect(response.status).to.equal(200);
		});
	});

	it("does not follow up with /captcha/pow when /frictionless returns a bare-string 401", () => {
		// Simulate the wire shape emitted by every server path that
		// currently returns 401 with `{ error: "Unauthorized" }` — the
		// exact body seen in prod on affected frictionless sitekeys.
		// The widget must handle this without cascading into a pow
		// challenge.
		cy.intercept("POST", "**/prosopo/provider/client/captcha/frictionless", {
			statusCode: 401,
			body: { error: "Unauthorized" },
		}).as("frictionless");

		// Track all follow-up captcha requests. In the broken widget path
		// /captcha/pow would fire within a few ms of the 401.
		let powChallengeCallCount = 0;
		let imageChallengeCallCount = 0;
		let puzzleChallengeCallCount = 0;
		cy.intercept("POST", "**/prosopo/provider/client/captcha/pow", (req) => {
			powChallengeCallCount += 1;
			req.reply({ statusCode: 500, body: { error: "should-not-be-called" } });
		}).as("powChallenge");
		cy.intercept("POST", "**/prosopo/provider/client/captcha/image", (req) => {
			imageChallengeCallCount += 1;
			req.reply({ statusCode: 500, body: { error: "should-not-be-called" } });
		}).as("imageChallenge");
		cy.intercept("POST", "**/prosopo/provider/client/captcha/puzzle", (req) => {
			puzzleChallengeCallCount += 1;
			req.reply({ statusCode: 500, body: { error: "should-not-be-called" } });
		}).as("puzzleChallenge");

		cy.visit(Cypress.env("default_page"));
		cy.waitForProcaptchaScript();

		cy.wait("@frictionless", { timeout: 15000 })
			.its("response.statusCode")
			.should("equal", 401);

		// 5s is well over the widget's synchronous fall-through window
		// (prod trace showed /captcha/pow firing ~2ms after /frictionless
		// in the broken case). If the guard fails these counters will be
		// non-zero.
		cy.wait(5000).then(() => {
			expect(
				powChallengeCallCount,
				"widget must not fall through to /captcha/pow when /frictionless returned no captchaType",
			).to.equal(0);
			expect(
				imageChallengeCallCount,
				"widget must not fall through to /captcha/image",
			).to.equal(0);
			expect(
				puzzleChallengeCallCount,
				"widget must not fall through to /captcha/puzzle",
			).to.equal(0);
		});
	});
});
