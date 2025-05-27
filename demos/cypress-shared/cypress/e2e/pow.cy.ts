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

let captchaType: CaptchaType;

describe("Proof of Work CAPTCHA", () => {
	beforeEach(() => {
		captchaType = Cypress.env("CAPTCHA_TYPE") || "pow";
		cy.registerSiteKey(captchaType).then((response) => {
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

		return cy.visit(Cypress.env("default_page")).then(() => {
			cy.waitForProcaptchaScript();
			getWidgetElement(checkboxClass).should("be.visible");
			cy.wrap(solutions).as("solutions");
		});
	});

	after(() => {
		return cy.registerSiteKey(CaptchaType.image);
	});

	it("An error is returned if captcha type is set to image and pow is used in the widget", () => {
		// Register with image site key but use POW captcha
		cy.registerSiteKey(CaptchaType.image).then((response) => {
			cy.task("log", `Response status: ${response.status}`);
			cy.task("log", `Response: ${JSON.stringify(response.body)}`);
			expect(response.status).to.equal(200);
		});
		cy.visit(Cypress.env("default_page"));

		cy.waitForProcaptchaScript();

		cy.intercept("POST", "**/prosopo/provider/client/captcha/pow").as(
			"powCaptcha",
		);

		getWidgetElement(checkboxClass, { timeout: 12000 }).first().click();

		return cy
			.wait("@powCaptcha", { timeout: 36000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(400);
				expect(response?.body).to.have.property("error");
			});
	});

	it("POW CAPTCHA loads and completes when 'I am human' is pressed", () => {
		cy.visit(Cypress.env("default_page"));

		// Wait for the procaptcha script to be loaded after navigation
		cy.waitForProcaptchaScript();

		// Intercept the POW captcha request
		cy.intercept("POST", "**/prosopo/provider/client/captcha/pow").as(
			"powCaptcha",
		);

		// Intercept the client verification request
		cy.intercept("POST", "**/prosopo/provider/client/pow/solution").as(
			"powVerify",
		);

		getWidgetElement(checkboxClass, { timeout: 12000 }).first().click();

		cy.wait("@powCaptcha", { timeout: 12000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);
			});

		// Wait for the POW computation to complete and verification to occur
		// This may take longer as it involves actual computation
		cy.wait("@powVerify", { timeout: 60000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);
				expect(response?.body.verified).to.equal(true);
			});

		// Check that the CAPTCHA was successfully verified
		cy.get(".status-success").should("exist");
		cy.get(".status-success").should(
			"contain",
			"Challenge passed successfully",
		);
	});
});
