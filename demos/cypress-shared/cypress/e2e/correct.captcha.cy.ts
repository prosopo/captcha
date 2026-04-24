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
import {
	buildTestSolutions,
	checkboxClass,
	getWidgetElement,
} from "../support/commands.js";

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
		const solutions = buildTestSolutions(datasetWithSolutionHashes.captchas);

		if (!solutions) {
			throw new ProsopoDatasetError(
				"DATABASE.DATASET_WITH_SOLUTIONS_GET_FAILED",
				{
					context: { datasetWithSolutionHashes },
				},
			);
		}

		cy.intercept("/dummy").as("dummy");

		const page = Cypress.env("default_page");

		console.log(`Visiting page: ${page}`);

		// visit the base URL specified on command line when running cypress
		return cy
			.visit(page, {
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

	it("Selecting the incorrect images fails the captcha", () => {
		cy.window()
			.its("console")
			.then((console) => {
				cy.spy(console, "log").as("log");
			});
		cy.clickIAmHuman().then(() => {
			// Make sure the images are loaded
			cy.captchaImages().then(() => {
				cy.get("@captchas").each((captcha: Captcha) => {
					cy.log("in each function");
					// Click correct images and submit the solution
					cy.clickNextButton();
					// wait a bit for the next captcha to load before clicking incorrect images
					cy.wait(500);
				});
			});
			getWidgetElement(checkboxClass).first().should("not.be.checked");
		});

		// check the logs by going through all recorded calls
		cy.get("@log").should("have.been.calledWith", "Challenge failed");
	});

	it("Selecting the correct images passes the captcha", () => {
		cy.window()
			.its("console")
			.then((console) => {
				cy.spy(console, "log").as("log");
			});

		// Click "I am human" button
		cy.clickIAmHuman();

		// Wait for images to load
		cy.captchaImages();

		// Solve the captchas
		cy.get("@captchas").each((captcha: Captcha, index: number) => {
			cy.log(`Solving captcha ${index + 1}: ${captcha.captchaContentId}`);
			// Click correct images and submit the solution
			cy.clickCorrectCaptchaImages(captcha);
			// Wait for the next captcha to fully load before continuing
			// This is critical for CICD where the second round can be slower
			cy.wait(1200); // Increased wait time for CI to ensure next captcha loads
		});

		// Wait for solution to be processed
		cy.wait(1000);

		// Verify checkbox is checked
		getWidgetElement(checkboxClass, { timeout: 10000 })
			.first()
			.should("be.checked");

		// check the logs by going through all recorded calls
		cy.get("@log", { timeout: 5000 }).should(
			"have.been.calledWith",
			"Challenge passed",
		);
	});
});
