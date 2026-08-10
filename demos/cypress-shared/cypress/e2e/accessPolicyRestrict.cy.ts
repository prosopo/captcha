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

// End-to-end coverage of Restrict access policies (the sibling of Block
// covered in accessPolicy.cy.ts). Restrict rules don't 403 — they narrow
// which captchaType is acceptable and can override captcha params
// (solvedImagesCount, imageThreshold, powDifficulty). The two paths worth
// exercising end-to-end:
//
//   1. Restrict with `captchaType: image` on an image request →
//      isValidRequest accepts, request proceeds. Regression guard against
//      the captchaType-equality check accidentally rejecting matching
//      Restricts (the same check that had the sanitiser bug for Block).
//   2. Restrict with `captchaType: pow` on an image request →
//      session captchaType wins over the restrict pin (PR #3010): when a
//      valid session exists, its captchaType is authoritative at the
//      /captcha/{type} gate; the policy still fires at verify time via
//      the decision machine. So the /captcha/image call returns 200 even
//      though the policy pins pow.

import "@cypress/xpath";
import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "image";

describe("User access policy Restrict rules", () => {
	const siteKey: string = Cypress.env(
		`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
	);

	const buildRestrictRule = (opts: {
		captchaType: "image" | "pow";
		deferToVerify?: boolean;
	}) => [
		{
			accessPolicy: {
				type: "restrict",
				captchaType: opts.captchaType,
				description: `cypress-test-restrict-${opts.captchaType}${
					opts.deferToVerify ? "-defer" : ""
				}`,
				...(opts.deferToVerify && { deferToVerify: true }),
			},
			policyScopes: [{ clientId: siteKey }],
			userScopes: [{}],
			expiresUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
		},
	];

	before(() => {
		if (!siteKey) {
			throw new Error(
				`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()} must be set for the Restrict test.`,
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
		cy.deleteAllAccessRules();
	});

	after(() => {
		cy.deleteAllAccessRules();
		cy.registerSiteKey(CaptchaType.image);
	});

	it("Restrict with matching captchaType lets the request through (200)", () => {
		cy.addAccessRules(buildRestrictRule({ captchaType: "image" })).then(
			(response) => {
				expect(response.status).to.equal(200);
			},
		);

		cy.intercept("POST", "**/prosopo/provider/client/captcha/**").as(
			"anyCaptcha",
		);
		cy.visit(Cypress.env("default_page"), {
			timeout: 30000,
			failOnStatusCode: false,
		});
		cy.waitForProcaptchaScript();

		getWidgetElement(checkboxClass, { timeout: 15000 })
			.first()
			.should("be.visible")
			.realClick();

		cy.wait("@anyCaptcha", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(
					response?.statusCode,
					"Restrict with matching captchaType should NOT block",
				).to.equal(200);
			});
	});

	it("Restrict pinning a different captchaType is overridden by the session's captchaType (200)", () => {
		// Restrict says "you must do pow" but the widget already minted a
		// session for the image sitekey. PR #3010 made the session
		// captchaType authoritative at /captcha/{type} — the /captcha/image
		// call therefore returns 200 despite the mismatched pin. The
		// restrict policy still fires at verify time via the decision
		// machine's hard-block path; that half is covered by the verify-
		// time restrict tests.
		//
		// Intercept /captcha/image specifically (not /captcha/**) — the
		// widget hits /captcha/frictionless FIRST which returns 200, and
		// matching /captcha/** would catch that response before the image
		// one and hide the real behaviour.
		cy.addAccessRules(buildRestrictRule({ captchaType: "pow" })).then(
			(response) => {
				expect(response.status).to.equal(200);
			},
		);

		cy.intercept("POST", "**/prosopo/provider/client/captcha/image").as(
			"imageChallenge",
		);
		cy.visit(Cypress.env("default_page"), {
			timeout: 30000,
			failOnStatusCode: false,
		});
		cy.waitForProcaptchaScript();

		getWidgetElement(checkboxClass, { timeout: 15000 })
			.first()
			.should("be.visible")
			.realClick();

		cy.wait("@imageChallenge", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(
					response?.statusCode,
					"session captchaType wins over restrict pin at /captcha/{type}",
				).to.equal(200);
			});
	});

	it("Restrict with deferToVerify=true skips the request-time captchaType pin (200 despite mismatch)", () => {
		// Symmetric to the Block+deferToVerify path: the challenge
		// handlers' `.find((p) => !p.deferToVerify)` filter drops
		// deferToVerify policies before they reach isValidRequest, so a
		// Restrict pinning a mismatched captchaType with deferToVerify
		// no longer fires INCORRECT_CAPTCHA_TYPE at request time. It
		// still lands in the endpoint's rule set — findHardBlockPolicy
		// at verify time treats any deferToVerify policy as a hard block
		// (see captchaManager.ts:87), but checkForHardBlock queries
		// blockOnly=true so a Restrict/defer never reaches it in
		// practice — this variant is effectively a no-op today. The
		// test locks in the current "no-op" observable so a future
		// change that starts enforcing deferToVerify Restricts at
		// request time can't slip in unnoticed.
		cy.addAccessRules(
			buildRestrictRule({ captchaType: "pow", deferToVerify: true }),
		).then((response) => {
			expect(response.status).to.equal(200);
		});

		cy.intercept("POST", "**/prosopo/provider/client/captcha/image").as(
			"imageChallenge",
		);
		cy.visit(Cypress.env("default_page"), {
			timeout: 30000,
			failOnStatusCode: false,
		});
		cy.waitForProcaptchaScript();

		getWidgetElement(checkboxClass, { timeout: 15000 })
			.first()
			.should("be.visible")
			.realClick();

		cy.wait("@imageChallenge", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(
					response?.statusCode,
					"deferToVerify Restrict must NOT fire the pin check at request time",
				).to.equal(200);
			});
	});
});
