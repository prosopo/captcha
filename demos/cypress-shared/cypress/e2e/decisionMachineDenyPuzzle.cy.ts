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

// Puzzle variant of decisionMachineDeny.cy.ts. See that spec for the
// shape of the assertion; the difference here is the puzzle widget's
// drag interaction and the puzzle-tolerance override so any release
// point counts as "on target".

import "@cypress/xpath";
import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "puzzle";

// Big enough to swallow any release point inside the 300×200 canvas —
// mirrors puzzle.cy.ts.
const LAX_PUZZLE_TOLERANCE = 999;

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

describe("Decision machine denies a puzzle solve at verify", () => {
	const siteKey: string = Cypress.env(
		`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
	);

	before(() => {
		if (!siteKey) {
			throw new Error(
				`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()} must be set for the DM-deny-puzzle test.`,
			);
		}
		cy.removeAllDecisionMachines();

		const registerWithRetry = (
			retries = 3,
			delay = 2000,
		): Cypress.Chainable => {
			return cy
				.registerSiteKey(baseCaptchaType, CaptchaType.puzzle, {
					puzzleTolerance: LAX_PUZZLE_TOLERANCE,
				})
				.then((response) => {
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
			"cypress-forced-deny-puzzle",
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
			});
	});

	after(() => {
		cy.removeAllDecisionMachines();
		cy.registerSiteKey(CaptchaType.image);
	});

	it("puzzle solve is accepted client-side but /signup rejects with 401 because the DM denied at verify", () => {
		cy.intercept("POST", "/signup").as("signup");
		cy.intercept("POST", "**/prosopo/provider/client/captcha/puzzle").as(
			"puzzleChallenge",
		);
		cy.intercept("POST", "**/prosopo/provider/client/puzzle/solution").as(
			"puzzleSolution",
		);

		// Checkbox click opens the puzzle canvas.
		getWidgetElement(checkboxClass, { timeout: 15000 })
			.first()
			.should("be.visible")
			.realClick();

		cy.wait("@puzzleChallenge", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
			});

		// Drag the piece anywhere within the canvas — lax tolerance accepts
		// any release point. Mirrors puzzle.cy.ts.
		getWidgetElement('[data-cy="prosopo-puzzle-piece"]', { timeout: 15000 })
			.first()
			.then(($piece) => {
				const piece = $piece[0];
				if (!piece) throw new Error("puzzle piece not found");
				const rect = piece.getBoundingClientRect();
				const startX = rect.left + rect.width / 2;
				const startY = rect.top + rect.height / 2;
				const endX = startX + 80;
				const endY = startY + 40;
				cy.wrap(piece)
					.trigger("mousedown", {
						button: 0,
						clientX: startX,
						clientY: startY,
						force: true,
					})
					.trigger("mousemove", {
						clientX: endX,
						clientY: endY,
						force: true,
					});
				cy.document().then((doc) => {
					const evt = new MouseEvent("mouseup", {
						clientX: endX,
						clientY: endY,
						bubbles: true,
						cancelable: true,
					});
					doc.dispatchEvent(evt);
				});
			});

		cy.wait("@puzzleSolution", { timeout: 30000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body?.verified).to.equal(true);
			});

		const uniqueId = `dm-deny-puzzle-${Cypress._.random(0, 1e6)}`;
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

		// Demo server's /signup dispatches to /puzzle/verify. DM denies
		// there → verified:false → 401.
		cy.wait("@signup", { timeout: 20000 }).then((interception) => {
			expect(
				interception.response?.statusCode,
				"DM deny on puzzle should surface as 401 from /signup",
			).to.equal(401);
			expect(
				interception.response?.body?.verified,
				"signup body should carry verified:false",
			).to.equal(false);
		});
	});
});
