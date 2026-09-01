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

// End-to-end proof that the icon-order type works from challenge to
// server-verify.
//
// The flow: fill the signup form → click submit → the icon-order widget
// appears → click three icons → confirm → the widget mints a token → the form
// POSTs it to the demo dapp's /signup → the dapp calls
// prosopoServer.isVerified(token) → the SDK dispatches to the icon-order
// endpoint → the provider grades against the stored targets and verifies.
//
// If the SDK's dispatch lost its icon-order branch, /signup would return a
// rejection message (verified:false from isVerified) rather than "user
// created", and the message assertion at the end would fail. Mirrors
// puzzle.cy.ts for the puzzle path.

import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "iconOrder";

/**
 * Hit radius as a multiple of each icon's own size. Icons are ~38 px on a
 * 300x200 frame, so 20 gives a radius of ~760 px — larger than the frame's
 * diagonal (~360 px). Every target therefore covers the whole frame, and a
 * scripted click anywhere inside it counts as landing on the icon the legend
 * asked for. That is what lets Cypress drive the flow without reading the
 * imagery: order and click count still have to be right, which is what this
 * spec is proving end to end.
 */
const LAX_ICON_ORDER_TOLERANCE = 20;

/** Matches `iconOrderTargetCountDefault`; the number of clicks to make. */
const TARGET_COUNT = 3;

describe("Icon Order CAPTCHA — signup", () => {
	before(() => {
		const registerWithRetry = (
			retries = 3,
			delay = 2000,
		): Cypress.Chainable => {
			return cy
				.registerSiteKey(baseCaptchaType, CaptchaType.iconOrder, {
					iconOrderTolerance: LAX_ICON_ORDER_TOLERANCE,
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
		// Restore the site key to its baseline captcha type so sibling specs
		// don't inherit icon-order mode with a lax tolerance.
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

	it("icon-order token verifies via /signup — proves the SDK dispatched to the icon-order endpoint", () => {
		cy.intercept("POST", "/signup").as("signup");
		cy.intercept("POST", "**/prosopo/provider/client/captcha/icon-order").as(
			"iconOrderChallenge",
		);
		cy.intercept("POST", "**/prosopo/provider/client/icon-order/solution").as(
			"iconOrderSolution",
		);

		// Widget renders implicitly. Wait for the "I am human" checkbox and
		// click it to open the icon-order frame.
		getWidgetElement(checkboxClass, { timeout: 15000 })
			.first()
			.should("be.visible")
			.realClick();

		cy.wait("@iconOrderChallenge", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);
			});

		// The challenge response is imagery only — it carries no icon
		// positions — so the spec cannot aim at a target and does not need to:
		// the lax tolerance above makes any point inside the frame count.
		cy.wait("@iconOrderChallenge")
			.its("response.body")
			.then((body) => {
				expect(body, "challenge body should exist").to.exist;
				expect(body.background, "frame imagery").to.be.a("string");
				expect(body.legend, "legend imagery").to.be.a("string");
				// The answer must never be on the wire.
				expect(body).to.not.have.property("targets");
				expect(body).to.not.have.property("tolerance");
			});

		// Click three distinct points inside the frame. Distinct so each lands
		// on its own marker; the provider grades count and order, and with the
		// lax tolerance every one of them counts as the target it was asked for.
		getWidgetElement('[data-cy="prosopo-icon-order-frame"]', {
			timeout: 15000,
		})
			.first()
			.then(($frame) => {
				const frame = $frame[0];
				if (!frame) throw new Error("icon-order frame not found");
				const rect = frame.getBoundingClientRect();
				for (let i = 0; i < TARGET_COUNT; i++) {
					const clientX = rect.left + rect.width * (0.2 + i * 0.25);
					const clientY = rect.top + rect.height * (0.3 + i * 0.15);
					cy.wrap(frame).trigger("click", {
						clientX,
						clientY,
						force: true,
					});
				}
			});

		// One marker per click, numbered in the order they were made.
		getWidgetElement('[data-cy="prosopo-icon-order-frame"]')
			.first()
			.within(() => {
				cy.contains(String(TARGET_COUNT)).should("exist");
			});

		getWidgetElement('[data-cy="prosopo-icon-order-submit"]', {
			timeout: 15000,
		})
			.first()
			.should("not.be.disabled")
			.realClick();

		cy.wait("@iconOrderSolution", { timeout: 30000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);
				expect(response?.body.verified).to.equal(true);
			});

		// Widget has minted the token into the hidden procaptcha-response
		// input. Fill the form and submit — onActionHandler grabs the token
		// and POSTs it to /signup.
		const uniqueId = `icon-order-test-${Cypress._.random(0, 1e6)}`;
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

		// The proof: /signup uses prosopoServer.isVerified, which must send an
		// icon-order token to the icon-order endpoint. Without that dispatch
		// isVerified returns verified:false and /signup responds with a
		// rejection message instead of "user created".
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
