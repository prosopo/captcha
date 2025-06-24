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
import { u8aToHex } from "@polkadot/util";
import { ProsopoDatasetError } from "@prosopo/common";
import { datasetWithSolutionHashes } from "@prosopo/datasets";
import { getPair } from "@prosopo/keyring";
import {
	AdminApiPaths,
	type Captcha,
	CaptchaType,
	type IUserSettings,
	type RegisterSitekeyBodyTypeOutput,
	Tier,
} from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

let captchaType: CaptchaType;

describe("Captchas", () => {
	before(() => {
		captchaType = Cypress.env("CAPTCHA_TYPE") || "image";
		// Call registerSiteKey and handle response here
		return cy.registerSiteKey(captchaType).then((response) => {
			// Log the response status and body using cy.task()
			cy.task("log", `Response status: ${response.status}`);
			cy.task("log", `Response: ${JSON.stringify(response.body)}`);

			// Ensure the request was successful
			expect(response.status).to.equal(200);
		});
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
		cy.registerSiteKey(CaptchaType.image);
	});

	it("Selecting the correct images passes the captcha and signs up the user", () => {
		cy.get("button").as("button");
		expect("@button").to.have.length.gte(1);
		cy.elementExists("button[type='button']:nth-of-type(2)").then(
			(confirmBtn) => {
				if (confirmBtn) {
					cy.wrap(confirmBtn).click();
				}
			},
		);
		// puts the client-example demo in the signup state. Does not exist in the client-bundle-example
		cy.clickIAmHuman().then(() => {
			// Make sure the images are loaded
			cy.captchaImages().then(() => {
				// Solve the captchas
				cy.get("@captchas").each((captcha: Captcha) => {
					cy.log("in each function");
					// Click correct images and submit the solution
					cy.clickCorrectCaptchaImages(captcha);
				});

				// wait for solution http request to complete
				cy.wait("@postSolution");

				// Get checked checkboxes
				getWidgetElement(`${checkboxClass}:checked`).should(
					"have.length.gte",
					1,
				);

				const uniqueId = `test${Cypress._.random(0, 1e6)}`;
				cy.get('input[type="password"]').type("password");
				cy.get('input[id="email"]').type(`${uniqueId}@prosopo.io`);
				cy.get('input[id="name"]').type("test");

				cy.intercept("POST", "/signup").as("signup");

				cy.get('button[data-cy="submit-button"]').first().click();

				cy.wait("@signup").then((interception) => {
					const body = interception.response?.body;
					console.log("body", body);
					const { message } = body;
					expect(message).to.equal("user created");
				});
			});
		});
	});
});
