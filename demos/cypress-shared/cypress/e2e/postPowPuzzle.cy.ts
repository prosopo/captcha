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

// Mirror of escalation.cy.ts (post-PoW → image) but for the puzzle
// escalation path. Guards two production surfaces that regressed silently
// in the past:
//   - The pow Manager forwards the trusted checkbox click coords through
//     onEscalate (see procaptcha-pow/src/services/Manager.ts). If it
//     doesn't, the escalated puzzle widget seeds (0, 0) into its salt and
//     the entry-point telemetry is lost — coords[0][0] on the puzzle
//     record ends up [[0, 0]] instead of the real click.
//   - The frictionless wrapper mounts the puzzle widget with autoStart +
//     startCoords. If either prop is dropped on the way through
//     ProcaptchaPuzzle → ProcaptchaWidget, the widget hangs on the
//     spinner.
//
// Both are only observable from the user-facing wire — the /captcha/puzzle
// request firing after PoW submit — hence this spec.

import "@cypress/xpath";
import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType = CaptchaType.frictionless;

// Hand-rolled JS: only escalate at the post-PoW phase, keep baseline pow
// at the initial route phase so the widget actually issues a PoW request
// first. Same shape as FORCE_IMAGE_ROUTING_MACHINE in escalation.cy.ts.
const FORCE_PUZZLE_ROUTING_MACHINE = `
	module.exports.route = function (input) {
		if (input && input.phase !== 'postPow') return undefined;
		return { captchaType: 'puzzle' };
	};
`;

describe("Post-PoW route() escalation surfaces the puzzle captcha", () => {
	const siteKey: string = Cypress.env(
		`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
	);

	before(() => {
		if (!siteKey) {
			throw new Error(
				"PROSOPO_SITE_KEY_FRICTIONLESS must be set for the escalation test.",
			);
		}
		cy.removeAllDecisionMachines();
	});

	beforeEach(() => {
		// Register the sitekey with the lax puzzle tolerance so the eventual
		// drag can release anywhere on the canvas. Mirrors puzzle.cy.ts.
		cy.registerSiteKey(baseCaptchaType, undefined, {
			puzzleTolerance: 999,
		}).then((response) => {
			expect(response.status).to.equal(200);
		});
		cy.installRoutingMachine(
			siteKey,
			FORCE_PUZZLE_ROUTING_MACHINE,
			"cypress-forced-puzzle",
		).then((response) => {
			expect(response.status).to.equal(200);
		});
		return cy.visit(Cypress.env("default_page")).then(() => {
			cy.waitForProcaptchaScript();
			getWidgetElement(checkboxClass).should("be.visible");
		});
	});

	after(() => {
		cy.removeAllDecisionMachines();
		cy.registerSiteKey(CaptchaType.image);
	});

	it("mounts the puzzle widget after PoW solves and route() escalates to puzzle", () => {
		// Fresh visit so the intercepts below are in place BEFORE the widget
		// script mounts and fires its first requests. Mirrors the
		// intercept-first pattern in escalation.cy.ts.
		cy.intercept("POST", "**/prosopo/provider/client/captcha/frictionless").as(
			"frictionless",
		);
		cy.intercept("POST", "**/prosopo/provider/client/captcha/pow").as(
			"powChallenge",
		);
		cy.intercept("POST", "**/prosopo/provider/client/pow/solution").as(
			"powSubmit",
		);
		// puzzleChallenge is the UI contract — it only fires if the
		// frictionless wrapper's onEscalate handler forwarded the escalation
		// AND the puzzle widget's autoStart effect ran. Missing either link
		// (e.g. Suspense wrapper dropping onEscalate) blocks this request.
		cy.intercept("POST", "**/prosopo/provider/client/captcha/puzzle").as(
			"puzzleChallenge",
		);

		cy.visit(Cypress.env("default_page"));
		cy.waitForProcaptchaScript();

		getWidgetElement(checkboxClass, { timeout: 12000 }).first().realClick();

		cy.wait("@frictionless", { timeout: 12000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
			});

		cy.wait("@powChallenge", { timeout: 12000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
			});

		// The critical contract: /pow/solution returns escalation.captchaType =
		// 'puzzle' with a fresh sessionId. `verified: false` because PoW alone
		// wasn't enough — the user has to clear the puzzle to earn a token.
		cy.wait("@powSubmit", { timeout: 60000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body).to.have.property("escalation");
				expect(response?.body.escalation.captchaType).to.equal(
					CaptchaType.puzzle,
				);
				expect(response?.body.escalation.sessionId).to.be.a("string");
				expect(response?.body.verified).to.equal(false);
			});

		// The wrapper mounted the puzzle widget which autoStart-fired
		// /captcha/puzzle. Asserting the request is the cheapest signal that
		// the whole client-side handoff ran end-to-end.
		cy.wait("@puzzleChallenge", { timeout: 30000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body).to.have.property("challenge");
			});

		// User-visible: puzzle canvas rendered. The piece selector is only
		// present when the puzzle widget has actually reached its dragging
		// phase after fetching the challenge.
		getWidgetElement('[data-cy="prosopo-puzzle-piece"]', {
			timeout: 15000,
		}).should("be.visible");
	});
});
