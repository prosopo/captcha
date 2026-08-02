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

import type {
	ApiEndpoint,
	ApiRoutes,
	ApiRoutesProvider,
} from "@prosopo/api-route";
import type { NextFunction, Request, Response, Router } from "express";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ZodType } from "zod";
import { ApiExpressRouterFactory } from "../../apiExpressRouterFactory.js";
import type { ApiExpressEndpointAdapter } from "../../endpointAdapter/apiExpressEndpointAdapter.js";
import { handleErrors } from "../../errorHandler.js";

/**
 * The factory is the wiring between a routes provider and express. What matters
 * is that every declared route reaches the adapter untouched, that the error
 * handler is mounted last, and that a provider handing back nothing still
 * produces a usable router rather than throwing.
 */

type Handler = (
	request: Request,
	response: Response,
	next: NextFunction,
) => Promise<void>;

const endpoint = (): ApiEndpoint<ZodType | undefined> => ({
	getRequestArgsSchema: vi.fn<() => ZodType | undefined>(() => undefined),
	processRequest: vi.fn<ApiEndpoint<ZodType | undefined>["processRequest"]>(
		async () => ({ status: "ok" }),
	),
});

const provider = (routes: ApiRoutes): ApiRoutesProvider => ({
	getRoutes: (): ApiRoutes => routes,
});

const adapter = (): ApiExpressEndpointAdapter => ({
	handleRequest:
		vi.fn<ApiExpressEndpointAdapter["handleRequest"]>(async () => undefined),
});

/** The (path, handler) pairs the factory registered as POST routes. */
const postRoutes = (router: Router): [string, Handler][] => {
	const registered: [string, Handler][] = [];
	for (const layer of router.stack) {
		const route = layer.route;
		if (!route) continue;
		const handler = route.stack[route.stack.length - 1]?.handle as
			| Handler
			| undefined;
		if (handler) registered.push([route.path, handler]);
	}
	return registered;
};

let factory: ApiExpressRouterFactory;

beforeEach(() => {
	factory = new ApiExpressRouterFactory();
});

describe("createRouter", () => {
	test("registers one POST route per entry the provider declares", () => {
		const router = factory.createRouter(
			provider({ "/a": endpoint(), "/b": endpoint() }),
			adapter(),
		);
		expect(postRoutes(router).map(([path]) => path)).toEqual(["/a", "/b"]);
	});

	test("registers the routes as POST only", () => {
		const router = factory.createRouter(provider({ "/a": endpoint() }), adapter());
		const route = router.stack.find((layer) => layer.route)?.route;
		expect(route?.methods).toEqual({ post: true });
	});

	test("a provider with no routes still yields a router", () => {
		// An empty route table is a legitimate state during start-up, so it must
		// not throw: the router simply has nothing but the error handler on it.
		const router = factory.createRouter(provider({}), adapter());
		expect(postRoutes(router)).toEqual([]);
		expect(router.stack).toHaveLength(1);
	});

	test("mounts the error handler last, after every route", () => {
		// Express only reaches an error handler declared after the handlers that
		// might fail, so its position is load-bearing rather than cosmetic.
		const router = factory.createRouter(
			provider({ "/a": endpoint(), "/b": endpoint() }),
			adapter(),
		);
		const last = router.stack[router.stack.length - 1];
		expect(last?.handle).toBe(handleErrors);
		expect(last?.route).toBeUndefined();
	});

	test("asks the provider for its routes exactly once", () => {
		const getRoutes = vi.fn<() => ApiRoutes>(() => ({ "/a": endpoint() }));
		factory.createRouter({ getRoutes }, adapter());
		expect(getRoutes).toHaveBeenCalledTimes(1);
	});

	test("each call builds a fresh router", () => {
		const routes = provider({ "/a": endpoint() });
		expect(factory.createRouter(routes, adapter())).not.toBe(
			factory.createRouter(routes, adapter()),
		);
	});

	test("routes named oddly are passed to express verbatim", () => {
		// The factory does no normalising of its own, so a provider is free to
		// use path parameters or a bare root route.
		const router = factory.createRouter(
			provider({ "/": endpoint(), "/nested/:id": endpoint() }),
			adapter(),
		);
		expect(postRoutes(router).map(([path]) => path)).toEqual([
			"/",
			"/nested/:id",
		]);
	});
});

describe("the handler each route is given", () => {
	test("hands the endpoint and the express trio to the adapter", async () => {
		const target = endpoint();
		const endpointAdapter = adapter();
		const router = factory.createRouter(
			provider({ "/a": target }),
			endpointAdapter,
		);
		const request = {} as Request;
		const response = {} as Response;
		const next = vi.fn<NextFunction>();

		const handler = postRoutes(router)[0]?.[1];
		await handler?.(request, response, next);

		expect(endpointAdapter.handleRequest).toHaveBeenCalledWith(
			target,
			request,
			response,
			next,
		);
	});

	test("routes each path to its own endpoint, not the last one registered", () => {
		// A loop that closes over the wrong variable would send every request to
		// whichever endpoint happened to be last.
		const first = endpoint();
		const second = endpoint();
		const endpointAdapter = adapter();
		const router = factory.createRouter(
			provider({ "/first": first, "/second": second }),
			endpointAdapter,
		);

		for (const [, handler] of postRoutes(router)) {
			void handler({} as Request, {} as Response, vi.fn<NextFunction>());
		}

		const handled = vi.mocked(endpointAdapter.handleRequest).mock.calls;
		expect(handled.map(([called]) => called)).toEqual([first, second]);
	});

	test("propagates a rejection from the adapter to the caller", async () => {
		// The handler returns the adapter's promise, so express receives the
		// rejection rather than it becoming an unhandled one.
		const endpointAdapter = adapter();
		vi.mocked(endpointAdapter.handleRequest).mockRejectedValue(
			new Error("adapter blew up"),
		);
		const router = factory.createRouter(
			provider({ "/a": endpoint() }),
			endpointAdapter,
		);

		const handler = postRoutes(router)[0]?.[1];
		await expect(
			handler?.({} as Request, {} as Response, vi.fn<NextFunction>()),
		).rejects.toThrow("adapter blew up");
	});

	test("does not call the endpoint itself — that is the adapter's job", async () => {
		const target = endpoint();
		const router = factory.createRouter(provider({ "/a": target }), adapter());
		const handler = postRoutes(router)[0]?.[1];
		await handler?.({} as Request, {} as Response, vi.fn<NextFunction>());
		expect(target.processRequest).not.toHaveBeenCalled();
	});
});
