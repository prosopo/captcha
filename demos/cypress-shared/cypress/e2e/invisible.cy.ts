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

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "image";

describe("Captchas", () => {
	beforeEach(() => {
		cy.registerSiteKey(baseCaptchaType).then((response) => {
			// Log the response status and body using cy.task()
			cy.task("log", `Response status: ${response.status}`);
			cy.task("log", `Response: ${JSON.stringify(response.body)}`);

			// Ensure the request was successful
			expect(response.status).to.equal(200);
		});

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
		return cy.visit(Cypress.env("default_page"));
	});

	after(() => {
		// Re-register the site key to reset state for subsequent test runs
		// Using failOnStatusCode: false in the command, so this won't throw
		cy.registerSiteKey(CaptchaType.image).then((response) => {
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

	it("Captchas load when 'I am human' is pressed", () => {
		cy.visit(Cypress.env("default_page"));

		// Fill in name and email
		cy.get("input[name='name']").type("John Doe");
		cy.get("input[name='email']").type("john.doe@example.com");

		// Wait for form validation to settle
		cy.wait(500);

		// Click the submit button
		cy.get('[data-cy="submit-button"]').click();

		// Wait for the captcha to load
		cy.wait(2000);
		cy.captchaImages().then((images) => {
			expect(images).to.have.length(9);
		});
	});
});
