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

// This package ships one runtime value and otherwise consists of the contracts
// every API endpoint in the workspace implements. Its business logic *is* its
// types — in particular the conditional signature of processRequest — so these
// are the tests that actually cover it.

import type { Logger } from "@prosopo/logger";
import { assertType, describe, expectTypeOf, it } from "vitest";
import { type ZodType, z } from "zod";
import type {
	ApiEndpoint,
	ApiEndpointData,
	ApiEndpointResponse,
	ApiRouteLimit,
	ApiRouteLimits,
	ApiRouteRequest,
	ApiRouteResponseData,
	ApiRoutes,
	ApiRoutesProvider,
} from "../index.js";
import { ApiEndpointResponseStatus, defineApiRoute } from "../index.js";

type SiteKeySchema = ZodType<{ siteKey: string }>;

describe("ApiEndpoint.processRequest", () => {
	it("takes the parsed arguments when the endpoint declares a schema", () => {
		// The whole point of the conditional: an endpoint with a schema receives
		// the inferred arguments, not a raw unknown it has to parse itself.
		expectTypeOf<
			ApiEndpoint<SiteKeySchema, undefined>["processRequest"]
		>().parameters.toEqualTypeOf<
			[z.infer<SiteKeySchema>, (Logger | undefined)?]
		>();
	});

	it("takes no arguments at all when the schema is undefined", () => {
		// The other branch. If this collapsed into the schema branch, every
		// argument-free endpoint would be forced to accept a phantom first
		// parameter.
		expectTypeOf<
			ApiEndpoint<undefined, undefined>["processRequest"]
		>().parameters.toEqualTypeOf<[(Logger | undefined)?]>();
	});

	it("keeps the logger optional on both branches", () => {
		// Callers that do not have a logger to hand must still be able to invoke
		// an endpoint directly.
		const withArgs: ApiEndpoint<SiteKeySchema, undefined>["processRequest"] =
			async () => ({
				status: ApiEndpointResponseStatus.SUCCESS,
			});
		expectTypeOf(withArgs).toBeCallableWith({ siteKey: "abc" });

		const withoutArgs: ApiEndpoint<undefined, undefined>["processRequest"] =
			async () => ({
				status: ApiEndpointResponseStatus.SUCCESS,
			});
		expectTypeOf(withoutArgs).toBeCallableWith();
	});

	it("always resolves to a response, never to void", () => {
		// A void-returning endpoint would give the mounting layer nothing to
		// serialise back to the client.
		expectTypeOf<
			ApiEndpoint<SiteKeySchema, undefined>["processRequest"]
		>().returns.toEqualTypeOf<Promise<ApiEndpointResponse<undefined>>>();
		expectTypeOf<
			ApiEndpoint<undefined, undefined>["processRequest"]
		>().returns.toEqualTypeOf<Promise<ApiEndpointResponse<undefined>>>();
	});

	it("rejects arguments that do not match the declared schema", () => {
		const endpoint: ApiEndpoint<SiteKeySchema, undefined> = {
			getRequestArgsSchema: (): SiteKeySchema => {
				throw new Error("not called");
			},
			processRequest: async (): Promise<ApiEndpointResponse<undefined>> => ({
				status: ApiEndpointResponseStatus.SUCCESS,
			}),
		};
		// @ts-expect-error siteKey is required by the schema
		endpoint.processRequest({});
	});

	it("rejects an argument-free endpoint being called with arguments", () => {
		const endpoint: ApiEndpoint<undefined, undefined> = {
			getRequestArgsSchema: (): undefined => undefined,
			processRequest: async (): Promise<ApiEndpointResponse<undefined>> => ({
				status: ApiEndpointResponseStatus.SUCCESS,
			}),
		};
		// @ts-expect-error this endpoint declared no schema, so takes no args
		endpoint.processRequest({ siteKey: "abc" });
	});
});

describe("ApiEndpoint.getRequestArgsSchema", () => {
	it("returns exactly the schema the endpoint was parameterised with", () => {
		// Returning a widened ZodType would leave callers unable to infer the
		// argument type from the schema they just fetched.
		expectTypeOf<
			ApiEndpoint<SiteKeySchema, undefined>["getRequestArgsSchema"]
		>().returns.toEqualTypeOf<SiteKeySchema>();
		expectTypeOf<
			ApiEndpoint<undefined, undefined>["getRequestArgsSchema"]
		>().returns.toEqualTypeOf<undefined>();
	});

	it("takes no arguments", () => {
		expectTypeOf<
			ApiEndpoint<undefined, undefined>["getRequestArgsSchema"]
		>().parameters.toEqualTypeOf<[]>();
	});
});

