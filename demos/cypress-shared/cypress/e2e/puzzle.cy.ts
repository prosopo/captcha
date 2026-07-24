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

// End-to-end proof that puzzle server-verify works. Before the
// puzzle-server-verify fix, `@prosopo/server`'s dispatch had no puzzle branch
// so puzzle tokens hit the pow endpoint and 404'd, leaving customers with
// silent `verified: false` responses on legitimate solvers.
//
// This test drives the puzzle-implicit demo page: fill signup form → click
// submit → puzzle widget appears → drag piece anywhere → widget mints token
// → form POSTs token to demo dapp's /signup → dapp calls
// prosopoServer.isVerified(token) → SDK dispatches to the puzzle endpoint
// → provider verifies against puzzlecaptchas → /signup returns
// { message: "user created" }.
//
// If the dispatch bug were reintroduced, /signup would return a rejection
// message (verified:false from isVerified) and this test would fail on the
// message assertion. Mirrors correct.captcha.signup.cy.ts for the image path.
//
// The puzzle tolerance is registered at 999 px, well beyond the 300×200
// canvas diagonal (~360 px), so any release point in the puzzle area passes.
// That lets Cypress simulate the drag without pixel-perfect target hitting.

import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "puzzle";

// Big enough to swallow any click inside the canvas — the check is Euclidean
// distance to the target centre, and the canvas is 300×200. Anything ≥ ~360
// admits any release point; 999 gives generous headroom and lets the widget
// accept a scripted release without needing pixel-perfect target hitting.
const LAX_PUZZLE_TOLERANCE = 999;

describe("Puzzle CAPTCHA — signup", () => {
	before(() => {
		const registerWithRetry = (
			retries = 3,
			delay = 2000,
		): Cypress.Chainable => {
			return cy
				.registerSiteKey(baseCaptchaType, CaptchaType.puzzle, {
					puzzleTolerance: LAX_PUZZLE_TOLERANCE,
				})
				.then((response) => {
					cy.task("log", `Response status: ${response.status}`);
					cy.task("log", `Response: ${JSON.stringify(response.body)}`);
					if (response.status !== 200 && retries > 0) {
						cy.task(
							"log",
							`Site key registration failed. Retrying... (${retries} attempts left)`,
						);
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
		// Restore the site key to its baseline captcha type so sibling tests
		// don't inherit puzzle mode with a lax tolerance.
		cy.registerSiteKey(CaptchaType.image).then((response) => {
			if (response.status === 200) {
				cy.task("log", "Site key successfully re-registered as image");
			} else {
				cy.task(
					"log",
					`Warning: Could not re-register site key. Status: ${response.status}`,
				);
			}
		});
	});

	it("puzzle token verifies via /signup — proves the SDK dispatched to the puzzle endpoint", () => {
		cy.intercept("POST", "/signup").as("signup");
		cy.intercept("POST", "**/prosopo/provider/client/captcha/puzzle").as(
			"puzzleChallenge",
		);
		cy.intercept("POST", "**/prosopo/provider/client/puzzle/solution").as(
			"puzzleSolution",
		);

		// Fill signup form.
		const uniqueId = `puzzle-test-${Cypress._.random(0, 1e6)}`;
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
			.should("not.be.disabled")
			.realClick();

		// The widget starts the puzzle flow — first with an "I am human"
		// checkbox, then the drag canvas. Some puzzle-implicit flows skip the
		// checkbox and go straight to the drag, so tolerate either.
		getWidgetElement(checkboxClass, { timeout: 12000 })
			.first()
			.then(($checkbox) => {
				if ($checkbox.length && !$checkbox.is(":checked")) {
					cy.wrap($checkbox).realClick();
				}
			});

		cy.wait("@puzzleChallenge", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);
			});

		// Drag the piece anywhere within the canvas. Any release point passes
		// because the tolerance was raised to swallow the whole canvas.
		getWidgetElement('[data-cy="prosopo-puzzle-piece"]', { timeout: 15000 })
			.first()
			.then(($piece) => {
				const piece = $piece[0];
				if (!piece) throw new Error("puzzle piece not found");
				const rect = piece.getBoundingClientRect();
				const startX = rect.left + rect.width / 2;
				const startY = rect.top + rect.height / 2;
				// Release ~80 px away in an arbitrary direction — lax
				// tolerance ensures this counts as "on target".
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
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);
				expect(response?.body.verified).to.equal(true);
			});

		// The proof: /signup uses prosopoServer.isVerified, which — with
		// this PR's dispatch — must send the puzzle token to the puzzle
		// endpoint. If that dispatch were still routing puzzle tokens to
		// the pow endpoint, isVerified would return verified:false and
		// /signup would respond with a rejection message instead of
		// "user created".
		cy.wait("@signup", { timeout: 30000 }).then((interception) => {
			cy.task(
				"log",
				`Signup response status: ${interception.response?.statusCode}`,
			);
			expect(interception.response, "Signup response should exist").to.exist;
			expect(
				interception.response?.statusCode,
				"Signup should return 200",
			).to.equal(200);

			const body = interception.response?.body;
			cy.task("log", `Signup response body: ${JSON.stringify(body)}`);
			expect(body, "Response body should exist").to.exist;
			expect(
				body?.message,
				"Message should indicate user was created",
			).to.equal("user created");
		});
	});
});
