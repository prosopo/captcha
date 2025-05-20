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
		// Define the onCaptchaVerified callback
		cy.window().then((win) => {
			// @ts-ignore
			win.onCaptchaVerified = () => {
				// Mock implementation for the test
				console.log("Challenge passed");
			};
		});
		captchaType = Cypress.env("CAPTCHA_TYPE") || "image";
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

		// Intercept ALL POST requests and log them
		cy.intercept("POST", "**", (req) => {
			// Synchronously log request details using Cypress.log()
			Cypress.log({
				name: "Request",
				message: `${req.method} ${req.url}`,
				consoleProps: () => ({ requestBody: req.body }),
			});

			// Continue request & log response
			req.continue((res) => {
				Cypress.log({
					name: "Response",
					message: `${res.statusCode}`,
					consoleProps: () => ({ responseBody: res.body }),
				});
			});
		}).as("allRequests");

		// visit the base URL specified on command line when running cypress
		return cy.visit(Cypress.env("default_page")).then(() => {
			getWidgetElement(checkboxClass).should("be.visible");
			// wrap the solutions to make them available to the tests
			cy.wrap(solutions).as("solutions");
		});
	});

	after(() => {
		cy.registerSiteKey(CaptchaType.image);
	});

	it("An error is returned if captcha type is set to pow and the wrong captcha type is used in the widget", () => {
		expect(captchaType).to.not.equal(CaptchaType.pow);
		cy.registerSiteKey(CaptchaType.pow).then((response) => {
			// Log the response status and body using cy.task()
			cy.task("log", `Response status: ${response.status}`);
			cy.task("log", `Response: ${JSON.stringify(response.body)}`);

			// Ensure the request was successful
			expect(response.status).to.equal(200);
		});
		cy.visit(Cypress.env("default_page"));

		cy.task("log", "Clicking the first div...");
		cy.get("div").first().click();

		const checkbox = getWidgetElement(checkboxClass, { timeout: 12000 });

		cy.task("log", "Checking if checkbox is visible...");
		checkbox.first().should("be.visible");

		cy.task("log", "Intercepting POST request...");
		cy.intercept("POST", "**/prosopo/provider/client/captcha/**").as(
			"getCaptcha",
		);
		checkbox.first().click();

		cy.task("log", "Waiting for @getCaptcha...");

		// Wait for at least one request and log it to terminal
		cy.wait("@allRequests").then((interception) => {
			cy.task(
				"log",
				`Intercepted Request: ${JSON.stringify(interception.request.body)}`,
			);
			cy.task(
				"log",
				`Intercepted Response: ${interception.response?.statusCode} - ${JSON.stringify(interception.response?.body)}`,
			);
		});
		return cy
			.wait("@getCaptcha", { timeout: 36000 })
			.its("response")
			.should("exist") // Ensures response is not undefined
			.then((response) => {
				expect(response.statusCode).to.equal(400);
				expect(response.body).to.have.property("error");
			});
	});

	it("Captchas load when 'I am human' is pressed", () => {
		cy.clickIAmHuman().then((captchas) => {
			expect(captchas.length).to.be.gt(0);
		});
	});

	it("Number of displayed captchas equals number received in response", () => {
		cy.clickIAmHuman().then((captchas: Captcha[]) => {
			cy.wait(2000);
			cy.captchaImages().then(() => {
				console.log(
					"captchas in 'Number of displayed captchas equals number received in response'",
					captchas,
				);
				cy.get("@captchaImages").should(
					"have.length",
					at(captchas, 0).items.length,
				);
			});
		});
	});

	// move to component testing later
	it("Can select an item", () => {
		cy.clickIAmHuman().then(() => {
			cy.wait(2000);
			cy.captchaImages().then(() => {
				cy.get("@captchaImages").first().click();
				cy.get("@captchaImages")
					.first()
					.siblings()
					.first()
					.should("have.css", "opacity", "1");
			});
		});
	});
});
