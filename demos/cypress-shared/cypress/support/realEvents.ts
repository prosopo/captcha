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

// cypress-real-events dispatches input over the Chrome DevTools Protocol, which
// cypress only exposes for chromium-family browsers — on firefox every
// realClick() rejects with "remote:debugger:protocol is not supported". The
// specs are browser-agnostic at the call site, so translate the command once
// here rather than branching at ~20 call sites.
//
// The fallback is cypress' own click, which dispatches synthetic events
// (event.isTrusted === false). The widget deliberately ignores untrusted input,
// so the firefox leg only gets past the checkbox when the bundle is built with
// the untrusted-event test allowance (see .github/workflows/cypress.yml).

// Derived from the augmented Chainable rather than imported from
// cypress-real-events/commands/realClick, which isn't a published subpath.
type RealClickOptions = NonNullable<
	Parameters<Cypress.Chainable["realClick"]>[0]
>;

function clickOptionsFrom(
	options?: RealClickOptions,
): Partial<Cypress.ClickOptions> {
	const clickOptions: Partial<Cypress.ClickOptions> = {
		// realClick clicks at coordinates and so never runs cypress'
		// "element is covered" check. That check resolves cover elements against
		// the light DOM and misreads the widget's shadow host as an obstruction,
		// so opt out of it here too.
		force: true,
	};
	if (options?.scrollBehavior !== undefined) {
		clickOptions.scrollBehavior = options.scrollBehavior;
	}
	return clickOptions;
}

function clickWithoutCdp(
	subject: Cypress.JQueryWithSelector,
	options?: RealClickOptions,
): Cypress.Chainable<JQuery<HTMLElement>> {
	const clickOptions = clickOptionsFrom(options);
	const target = cy.wrap<JQuery<HTMLElement>>(subject, { log: false });

	if (options?.x !== undefined && options?.y !== undefined) {
		return target.click(options.x, options.y, clickOptions);
	}
	const position = options?.position;
	if (typeof position === "string") {
		return target.click(position, clickOptions);
	}
	if (position) {
		return target.click(position.x, position.y, clickOptions);
	}
	return target.click(clickOptions);
}

if (Cypress.browser.family !== "chromium") {
	Cypress.Commands.overwrite<"realClick", "element">(
		"realClick",
		(
			_originalFn: Cypress.CommandOriginalFnWithSubject<
				"realClick",
				Cypress.JQueryWithSelector
			>,
			subject: Cypress.JQueryWithSelector,
			options?: RealClickOptions,
		): Cypress.Chainable<JQuery<HTMLElement>> =>
			clickWithoutCdp(subject, options),
	);
}
