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

// End-to-end cover for the client session id correlation (#3139).
//
// Why this exists: #3139 shipped with unit tests for the comparison helper
// and for the escalation handoff, but nothing exercised a real
// solve -> persist -> verify round trip against mongo. The bug that
// followed was a read projection —
// `getPowCaptchaRecordByChallenge` listed its fields explicitly and did not
// include `clientMetaData`, so the verify path read `undefined` and
// disapproved EVERY token that carried a session id. Client, wire format and
// write path were all correct; only the read was wrong, which is precisely
// the seam a unit test cannot see.
//
// The two cases below are both required. The happy path alone would still
// pass if the correlation were silently skipped, so the mismatch case is what
// proves the check actually runs.

/// <reference types="cypress" />

import "@cypress/xpath";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

// Must match `data-sessionid` on pow-implicit-sessionid.html.
const MATCHING_SESSION_ID =
	"cypress-session-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const solvePowAndSubmit = (uniqueId: string) => {
	cy.intercept("POST", "/signup").as("signup");
	cy.intercept("POST", "**/prosopo/provider/client/pow/solution").as(
		"powSolution",
	);

	getWidgetElement(checkboxClass, { timeout: 15000 }).first().realClick();

	// The solve itself must succeed and must carry the render-time session id
	// on the wire. If this assertion fails the fault is client-side; if it
	// passes but /signup rejects, the fault is server-side.
	cy.wait("@powSolution", { timeout: 60000 }).then((interception) => {
		expect(interception.response?.statusCode).to.equal(200);
		expect(interception.response?.body?.verified).to.equal(true);
		expect(
			interception.request?.body?.clientMetaData?.clientSessionId,
			"widget must attach the render-time session id to the solution",
		).to.equal(MATCHING_SESSION_ID);
	});

	getWidgetElement(`${checkboxClass}:checked`, { timeout: 15000 }).should(
		"have.length.gte",
		1,
	);

	cy.get('input[id="name"]', { timeout: 10000 })
		.should("be.visible")
		.clear()
		.type("test", { delay: 50 });
	cy.get('input[id="email"]', { timeout: 10000 })
		.should("be.visible")
		.clear()
		.type(`${uniqueId}@prosopo.io`, { delay: 50 });
	cy.get('input[type="password"]', { timeout: 10000 })
		.should("be.visible")
		.clear()
		.type("password", { delay: 50 });

	cy.get('button[data-cy="submit-button"]', { timeout: 10000 })
		.first()
		.should("be.visible")
		.should("not.be.disabled");
	cy.get('button[data-cy="submit-button"]').first().realClick();
};

describe("Client session id correlation", () => {
	it("verifies a token whose solve carries the same session id the widget rendered with", () => {
		cy.visit(Cypress.env("default_page"));
		cy.waitForProcaptchaScript();
		getWidgetElement(checkboxClass).should("be.visible");

		solvePowAndSubmit(`client-session-match-${Cypress._.random(0, 1e6)}`);

		// The regression this guards: the projection dropped clientMetaData,
		// so the provider compared the supplied id against `undefined` and
		// answered CLIENT_SESSION_MISMATCH. That surfaced here as a 401.
		cy.wait("@signup", { timeout: 20000 }).then((interception) => {
			expect(
				interception.response?.statusCode,
				"matching clientSessionId must verify — a 401 here means the provider could not read the recorded session id",
			).to.equal(200);
		});
	});

	it("rejects a token verified with a different session id", () => {
		// Same render-time id, different id at verify.
		cy.visit(`${Cypress.env("default_page")}?mismatch=1`);
		cy.waitForProcaptchaScript();
		getWidgetElement(checkboxClass).should("be.visible");

		solvePowAndSubmit(`client-session-mismatch-${Cypress._.random(0, 1e6)}`);

		cy.wait("@signup", { timeout: 20000 }).then((interception) => {
			expect(
				interception.response?.statusCode,
				"a token earned in another session must not verify",
			).to.equal(401);
		});
	});
});
