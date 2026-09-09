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

import type { ProviderEnvironment } from "@prosopo/env";
import { HealthApiPaths } from "@prosopo/types";
import type { Request, RequestHandler, Response, Router } from "express";
import { describe, expect, it, vi } from "vitest";
import { authHealthRouter } from "../../../api/authHealth.js";
import { publicRouter } from "../../../api/public.js";

vi.mock("@prosopo/api-express-router", () => ({
	handleErrors: vi.fn(),
}));

vi.mock("@prosopo/util", () => ({
	version: "1.0.0-test",
}));

/**
 * The router's registered layers, as express actually stores them.
 *
 * Reached into rather than mocked so the tests exercise the paths the routers
 * really register: asserting against a hand-rolled copy of the handler, as the
 * older tests in this directory do, passes whatever the router does.
 */
interface RouterLayer {
	route?: { path: string; stack: Array<{ handle: RequestHandler }> };
}

const handlerFor = (router: Router, path: string): RequestHandler => {
	const layers = (router as unknown as { stack: RouterLayer[] }).stack;
	const handler = layers.find((layer) => layer.route?.path === path)?.route
		?.stack[0]?.handle;
	if (handler === undefined) {
		throw new Error(`no route registered at ${path}`);
	}
	return handler;
};

const providerEnv = (): ProviderEnvironment =>
	({
		getDb: vi.fn(),
		logger: { error: vi.fn(), info: vi.fn() },
	}) as unknown as ProviderEnvironment;

const responseSpy = (): { res: Response; json: ReturnType<typeof vi.fn> } => {
	const json = vi.fn();
	return {
		res: {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			json,
		} as unknown as Response,
		json,
	};
};

const isoTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("health endpoints", () => {
	it("answers the public health route with alive and a timestamp", () => {
		const { res, json } = responseSpy();

		handlerFor(publicRouter(providerEnv()), HealthApiPaths.Health)(
			{} as Request,
			res,
			vi.fn(),
		);

		const body: unknown = json.mock.calls[0]?.[0];
		expect(body).toEqual({
			alive: true,
			timestamp: expect.stringMatching(isoTimestamp),
		});
	});

	it("answers the authenticated health route with the full provider detail", () => {
		const { res, json } = responseSpy();

		handlerFor(authHealthRouter(providerEnv()), HealthApiPaths.Health)(
			{} as Request,
			res,
			vi.fn(),
		);

		const body: unknown = json.mock.calls[0]?.[0];
		expect(body).toEqual({
			alive: true,
			timestamp: expect.stringMatching(isoTimestamp),
			version: "1.0.0-test",
			uptimeSeconds: expect.any(Number),
			name: "provider",
		});
	});

	it("registers the authenticated route relative to its mount point", () => {
		// startProviderApi mounts this router at "/auth" behind the auth
		// middleware. If the router spelled the prefix out itself the effective
		// path would be /auth/auth/health; if it were mounted at the root
		// instead, the route would answer unauthenticated.
		const layers = (
			authHealthRouter(providerEnv()) as unknown as { stack: RouterLayer[] }
		).stack;
		const paths = layers
			.map((layer) => layer.route?.path)
			.filter((path): path is string => path !== undefined);

		expect(paths).toEqual([HealthApiPaths.Health]);
		expect(paths).not.toContain(HealthApiPaths.AuthHealth);
	});
});
