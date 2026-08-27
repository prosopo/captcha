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

// End-to-end coverage of the frictionless score ladder: one score line cut
// into three bands by `settings.frictionlessThreshold`, so a session gets a
// silent PoW, a puzzle, or an image captcha depending on where it lands.
//
// Driving a real score from a headless browser isn't possible — the detector
// can't produce a server-decryptable payload, which is why the CI step sets
// PROSOPO_TEST_FRICTIONLESS_DETECTOR_OVERRIDE and pins the base score to 0.
// So the score is supplied from the other side instead: a Restrict access
// rule carrying `frictionlessScore` adds a known amount to the base score and
// then falls through to the decision machine (it has no `captchaType`, so it
// pins nothing — see handleAccessPolicy's `handled: false` return). Score in,
// captchaType out, with the ladder as the only thing in between.
//
// The assertions read `/captcha/frictionless`'s own response body rather than
// watching which follow-up endpoint the widget calls, matching
// routingFrictionless.cy.ts — that is the value the ladder actually produced,
// before any widget-side interpretation of it.

import "@cypress/xpath";
import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "image";

const siteKey: string = Cypress.env(
	`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
);

// Rungs chosen with clear air either side of each band's boundary so the
// assertions can't flip on a small scoring change: PoW below 0.5, puzzle
// across 0.5-1.2, image at 1.2 and up.
const PUZZLE_RUNG = 0.5;
const IMAGE_RUNG = 1.2;

// Scores aimed at the middle of each band rather than at its edges.
const SCORE_IN_PUZZLE_BAND = 0.8;
const SCORE_IN_IMAGE_BAND = 1.5;

const buildScoreRule = (frictionlessScore: number) => [
	{
		accessPolicy: {
			// Restrict, deliberately with no `captchaType`: the rule exists
			// only to move the score. Pinning a type here would short-circuit
			// the decision machine and test nothing about the ladder.
			type: "restrict",
			frictionlessScore,
			description: `cypress-test-ladder-score-${frictionlessScore}`,
		},
		policyScopes: [{ clientId: siteKey }],
		userScopes: [{}],
		expiresUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
	},
];

describe("Frictionless score ladder picks the captcha type by score", () => {
	before(() => {
		if (!siteKey) {
			throw new Error(
				`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()} must be set for the score ladder test.`,
			);
		}
		cy.deleteAllAccessRules();
	});

	beforeEach(() => {
		cy.deleteAllAccessRules();
		cy.registerSiteKey(baseCaptchaType, undefined, {
			frictionlessThreshold: {
				frictionlessPuzzleThreshold: PUZZLE_RUNG,
				frictionlessImageThreshold: IMAGE_RUNG,
			},
		}).then((response) => {
			expect(response.status).to.equal(200);
		});
		// Prime the page + widget script cache. Each `it` re-visits after its
		// intercepts are primed, because the frictionless widget fires
		// /frictionless on mount (same pattern as routingFrictionless.cy.ts).
		return cy.visit(Cypress.env("default_page")).then(() => {
			cy.waitForProcaptchaScript();
			getWidgetElement(checkboxClass).should("be.visible");
		});
	});

	after(() => {
		cy.deleteAllAccessRules();
		cy.registerSiteKey(CaptchaType.image);
	});

	const primeAndVisit = () => {
		cy.intercept("POST", "**/prosopo/provider/client/captcha/frictionless").as(
			"frictionless",
		);
		cy.visit(Cypress.env("default_page"));
		cy.waitForProcaptchaScript();
	};

	const expectServedType = (expected: CaptchaType, why: string) => {
		cy.wait("@frictionless", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body).to.have.property("captchaType");
				expect(response?.body.captchaType, why).to.equal(expected);
			});
	};

	it("serves PoW for a score below the puzzle rung", () => {
		// No score rule at all: the detector override pins the base score to
		// 0, which is under every rung, so the session passes frictionlessly.
		primeAndVisit();
		expectServedType(
			CaptchaType.pow,
			"a clean score must still pass silently to PoW",
		);
	});

	it("serves a puzzle for a score between the two rungs", () => {
		// The band this whole change exists to create: previously anything
		// over the single threshold went straight to an image captcha.
		cy.addAccessRules(buildScoreRule(SCORE_IN_PUZZLE_BAND)).then((response) => {
			expect(response.status).to.equal(200);
		});

		primeAndVisit();
		expectServedType(
			CaptchaType.puzzle,
			"a score in the middle band must get a puzzle, not an image captcha",
		);
	});

	it("serves an image captcha for a score at or above the image rung", () => {
		cy.addAccessRules(buildScoreRule(SCORE_IN_IMAGE_BAND)).then((response) => {
			expect(response.status).to.equal(200);
		});

		primeAndVisit();
		expectServedType(
			CaptchaType.image,
			"a score above the image rung must still get an image captcha",
		);
	});

	it("collapses to the old two-outcome behaviour when both rungs match", () => {
		// A site that puts both rungs on the same value opts out of the
		// middle band entirely and must behave exactly as it did before the
		// ladder existed: pass, or image.
		cy.registerSiteKey(baseCaptchaType, undefined, {
			frictionlessThreshold: {
				frictionlessPuzzleThreshold: PUZZLE_RUNG,
				frictionlessImageThreshold: PUZZLE_RUNG,
			},
		}).then((response) => {
			expect(response.status).to.equal(200);
		});
		cy.addAccessRules(buildScoreRule(SCORE_IN_PUZZLE_BAND)).then((response) => {
			expect(response.status).to.equal(200);
		});

		primeAndVisit();
		expectServedType(
			CaptchaType.image,
			"a collapsed band must send the same score to image, as it did before the ladder",
		);
	});

	it("reads a pre-ladder bare threshold as the puzzle rung", () => {
		// Client records are replicated to providers rather than migrated in
		// lockstep, so a record still holding the old bare number has to keep
		// routing — as the puzzle rung, which is what it always meant. With
		// the image rung falling back to its default of 1, a 1.5 score is
		// still an image captcha.
		cy.registerSiteKey(baseCaptchaType, undefined, {
			frictionlessThreshold: PUZZLE_RUNG,
		}).then((response) => {
			expect(response.status).to.equal(200);
		});
		cy.addAccessRules(buildScoreRule(SCORE_IN_IMAGE_BAND)).then((response) => {
			expect(response.status).to.equal(200);
		});

		primeAndVisit();
		expectServedType(
			CaptchaType.image,
			"a legacy numeric threshold must keep routing rather than break the flow",
		);
	});
});
