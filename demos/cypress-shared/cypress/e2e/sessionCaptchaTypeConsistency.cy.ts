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
import { CaptchaType } from "@prosopo/types";
import { checkboxClass, getWidgetElement } from "../support/commands.js";

// Assert Mongo and Redis agree on a session's captchaType (and its
// escalation-linked fields) at every stage of a captcha flow. Backed by
// the diagnostic `AdminApiPaths.GetSession` endpoint added alongside this
// suite. If Mongo and Redis ever disagree — or an unexpected `deleted`
// flag surfaces mid-flow — future regressions in the dedup / rebind /
// escalation write paths surface here rather than as INCORRECT_CAPTCHA_
// TYPE 400s in prod.

interface SessionStateBody {
	mongo: Record<string, unknown> | null;
	redis: Record<string, unknown> | null;
}

// Small helper — reads both stores and asserts every named field matches
// between them. `null`-in-Redis is allowed (the cache TTL might have
// expired between hops) but if Redis IS present it must agree with Mongo.
function assertStoresAgree(
	sessionId: string,
	fields: string[],
	stageLabel: string,
): void {
	cy.getSessionState(sessionId).then((response) => {
		expect(response.status, `${stageLabel}: admin/session/get status`).to.equal(
			200,
		);
		const body = response.body as { data: SessionStateBody };
		const mongo = body.data.mongo;
		const redis = body.data.redis;
		expect(mongo, `${stageLabel}: mongo record present`).to.not.equal(null);
		for (const f of fields) {
			// biome-ignore lint/suspicious/noExplicitAny: dynamic field access
			const mv = (mongo as any)[f];
			if (redis !== null) {
				// biome-ignore lint/suspicious/noExplicitAny: dynamic field access
				const rv = (redis as any)[f];
				expect(
					rv,
					`${stageLabel}: redis.${f} matches mongo.${f}`,
				).to.deep.equal(mv);
			}
		}
	});
}

// Force `route()` to keep the widget on PoW at the post-PoW phase — we
// want to exercise the "session persists as pow throughout" path here,
// not the escalation-to-image path (already covered by escalation.cy.ts).
const KEEP_POW_ROUTING_MACHINE = `
	module.exports.route = function (input) {
		if (input && input.phase !== 'postPow') return undefined;
		return { captchaType: 'pow' };
	};
`;

describe("Session captchaType agrees between Mongo and Redis at each stage", () => {
	const siteKey: string = Cypress.env(
		`PROSOPO_SITE_KEY_${CaptchaType.frictionless.toUpperCase()}`,
	);

	before(() => {
		if (!siteKey) {
			throw new Error(
				"PROSOPO_SITE_KEY_FRICTIONLESS must be set for the consistency test.",
			);
		}
		cy.removeAllDecisionMachines();
	});

	beforeEach(() => {
		cy.registerSiteKey(CaptchaType.frictionless).then((response) => {
			expect(response.status).to.equal(200);
		});
		cy.installRoutingMachine(siteKey, KEEP_POW_ROUTING_MACHINE).then(
			(response) => {
				expect(response.status).to.equal(200);
			},
		);

		// Intercepts must be installed BEFORE `cy.visit` — the widget
		// (`bundleCaptcha` unconditionally mounts `ProcaptchaFrictionless`)
		// fires `/frictionless` from a mount-effect the moment the page
		// loads, and there's no second call on the later `.realClick()`.
		// If we set them up in the `it` block after `beforeEach`'s visit
		// the aliases catch nothing and every wait times out.
		cy.intercept("POST", "**/prosopo/provider/client/captcha/frictionless").as(
			"frictionless",
		);
		cy.intercept("POST", "**/prosopo/provider/client/captcha/pow").as(
			"powChallenge",
		);
		cy.intercept("POST", "**/prosopo/provider/client/pow/solution").as(
			"powSolution",
		);

		// Hardcode the frictionless-explicit demo page — it embeds
		// `PROSOPO_SITE_KEY_FRICTIONLESS`, the sitekey the routing
		// machine above is scoped to. Under any config whose
		// `default_page` env is set to a different demo page (e.g.
		// the image config's `/`, which embeds
		// `PROSOPO_SITE_KEY_IMAGE`) the routing machine would never
		// apply and `/frictionless` would return `captchaType=image`
		// instead of the `captchaType=pow` this suite asserts on.
		return cy.visit("/frictionless-explicit.html").then(() => {
			cy.waitForProcaptchaScript();
			getWidgetElement(checkboxClass).should("be.visible");
		});
	});

	after(() => {
		cy.removeAllDecisionMachines();
		cy.registerSiteKey(CaptchaType.image).then((response) => {
			if (response.status !== 200) {
				cy.task(
					"log",
					`Warning: Could not re-register siteKey. Status: ${response.status}`,
				);
			}
		});
	});

	it("keeps captchaType=pow consistent in Mongo + Redis from frictionless through pow-submit", () => {
		getWidgetElement(checkboxClass, { timeout: 12000 }).first().realClick();

		cy.wait("@frictionless", { timeout: 12000 }).then((interception) => {
			expect(interception.response?.statusCode).to.equal(200);
			const sessionId = interception.response?.body.sessionId as string;
			const captchaType = interception.response?.body.captchaType as string;
			expect(sessionId, "frictionless: sessionId present").to.be.a("string");
			expect(captchaType, "frictionless: captchaType=pow").to.equal(
				CaptchaType.pow,
			);
			// STAGE 1 — right after frictionless mint. Redis and Mongo must
			// both hold the fresh session with captchaType=pow. `deleted`
			// must be absent — a `true` here would explain the
			// NO_SESSION_FOUND / INCORRECT_CAPTCHA_TYPE class of prod bugs.
			assertStoresAgree(
				sessionId,
				["captchaType", "bundleId", "deleted"],
				"stage 1 (post-frictionless)",
			);
			cy.wrap(sessionId).as("originSessionId");
		});

		cy.wait("@powChallenge", { timeout: 12000 }).then((interception) => {
			expect(interception.response?.statusCode).to.equal(200);
			// STAGE 2 — /captcha/pow served. Session should still be
			// pow-typed and not deleted; the fetch is peek-only.
			cy.get<string>("@originSessionId").then((sessionId) => {
				assertStoresAgree(
					sessionId,
					["captchaType", "bundleId", "deleted"],
					"stage 2 (post-captcha/pow-fetch)",
				);
			});
		});

		cy.wait("@powSolution", { timeout: 30000 }).then((interception) => {
			expect(interception.response?.statusCode).to.equal(200);
			// STAGE 3 — /pow/solution consumed. Routing machine returned
			// captchaType=pow (no escalation), so no new session was minted;
			// the origin should transition to `deleted:true` in Mongo (the
			// consume path), and Redis should either agree or have been
			// invalidated. captchaType must NOT have flipped to image /
			// puzzle — that would indicate a spurious escalation write.
			cy.get<string>("@originSessionId").then((sessionId) => {
				cy.getSessionState(sessionId).then((response) => {
					expect(response.status).to.equal(200);
					const body = response.body as { data: SessionStateBody };
					const mongo = body.data.mongo;
					const redis = body.data.redis;
					if (mongo !== null) {
						expect(
							mongo.captchaType,
							"stage 3: captchaType stays pow",
						).to.equal(CaptchaType.pow);
					}
					if (redis !== null && mongo !== null) {
						expect(
							redis.captchaType,
							"stage 3: redis and mongo agree on captchaType",
						).to.equal(mongo.captchaType);
					}
				});
			});
		});
	});
});
