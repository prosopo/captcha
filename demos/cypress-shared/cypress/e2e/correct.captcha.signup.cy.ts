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
import type { Captcha, CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "image";

describe("Captchas", () => {
	before(() => {
		// Call registerSiteKey and handle response here with retry logic
		const registerWithRetry = (
			retries = 3,
			delay = 2000,
		): Cypress.Chainable => {
			return cy.registerSiteKey(baseCaptchaType).then((response) => {
				// Log the response status and body using cy.task()
				cy.task("log", `Response status: ${response.status}`);
				cy.task("log", `Response: ${JSON.stringify(response.body)}`);

				// If request failed and we have retries left, try again
				if (response.status !== 200 && retries > 0) {
					cy.task(
						"log",
						`Site key registration failed. Retrying... (${retries} attempts left)`,
					);
					cy.wait(delay);
					return registerWithRetry(retries - 1, delay);
				}

				// Ensure the request was successful
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

		// visit the base URL specified on command line when running cypress
		return cy
			.visit(Cypress.env("default_page"), {
				timeout: 30000,
				failOnStatusCode: false, // Don't fail immediately on non-2xx status codes
			})
			.then(() => {
				// Wait for the procaptcha script to be loaded
				// This ensures tests work with both async and non-async script loading
				cy.waitForProcaptchaScript();

				// Wait for widget to be visible with longer timeout for CI
				getWidgetElement(checkboxClass, { timeout: 15000 }).should(
					"be.visible",
				);

				// wrap the solutions to make them available to the tests
				cy.wrap(solutions).as("solutions");
			});
	});

	after(() => {
		// Re-register the site key to reset state for subsequent test runs
		// Using failOnStatusCode: false in the command, so this won't throw
		cy.registerSiteKey(baseCaptchaType).then((response) => {
			if (response.status === 200) {
				cy.task("log", "Site key successfully re-registered");
			} else {
				cy.task(
					"log",
					`Warning: Could not re-register site key. Status: ${response.status}`,
				);
			}
		});
	});

	it("Selecting the correct images passes the captcha and signs up the user", () => {
		// Set up signup intercept early
		cy.intercept("POST", "/signup").as("signup");

		cy.get("button").as("button");
		expect("@button").to.have.length.gte(1);

		cy.elementExists("button[type='button']:nth-of-type(2)").then(
			(confirmBtn: Element | null) => {
				if (confirmBtn) {
					cy.wrap(confirmBtn).click();
				}
			},
		);

		// Click "I am human" button
		cy.clickIAmHuman();

		// Wait for images to load with timeout
		cy.captchaImages();

		// Solve the captchas
		cy.get("@captchas").each((captcha: Captcha) => {
			cy.log(`Solving captcha: ${captcha.captchaContentId}`);
			// Click correct images and submit the solution
			cy.clickCorrectCaptchaImages(captcha);
			cy.wait(1000);
		});

		// Wait for solution http request to complete with timeout
		cy.wait("@postSolution", { timeout: 15000 })
			.its("response.statusCode")
			.should("be.oneOf", [200, 201]);

		// Give the UI time to update
		cy.wait(1000);

		// Verify checkbox is checked
		getWidgetElement(`${checkboxClass}:checked`).should("have.length.gte", 1);

		// Fill in form fields with proper waiting
		const uniqueId = `test${Cypress._.random(0, 1e6)}`;

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

		// Ensure the submit button is visible and enabled
		cy.get('button[data-cy="submit-button"]', { timeout: 10000 })
			.first()
			.should("be.visible")
			.should("not.be.disabled");

		// Click submit button
		cy.get('button[data-cy="submit-button"]').first().realClick();

		// Wait for signup response with extended timeout and proper error handling
		cy.wait("@signup", { timeout: 20000 }).then((interception) => {
			cy.task(
				"log",
				`Signup response status: ${interception.response?.statusCode}`,
			);

			// Verify response exists
			expect(interception.response, "Signup response should exist").to.exist;
			expect(
				interception.response?.statusCode,
				"Signup should return 200 or 201",
			).to.be.oneOf([200, 201]);

			const body = interception.response?.body;
			cy.task("log", `Signup response body: ${JSON.stringify(body)}`);

			// Check if body exists before destructuring
			expect(body, "Response body should exist").to.exist;
			expect(body, "Response body should not be null").to.not.be.null;

			const { message } = body;
			expect(message, "Message should indicate user was created").to.equal(
				"user created",
			);
		});
	});
});
