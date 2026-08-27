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
// The score is therefore supplied through the language-rule lever instead:
// `L_RULES` maps a language tag to a score the provider adds to the base, and
// the CI step configures two synthetic tags, one landing in each band. Each
// test rewrites `accept-language` on the way through, the same way
// routingFrictionless.cy.ts injects its routing header. Score in, captchaType
// out, with the ladder as the only thing in between.
//
// The tags are deliberately not real languages, so they cannot collide with
// the `en-US,en;q=0.9` the browser sends by default — that default has to
// score zero for the PoW case to mean anything.
//
// Assertions read `/captcha/frictionless`'s own response body rather than
// watching which endpoint the widget calls next, matching
// routingFrictionless.cy.ts — that is the value the ladder produced, before
// any widget-side interpretation of it.

import "@cypress/xpath";
import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "image";

const siteKey: string = Cypress.env(
	`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
);

// Rungs with clear air either side of each boundary so the assertions can't
// flip on a small scoring change: PoW below 0.5, puzzle across 0.5-1.2,
// image at 1.2 and up.
const PUZZLE_RUNG = 0.5;
const IMAGE_RUNG = 1.2;

// Language tags the CI step maps to a score via L_RULES. Values are aimed at
// the middle of each band, not at its edges. Keep in step with the workflow.
const LANG_PUZZLE_BAND = "zz-puzzleband"; // scores 0.8
const LANG_IMAGE_BAND = "zz-imageband"; // scores 1.5

describe("Frictionless score ladder picks the captcha type by score", () => {
	before(() => {
		if (!siteKey) {
			throw new Error(
				`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()} must be set for the score ladder test.`,
			);
		}
	});

	beforeEach(() => {
		cy.registerSiteKey(baseCaptchaType, undefined, {
			frictionlessThreshold: {
				frictionlessPuzzleThreshold: PUZZLE_RUNG,
				frictionlessImageThreshold: IMAGE_RUNG,
			},
		}).then((response) => {
			expect(response.status).to.equal(200);
		});
		// Deliberately no priming visit here. The frictionless widget fires
		// `/frictionless` on mount, so a warm-up visit creates a real session
		// for (user, ip, sitekey) — and `/frictionless` deduplicates on that
		// triple and replays a live session rather than scoring again. The
		// warm-up's score-0 session was therefore handed straight back to the
		// request the test had just set its language header on, and every
		// banded case came back `pow`. `primeAndVisit` is the only visit, and
		// it registers the intercepts before it.
	});

	after(() => {
		cy.registerSiteKey(CaptchaType.image);
	});

	// Mounts the widget from scratch with intercepts already primed. `lang`
	// decides which band the session's score lands in.
	const primeAndVisit = (lang?: string) => {
		cy.intercept(
			"POST",
			"**/prosopo/provider/client/captcha/frictionless",
			(req) => {
				if (lang) {
					req.headers["accept-language"] = lang;
				}
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

	/**
	 * Assert the type `/frictionless` chose, then drive the widget far enough
	 * to consume the session it created.
	 *
	 * The consume step is not incidental. `/frictionless` deduplicates on
	 * user + IP + sitekey and replays any live session for that triple, and
	 * the widget's identity is derived from the browser fingerprint — so it
	 * is the same for every test in the run. A session left alive here would
	 * be handed straight back to the next test, which would then assert
	 * against this test's band rather than its own. Fetching the challenge
	 * removes the session (`checkAndRemoveSession`), leaving a clean slate.
	 */
	const expectServedType = (expected: CaptchaType, why: string) => {
		cy.wait("@frictionless", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response?.statusCode).to.equal(200);
				expect(response?.body).to.have.property("captchaType");
				expect(response?.body.captchaType, why).to.equal(expected);
			});

		getWidgetElement(checkboxClass, { timeout: 15000 }).first().realClick();
		cy.wait(`@${expected}`, { timeout: 20000 })
			.its("response.statusCode")
			.should("equal", 200);
	};

	it("serves PoW for a score below the puzzle rung", () => {
		// No language override: the browser's own accept-language scores
		// nothing, and the detector override pins the base score to 0.
		primeAndVisit();
		expectServedType(
			CaptchaType.pow,
			"a clean score must still pass silently to PoW",
		);
	});

	it("serves a puzzle for a score between the two rungs", () => {
		// The band this whole change exists to create: previously anything
		// over the single threshold went straight to an image captcha.
		primeAndVisit(LANG_PUZZLE_BAND);
		expectServedType(
			CaptchaType.puzzle,
			"a score in the middle band must get a puzzle, not an image captcha",
		);
	});

	it("serves an image captcha for a score above the image rung", () => {
		primeAndVisit(LANG_IMAGE_BAND);
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

		primeAndVisit(LANG_PUZZLE_BAND);
		expectServedType(
			CaptchaType.image,
			"a collapsed band must send the same score to image, as it did before the ladder",
		);
	});

	it("reads a pre-ladder bare threshold as the puzzle rung", () => {
		// Client records are replicated to providers rather than migrated in
		// lockstep, so a record still holding the old bare number has to keep
		// routing — as the puzzle rung, which is what it always meant. The
		// image rung falls back to its default of 1, so a 1.5 score is still
		// an image captcha.
		cy.registerSiteKey(baseCaptchaType, undefined, {
			frictionlessThreshold: PUZZLE_RUNG,
		}).then((response) => {
			expect(response.status).to.equal(200);
		});

		primeAndVisit(LANG_IMAGE_BAND);
		expectServedType(
			CaptchaType.image,
			"a legacy numeric threshold must keep routing rather than break the flow",
		);
	});
});
