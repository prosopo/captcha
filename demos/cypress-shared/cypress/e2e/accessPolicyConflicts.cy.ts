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

// End-to-end proof of the two conflict-resolution rules in
// packages/provider/src/api/blacklistRequestInspector.ts's
// rankCandidateRules:
//
//   Primary: specificity DESC — the rule with more populated scope
//   fields wins. A narrow Restrict beats a broad Block even though Block
//   is normally harsher.
//
//   Tiebreaker: harshness DESC within equal specificity — Block wins
//   over Restrict, Restrict[image] > Restrict[puzzle] > Restrict[pow].
//
// Both rules are installed against the same sitekey with different
// scopes; the observable outcome is the /captcha/* response status
// (200 = Restrict picked, 403 = Block picked). Regression guards
// against a future refactor of rankCandidateRules that accidentally
// flips one or both orderings.

import "@cypress/xpath";
import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

const baseCaptchaType: CaptchaType = Cypress.env("CAPTCHA_TYPE") || "image";

describe("User access policy conflict resolution", () => {
	const siteKey: string = Cypress.env(
		`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()}`,
	);

	before(() => {
		if (!siteKey) {
			throw new Error(
				`PROSOPO_SITE_KEY_${baseCaptchaType.toUpperCase()} must be set for the conflicts test.`,
			);
		}
		cy.deleteAllAccessRules();

		const registerWithRetry = (
			retries = 3,
			delay = 2000,
		): Cypress.Chainable => {
			return cy.registerSiteKey(baseCaptchaType).then((response) => {
				if (response.status !== 200 && retries > 0) {
					cy.wait(delay);
					return registerWithRetry(retries - 1, delay);
				}
				expect(
					response.status,
					"Site key registration should return 200",
				).to.equal(200);
				return cy.wrap(response);
			});
		};

		return registerWithRetry();
	});

	beforeEach(() => {
		cy.deleteAllAccessRules();
	});

	after(() => {
		cy.deleteAllAccessRules();
		cy.registerSiteKey(CaptchaType.image);
	});

	it("more specific Restrict beats broad Block once both reach the endpoint (Block is deferToVerify so middleware doesn't 403 first)", () => {
		// Design constraint: blockMiddleware only ever queries the
		// candidate set with `blockOnly: true` (see
		// blacklistRequestInspector.ts:530), so Restrict rules are never
		// visible there. A Block with `deferToVerify: false` always
		// short-circuits at the middleware — a Restrict, no matter how
		// specific, can't unseat it. The specificity/harshness ordering
		// only decides the winner among rules that actually reach the
		// endpoint handler's `getPrioritisedAccessPolicies` call.
		//
		// So the way to demonstrate "narrow Restrict outranks broad
		// Block" end-to-end is to defer the Block (middleware skips it,
		// both rules reach isValidRequest, rank picks Restrict). This
		// isn't just spec ergonomics — it's the exact production shape
		// operators reach for when they want the Block to enforce at
		// verify but a Restrict to steer captchaType at request time.
		//
		// Cypress runs against localhost. Node surfaces the IPv4
		// loopback as the IPv4-mapped IPv6 address `::ffff:127.0.0.1`,
		// which is what getRequestUserScope stamps on the request.
		// Scope the narrow Restrict on that exact string — a bare
		// `127.0.0.1` has a different numeric representation and never
		// compares equal.
		const rules = [
			{
				accessPolicy: {
					type: "block",
					deferToVerify: true,
					description: "broad-defer-block",
				},
				policyScopes: [{ clientId: siteKey }],
				userScopes: [{}],
				expiresUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
			},
			{
				accessPolicy: {
					type: "restrict",
					captchaType: "image",
					description: "narrow-restrict-by-ip",
				},
				policyScopes: [{ clientId: siteKey }],
				userScopes: [{ ip: "::ffff:127.0.0.1" }],
				expiresUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
			},
		];

		cy.addAccessRules(rules).then((response) => {
			expect(response.status).to.equal(200);
		});

		cy.intercept("POST", "**/prosopo/provider/client/captcha/**").as(
			"anyCaptcha",
		);
		cy.visit(Cypress.env("default_page"), {
			timeout: 30000,
			failOnStatusCode: false,
		});
		cy.waitForProcaptchaScript();

		getWidgetElement(checkboxClass, { timeout: 15000 })
			.first()
			.should("be.visible")
			.realClick();

		cy.wait("@anyCaptcha", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(
					response?.statusCode,
					"more-specific Restrict must outrank broad Block",
				).to.equal(200);
			});
	});

	it("Block wins over Restrict at equal specificity (both scoped by clientId only)", () => {
		// Ranking tiebreaker: harshness DESC. Both rules are
		// clientId-only (specificity 1). Block harshness =
		// MAX_SAFE_INTEGER, Restrict[image] = 30. Block wins → 403.
		const rules = [
			{
				accessPolicy: {
					type: "block",
					description: "tie-block",
				},
				policyScopes: [{ clientId: siteKey }],
				userScopes: [{}],
				expiresUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
			},
			{
				accessPolicy: {
					type: "restrict",
					captchaType: "image",
					description: "tie-restrict",
				},
				policyScopes: [{ clientId: siteKey }],
				userScopes: [{}],
				expiresUnixTimestamp: Math.floor(Date.now() / 1000) + 3600,
			},
		];

		cy.addAccessRules(rules).then((response) => {
			expect(response.status).to.equal(200);
		});

		cy.intercept("POST", "**/prosopo/provider/client/captcha/**").as(
			"anyCaptcha",
		);
		cy.visit(Cypress.env("default_page"), {
			timeout: 30000,
			failOnStatusCode: false,
		});
		cy.waitForProcaptchaScript();

		getWidgetElement(checkboxClass, { timeout: 15000 })
			.first()
			.should("be.visible")
			.realClick();

		cy.wait("@anyCaptcha", { timeout: 15000 })
			.its("response")
			.then((response) => {
				expect(
					response?.statusCode,
					"Block must beat Restrict at equal specificity",
				).to.equal(403);
			});
	});
});
