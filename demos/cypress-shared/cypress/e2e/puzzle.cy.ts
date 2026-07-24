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
// silent `verified: false` responses on legitimate solvers. This test locks
// in the full chain: widget mints a puzzle token → demo dapp POSTs it back to
// its server → server calls `prosopoServer.isVerified(token)` → SDK dispatches
// to the puzzle endpoint → provider verifies against the puzzlecaptchas
// collection → `status-success` renders.
//
// The puzzle tolerance is registered at 999 px, well beyond the 300×200
// canvas diagonal (~360 px), so any release point in the puzzle area passes.
// That lets Cypress simulate the drag without pixel-perfect target hitting,
// which matches the bot-solvable posture we want to test.

import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "image";

// Big enough to swallow any click inside the canvas — the check is Euclidean
// distance to the target centre, and the canvas is 300×200. Anything ≥ ~360
// admits any release point; 999 gives generous headroom.
const LAX_PUZZLE_TOLERANCE = 999;

describe("Puzzle CAPTCHA", () => {
	beforeEach(() => {
		cy.registerSiteKey(baseCaptchaType, CaptchaType.puzzle, {
			puzzleTolerance: LAX_PUZZLE_TOLERANCE,
		}).then((response) => {
			cy.task("log", `Response status: ${response.status}`);
			cy.task("log", `Response: ${JSON.stringify(response.body)}`);
			expect(response.status).to.equal(200);
		});

		cy.intercept("/dummy").as("dummy");

		return cy.visit(Cypress.env("default_page")).then(() => {
			cy.waitForProcaptchaScript();
			getWidgetElement(checkboxClass).should("be.visible");
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

	it("puzzle mints a captchaType-puzzle token and server-verifies via the puzzle endpoint", () => {
		cy.visit(Cypress.env("default_page"));

		cy.waitForProcaptchaScript();

		// Intercept the three interesting network moments in the puzzle path.
		cy.intercept("POST", "**/prosopo/provider/client/captcha/puzzle").as(
			"puzzleChallenge",
		);
		cy.intercept("POST", "**/prosopo/provider/client/puzzle/solution").as(
			"puzzleSolution",
		);
		cy.intercept("POST", "**/prosopo/provider/client/puzzle/verify").as(
			"puzzleServerVerify",
		);

		// Click "I am human" to kick off the puzzle flow.
		getWidgetElement(checkboxClass, { timeout: 12000 }).first().realClick();

		// The provider serves a puzzle challenge (target coords + canvas image).
		cy.wait("@puzzleChallenge", { timeout: 12000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);
			});

		// Puzzle canvas renders; drag the piece anywhere within the canvas.
		// Any release point passes because the tolerance was raised to swallow
		// the whole canvas. See LAX_PUZZLE_TOLERANCE above.
		cy.get('[data-cy="prosopo-puzzle-piece"]', { timeout: 15000 })
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

		// Client → provider: submit puzzle solution. Must be verified=true —
		// this is the client-side verification the widget performs before
		// minting the token.
		cy.wait("@puzzleSolution", { timeout: 30000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);
				expect(response?.body.verified).to.equal(true);
			});

		// The end-to-end proof: the demo dapp forwards the puzzle token to its
		// server, which calls prosopoServer.isVerified(token). With the fix
		// in this PR, isVerified dispatches to the puzzle endpoint. Watch for
		// that request and its verified: true response.
		cy.wait("@puzzleServerVerify", { timeout: 30000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);
				expect(response?.body.verified).to.equal(true);
			});

		// UI confirmation that the whole chain completed.
		cy.get(".status-success", { timeout: 15000 }).should("exist");
		cy.get(".status-success").should(
			"contain",
			"Challenge passed successfully",
		);
	});
});
