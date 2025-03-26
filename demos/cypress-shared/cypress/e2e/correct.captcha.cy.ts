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
import { getPairAsync } from "@prosopo/keyring";
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

		const page = Cypress.env("default_page");

		console.log(`Visiting page: ${page}`);

		// visit the base URL specified on command line when running cypress
		return cy.visit(page).then(() => {
			getWidgetElement(checkboxClass).should("be.visible");
			// wrap the solutions to make them available to the tests
			cy.wrap(solutions).as("solutions");
		});
	});

	after(() => {
		return cy.registerSiteKey(CaptchaType.image);
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
				});
			});
			getWidgetElement(checkboxClass).first().should("not.be.checked");
		});

		// check the logs by going through all recorded calls
		cy.get("@log").should("have.been.calledWith", "Challenge failed");
	});

	it("Selecting the correct images passes the captcha", () => {
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
						getWidgetElement(checkboxClass).first().should("be.checked");
					});
			});
		});
	});
});
