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
import { addCompareSnapshotCommand } from "cypress-visual-regression/dist/command";

addCompareSnapshotCommand();

const PAUSE_ANIMATIONS_STYLE = `
*, *::before, *::after {
	animation-delay: 0s !important;
	animation-duration: 0s !important;
	animation-play-state: paused !important;
	transition-duration: 0s !important;
	transition-delay: 0s !important;
	caret-color: transparent !important;
}
`;

const PAUSE_STYLE_ID = "__prosopo_visual_regression_pause__";

export interface SnapOptions {
	errorThreshold?: number;
	capture?: "viewport" | "fullPage";
	// CSS selector of an element to scrollIntoView before a viewport capture.
	// Use this to guarantee the captcha widget is in shot regardless of where
	// it renders on the host page. Ignored for element-scoped snaps and when
	// capture is "fullPage".
	ensureInView?: string;
}

declare global {
	namespace Cypress {
		// biome-ignore lint/suspicious/noExplicitAny: matches existing commands.ts shape
		interface Chainable<Subject = any> {
			snap(name: string, options?: SnapOptions): Cypress.Chainable<Subject>;
		}
	}
}

function appendPauseAnimationsStyle(
	doc: Document,
	root: Document | ShadowRoot,
): void {
	if (root.getElementById(PAUSE_STYLE_ID)) {
		return;
	}
	const style = doc.createElement("style");
	style.id = PAUSE_STYLE_ID;
	style.appendChild(doc.createTextNode(PAUSE_ANIMATIONS_STYLE));
	(root === doc ? doc.head : root).appendChild(style);
}

// Document styles don't reach into a shadow root, so a widget snapshot needs
// the pause style injected inside the widget's own shadow root as well.
function injectPauseAnimationsStyle(
	subject: JQuery<HTMLElement> | undefined,
): void {
	cy.document({ log: false }).then((doc) => {
		appendPauseAnimationsStyle(doc, doc);
		const shadowRoot = subject?.get(0)?.shadowRoot;
		if (shadowRoot) {
			appendPauseAnimationsStyle(doc, shadowRoot);
		}
	});
}

Cypress.Commands.add(
	"snap",
	{ prevSubject: ["optional", "element"] },
	(
		// biome-ignore lint/suspicious/noConfusingVoidType: cypress's prevSubject typing requires void for the missing-subject branch
		subject: JQuery<HTMLElement> | void,
		name: string,
		options: SnapOptions = {},
	) => {
		const {
			errorThreshold = 0.01,
			capture = "viewport",
			ensureInView,
		} = options;

		// Baselines are generated in chrome (cypress-baselines.yml), and font
		// rasterisation differs enough between engines that comparing them
		// anywhere else is just noise. Other browsers still run the spec, they
		// only skip the pixel assertion.
		if (Cypress.browser.family !== "chromium") {
			cy.log(`snap: skipped "${name}" — baselines are chrome-only`);
			return subject
				? cy.wrap(subject, { log: false })
				: cy.wrap(null, { log: false });
		}

		injectPauseAnimationsStyle(subject || undefined);
		// One animation frame for the style to apply before screenshotting.
		cy.wait(50, { log: false });

		if (subject) {
			return cy
				.wrap(subject, { log: false })
				.compareSnapshot(name, { errorThreshold });
		}
		if (ensureInView && capture === "viewport") {
			cy.get(ensureInView, { includeShadowDom: true, log: false })
				.first()
				.scrollIntoView();
			cy.wait(50, { log: false });
		}
		return cy.compareSnapshot(name, { capture, errorThreshold });
	},
);
