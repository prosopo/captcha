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

import type { ApiEndpoint, ApiRoutesProvider } from "@prosopo/api-route";
import type { LogLevel } from "@prosopo/logger";
import type { KeyringPair } from "@prosopo/types";
import type {
	NextFunction,
	Request,
	RequestHandler,
	Response,
	Router,
} from "express";
import { assertType, describe, expectTypeOf, test } from "vitest";
import type { ZodType } from "zod";
import type * as barrel from "../index.js";
import {
	type ApiExpressEndpointAdapter,
	apiExpressRouterFactory,
	authMiddleware,
	createApiExpressDefaultEndpointAdapter,
	handleErrors,
	requestLoggerMiddleware,
	verifySignature,
} from "../index.js";

/**
 * These pin the package's public type surface. Consumers wire routers and
 * middleware from this barrel alone, so a widened parameter or a dropped export
 * is a break they would only find at their own call sites.
 */

describe("the barrel's shape", () => {
	test("exports exactly the intended names", () => {
		expectTypeOf<keyof typeof barrel>().toEqualTypeOf<
			| "apiExpressRouterFactory"
			| "createApiExpressDefaultEndpointAdapter"
			| "handleErrors"
			| "authMiddleware"
			| "verifySignature"
			| "requestLoggerMiddleware"
		>();
	});
});

describe("createApiExpressDefaultEndpointAdapter", () => {
	test("takes a log level and an optional status code", () => {
		expectTypeOf(
			createApiExpressDefaultEndpointAdapter,
		).parameters.toEqualTypeOf<
			[logLevel: LogLevel, errorStatusCode?: number]
		>();
	});

	test("returns the interface, not the concrete class", () => {
		// Callers depend on the interface so an alternative adapter can be
		// substituted without a cast.
		expectTypeOf(
			createApiExpressDefaultEndpointAdapter,
		).returns.toEqualTypeOf<ApiExpressEndpointAdapter>();
	});

	test("rejects a log level that is not one of the known levels", () => {
		// @ts-expect-error - an arbitrary string is not a LogLevel
		createApiExpressDefaultEndpointAdapter("chatty");
	});

	test("rejects a non-numeric status code", () => {
		// @ts-expect-error - the status code is a number
		createApiExpressDefaultEndpointAdapter("info", "500");
	});
});

describe("the router factory", () => {
	test("takes a routes provider and an adapter, and returns a Router", () => {
		expectTypeOf(apiExpressRouterFactory.createRouter).toEqualTypeOf<
			(
				apiRoutesProvider: ApiRoutesProvider,
				apiExpressEndpointAdapter: ApiExpressEndpointAdapter,
			) => Router
		>();
	});

	test("rejects a bare routes object in place of a provider", () => {
		const adapter: ApiExpressEndpointAdapter = {
			handleRequest: async () => undefined,
		};
		// @ts-expect-error - the factory wants a provider, not the routes it returns
		apiExpressRouterFactory.createRouter({}, adapter);
	});
});

describe("the endpoint adapter interface", () => {
	test("takes the endpoint and the express trio and resolves to void", () => {
		expectTypeOf<ApiExpressEndpointAdapter["handleRequest"]>().toEqualTypeOf<
			(
				endpoint: ApiEndpoint<ZodType | undefined>,
				request: Request,
				response: Response,
				next: NextFunction,
			) => Promise<void>
		>();
	});

	test("is satisfied by any object with a matching handleRequest", () => {
		// Structural, deliberately: a consumer can supply its own adapter
		// without importing or extending the default class.
		assertType<ApiExpressEndpointAdapter>({
			handleRequest: async (): Promise<void> => undefined,
		});
	});
});

describe("the middleware", () => {
	test("authMiddleware takes an optional pair and an optional auth account", () => {
		expectTypeOf(authMiddleware).parameters.toEqualTypeOf<
			[pair: KeyringPair | undefined, authAccount?: KeyringPair | undefined]
		>();
	});

	test("authMiddleware returns an async express handler", () => {
		expectTypeOf(authMiddleware).returns.toEqualTypeOf<
			(req: Request, res: Response, next: NextFunction) => Promise<void>
		>();
	});

	test("authMiddleware still requires the first argument to be passed", () => {
		// It is `KeyringPair | undefined` rather than optional, so a provider
		// with no key has to say so explicitly instead of forgetting to wire it.
		// @ts-expect-error - the first parameter is required
		authMiddleware();
	});

	test("requestLoggerMiddleware returns a synchronous express handler", () => {
		expectTypeOf(requestLoggerMiddleware).returns.toEqualTypeOf<
			(req: Request, res: Response, next: NextFunction) => void
		>();
	});

	test("the handler each factory builds is usable as express middleware", () => {
		// The exports are factories, so it is what they return — not the
		// factories themselves — that gets mounted with app.use().
		assertType<RequestHandler>(
			requestLoggerMiddleware(
				{} as Parameters<typeof requestLoggerMiddleware>[0],
			),
		);
		assertType<RequestHandler>(authMiddleware(undefined));
	});

	test("verifySignature takes a signature, a message and a pair, and returns void", () => {
		expectTypeOf(verifySignature).parameters.toEqualTypeOf<
			[signature: string, message: string, pair: KeyringPair]
		>();
		expectTypeOf(verifySignature).returns.toEqualTypeOf<void>();
	});

	test("verifySignature rejects a byte-array signature", () => {
		// The hex string is decoded internally; passing bytes would be decoded
		// a second time and silently verify the wrong value.
		// @ts-expect-error - the signature is a hex string
		verifySignature(new Uint8Array([1]), "msg", {} as KeyringPair);
	});
});

describe("the error handler", () => {
	test("takes an error first, which is what makes express treat it as one", () => {
		// A three-parameter handler would be mounted as ordinary middleware and
		// never see an error at all.
		expectTypeOf(handleErrors).parameters.toMatchTypeOf<
			[unknown, Request, Response, NextFunction]
		>();
	});

	test("rejects being mounted as an ordinary handler", () => {
		// @ts-expect-error - the first parameter is an error, not a request
		assertType<RequestHandler>(handleErrors);
	});
});
