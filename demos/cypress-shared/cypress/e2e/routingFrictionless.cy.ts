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

// Exercises the routing machine's frictionless (`route`) phase — the moment
// the provider decides which concrete captcha type to serve after the
// frictionless bot-score handoff. Distinct from escalation.cy.ts, which
// covers the post-PoW `route()` phase.
//
// Test-only routing DMs read a synthetic header `X-Test-Route-To` and
// forward it as the chosen captchaType. Deliberately generic so this spec
// reads as a plumbing check, not a mirror of production rules.

import "@cypress/xpath";
import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType = CaptchaType.frictionless;

// Hand-rolled JS source — the runner `eval`s it in a node context, so no
// TypeScript imports here. The machine forwards the requested captchaType
// only at the frictionless `route` phase; postPow returns undefined so the
// baseline PoW result is kept intact if a spec exercises pow-first flows.
const HEADER_DRIVEN_ROUTER = `
	module.exports.route = function (input) {
		if (!input || input.phase !== 'route') return undefined;
		var raw = input.raw || {};
		var headers = raw.headers || {};
		var target = headers['x-test-route-to'];
		if (target === 'image') return { captchaType: 'image', solvedImagesCount: 2 };
		if (target === 'puzzle') return { captchaType: 'puzzle' };
		if (target === 'pow') return { captchaType: 'pow' };
		return undefined;
	};
`;

const siteKey: string = Cypress.env(
	`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
);

describe("Routing machine at the frictionless phase picks the captcha type", () => {
	before(() => {
		if (!siteKey) {
			throw new Error(
				"PROSOPO_SITE_KEY_FRICTIONLESS must be set for the routing test.",
			);
		}
		cy.removeAllDecisionMachines();
	});

	beforeEach(() => {
		cy.registerSiteKey(baseCaptchaType).then((response) => {
			expect(response.status).to.equal(200);
		});
		cy.installRoutingMachine(
			siteKey,
			HEADER_DRIVEN_ROUTER,
			"cypress-routing-frictionless",
		).then((response) => {
			expect(response.status).to.equal(200);
		});
		// Prime the page + widget script cache. Each `it` then re-visits
		// AFTER setting up intercepts — the frictionless widget auto-fires
		// /frictionless on mount, so intercepts have to be in place BEFORE
		// that mount (same pattern as escalation.cy.ts).
		return cy.visit(Cypress.env("default_page")).then(() => {
			cy.waitForProcaptchaScript();
			getWidgetElement(checkboxClass).should("be.visible");
		});
	});

	after(() => {
		cy.removeAllDecisionMachines();
		cy.registerSiteKey(CaptchaType.image);
	});

	// Mounts the widget from scratch with intercepts already primed.
	// `target` decides which captchaType the test DM returns via the
	// `X-Test-Route-To` header — routed all the way through the request
	// interceptor into raw.headers on the DM input.
	const primeAndVisit = (target: "image" | "puzzle" | "pow") => {
		cy.intercept(
			"POST",
			"**/prosopo/provider/client/captcha/frictionless",
			(req) => {
				req.headers["x-test-route-to"] = target;
			},
		).as("frictionless");
		cy.intercept("POST", "**/prosopo/provider/client/captcha/pow").as("pow");
		cy.intercept("POST", "**/prosopo/provider/client/captcha/image").as(
			"image",
		);
		cy.intercept("POST", "**/prosopo/provider/client/captcha/puzzle").as(
			"puzzle",
		);
		cy.visit(Cypress.env("default_page"));
		cy.waitForProcaptchaScript();
	};

	it("routes straight to image when the DM returns image at frictionless phase", () => {
		primeAndVisit("image");

		cy.wait("@frictionless", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body).to.have.property("captchaType");
				expect(response?.body.captchaType).to.equal(CaptchaType.image);
			});

		// User needs to tick the image widget's checkbox to request the
		// image challenge — the frictionless routing selects the widget
		// type but doesn't auto-start it.
		getWidgetElement(checkboxClass, { timeout: 12000 }).first().realClick();

		cy.wait("@image", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body).to.have.property("captchas");
			});

		// The image modal is the user-visible proof. If the routing DM had
		// silently fallen through to baseline PoW, no modal would appear.
		getWidgetElement(".prosopo-modalInner p", { timeout: 15000 }).should(
			"be.visible",
		);
	});

	it("routes straight to puzzle when the DM returns puzzle at frictionless phase", () => {
		primeAndVisit("puzzle");

		cy.wait("@frictionless", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body.captchaType).to.equal(CaptchaType.puzzle);
			});

		getWidgetElement(checkboxClass, { timeout: 12000 }).first().realClick();

		cy.wait("@puzzle", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body).to.have.property("challenge");
			});

		// Puzzle piece renders via a fixed-position canvas overlay; the piece
		// selector is only present when the puzzle widget has actually
		// mounted its dragging phase.
		getWidgetElement('[data-cy="prosopo-puzzle-piece"]', {
			timeout: 15000,
		}).should("be.visible");
	});

	it("routes straight to pow when the DM returns pow at frictionless phase", () => {
		// Baseline path — the frictionless flow ordinarily lands on pow
		// when the score is under threshold. Explicitly returning `pow`
		// from the routing DM asserts the DM CAN pin this outcome, and
		// that the widget wires up the pow challenge (guarding against a
		// future refactor that treats "pow" as the frictionless default
		// and never actually calls /captcha/pow when the DM asks for it).
		primeAndVisit("pow");

		cy.wait("@frictionless", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body.captchaType).to.equal(CaptchaType.pow);
			});

		getWidgetElement(checkboxClass, { timeout: 12000 }).first().realClick();

		cy.wait("@pow", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
			});
	});
});
