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
import { u8aToHex } from "@polkadot/util";
import { ProsopoDatasetError } from "@prosopo/common";
import { getPairAsync } from "@prosopo/contract";
import { datasetWithSolutionHashes } from "@prosopo/datasets";
import {
	AdminApiPaths,
	type Captcha,
	type IUserSettings,
} from "@prosopo/types";
import { checkboxClass } from "../support/commands.js";

describe("Captchas", () => {
	before(async () => {
		const timestamp = new Date().getTime();
		const pair = await getPairAsync(Cypress.env("PROSOPO_PROVIDER_MNEMONIC"));
		const signature = u8aToHex(pair.sign(timestamp.toString()));
		const adminSiteKeyURL = `http://localhost:9229${AdminApiPaths.SiteKeyRegister}`;
		const settings: IUserSettings = {
			captchaType: "pow",
			domains: ["0.com"],
			frictionlessThreshold: 0.5,
			powDifficulty: 2,
		};
		await fetch(adminSiteKeyURL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				signature: signature,
				timestamp: timestamp.toString(),
			},
			body: JSON.stringify({
				siteKey: Cypress.env("PROSOPO_SITE_KEY"),
				settings,
			}),
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
			cy.get(checkboxClass).should("be.visible");
			// wrap the solutions to make them available to the tests
			cy.wrap(solutions).as("solutions");
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
				});
			});
			cy.get("input[type='checkbox']").then((checkboxes) => {
				cy.wrap(checkboxes).first().should("not.be.checked");
			});
		});

		// check the logs by going through all recorded calls
		cy.get("@log").should(
			"have.been.calledWith",
			"The user failed the captcha",
		);
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
						cy.get("input[type='checkbox']").then((checkboxes) => {
							cy.wrap(checkboxes).first().should("be.checked");
						});
					});
			});
		});
	});
});
