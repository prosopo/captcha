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

// Pow variant of decisionMachineDeny.cy.ts. Each captcha task's
// serverVerifyXCaptcha* method invokes decisionMachineRunner.decide()
// separately, so one spec per captcha type is what catches a regression
// where a single verify path drops the deny hook — the exact shape of
// the past post-pow / puzzle escalation regressions.

import "@cypress/xpath";
import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "pow";

// Same DM source as the image variant — decide() is called from all three
// server-verify paths, so a shared always-deny DM covers each.
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

describe("Decision machine denies a pow solve at verify", () => {
	const siteKey: string = Cypress.env(
		`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
	);

	before(() => {
		if (!siteKey) {
			throw new Error(
				`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()} must be set for the DM-deny-pow test.`,
			);
		}
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
		cy.installDecisionMachine(
			siteKey,
			ALWAYS_DENY_DM,
			"cypress-forced-deny-pow",
		).then((response) => {
			expect(response.status).to.equal(200);
		});

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
			});
	});

	after(() => {
		cy.removeAllDecisionMachines();
		cy.registerSiteKey(CaptchaType.image);
	});

	it("pow solve is accepted client-side but /signup rejects with 401 because the DM denied at verify", () => {
		cy.intercept("POST", "/signup").as("signup");
		cy.intercept("POST", "**/prosopo/provider/client/pow/solution").as(
			"powSolution",
		);

		// Checkbox click drives the pow widget: fetches challenge, solves the
		// hash puzzle in the page, submits solution. On solution success the
		// widget mints a token into the form.
		getWidgetElement(checkboxClass, { timeout: 15000 }).first().realClick();

		cy.wait("@powSolution", { timeout: 60000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body?.verified).to.equal(true);
			});

		// Widget minted the token — checkbox ticks, ready to submit.
		getWidgetElement(`${checkboxClass}:checked`, { timeout: 15000 }).should(
			"have.length.gte",
			1,
		);

		const uniqueId = `dm-deny-pow-${Cypress._.random(0, 1e6)}`;
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

		// Demo server's /signup calls prosopo-server which dispatches to
		// /pow/verify on the provider. Our decide() DM denies there →
		// verified:false → auth.ts returns 401.
		cy.wait("@signup", { timeout: 20000 }).then((interception) => {
			expect(
				interception.response?.statusCode,
				"DM deny on pow should surface as 401 from /signup",
			).to.equal(401);
			expect(
				interception.response?.body?.verified,
				"signup body should carry verified:false",
			).to.equal(false);
		});
	});
});
