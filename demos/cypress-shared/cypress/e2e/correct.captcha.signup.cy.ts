// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import type { Captcha } from "@prosopo/types";
import { checkboxClass } from "../support/commands.js";

describe("Captchas", () => {
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
		return cy.visit(Cypress.env("default_page")).then(() => {
			cy.get(checkboxClass).should("be.visible");
			// wrap the solutions to make them available to the tests
			cy.wrap(solutions).as("solutions");
		});
	});

	it("Selecting the correct images passes the captcha", () => {
		cy.get('button[type="button"]').eq(1).click();
		cy.clickIAmHuman().then(() => {
			// Make sure the images are loaded
			cy.captchaImages().then(() => {
				// Solve the captchas
				cy.get("@captchas")
					.each((captcha: Captcha) => {
						cy.log("in each function");
						// Click correct images and submit the solution
						cy.clickCorrectCaptchaImages(captcha);
					})
					.then(() => {
						// Get inputs of type checkbox
						cy.get("input[type='checkbox']").then((checkboxes) => {
							cy.wrap(checkboxes).first().should("be.checked");
						});
					});
				const uniqueId = Cypress._.uniqueId("test");
				cy.get('input[type="password"]').type("password");
				cy.get('input[id="email"]').type(`${uniqueId}@prosopo.io`);
				cy.get('input[id="name"]').type("test");
				cy.get('button[type="button"]').first().click();

				cy.contains("user created").should("be.visible");

				// reloading the page and checking the box again should not require a captcha to be solved
				cy.reload();

				cy.get(checkboxClass, { timeout: 12000 }).first().click();
			});
		});
	});
});
