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

// Solves an icon-order challenge, then proves the token verifies server-side:
// /signup only answers "user created" if the SDK dispatched the token to the
// icon-order endpoint.

import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType =
	Cypress.expose("CAPTCHA_TYPE") || "iconOrder";

/**
 * The ceiling `iconOrderToleranceFieldSchema` allows, in multiples of icon
 * size. It makes even the smallest icon's hit radius (~388 px) cover the whole
 * 300x200 frame, so any click counts and the spec never reads the imagery.
 */
const LAX_ICON_ORDER_TOLERANCE = 12;

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
					frictionlessTypes: { image: true, puzzle: true, iconOrder: true },
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
			.visit(Cypress.expose("default_page"), {
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

		getWidgetElement(checkboxClass, { timeout: 15000 })
			.first()
			.should("be.visible")
			.realClick();

		cy.wait("@iconOrderChallenge", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);
				const body = response?.body;
				expect(body, "challenge body should exist").to.exist;
				expect(body.background, "frame imagery").to.be.a("string");
				expect(body.legend, "legend imagery").to.be.a("string");
				expect(body).to.not.have.property("targets");
				expect(body).to.not.have.property("tolerance");
			});

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
					cy.wrap(frame).trigger("pointerup", {
						eventConstructor: "PointerEvent",
						pointerType: "mouse",
						clientX,
						clientY,
						force: true,
					});
				}
			});

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
