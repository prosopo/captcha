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

// End-to-end coverage of `settings.frictionlessTypes` — the on/off switch for
// each interactive challenge type.
//
// The score ladder decides which type a session *wants*; this decides which
// types the site *permits*. The two are independent, and the interesting cases
// are the ones where they disagree: a score that lands squarely in the image
// band on a site that has turned image off must come back as a puzzle, not an
// image captcha. A customer asking us never to serve image captchas is the
// reason this exists, so "never" is what these tests check.
//
// Same levers as frictionlessLadder.cy.ts, for the same reasons: the detector
// cannot produce a server-decryptable payload from a headless browser, so CI
// pins the base score to 0 via PROSOPO_TEST_FRICTIONLESS_DETECTOR_OVERRIDE and
// the score is supplied through `L_RULES` language tags. Read that spec's
// header for the full rationale, including why there is no priming visit.
//
// Assertions read `/captcha/frictionless`'s own response body — the type the
// server actually settled on, before any widget-side interpretation.

import "@cypress/xpath";
import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "image";

const siteKey: string = Cypress.env(
	`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
);

// Same rungs as the ladder spec, with clear air either side of each boundary.
const PUZZLE_RUNG = 0.5;
const IMAGE_RUNG = 1.2;

// Language tags CI maps to a score via L_RULES. Keep in step with the
// workflow and with frictionlessLadder.cy.ts.
const LANG_PUZZLE_BAND = "zz-puzzleband"; // scores 0.8 -> puzzle band
const LANG_IMAGE_BAND = "zz-imageband"; // scores 1.5 -> image band

describe("frictionlessTypes bounds what the ladder may serve", () => {
	before(() => {
		if (!siteKey) {
			throw new Error(
				`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()} must be set for the challenge-types test.`,
			);
		}
	});

	// Leave the sitekey as the rest of the suite expects it, whatever this
	// spec did to it — including on failure.
	after(() => {
		cy.registerSiteKey(CaptchaType.image);
	});

	/**
	 * Register the sitekey with both ladder rungs pinned and a given
	 * enabled-type pair. `types` undefined registers no `frictionlessTypes` at
	 * all, which is the shape every client record written before the field
	 * existed still has.
	 */
	const configure = (types?: { image: boolean; puzzle: boolean }) => {
		cy.registerSiteKey(baseCaptchaType, undefined, {
			frictionlessThreshold: {
				frictionlessPuzzleThreshold: PUZZLE_RUNG,
				frictionlessImageThreshold: IMAGE_RUNG,
			},
			...(types ? { frictionlessTypes: types } : {}),
		}).then((response) => {
			expect(response.status).to.equal(200);
		});
	};

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
	 * Assert the served type, then drive the widget far enough to consume the
	 * session. The consume step is load-bearing: `/frictionless` deduplicates
	 * on user + IP + sitekey and the widget's identity is constant across the
	 * run, so a session left alive is replayed into the next test and that
	 * test asserts against this one's configuration. See frictionlessLadder.
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

	describe("image disabled", () => {
		beforeEach(() => configure({ image: false, puzzle: true }));

		it("serves a puzzle for a score that would otherwise get an image", () => {
			// The case the whole setting exists for. Without coercion this is an
			// image captcha, which is exactly what the customer asked us never
			// to serve.
			primeAndVisit(LANG_IMAGE_BAND);
			expectServedType(
				CaptchaType.puzzle,
				"a site with image disabled must never be served an image captcha, whatever the score",
			);
		});

		it("still serves a puzzle in the puzzle band", () => {
			primeAndVisit(LANG_PUZZLE_BAND);
			expectServedType(
				CaptchaType.puzzle,
				"disabling image must not disturb the band that already served a puzzle",
			);
		});

		it("still passes a clean score silently to PoW", () => {
			// Coercion narrows; it must never promote a passing session into a
			// challenge it did not earn.
			primeAndVisit();
			expectServedType(
				CaptchaType.pow,
				"disabling image must not add friction below the puzzle rung",
			);
		});
	});

	describe("puzzle disabled", () => {
		beforeEach(() => configure({ image: true, puzzle: false }));

		it("serves an image for a score that would otherwise get a puzzle", () => {
			primeAndVisit(LANG_PUZZLE_BAND);
			expectServedType(
				CaptchaType.image,
				"with puzzle disabled the middle band must fall back to image",
			);
		});

		it("still serves an image above the image rung", () => {
			primeAndVisit(LANG_IMAGE_BAND);
			expectServedType(
				CaptchaType.image,
				"disabling puzzle must leave the image band untouched",
			);
		});
	});

	describe("both disabled", () => {
		beforeEach(() => configure({ image: false, puzzle: false }));

		it("falls back to PoW in the image band", () => {
			// PoW is deliberately not toggleable — it needs no interaction from
			// the user, so it is the one type always left to fall back to.
			primeAndVisit(LANG_IMAGE_BAND);
			expectServedType(
				CaptchaType.pow,
				"with both interactive types off, PoW is the only thing left to serve",
			);
		});

		it("falls back to PoW in the puzzle band", () => {
			primeAndVisit(LANG_PUZZLE_BAND);
			expectServedType(
				CaptchaType.pow,
				"with both interactive types off, the middle band must also land on PoW",
			);
		});
	});

	describe("both enabled", () => {
		beforeEach(() => configure({ image: true, puzzle: true }));

		// Regression guard: the coercion seam sits on the path every
		// frictionless session takes, so it has to be a no-op when nothing is
		// disabled.
		//
		// One band per test, deliberately. These were a single test calling
		// `primeAndVisit` three times, which re-registers the same intercept
		// aliases within one test — `cy.wait("@frictionless")` then resolves
		// against the first registration rather than the current visit, and the
		// third band asserted against the first band's response.

		it("leaves the image band alone", () => {
			primeAndVisit(LANG_IMAGE_BAND);
			expectServedType(
				CaptchaType.image,
				"with both types enabled the image band must still reach image",
			);
		});

		it("leaves the puzzle band alone", () => {
			primeAndVisit(LANG_PUZZLE_BAND);
			expectServedType(
				CaptchaType.puzzle,
				"with both types enabled the puzzle band must still reach puzzle",
			);
		});

		it("leaves a clean score passing silently to PoW", () => {
			primeAndVisit();
			expectServedType(
				CaptchaType.pow,
				"with both types enabled a clean score must still pass to PoW",
			);
		});
	});

	describe("record written before the field existed", () => {
		beforeEach(() => configure(undefined));

		it("treats a missing setting as every type enabled", () => {
			// Client records replicate to providers rather than migrating in
			// lockstep, so a record with no `frictionlessTypes` must keep
			// serving what it served yesterday — not silently narrow to PoW.
			primeAndVisit(LANG_IMAGE_BAND);
			expectServedType(
				CaptchaType.image,
				"an absent frictionlessTypes must mean 'everything enabled', not 'nothing enabled'",
			);
		});
	});
});
