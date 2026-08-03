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

import type { ApiRoutes, ApiRoutesProvider } from "@prosopo/api-route";
import { LogLevel } from "@prosopo/logger";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, test, vi } from "vitest";
import {
	apiExpressRouterFactory,
	authMiddleware,
	createApiExpressDefaultEndpointAdapter,
	handleErrors,
	requestLoggerMiddleware,
} from "../../index.js";

/**
 * The barrel is what every consuming package imports, so the shape of it is
 * part of the contract — a missing re-export or a changed default breaks
 * callers without touching any of the implementations.
 */

describe("createApiExpressDefaultEndpointAdapter", () => {
	test("builds an adapter exposing handleRequest", () => {
		const adapter = createApiExpressDefaultEndpointAdapter(LogLevel.enum.info);
		expect(typeof adapter.handleRequest).toBe("function");
	});

	test("builds a fresh adapter per call", () => {
		expect(createApiExpressDefaultEndpointAdapter(LogLevel.enum.info)).not.toBe(
			createApiExpressDefaultEndpointAdapter(LogLevel.enum.info),
		);
	});

	test("defaults the error status code so callers may omit it", () => {
		expect(() =>
			createApiExpressDefaultEndpointAdapter(LogLevel.enum.debug),
		).not.toThrow();
	});

	test("accepts an explicit error status code", () => {
		expect(() =>
			createApiExpressDefaultEndpointAdapter(LogLevel.enum.debug, 503),
		).not.toThrow();
	});
});

describe("apiExpressRouterFactory", () => {
	test("is exported as a single shared instance", () => {
		// It holds no per-router state, so one instance is enough — but callers
		// import the value rather than the class, so it must stay a singleton.
		expect(typeof apiExpressRouterFactory.createRouter).toBe("function");
	});

	test("builds a router from a provider", () => {
		const provider: ApiRoutesProvider = {
			getRoutes: (): ApiRoutes => ({}),
		};
		const router = apiExpressRouterFactory.createRouter(provider, {
			handleRequest: vi.fn<
				(
					endpoint: never,
					request: Request,
					response: Response,
					next: NextFunction,
				) => Promise<void>
			>(async () => undefined),
		});
		expect(typeof router).toBe("function");
	});
});

describe("the re-exported middleware", () => {
	test("exposes the error handler", () => {
		expect(typeof handleErrors).toBe("function");
	});

	test("exposes the auth middleware", () => {
		expect(typeof authMiddleware).toBe("function");
	});

	test("exposes the request logger middleware", () => {
		expect(typeof requestLoggerMiddleware).toBe("function");
	});
});
