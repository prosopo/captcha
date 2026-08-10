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

import "@cypress/xpath";
import { ProsopoDatasetError } from "@prosopo/common";
import { datasetWithSolutionHashes } from "@prosopo/datasets";
import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

// `route()`'s post-PoW phase only fires through the frictionless entry
// point — that's the surface the production widget hits and the surface
// the production bug surfaced on. Force the baseCaptchaType to
// `frictionless` so the test doesn't depend on the CAPTCHA_TYPE env var
// being right.
const baseCaptchaType = CaptchaType.frictionless;

// Routing machine source: escalate ONLY at the post-PoW phase. The same
// `route()` export is consulted by `sendCaptcha` at frictionless time too;
// returning image there would short-circuit the widget to /captcha/image
// before any PoW challenge fires, defeating the whole test. Returning
// undefined makes applyRouter fall back to the baseline (pow) at that
// phase, then at postPow phase the machine escalates to image.
// Hand-rolled string so the published machine source is exactly what the
// runner `eval`s server-side; do not import from TS — runtime is `node`.
const FORCE_IMAGE_ROUTING_MACHINE = `
	module.exports.route = function (input) {
		if (input && input.phase !== 'postPow') return undefined;
		return { captchaType: 'image' };
	};
`;

describe("Post-PoW route() escalation surfaces the image captcha", () => {
	// The frictionless siteKey from .env. Same one as other suites.
	const siteKey: string = Cypress.env(
		`PROSOPO_SITE_KEY_${CaptchaType.frictionless.toUpperCase()}`,
	);

	before(() => {
		if (!siteKey) {
			throw new Error(
				"PROSOPO_SITE_KEY_FRICTIONLESS must be set for the escalation test.",
			);
		}
		// Make sure no leftover routing machine from a previous (possibly
		// crashed) run is still in place. This is a single global wipe;
		// the siteKey we install onto in beforeEach is dapp-scoped.
		cy.removeAllDecisionMachines();
	});

	beforeEach(() => {
		// Register a fresh frictionless siteKey with powDifficulty=1 so the
		// browser-side PoW solver can finish in test time (the production
		// Twickets siteKey runs higher difficulty — that path is exercised
		// in the unit/integration suites, not here).
		cy.registerSiteKey(baseCaptchaType).then((response) => {
			cy.task("log", `registerSiteKey status: ${response.status}`);
			cy.task("log", `registerSiteKey body: ${JSON.stringify(response.body)}`);
			expect(response.status).to.equal(200);
		});

		// Force `route()` to escalate to image for this siteKey only.
		cy.installRoutingMachine(siteKey, FORCE_IMAGE_ROUTING_MACHINE).then(
			(response) => {
				cy.task("log", `installRoutingMachine status: ${response.status}`);
				expect(response.status).to.equal(200);
			},
		);

		const solutions = datasetWithSolutionHashes.captchas.map((captcha) => ({
			captchaContentId: captcha.captchaContentId,
			solution: captcha.solution,
		}));

		if (!solutions) {
			throw new ProsopoDatasetError(
				"DATABASE.DATASET_WITH_SOLUTIONS_GET_FAILED",
				{
					context: { datasetWithSolutionHashes },
				},
			);
		}
		cy.intercept("/dummy").as("dummy");

		return cy.visit(Cypress.env("default_page")).then(() => {
			cy.waitForProcaptchaScript();
			getWidgetElement(checkboxClass).should("be.visible");
			cy.wrap(solutions).as("solutions");
		});
	});

	after(() => {
		// Clear the forced routing machine so this suite doesn't poison
		// later runs that share the provider.
		cy.removeAllDecisionMachines();
		// Re-register the siteKey at the conventional image baseline so
		// later parallel suites don't start with stale settings.
		cy.registerSiteKey(CaptchaType.image).then((response) => {
			if (response.status !== 200) {
				cy.task(
					"log",
					`Warning: Could not re-register siteKey. Status: ${response.status}`,
				);
			}
		});
	});

	it("displays the image captcha after PoW is solved and route() escalates", () => {
		cy.visit(Cypress.env("default_page"));
		cy.waitForProcaptchaScript();

		// Watch every leg of the flow so the test fails on a specific edge
		// rather than a "modal didn't appear" timeout.
		cy.intercept("POST", "**/prosopo/provider/client/captcha/frictionless").as(
			"frictionless",
		);
		cy.intercept("POST", "**/prosopo/provider/client/captcha/pow").as(
			"powChallenge",
		);
		cy.intercept("POST", "**/prosopo/provider/client/pow/solution").as(
			"powSubmit",
		);
		// `imageChallenge` is the UI contract: it only fires if the frictionless
		// wrapper's onEscalate handler was actually invoked AND the freshly
		// loaded Procaptcha image widget mounted and ran its autoStart effect.
		// A regression in any link of that chain (e.g. the ProcaptchaPow
		// Suspense wrapper dropping `onEscalate` from its forwarded props)
		// will block this request from ever leaving the page.
		cy.intercept("POST", "**/prosopo/provider/client/captcha/image").as(
			"imageChallenge",
		);

		// Kick the flow off.
		getWidgetElement(checkboxClass, { timeout: 12000 }).first().realClick();

		// Frictionless decide() returns default_pow at this threshold/score,
		// so the widget moves to /captcha/pow next.
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

		// The widget runs the PoW solver in the page (difficulty=1, fast),
		// then submits. The CRITICAL contract: the response carries
		// `escalation: { captchaType: 'image', sessionId: <newId> }`,
		// because the routing machine we installed forces image. With
		// `verified: false`, the wrapper's onEscalate handler mounts the
		// image widget for the user.
		cy.wait("@powSubmit", { timeout: 60000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body).to.have.property("escalation");
				expect(response?.body.escalation.captchaType).to.equal(
					CaptchaType.image,
				);
				expect(response?.body.escalation.sessionId).to.be.a("string");
				// PoW alone is not enough when the router escalates — the user
				// has to clear the follow-up image challenge before they get a
				// token.
				expect(response?.body.verified).to.equal(false);
			});

		// UI contract: once the wrapper receives the escalation envelope it
		// must mount the image widget, whose autoStart effect kicks off
		// /captcha/image. Asserting the request is the cheapest signal that
		// the whole client-side handoff actually executed end-to-end. The
		// real regression we're guarding here is a missing prop on the
		// Suspense wrapper around ProcaptchaWidget swallowing `onEscalate`
		// before it reaches Manager — in that case Manager.start silently
		// no-ops onEscalate?.(), no further request fires, and the user
		// stares at a spinning checkbox.
		cy.wait("@imageChallenge", { timeout: 30000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body).to.have.property("captchas");
				expect(response?.body.captchas).to.have.length.gte(1);
			});

		// And the image modal should be visible to the user — same DOM
		// surface the image-flow tests reach via cy.captchaImages().
		getWidgetElement(".prosopo-modalInner p", { timeout: 15000 }).should(
			"be.visible",
		);
	});
});
