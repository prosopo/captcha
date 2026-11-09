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
import {
	apiExpressRouterFactory,
	createApiExpressDefaultEndpointAdapter,
} from "@prosopo/api-express-router";
import type { ProviderEnvironment } from "@prosopo/env";
import { LogLevel, getLogger } from "@prosopo/logger";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { AccessRuleApiRoutes } from "@prosopo/user-access-policy/api";
import type { Router } from "express";
import { describe, expect, it } from "vitest";
import { createApiAdminRoutesProvider } from "../../../api/admin/createApiAdminRoutesProvider.js";
import { prosopoRouter } from "../../../api/captcha.js";
import { publicRouter } from "../../../api/public.js";
import { prosopoVerifyRouter } from "../../../api/verify.js";
import { createMockProviderEnvironment } from "../testUtils/mockProviderEnv.js";

// Pins every route each router registers, in order, with its method and the
// number of handlers on it, so moving registrations onto route contracts cannot
// silently drop, add, reorder or re-method a route.

type Layer = {
	name: string;
	route?: { path: string; methods: Record<string, boolean>; stack: unknown[] };
};

const describeRouter = (router: Router): string[] =>
	(router.stack as Layer[]).map((layer) =>
		layer.route
			? `${Object.keys(layer.route.methods).join(",").toUpperCase()} ${layer.route.path} handlers=${layer.route.stack.length}`
			: `use ${layer.name}`,
	);

const apiRouter = (
	provider: Parameters<typeof apiExpressRouterFactory.createRouter>[0],
): Router =>
	apiExpressRouterFactory.createRouter(
		provider,
		createApiExpressDefaultEndpointAdapter(LogLevel.enum.error),
	);

describe("provider route table", () => {
	it("client captcha routes", () => {
		expect(
			describeRouter(prosopoRouter(createMockProviderEnvironment())),
		).toMatchInlineSnapshot(`
			[
			  "use padResponseMiddleware",
			  "POST /v1/prosopo/provider/client/captcha/image handlers=1",
			  "POST /v1/prosopo/provider/client/solution handlers=1",
			  "POST /v1/prosopo/provider/client/captcha/pow handlers=1",
			  "POST /v1/prosopo/provider/client/pow/solution handlers=1",
			  "POST /v1/prosopo/provider/client/captcha/frictionless handlers=1",
			  "POST /v1/prosopo/provider/client/detector/assign handlers=1",
			  "POST /v1/prosopo/provider/client/captcha/puzzle handlers=1",
			  "POST /v1/prosopo/provider/client/puzzle/solution handlers=1",
			  "POST /v1/prosopo/provider/client/captcha/audio handlers=1",
			  "POST /v1/prosopo/provider/client/audio/solution handlers=1",
			  "POST /v1/prosopo/provider/client/captcha/icon-order handlers=1",
			  "POST /v1/prosopo/provider/client/icon-order/solution handlers=1",
			  "POST /v1/prosopo/provider/client/spam/email handlers=1",
			  "use handleErrors",
			]
		`);
	});

	it("verify routes", () => {
		expect(
			describeRouter(prosopoVerifyRouter(createMockProviderEnvironment())),
		).toMatchInlineSnapshot(`
			[
			  "use <anonymous>",
			  "POST /v1/prosopo/provider/client/image/dapp/verify handlers=1",
			  "POST /v1/prosopo/provider/client/pow/verify handlers=1",
			  "POST /v1/prosopo/provider/client/puzzle/verify handlers=1",
			  "POST /v1/prosopo/provider/client/audio/verify handlers=1",
			  "POST /v1/prosopo/provider/client/icon-order/verify handlers=1",
			  "POST /v1/prosopo/provider/client/authenticated/verify handlers=1",
			  "use handleErrors",
			]
		`);
	});

	it("public routes", () => {
		expect(
			describeRouter(
				publicRouter(
					createMockProviderEnvironment() as Partial<ProviderEnvironment> as ProviderEnvironment,
				),
			),
		).toMatchInlineSnapshot(`
			[
			  "GET /healthz handlers=1",
			  "GET /metrics handlers=1",
			  "GET /v1/prosopo/provider/public/details handlers=1",
			  "use router",
			  "use handleErrors",
			]
		`);
	});

	it("admin routes", () => {
		expect(
			describeRouter(
				apiRouter(
					createApiAdminRoutesProvider(createMockProviderEnvironment()),
				),
			),
		).toMatchInlineSnapshot(`
			[
			  "POST /v1/prosopo/provider/admin/sitekey/register handlers=1",
			  "POST /v1/prosopo/provider/admin/sitekeys/register handlers=1",
			  "POST /v1/prosopo/provider/admin/decision-machine/update handlers=1",
			  "POST /v1/prosopo/provider/admin/decision-machine/get-all handlers=1",
			  "POST /v1/prosopo/provider/admin/decision-machine/get handlers=1",
			  "POST /v1/prosopo/provider/admin/decision-machine/remove handlers=1",
			  "POST /v1/prosopo/provider/admin/decision-machine/remove-all handlers=1",
			  "POST /v1/prosopo/provider/admin/counters/clear-all handlers=1",
			  "POST /v1/prosopo/provider/admin/sitekey/remove handlers=1",
			  "POST /v1/prosopo/provider/admin/sitekeys/remove handlers=1",
			  "POST /v1/prosopo/provider/admin/maintenance/toggle handlers=1",
			  "POST /v1/prosopo/provider/admin/dns/event handlers=1",
			  "POST /v1/prosopo/provider/admin/detector/pool/replace handlers=1",
			  "POST /v1/prosopo/provider/admin/session/get handlers=1",
			  "use handleErrors",
			]
		`);
	});

	it("access rule routes", () => {
		expect(
			describeRouter(
				apiRouter(
					new AccessRuleApiRoutes(
						{} as AccessRulesStorage,
						getLogger(LogLevel.enum.error, "routeTable"),
					),
				),
			),
		).toMatchInlineSnapshot(`
			[
			  "POST /v1/prosopo/user-access-policy/rules/delete-all handlers=1",
			  "POST /v1/prosopo/user-access-policy/rules/delete-groups handlers=1",
			  "POST /v1/prosopo/user-access-policy/rules/delete-many handlers=1",
			  "POST /v1/prosopo/user-access-policy/rules/fetch-many handlers=1",
			  "POST /v1/prosopo/user-access-policy/rules/find-ids handlers=1",
			  "POST /v1/prosopo/user-access-policy/rules/get-missing-ids handlers=1",
			  "POST /v1/prosopo/user-access-policy/rules/insert-many handlers=1",
			  "POST /v1/prosopo/user-access-policy/rules/rehash-all handlers=1",
			  "use handleErrors",
			]
		`);
	});
});
