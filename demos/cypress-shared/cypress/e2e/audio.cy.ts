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

// End-to-end proof that the audio captcha works, all the way from
// challenge issuance to the dapp server's verify call.
//
// Drives the audio-implicit demo page: fill signup form → click checkbox →
// audio widget appears → read the answer out of Mongo (Cypress cannot
// listen to synthesised speech; see the `audioAnswer` task in
// cypress.audio.config.js for why this is the honest approach rather than
// adding a "make anything pass" setting) → type it → widget mints token →
// form POSTs token to the demo dapp's /signup → dapp calls
// prosopoServer.isVerified(token) → the SDK must dispatch to the AUDIO
// endpoint → provider verifies against the audiocaptcha collection →
// /signup returns { message: "user created" }.
//
// If the server-side dispatch were missing an audio branch, isVerified
// would hit the wrong endpoint and 404, /signup would return a rejection,
// and the message assertion below would fail. That is the same class of
// bug puzzle.cy.ts was written to catch for the puzzle path.

import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "audio";

describe("Audio CAPTCHA — signup", () => {
	before(() => {
		const registerWithRetry = (
			retries = 3,
			delay = 2000,
		): Cypress.Chainable => {
			return cy
				.registerSiteKey(baseCaptchaType, CaptchaType.audio, {
					// Deliberately NOT made easier than production. The whole
					// point of grading real synthesised speech against a real
					// transcript is that the test exercises the same path a
					// user does; loosening it here would leave the grader
					// untested. The test knows the answer, so difficulty is
					// irrelevant to whether it passes.
					audio: {
						digitCount: 5,
					},
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
		// don't inherit audio mode.
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

	it("audio token verifies via /signup — proves the SDK dispatched to the audio endpoint", () => {
		cy.intercept("POST", "/signup").as("signup");
		cy.intercept("POST", "**/prosopo/provider/client/captcha/audio").as(
			"audioChallenge",
		);
		cy.intercept("POST", "**/prosopo/provider/client/audio/solution").as(
			"audioSolution",
		);

		// Widget renders implicitly. Wait for the "I am human" checkbox and
		// click it to open the audio challenge.
		getWidgetElement(checkboxClass, { timeout: 15000 })
			.first()
			.should("be.visible")
			.realClick();

		cy.wait("@audioChallenge", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);

				const body = response?.body;
				// The transcript must never appear in the response. This is
				// the audio equivalent of the puzzle shipping its target
				// coordinates to the client — any caller could then echo the
				// answer back and pass without rendering anything.
				expect(
					JSON.stringify(body),
					"challenge response must not contain the answer",
				).to.not.match(/"answer"/);
				expect(body.clip, "clip should be a wav data URI").to.match(
					/^data:audio\/wav;base64,/,
				);
				expect(body.characterCount).to.equal(5);

				// Ask the DB what was actually spoken, then type it.
				cy.task<string | null>("audioAnswer", {
					challenge: body.challenge,
				}).then((answer) => {
					expect(answer, "answer should be persisted on the record").to.be.a(
						"string",
					);
					const typed = answer as string;
					expect(typed).to.have.length(5);

					// Press play first: a real user cannot answer without
					// hearing the clip, and the replay/telemetry counters
					// should see a play event.
					getWidgetElement('[data-cy="prosopo-audio-play"]', {
						timeout: 15000,
					})
						.first()
						.click();

					getWidgetElement('[data-cy="prosopo-audio-answer"]', {
						timeout: 15000,
					})
						.first()
						.should("be.visible")
						.clear()
						.type(typed, { delay: 50 });

					getWidgetElement('[data-cy="prosopo-audio-submit"]', {
						timeout: 15000,
					})
						.first()
						.should("not.be.disabled")
						.click();
				});
			});

		cy.wait("@audioSolution", { timeout: 30000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);
				expect(response?.body.verified).to.equal(true);
			});

		// Widget has minted the token into the hidden procaptcha-response
		// input. Fill the form and submit — onActionHandler grabs the token
		// and POSTs it to /signup.
		const uniqueId = `audio-test-${Cypress._.random(0, 1e6)}`;
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

		// The proof: /signup uses prosopoServer.isVerified, which must send
		// the audio token to the audio endpoint. Routing it anywhere else
		// returns verified:false and /signup responds with a rejection.
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

	it("rejects a wrong answer and issues a fresh challenge", () => {
		// The retry contract: a wrong answer is a user failure, not a block,
		// and the spent challenge is replaced rather than re-offered (each
		// clip is single-use, so re-submitting against it is refused).
		cy.intercept("POST", "**/prosopo/provider/client/captcha/audio").as(
			"audioChallenge",
		);
		cy.intercept("POST", "**/prosopo/provider/client/audio/solution").as(
			"audioSolution",
		);

		getWidgetElement(checkboxClass, { timeout: 15000 })
			.first()
			.should("be.visible")
			.realClick();

		cy.wait("@audioChallenge", { timeout: 15000 })
			.its("response")
			.then((response) => {
				const firstChallenge = response?.body.challenge;

				cy.task<string | null>("audioAnswer", {
					challenge: firstChallenge,
				}).then((answer) => {
					const correct = answer as string;
					// Any five digits that are not the answer.
					const wrong = correct
						.split("")
						.map((d) => String((Number(d) + 1) % 10))
						.join("");

					getWidgetElement('[data-cy="prosopo-audio-answer"]', {
						timeout: 15000,
					})
						.first()
						.should("be.visible")
						.clear()
						.type(wrong, { delay: 50 });

					getWidgetElement('[data-cy="prosopo-audio-submit"]', {
						timeout: 15000,
					})
						.first()
						.click();

					cy.wait("@audioSolution", { timeout: 30000 })
						.its("response")
						.then((solutionResponse) => {
							expect(solutionResponse?.statusCode).to.equal(200);
							expect(solutionResponse?.body.verified).to.equal(false);
						});

					// A replacement challenge must arrive, with a different id.
					cy.wait("@audioChallenge", { timeout: 15000 })
						.its("response")
						.then((second) => {
							expect(second?.statusCode).to.equal(200);
							expect(second?.body.challenge).to.not.equal(firstChallenge);
						});
				});
			});
	});
});
