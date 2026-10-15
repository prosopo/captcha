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

import "@cypress/xpath";
import type { CaptchaResponseBody, CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.expose("CAPTCHA_TYPE") || "image";

const LOCALES = "../../packages/locale/src/locales";

const CONDITIONAL_HEADERS: ReadonlySet<string> = new Set([
	"if-none-match",
	"if-modified-since",
]);

interface WidgetStrings {
	WIDGET: { I_AM_HUMAN: string; SELECT_ALL: string };
}

interface TargetStrings {
	TARGET: Record<string, string>;
}

interface Case {
	name: string;
	browser: readonly string[];
	attribute?: string;
	expected: "tr" | "en";
}

const cases: readonly Case[] = [
	{ name: "the browser's language", browser: ["tr-TR", "tr"], expected: "tr" },
	{
		name: "data-language over the browser's language",
		browser: ["en-GB", "en"],
		attribute: "tr",
		expected: "tr",
	},
	{
		name: "the first supported code in a data-language list",
		browser: ["en-GB"],
		attribute: "xx, tr",
		expected: "tr",
	},
	{
		name: "English for an unsupported browser language",
		browser: ["xx"],
		expected: "en",
	},
];

const escapeRegExp = (text: string): string =>
	text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Serves the demo page with `data-language` set on the widget's element. */
const injectLanguageAttribute = (page: string, attribute: string): void => {
	// Anchored so Vite's `?html-proxy` requests for the page's inline scripts,
	// which share its pathname, pass through untouched.
	const pageUrl = new RegExp(`${escapeRegExp(page)}$`);
	cy.intercept({ method: "GET", url: pageUrl }, (req) => {
		// A 304 has no body to rewrite.
		req.headers = Object.fromEntries(
			Object.entries(req.headers).filter(
				([name]: [string, string | string[]]): boolean =>
					!CONDITIONAL_HEADERS.has(name),
			),
		);
		req.continue((res) => {
			const html: string = String(res.body);
			const marker = 'class="procaptcha"';
			expect(html, "demo page renders an implicit widget").to.contain(marker);
			res.body = html.replace(marker, `${marker} data-language="${attribute}"`);
		});
	});
};

const visitWithBrowserLanguages = (
	page: string,
	languages: readonly string[],
): void => {
	cy.visit(page, {
		onBeforeLoad: (win: Cypress.AUTWindow): void => {
			Object.defineProperty(win.navigator, "languages", {
				get: (): readonly string[] => languages,
			});
			Object.defineProperty(win.navigator, "language", {
				get: (): string => languages[0] ?? "",
			});
		},
	});
};

describe("Widget language", () => {
	beforeEach(() => {
		cy.registerSiteKey(baseCaptchaType).then((response) => {
			expect(response.status).to.equal(200);
		});
	});

	for (const testCase of cases) {
		it(`renders in ${testCase.expected} from ${testCase.name}`, () => {
			const page: string = Cypress.expose("default_page");
			const language = testCase.expected;
			if (testCase.attribute !== undefined) {
				injectLanguageAttribute(page, testCase.attribute);
			}
			visitWithBrowserLanguages(page, testCase.browser);
			cy.waitForProcaptchaScript();

			cy.readFile<WidgetStrings>(`${LOCALES}/${language}/widget.json`).then(
				(widget: WidgetStrings) => {
					if (language !== "en") {
						// Otherwise matching the catalogue would not prove a translation.
						cy.readFile<WidgetStrings>(`${LOCALES}/en/widget.json`).then(
							(english: WidgetStrings) => {
								expect(widget.WIDGET.I_AM_HUMAN).not.to.equal(
									english.WIDGET.I_AM_HUMAN,
								);
								expect(widget.WIDGET.SELECT_ALL).not.to.equal(
									english.WIDGET.SELECT_ALL,
								);
							},
						);
					}
					cy.contains(widget.WIDGET.I_AM_HUMAN, {
						includeShadowDom: true,
						timeout: 15000,
					}).should("be.visible");
					getWidgetElement(checkboxClass).should("be.visible");

					cy.intercept("POST", "**/prosopo/provider/client/captcha/image").as(
						"imageChallenge",
					);
					cy.clickCheckbox();

					cy.wait("@imageChallenge", { timeout: 36000 }).then(
						(interception) => {
							expect(interception.request.headers["prosopo-lang"]).to.exist;
							const body = interception.response?.body as
								| CaptchaResponseBody
								| undefined;
							expect(body?.language).to.equal(language);
							const first = body?.captchas[0];
							expect(first?.targetKey, "dataset label has a key").to.exist;

							cy.readFile<TargetStrings>(
								`${LOCALES}/${language}/target.json`,
							).then((targets: TargetStrings) => {
								const key: string = first?.targetKey ?? "";
								const label = targets.TARGET[key];
								expect(first?.target).to.equal(label);
								getWidgetElement('[data-cy="captcha-prompt"]', {
									timeout: 15000,
								})
									.first()
									.invoke("text")
									.should("equal", `${widget.WIDGET.SELECT_ALL} ${label} `);
							});
						},
					);
				},
			);
		});
	}
});
