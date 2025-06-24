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

import {
	AdminApiPaths,
	type Captcha,
	type CaptchaType,
	type IUserSettings,
	type RegisterSitekeyBodyTypeOutput,
	Tier,
} from "@prosopo/types";
import { at } from "@prosopo/util";
import Chainable = Cypress.Chainable;
import { u8aToHex } from "@polkadot/util";
import type { ApiEndpointResponse } from "@prosopo/api-route";
import { getPair } from "@prosopo/keyring";
import type { SolutionRecord } from "@prosopo/types-database";

declare global {
	namespace Cypress {
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix any
		interface Chainable<Subject = any> {
			clickIAmHuman(): Cypress.Chainable<Captcha[]>;

			captchaImages(): Cypress.Chainable<JQuery<HTMLElement>>;

			clickCorrectCaptchaImages(
				captcha: Captcha,
			): Chainable<JQuery<HTMLElement>>;

			getSelectors(captcha: Captcha): Cypress.Chainable<string[]>;

			clickNextButton(): Cypress.Chainable<void>;

			elementExists(element: string): Chainable<Subject>;

			registerSiteKey(
				captchaType?: CaptchaType,
				// biome-ignore lint/suspicious/noExplicitAny: tests
			): Cypress.Chainable<Response<any>>;

			// Wait for the procaptcha script to load and be ready
			waitForProcaptchaScript(): Cypress.Chainable<void>;
		}
	}
}

// Extend the AUTWindow interface to include the procaptcha property
declare global {
	interface Window {
		procaptcha?: unknown;
	}
}

export const checkboxClass = '[type="checkbox"]';

export function getWidgetElement(
	selector: string,
	options: object = {},
): Chainable<JQuery<HTMLElement>> {
	options = { ...options, includeShadowDom: true };

	return cy.get(selector, options);
}

/**
 * Wait for the procaptcha script to be loaded, handling async defer scripts
 * This is especially important when the script has async and defer attributes
 */
function waitForProcaptchaScript(): Cypress.Chainable<void> {
	return cy.window().then((win) => {
		return new Cypress.Promise<void>((resolve) => {
			// Check if procaptcha is already loaded
			if (win.procaptcha) {
				resolve();
				return;
			}

			// If not loaded yet, set up a check that runs repeatedly
			const checkInterval = 100; // ms
			const maxWaitTime = 10000; // 10 seconds max wait
			let elapsed = 0;

			const checkForProcaptcha = () => {
				if (win.procaptcha) {
					resolve();
					return;
				}

				elapsed += checkInterval;
				if (elapsed >= maxWaitTime) {
					// If max wait time exceeded, continue anyway - test will likely fail but this avoids hanging
					cy.log(
						"Warning: procaptcha script did not load within the expected time",
					);
					resolve();
					return;
				}

				setTimeout(checkForProcaptcha, checkInterval);
			};

			checkForProcaptcha();
		});
	});
}

function clickIAmHuman(): Cypress.Chainable<Captcha[]> {
	// First wait for the procaptcha script to be loaded
	return cy.waitForProcaptchaScript().then(() => {
		cy.intercept("POST", "**/prosopo/provider/client/captcha/**").as(
			"getCaptcha",
		);
		getWidgetElement(checkboxClass, { timeout: 12000 }).first().click();

		return cy
			.wait("@getCaptcha", { timeout: 36000 })
			.its("response")
			.then((response) => {
				expect(response).to.not.be.undefined;
				expect(response?.statusCode).to.equal(200);
				expect(response?.body).to.have.property("captchas");
				const captchas = response?.body.captchas;
				console.log(
					"-----------------------------captchas",
					captchas,
					"length",
					captchas.length,
				);
				expect(captchas).to.have.lengthOf(2);
				expect(captchas[0]).to.have.property("items");
				console.log(
					"-----------------------------captchas[0].items",
					captchas[0].items,
					"length",
					captchas[0].items.length,
				);
				expect(captchas[0].items).to.have.lengthOf(9);
				return captchas;
			})
			.as("captchas");
	});
}

