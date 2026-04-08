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
import "cypress-real-events";

import {
	AdminApiPaths,
	type Captcha,
	type CaptchaType,
	type IUserSettings,
	Tier,
} from "@prosopo/types";
import { at } from "@prosopo/util";
import Chainable = Cypress.Chainable;
import { getPair } from "@prosopo/keyring";
import type { CaptchaWithoutId } from "@prosopo/types";

export const MAX_IMAGE_CAPTCHA_ROUNDS = 3;

// Solution record keyed by item hashes for stable matching across dataset rebuilds.
// buildDataset recomputes captchaContentId via merkle trees, so matching by
// captchaContentId against the static fixture is unreliable.
interface TestSolution {
	itemHashes: string;
	solution: string[];
}

export function buildTestSolutions(
	captchas: CaptchaWithoutId[],
): TestSolution[] {
	return captchas
		.filter((c) => c.solution)
		.map((c) => ({
			itemHashes: c.items
				.map((i) => i.hash)
				.sort()
				.join(","),
			solution: (c.solution ?? []).map((s) => s.toString()),
		}));
}

declare global {
	namespace Cypress {
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix any
		interface Chainable<Subject = any> {
			clickIAmHuman(): Cypress.Chainable<Captcha[]>;

			clickCheckbox(): Cypress.Chainable<JQuery<HTMLElement>>;

			captchaImages(): Cypress.Chainable<JQuery<HTMLElement>>;

			clickCorrectCaptchaImages(
				captcha: Captcha,
			): Chainable<JQuery<HTMLElement>>;

			getSelectors(captcha: Captcha): Chainable<string[]>;

			clickNextButton(): Chainable<JQuery<HTMLElement>>;

			elementExists(element: string): Chainable<Subject>;

			registerSiteKey(
				baseCaptchaType: CaptchaType,
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

function clickCheckbox(): Cypress.Chainable<JQuery<HTMLElement>> {
	// Wait for checkbox to exist and be visible
	return getWidgetElement(checkboxClass, { timeout: 12000 })
		.should("exist")
		.should("be.visible")
		.should("not.be.disabled")
		.first()
		.then(($checkbox) => {
			// Log checkbox details for debugging
			cy.task("log", `Found checkbox: ${$checkbox.length} element(s)`);
			cy.task("log", `Checkbox is visible: ${$checkbox.is(":visible")}`);
			cy.task("log", `Checkbox is disabled: ${$checkbox.is(":disabled")}`);
			cy.task("log", `Checkbox checked state: ${$checkbox.is(":checked")}`);
			cy.wrap($checkbox).realClick();
		});
}

function clickIAmHuman(): Cypress.Chainable<Captcha[]> {
	// First wait for the procaptcha script to be loaded
	return cy.waitForProcaptchaScript().then(() => {
		cy.intercept("POST", "**/prosopo/provider/client/captcha/**").as(
			"getCaptcha",
		);

		// Log for debugging
		cy.task("log", `Looking for checkbox with selector: ${checkboxClass}`);

		// Wait for checkbox to exist and be visible
		getWidgetElement(checkboxClass, { timeout: 12000 })
			.should("exist")
			.should("be.visible")
			.should("not.be.disabled")
			.first()
			.then(($checkbox) => {
				// Log checkbox details for debugging
				cy.task("log", `Found checkbox: ${$checkbox.length} element(s)`);
				cy.task("log", `Checkbox is visible: ${$checkbox.is(":visible")}`);
				cy.task("log", `Checkbox is disabled: ${$checkbox.is(":disabled")}`);
				cy.task("log", `Checkbox checked state: ${$checkbox.is(":checked")}`);
				cy.wrap($checkbox).realClick();
			});

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
				expect(captchas).to.have.lengthOf.lte(MAX_IMAGE_CAPTCHA_ROUNDS);
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
	// Wait for the modal to be visible first
	return getWidgetElement(".prosopo-modalInner p", { timeout: 10000 })
		.should("be.visible")
		.then(($p) => {
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
				.should("have.length.gte", 1) // Ensure at least one image exists
				.as("captchaImages");
		});
}

function getSelectors(captcha: Captcha): Chainable<string[]> {
	cy.wrap({ captcha })
		.then(({ captcha }) => {
			cy.get<TestSolution[]>("@solutions").then((solutions) => {
				let selectors: string[] = [];
				// Match by item hashes rather than captchaContentId, because
				// buildDataset recomputes captchaContentId via merkle trees.
				const captchaItemHashes = captcha.items
					.map((i) => i.hash)
					.sort()
					.join(",");
				const match = solutions.find(
					(s) => s.itemHashes === captchaItemHashes,
				);
				if (match) {
					selectors = captcha.items
						.filter((item) => match.solution.includes(item.hash))
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
	return cy.get("@selectors") as unknown as Chainable<string[]>;
}

function clickCorrectCaptchaImages(
	captcha: Captcha,
): Chainable<JQuery<HTMLElement>> {
	// Set up intercept BEFORE clicking anything
	cy.intercept("POST", "**/prosopo/provider/client/solution").as(
		"postSolution",
	);

	// Wait for images to be loaded and ready
	// This ensures images are fully rendered before we try to interact with them
	cy.wait(500); // Give DOM time to update after previous round

	return cy.captchaImages().then(() => {
		// Additional wait to ensure captcha images are fully loaded
		cy.wait(300);

		cy.getSelectors(captcha).then((selectors: string[]) => {
			console.log("captchaId", captcha.captchaId, "selectors", selectors);

			// Ensure the selector elements exist before trying to click them
			if (selectors.length > 0) {
				// Wait for the specific images to be visible
				getWidgetElement(selectors.join(", "), { timeout: 5000 })
					.should("be.visible")
					.then((elements) => {
						if (elements.length > 0) {
							cy.wrap(elements).each(($img) => {
								cy.wrap($img).realClick();
								cy.wait(100); // Small wait between clicks
							});
						} else {
							console.log("No images to select");
						}
						// Wait for images to be selected
						cy.wait(500);
						// Click next button
						cy.clickNextButton();
					});
			} else {
				console.log("No selectors found for this captcha");
				// Still click next button even if no images to select
				cy.wait(500);
				cy.clickNextButton();
			}
		});
	});
}

function clickNextButton(): Chainable<JQuery<HTMLElement>> {
	// Ensure button exists and is visible before clicking
	return getWidgetElement('button[data-cy="button-next"]')
		.should("exist")
		.should("be.visible")
		.then(($btn) => {
			cy.task("log", "Next button found and visible, clicking...");
			cy.wrap($btn).realClick();
			cy.task("log", "Next button clicked!");
		});
}

function elementExists(selector: string) {
	return cy
		.window()
		.then(($window) => $window.document.querySelector(selector));
}

function registerSiteKey(
	baseCaptchaType: CaptchaType,
	captchaType?: CaptchaType,
) {
	const siteKey = Cypress.env(
		`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
	);
	if (!siteKey) {
		throw new Error(
			`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()} is not set in the environment variables.`,
		);
	}

	cy.task(
		"log",
		`Registering site key  ${siteKey} for captcha type: ${captchaType || baseCaptchaType}`,
	);

	return cy.then(() => {
		const pair = getPair(Cypress.env("PROSOPO_PROVIDER_MNEMONIC"));
		const jwt = pair.jwtIssue();
		const adminSiteKeyURL = `https://localhost:9229${AdminApiPaths.SiteKeyRegister}`;

		const settings: IUserSettings = {
			captchaType: captchaType || baseCaptchaType,
			domains: ["0.0.0.0", "localhost", "*"],
			frictionlessThreshold: 0.5,
			powDifficulty: 1,
			imageThreshold: 0.8,
			imageMaxRounds: MAX_IMAGE_CAPTCHA_ROUNDS,
			disallowWebView: false,
		};

		// Use cy.request() to ensure Cypress correctly queues the request
		// Set retryOnNetworkFailure to false to handle connection errors gracefully
		return cy.request({
			method: "POST",
			url: adminSiteKeyURL,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${jwt}`,
			},
			body: {
				siteKey: siteKey,
				tier: Tier.Free,
				settings,
			},
			failOnStatusCode: false, // Allow handling of non-200 responses manually
			retryOnNetworkFailure: false, // Don't retry on network failures
			timeout: 10000, // 10 second timeout
		});
	});
}

Cypress.Commands.add("clickIAmHuman", clickIAmHuman);
Cypress.Commands.add("clickCheckbox", clickCheckbox);
Cypress.Commands.add("captchaImages", captchaImages);
Cypress.Commands.add("clickCorrectCaptchaImages", clickCorrectCaptchaImages);
Cypress.Commands.add("getSelectors", getSelectors);
Cypress.Commands.add("clickNextButton", clickNextButton);
Cypress.Commands.add("elementExists", elementExists);
Cypress.Commands.add("registerSiteKey", registerSiteKey);
Cypress.Commands.add("waitForProcaptchaScript", waitForProcaptchaScript);
