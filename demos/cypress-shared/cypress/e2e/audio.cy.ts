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

// Reaches audio through "use audio instead" on an image site with
// `audioAccessibilityEnabled` and the audio feature flag, solves it, then
// proves the token verifies server-side: /signup only answers "user created"
// if the SDK dispatched the token to the audio endpoint.

import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.expose("CAPTCHA_TYPE") || "audio";

/** Opens the image challenge, then switches to audio through its control. */
const openAudioChallenge = (): void => {
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
	// A real click: the control ignores untrusted events.
	getWidgetElement('[data-cy="prosopo-audio-alternative"]', {
		timeout: 15000,
	})
		.first()
		.should("be.visible")
		.realClick();
};

describe("Audio CAPTCHA — signup", () => {
	before(() => {
		const registerWithRetry = (
			retries = 3,
			delay = 2000,
		): Cypress.Chainable => {
			return cy
				.registerSiteKey(baseCaptchaType, CaptchaType.image, {
					audioAccessibilityEnabled: true,
					captchaTypeFeatureFlags: { audio: true },
					// Production difficulty: the spec reads the answer, so it
					// gains nothing from an easier clip.
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
			.visit(Cypress.expose("default_page"), {
				timeout: 30000,
				failOnStatusCode: false,
			})
			.then(() => {
				cy.waitForProcaptchaScript();
			});
	});

	after(() => {
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

	it("audio chosen from the image challenge verifies via /signup — proves the SDK dispatched to the audio endpoint", () => {
		cy.intercept("POST", "/signup").as("signup");
		openAudioChallenge();

		cy.wait("@audioChallenge", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);

				const body = response?.body;
				expect(
					JSON.stringify(body),
					"challenge response must not contain the answer",
				).to.not.match(/"answer"/);
				expect(body.clip, "clip should be a wav data URI").to.match(
					/^data:audio\/wav;base64,/,
				);
				expect(body.characterCount).to.equal(5);

				cy.task<string | null>("audioAnswer", {
					challenge: body.challenge,
				}).then((answer) => {
					expect(answer, "answer should be persisted on the record").to.be.a(
						"string",
					);
					const typed = answer as string;
					expect(typed).to.have.length(5);

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

	it("a wrong answer stays on audio with a fresh challenge", () => {
		openAudioChallenge();

		cy.wait("@audioChallenge", { timeout: 15000 })
			.its("response")
			.then((response) => {
				const firstChallenge = response?.body.challenge;

				cy.task<string | null>("audioAnswer", {
					challenge: firstChallenge,
				}).then((answer) => {
					const correct = answer as string;
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
