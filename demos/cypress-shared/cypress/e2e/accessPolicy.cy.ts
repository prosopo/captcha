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

// End-to-end proof that the user-access-policy hard-block path fires on
// solve. Zero cypress coverage existed for this before — the whole flow
// (rule insert → captcha solve → verify hits checkForHardBlock → reason
// stamped ACCESS_POLICY_BLOCK → /signup 401) had only unit tests.
//
// Uses `deferToVerify: true` so the widget-side captcha completes normally
// (the user never sees the block on the challenge endpoint) and the block
// only fires when the dApp asks the provider to verify. That's the shape
// the production docs recommend for "punish the bot but don't tip them
// off" scenarios and mirrors the DM-deny spec.

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

describe("User access policy blocks an otherwise-valid solve at verify", () => {
	const siteKey: string = Cypress.env(
		`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
	);

	// A rule scoped only by clientId (the test sitekey) with no userScope
	// filters matches every request for that sitekey — perfect for a
	// deterministic block. `deferToVerify: true` keeps the widget path
	// open so the browser doesn't see a 4xx on /captcha/*; the block
	// stamps at verify time. Expires an hour out so a crashed test cleans
	// itself up eventually even if `after()` never runs.
	const buildBlockRule = () => [
		{
			accessPolicy: {
				type: "block",
				deferToVerify: true,
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

		const solutions = buildTestSolutions(datasetWithSolutionHashes.captchas);
		if (!solutions) {
			throw new ProsopoDatasetError(
				"DATABASE.DATASET_WITH_SOLUTIONS_GET_FAILED",
				{ context: { datasetWithSolutionHashes } },
			);
		}

		cy.intercept("/dummy").as("dummy");

		return cy
			.visit(Cypress.env("default_page"), {
				timeout: 30000,
				failOnStatusCode: false,
			})
			.then(() => {
				cy.waitForProcaptchaScript();
				getWidgetElement(checkboxClass, { timeout: 15000 }).should(
					"be.visible",
				);
				cy.wrap(solutions).as("solutions");
			});
	});

	after(() => {
		// MUST run — the rule blocks EVERY request for the image sitekey
		// while it's in place. Leaving it in Redis would break every
		// subsequent test that hits this sitekey.
		cy.deleteAllAccessRules();
		cy.registerSiteKey(CaptchaType.image);
	});

	it("widget solve is accepted but /signup 401s with verified:false when a deferToVerify block matches the sitekey", () => {
		cy.intercept("POST", "/signup").as("signup");

		cy.get("button").as("button");
		expect("@button").to.have.length.gte(1);

		cy.elementExists("button[type='button']:nth-of-type(2)").then(
			(confirmBtn: unknown) => {
				if (confirmBtn) {
					cy.wrap(confirmBtn).realClick();
				}
			},
		);

		cy.clickIAmHuman();
		cy.captchaImages();

		cy.get("@captchas").each((captcha: Captcha, index: number) => {
			cy.log(`Solving captcha ${index + 1}: ${captcha.captchaContentId}`);
			cy.clickCorrectCaptchaImages(captcha);
			cy.wait(1200);
		});

		// deferToVerify means the widget path completes normally — checkbox
		// ticks, token minted. The block fires only when the dApp asks the
		// provider to verify the token.
		getWidgetElement(`${checkboxClass}:checked`, { timeout: 15000 }).should(
			"have.length.gte",
			1,
		);

		const uniqueId = `access-block-${Cypress._.random(0, 1e6)}`;

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
				"Access-policy block should surface as 401 from /signup",
			).to.equal(401);
			expect(
				interception.response?.body?.verified,
				"signup body should carry verified:false",
			).to.equal(false);
		});
	});
});
