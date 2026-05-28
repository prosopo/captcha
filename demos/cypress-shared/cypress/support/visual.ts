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
}

declare global {
	namespace Cypress {
		// biome-ignore lint/suspicious/noExplicitAny: matches existing commands.ts shape
		interface Chainable<Subject = any> {
			snap(name: string, options?: SnapOptions): Cypress.Chainable<Subject>;
		}
	}
}

function injectPauseAnimationsStyle(): void {
	cy.document({ log: false }).then((doc) => {
		if (doc.getElementById(PAUSE_STYLE_ID)) {
			return;
		}
		const style = doc.createElement("style");
		style.id = PAUSE_STYLE_ID;
		style.appendChild(doc.createTextNode(PAUSE_ANIMATIONS_STYLE));
		doc.head.appendChild(style);
	});
}

Cypress.Commands.add(
	"snap",
	{ prevSubject: ["optional", "element"] },
	(
		subject: JQuery<HTMLElement> | undefined,
		name: string,
		options: SnapOptions = {},
	) => {
		const { errorThreshold = 0.01, capture = "viewport" } = options;

		injectPauseAnimationsStyle();
		// One animation frame for the style to apply before screenshotting.
		cy.wait(50, { log: false });

		if (subject) {
			return cy
				.wrap(subject, { log: false })
				.compareSnapshot(name, { errorThreshold });
		}
		return cy.compareSnapshot(name, { capture, errorThreshold });
	},
);
