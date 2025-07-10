// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import { type Captcha, CaptchaType } from "@prosopo/types";
import { at } from "@prosopo/util";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "image";

export default describe("Captchas", () => {
	beforeEach(() => {
		// Get the original captcha type from the environment variable
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
		return cy.visit(Cypress.env("default_page")).then(() => {
			// Wait for the procaptcha script to be loaded
			// This ensures tests work with both async and non-async script loading
			cy.waitForProcaptchaScript();
			getWidgetElement(checkboxClass).should("be.visible");
			// wrap the solutions to make them available to the tests
			cy.wrap(solutions).as("solutions");
		});
	});

	after(() => {
		return cy.registerSiteKey(CaptchaType.image);
	});

	it("An error is returned if captcha type is set to pow and frictionless is used in the widget", () => {
		expect(baseCaptchaType).to.not.equal(CaptchaType.pow);
		cy.registerSiteKey(baseCaptchaType, CaptchaType.pow).then((response) => {
			// Log the response status and body using cy.task()
			cy.task("log", `Response status: ${response.status}`);
			cy.task("log", `Response: ${JSON.stringify(response.body)}`);

			// Ensure the request was successful
			expect(response.status).to.equal(200);
		});
		cy.visit(Cypress.env("default_page"));

		// Wait for the procaptcha script to be loaded after navigation
		cy.waitForProcaptchaScript();

		cy.intercept("POST", "**/prosopo/provider/client/captcha/**").as(
			"getCaptcha",
		);

		return cy
			.wait("@getCaptcha", { timeout: 36000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(400);
				expect(response?.body).to.have.property("error");
			});
	});

	it("Captchas load when 'I am human' is pressed", () => {
		cy.visit(Cypress.env("default_page"));

		// Wait for the procaptcha script to be loaded after navigation
		cy.waitForProcaptchaScript();

		cy.intercept("POST", "**/prosopo/provider/client/captcha/frictionless").as(
			"frictionless",
		);
		cy.wait("@frictionless", { timeout: 5000 });

		cy.clickIAmHuman().then((captchas) => {
			expect(captchas.length).to.be.gt(0);
		});
	});
});
