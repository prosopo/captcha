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

// End-to-end proof that a user-access-policy Block rule stops a captcha
// request at the middleware boundary (403 Forbidden, endpoint never
// runs). Zero cypress coverage existed for this before — the block
// middleware path (packages/provider/src/api/blacklistRequestInspector.ts)
// only had unit / integration tests.
//
// The spec tests request-time blocking with `deferToVerify: false` (the
// default). The deferToVerify=true variant (block-at-verify) currently
// interacts with a Block-policy sanitiser that strips `captchaType`,
// tripping the `INCORRECT_CAPTCHA_TYPE` check in captchaManager
// isValidRequest — worth its own dedicated test + fix once we sort that
// path out.

import "@cypress/xpath";
import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "image";

describe("User access policy blocks a captcha request at the middleware", () => {
	const siteKey: string = Cypress.env(
		`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
	);

	// A Block rule scoped only by clientId (the test sitekey) with no
	// userScope filters matches every request for that sitekey — perfect
	// for a deterministic block. Expires an hour out so a crashed test
	// cleans itself up eventually even if `after()` never runs.
	const buildBlockRule = () => [
		{
			accessPolicy: {
				type: "block",
				description: "cypress-test-access-block",
			},
			policyScopes: [{ clientId: siteKey }],
			// Empty userScope object matches every user — the clientId scope
			// alone is what keeps this from spilling onto other sitekeys.
			userScopes: [{}],
			expiresUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
		},
	];

	before(() => {
		if (!siteKey) {
			throw new Error(
				`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()} must be set for the access-policy test.`,
			);
		}
		cy.deleteAllAccessRules();

		const registerWithRetry = (
			retries = 3,
			delay = 2000,
		): Cypress.Chainable => {
			return cy.registerSiteKey(baseCaptchaType).then((response) => {
				if (response.status !== 200 && retries > 0) {
					cy.wait(delay);
					return registerWithRetry(retries - 1, delay);
				}
				expect(
					response.status,
					"Site key registration should return 200",
				).to.equal(200);
				return cy.wrap(response);
			});
		};

		return registerWithRetry();
	});

	beforeEach(() => {
		// Belt + braces: clear any stale rules and reinsert the fresh one
		// each test so re-runs don't accumulate.
		cy.deleteAllAccessRules();
		cy.addAccessRules(buildBlockRule()).then((response) => {
			expect(response.status).to.equal(200);
		});
	});

	after(() => {
		// MUST run — the rule blocks EVERY request for the image sitekey
		// while it's in place. Leaving it in Redis would break every
		// subsequent test that hits this sitekey.
		cy.deleteAllAccessRules();
		cy.registerSiteKey(CaptchaType.image);
	});

	it("blockMiddleware 403s the /captcha/* request when a per-clientId Block rule matches", () => {
		// Match every captcha challenge endpoint — the default demo page
		// happens to fire /captcha/frictionless first (per its site key
		// registration), but a change of demo page shouldn't break the
		// spec's block-detection assertion.
		cy.intercept("POST", "**/prosopo/provider/client/captcha/**").as(
			"anyCaptcha",
		);
		cy.visit(Cypress.env("default_page"), {
			timeout: 30000,
			failOnStatusCode: false,
		});
		cy.waitForProcaptchaScript();

		// User ticks the checkbox — widget POSTs to whichever /captcha/*
		// endpoint the site key uses, which blockMiddleware short-circuits
		// with 403 Forbidden before the endpoint handler runs. The
		// wire-level 403 IS the assertion — it's what dApps ultimately
		// observe when a block rule is in place.
		getWidgetElement(checkboxClass, { timeout: 15000 })
			.first()
			.should("be.visible")
			.realClick();

		cy.wait("@anyCaptcha", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(
					response?.statusCode,
					"Access-policy block should return 403 at the middleware",
				).to.equal(403);
				expect(
					response?.body,
					"403 body should carry the { error: 'Forbidden' } shape from blockMiddleware",
				).to.deep.equal({ error: "Forbidden" });
			});
	});
});
