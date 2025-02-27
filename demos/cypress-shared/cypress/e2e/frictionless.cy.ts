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

describe("Captchas", () => {
	beforeEach(() => {
		captchaType = Cypress.env("CAPTCHA_TYPE") || "image";
		cy.registerSiteKey(captchaType);

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
			getWidgetElement(checkboxClass).should("be.visible");
			// wrap the solutions to make them available to the tests
			cy.wrap(solutions).as("solutions");
		});
	});

	it("An error is returned if captcha type is set to pow and frictionless is used in the widget", () => {
		expect(captchaType).to.not.equal(CaptchaType.pow);
		cy.registerSiteKey(CaptchaType.pow).then(() => {
			cy.visit(Cypress.env("default_page"));
			cy.intercept("POST", "**/prosopo/provider/client/captcha/**").as(
				"getCaptcha",
			);
			cy.wait("@getCaptcha", { timeout: 36000 })
				.its("response")
				.then((response) => {
					expect(response).to.not.be.undefined;
					expect(response?.statusCode).to.equal(400);
					expect(response?.body).to.have.property("error");
				})
				.then(() => {
					cy.get(".captcha-checkbox", { includeShadowDom: true })
						.should("exist") // Ensures element exists
						.should("be.visible") // Ensures it's rendered
						.find("label")
						.should("have.text", "Incorrect CAPTCHA type");
				});
		});
	});

	it("An error is returned if captcha type is set to image and frictionless is used in the widget", () => {
		expect(captchaType).to.not.equal(CaptchaType.image);
		cy.registerSiteKey(CaptchaType.pow).then(() => {
			cy.visit(Cypress.env("default_page"));
			cy.intercept("POST", "**/prosopo/provider/client/captcha/**").as(
				"getCaptcha",
			);
			cy.wait("@getCaptcha", { timeout: 36000 })
				.its("response")
				.then((response) => {
					expect(response).to.not.be.undefined;
					expect(response?.statusCode).to.equal(400);
					expect(response?.body).to.have.property("error");
				})
				.then(() => {
					cy.get(".captcha-checkbox", { includeShadowDom: true })
						.should("exist") // Ensures element exists
						.should("be.visible") // Ensures it's rendered
						.find("label")
						.should("have.text", "Incorrect CAPTCHA type");
				});
		});
	});

	it("Captchas load when 'I am human' is pressed", () => {
		cy.intercept("POST", "**/prosopo/provider/client/captcha/frictionless").as(
			"frictionless",
		);
		cy.wait("@frictionless", { timeout: 36000 });

		cy.clickIAmHuman().then((captchas) => {
			expect(captchas.length).to.be.gt(0);
		});
	});
});
