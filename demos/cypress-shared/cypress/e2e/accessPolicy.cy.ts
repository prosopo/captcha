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

// End-to-end proof of both user-access-policy Block paths:
//
//   1. Request-time block (`deferToVerify: false`, the default) —
//      blockMiddleware in packages/provider/src/api/blacklistRequestInspector.ts
//      short-circuits the /captcha/* request with 403 Forbidden before the
//      endpoint handler runs.
//   2. Defer-to-verify block (`deferToVerify: true`) — request-time
//      middleware skips the rule, the widget mounts and issues its
//      /captcha/* request normally, and the block fires at verify time
//      via checkForHardBlock (stamps ACCESS_POLICY_BLOCK on the record).
//      The widget-side flow completes successfully; the dApp's server
//      verify is what returns verified:false.
//
// Prior to the fix in getImageCaptchaChallenge et al (and the defensive
// tweak in captchaManager.isValidRequest), path 2 was broken:
// sanitizeAccessPolicy strips `captchaType` from every Block policy on
// write, and isValidRequest compared the (undefined) captchaType against
// the request type, returning 400 INCORRECT_CAPTCHA_TYPE and preventing
// the widget from ever solving.

import "@cypress/xpath";
import { ProsopoDatasetError } from "@prosopo/common";
import { datasetWithSolutionHashes } from "@prosopo/datasets";
import { type Captcha, CaptchaType } from "@prosopo/types";
import {
	buildTestSolutions,
	checkboxClass,
	getWidgetElement,
} from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "image";

describe("User access policy Block rules", () => {
	const siteKey: string = Cypress.env(
		`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
	);

	// A Block rule scoped only by clientId (the test sitekey) with no
	// userScope filters matches every request for that sitekey — perfect
	// for a deterministic block. Expires an hour out so a crashed test
	// cleans itself up eventually even if `after()` never runs.
	const buildBlockRule = (opts: { deferToVerify: boolean }) => [
		{
			accessPolicy: {
				type: "block",
				description: `cypress-test-access-block-${
					opts.deferToVerify ? "defer" : "request"
				}`,
				...(opts.deferToVerify && { deferToVerify: true }),
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
		// Clear before each — the two tests install different rule shapes.
		cy.deleteAllAccessRules();
	});

	after(() => {
		// MUST run — a leftover Block rule would break every subsequent
		// test that hits the image sitekey.
		cy.deleteAllAccessRules();
		cy.registerSiteKey(CaptchaType.image);
	});

	it("blockMiddleware 403s the /captcha/* request when a per-clientId Block rule matches", () => {
		cy.addAccessRules(buildBlockRule({ deferToVerify: false })).then(
			(response) => {
				expect(response.status).to.equal(200);
			},
		);

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

	it("deferToVerify Block lets the /captcha/* request through (200), not 400 INCORRECT_CAPTCHA_TYPE", () => {
		cy.addAccessRules(buildBlockRule({ deferToVerify: true })).then(
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

		// The regression guard: pre-fix this returned 400 with
		// INCORRECT_CAPTCHA_TYPE because sanitizeAccessPolicy stripped
		// captchaType from the Block policy, then isValidRequest compared
		// (undefined) captchaType against the request. Both call-site
		// filters and the defensive relaxation in isValidRequest are what
		// keep this at 200. The actual block will fire later at verify
		// time via checkForHardBlock — that surface is exercised by the
		// unit tests in packages/provider/src/tests/unit/tasks/
		// captchaManager.unit.test.ts and by the block middleware's own
		// integration tests.
		cy.wait("@anyCaptcha", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(
					response?.statusCode,
					"deferToVerify Block must NOT block at request time",
				).to.equal(200);
			});
	});

	it("deferToVerify Block fires at verify time — widget solves normally but /signup returns 401", () => {
		// The full end-to-end shape of "solve normally, block at verify"
		// that the previous `it` only covered halfway. Drive an image solve
		// through the signup demo; the widget mints a token, the demo
		// server hands the token to prosopo-server which POSTs
		// /image/dapp-user-commitment/verify on the provider, and
		// checkForHardBlock inside serverVerifyUserImageCaptcha stamps
		// ACCESS_POLICY_BLOCK on the commitment record — the provider
		// returns verified:false, the demo server returns 401.
		cy.addAccessRules(buildBlockRule({ deferToVerify: true })).then(
			(response) => {
				expect(response.status).to.equal(200);
			},
		);

		const solutions = buildTestSolutions(datasetWithSolutionHashes.captchas);
		if (!solutions) {
			throw new ProsopoDatasetError(
				"DATABASE.DATASET_WITH_SOLUTIONS_GET_FAILED",
				{ context: { datasetWithSolutionHashes } },
			);
		}

		cy.intercept("POST", "/signup").as("signup");
		// Intercept /captcha/image specifically — the widget goes
		// through /captcha/frictionless first and the shared clickIAmHuman
		// helper's `**/captcha/**` intercept can catch the frictionless
		// response instead of the image challenge, breaking its
		// `body.captchas` assertion. Wait on the specific endpoint here
		// and expose the captchas array to downstream steps under the
		// same @captchas alias captchaImages expects.
		cy.intercept("POST", "**/prosopo/provider/client/captcha/image").as(
			"imageChallenge",
		);
		cy.visit(Cypress.env("default_page"), {
			timeout: 30000,
			failOnStatusCode: false,
		});
		cy.waitForProcaptchaScript();
		cy.wrap(solutions).as("solutions");

		// Some demo pages render a modal-open button — click it if present.
		cy.elementExists("button[type='button']:nth-of-type(2)").then(
			(confirmBtn: unknown) => {
				if (confirmBtn) {
					cy.wrap(confirmBtn).realClick();
				}
			},
		);

		getWidgetElement(checkboxClass, { timeout: 15000 })
			.first()
			.should("be.visible")
			.realClick();

		cy.wait("@imageChallenge", { timeout: 30000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body).to.have.property("captchas");
				cy.wrap(response?.body.captchas).as("captchas");
			});

		cy.captchaImages();

		cy.get("@captchas").each((captcha: Captcha, index: number) => {
			cy.log(`Solving captcha ${index + 1}: ${captcha.captchaContentId}`);
			cy.clickCorrectCaptchaImages(captcha);
			cy.wait(1200);
		});

		// Widget minted the token — checkbox ticks. deferToVerify means
		// the block does NOT fire on the widget path.
		getWidgetElement(`${checkboxClass}:checked`, { timeout: 15000 }).should(
			"have.length.gte",
			1,
		);

		const uniqueId = `access-defer-${Cypress._.random(0, 1e6)}`;
		cy.get('input[id="name"]', { timeout: 10000 })
			.should("be.visible")
			.clear()
			.type("test", { delay: 50 });
		cy.get('input[id="email"]', { timeout: 10000 })
			.should("be.visible")
			.clear()
			.type(`${uniqueId}@prosopo.io`, { delay: 50 });
		cy.get('input[type="password"]', { timeout: 10000 })
			.should("be.visible")
			.clear()
			.type("password", { delay: 50 });

		cy.get('button[data-cy="submit-button"]', { timeout: 10000 })
			.first()
			.should("be.visible")
			.should("not.be.disabled");
		cy.get('button[data-cy="submit-button"]').first().realClick();

		cy.wait("@signup", { timeout: 20000 }).then((interception) => {
			expect(
				interception.response?.statusCode,
				"deferToVerify block should surface as 401 from /signup at verify time",
			).to.equal(401);
			expect(
				interception.response?.body?.verified,
				"signup body should carry verified:false",
			).to.equal(false);
		});
	});
});