function captchaImages(): Cypress.Chainable<JQuery<HTMLElement>> {
	return getWidgetElement(".prosopo-modalInner p").then(($p) => {
		const $pWithText = $p.filter((index, el) => {
			return Cypress.$(el).text().includes("all containing");
		});

		cy.wrap($pWithText)
			.should("be.visible")
			.parent()
			.parent()
			.parent()
			.parent()
			.children()
			.next()
			.children()
			.first()
			.children()
			.as("captchaImages");
	});
}

function getSelectors(captcha: Captcha) {
	cy.wrap({ captcha })
		.then(({ captcha }) => {
			cy.get<SolutionRecord[]>("@solutions").then((solutions) => {
				let selectors: string[] = [];
				// Get the index of the captcha in the solution records array
				const captchaIndex = solutions.findIndex(
					(testSolution) =>
						testSolution.captchaContentId === captcha.captchaContentId,
				);
				if (captchaIndex !== -1) {
					const solution = at(solutions, captchaIndex).solution;
					selectors = captcha.items
						.filter((item) => solution.includes(item.hash))
						// create a query selector for each image that is a solution
						// drop https from the urls as this is what procaptcha does (avoids mixed-content warnings, e.g. resources loaded via a mix of http / https)
						.map(
							(item) =>
								`img[src="${item.data.replace(/^http(s)*:\/\//, "https://")}"]`,
						);
				} else {
					console.log("Unsolved captcha or captcha with zero solutions");
				}
				return selectors;
			});
		})
		.as("selectors");
	return cy.get("@selectors");
}

function clickCorrectCaptchaImages(
	captcha: Captcha,
): Chainable<JQuery<HTMLElement>> {
	return cy.captchaImages().then(() => {
		cy.getSelectors(captcha).then((selectors: string[]) => {
			console.log("captchaId", captcha.captchaId, "selectors", selectors);
			// Click the correct images
			getWidgetElement(selectors.join(", ")).then((elements) => {
				if (elements.length > 0) {
					cy.wrap(elements).click({ multiple: true });
				}
				console.log("No images to select");
				cy.clickNextButton();
			});
		});
	});
}

function clickNextButton() {
	cy.intercept("POST", "**/prosopo/provider/client/solution").as(
		"postSolution",
	);
	// Go to the next captcha or submit solution
	getWidgetElement('button[data-cy="button-next"]').click({ force: true });
	cy.wait(0);
}

function elementExists(selector: string) {
	return cy
		.window()
		.then(($window) => $window.document.querySelector(selector));
}

function registerSiteKey(captchaType: CaptchaType) {
	const timestamp = new Date().getTime();

	return cy.then(() => {
		const pair = getPair(Cypress.env("PROSOPO_PROVIDER_MNEMONIC"));
		const signature = u8aToHex(pair.sign(timestamp.toString()));
		const adminSiteKeyURL = `http://localhost:9229${AdminApiPaths.SiteKeyRegister}`;

		const settings: IUserSettings = {
			captchaType: captchaType,
			domains: ["0.0.0.0", "localhost", "*"],
			frictionlessThreshold: 0.5,
			powDifficulty: 2,
			imageThreshold: 0.8,
		};

		// Use cy.request() to ensure Cypress correctly queues the request
		return cy.request({
			method: "POST",
			url: adminSiteKeyURL,
			headers: {
				"Content-Type": "application/json",
				signature: signature,
				timestamp: timestamp.toString(),
			},
			body: {
				siteKey: Cypress.env("PROSOPO_SITE_KEY"),
				tier: Tier.Free,
				settings,
			},
			failOnStatusCode: false, // Allow handling of non-200 responses manually
		});
	});
}

Cypress.Commands.addAll({
	clickIAmHuman,
	captchaImages,
	clickCorrectCaptchaImages,
	getSelectors,
	clickNextButton,
	elementExists,
	registerSiteKey,
	waitForProcaptchaScript,
});