describe("ApiEndpointResponse", () => {
	it("requires a status and nothing else", () => {
		// A bare acknowledgement is a valid response.
		assertType<ApiEndpointResponse<undefined>>({
			status: ApiEndpointResponseStatus.SUCCESS,
		});
		// @ts-expect-error status is mandatory
		assertType<ApiEndpointResponse<undefined>>({ data: {} });
	});

	it("keeps data and error independently optional", () => {
		// Not modelled as a discriminated union, so an endpoint may legitimately
		// return partial data alongside an error.
		expectTypeOf<ApiEndpointResponse<{ id: string }>["data"]>().toEqualTypeOf<
			{ id: string } | undefined
		>();
		expectTypeOf<ApiEndpointResponse<{ id: string }>["error"]>().toEqualTypeOf<
			string | undefined
		>();
	});

	it("types the status as the enum, not a bare string", () => {
		expectTypeOf<
			ApiEndpointResponse<undefined>["status"]
		>().toEqualTypeOf<ApiEndpointResponseStatus>();
		// @ts-expect-error an arbitrary string is not a status
		assertType<ApiEndpointResponse<undefined>>({ status: "OK" });
	});

	it("rejects an error that is not a string", () => {
		assertType<ApiEndpointResponse<undefined>>({
			status: ApiEndpointResponseStatus.FAIL,
			// @ts-expect-error error is a message, not an Error instance
			error: new Error("boom"),
		});
	});
});

describe("ApiRoutes", () => {
	it("is keyed by route string and valued by endpoints of any schema", () => {
		expectTypeOf<ApiRoutes>().toEqualTypeOf<
			Record<string, ApiEndpoint<ZodType | undefined, ApiEndpointData>>
		>();
	});

	it("accepts an empty record, for a provider with no endpoints yet", () => {
		assertType<ApiRoutes>({});
	});

	it("rejects a plain function in place of an endpoint", () => {
		// @ts-expect-error routes map to endpoint objects, not handlers
		assertType<ApiRoutes>({ "/x": async (): Promise<void> => {} });
	});
});

describe("ApiRoutesProvider", () => {
	it("exposes the routes through a method, not a property", () => {
		// A method lets a provider build its routes lazily, once its own
		// dependencies are ready.
		expectTypeOf<ApiRoutesProvider["getRoutes"]>().toEqualTypeOf<
			() => ApiRoutes
		>();
	});
});

describe("ApiRouteLimits", () => {
	it("requires a limit for every member of the route enum", () => {
		// Partial coverage would leave a route silently unlimited.
		enum Route {
			Verify = "verify",
			Submit = "submit",
		}
		assertType<ApiRouteLimits<Route>>({
			[Route.Verify]: { windowMs: 1000, limit: 5 },
			[Route.Submit]: { windowMs: 1000, limit: 5 },
		});
		// @ts-expect-error every route needs a limit
		assertType<ApiRouteLimits<Route>>({
			[Route.Verify]: { windowMs: 1000, limit: 5 },
		});
	});

	it("requires both the window and the count on each limit", () => {
		// A window without a count, or a count without a window, is not a rate
		// limit — it is a config mistake that would otherwise reach production.
		assertType<ApiRouteLimits<"verify">>({
			// @ts-expect-error limit is required alongside windowMs
			verify: { windowMs: 1000 },
		});
		assertType<ApiRouteLimits<"verify">>({
			// @ts-expect-error windowMs is required alongside limit
			verify: { limit: 5 },
		});
	});

	it("exposes the entry type, so a consumer can name one limit", () => {
		// Building a limits record entry by entry is the common case; without
		// this export the shape has to be redeclared at every call site.
		expectTypeOf<
			ApiRouteLimits<"verify">["verify"]
		>().toEqualTypeOf<ApiRouteLimit>();
		assertType<ApiRouteLimit>({ windowMs: 1000, limit: 5 });
	});

	it("works with a numeric route enum as well as a string one", () => {
		// The parameter is `string | number`, so both enum flavours are usable.
		assertType<ApiRouteLimits<0 | 1>>({
			0: { windowMs: 1000, limit: 5 },
			1: { windowMs: 1000, limit: 5 },
		});
	});
});

describe("typed routes", () => {
	it("rejects a route table missing a path or using an unknown one", () => {
		type Paths = "/a" | "/b";
		expectTypeOf<ApiRoutes<Paths>>().toHaveProperty("/a");
		expectTypeOf<ApiRoutes<Paths>>().toHaveProperty("/b");
		expectTypeOf<ApiRoutes<Paths>>().not.toHaveProperty("/c");
	});

	it("types the response data of an endpoint", () => {
		expectTypeOf<
			Awaited<
				ReturnType<ApiEndpoint<undefined, { id: string }>["processRequest"]>
			>
		>().toEqualTypeOf<ApiEndpointResponse<{ id: string }>>();
	});

	it("infers request and response from a contract", () => {
		const route = defineApiRoute({
			path: "/a",
			method: "post",
			requestSchema: z.object({ siteKey: z.string() }),
			responseSchema: undefined,
		});
		expectTypeOf(route.path).toEqualTypeOf<"/a">();
		expectTypeOf<ApiRouteRequest<typeof route>>().toEqualTypeOf<{
			siteKey: string;
		}>();
		expectTypeOf<ApiRouteResponseData<typeof route>>().toBeUndefined();
	});
});
