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

// Exercises the `decide()` (verify-phase) decision machine. When a decide()
// DM denies an otherwise-approved solve, the widget still mints a token
// client-side (so the user sees the checkbox tick) but the dApp's
// server-side verify returns { verified: false, reason: <dm-reason> }.
//
// This is the intended shape of "punish the bot but don't tip them off":
// the widget cheerfully hands back a token, the dApp's /signup call
// gets a 401 with `verified: false`, no user is created.
//
// The spec drives that whole path end-to-end via the image signup demo:
//   1. Install a decide() DM against the image sitekey that always denies.
//   2. Solve the image captcha as usual → widget mints token.
//   3. Fill and submit the signup form → demo server calls verify →
//      DM denies → /signup returns 401.

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

// Test-only decide() DM: always deny with a recognisable reason string so
// the test can pin the assertion on the reason rather than a generic
// "not verified". Reason threads through:
//   dm.decide() → serverVerifyUserImageCaptcha → commitment.result.reason
//   → /verify response.reason (unused by demo but persisted) → verified:false
const ALWAYS_DENY_DM = `
	module.exports.decide = function (input) {
		return {
			decision: 'deny',
			reason: 'CAPTCHA.TEST_DM_DENIED',
			score: 0,
			tags: ['cypress-test-deny'],
		};
	};
`;

describe("Decision machine denies an otherwise-valid solve at verify", () => {
	const siteKey: string = Cypress.env(
		`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
	);

	before(() => {
		if (!siteKey) {
			throw new Error(
				`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()} must be set for the DM-deny test.`,
			);
		}
		// Wipe any leftover machines from a crashed previous run so the
		// installDecisionMachine below is the ONLY artifact this sitekey has.
		cy.removeAllDecisionMachines();

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
		// Install fresh — the removeAllDecisionMachines in before() cleared
		// state, and this reinstall guarantees each `it` starts from the
		// same known DM even if a prior it altered it.
		cy.installDecisionMachine(
			siteKey,
			ALWAYS_DENY_DM,
			"cypress-forced-deny",
		).then((response) => {
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
		// Critical — without this cleanup the deny DM lingers and every
		// subsequent test suite that shares this sitekey would fail.
		cy.removeAllDecisionMachines();
		cy.registerSiteKey(CaptchaType.image);
	});

	it("solve is accepted client-side but /signup rejects with 401 because the DM denied at verify", () => {
		cy.intercept("POST", "/signup").as("signup");

		cy.get("button").as("button");
		expect("@button").to.have.length.gte(1);

		// Some demo pages render a modal-open button — click it if present.
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

		// Widget mints a token — checkbox ticks, ready to submit.
		getWidgetElement(`${checkboxClass}:checked`, { timeout: 15000 }).should(
			"have.length.gte",
			1,
		);

		const uniqueId = `dm-deny-${Cypress._.random(0, 1e6)}`;

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

		// The demo server's /signup handler calls prosopo-server which hits
		// /image/dapp-user-commitment/verify on the provider. Our decide()
		// DM denies there → response has verified:false → auth.ts returns
		// 401 with { message, verified:false }.
		cy.wait("@signup", { timeout: 20000 }).then((interception) => {
			expect(
				interception.response?.statusCode,
				"DM deny should surface as 401 from /signup",
			).to.equal(401);
			expect(
				interception.response?.body?.verified,
				"signup body should carry verified:false",
			).to.equal(false);
		});
	});
});
