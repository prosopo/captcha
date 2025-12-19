// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type { Logger } from "@prosopo/common";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import type {
	ApiRouteLimit,
	ApiRouteLimits,
	ApiRoutes,
	ApiRoutesProvider,
} from "../apiRoutes.js";
import type { ApiEndpoint } from "../endpoint/apiEndpoint.js";
import type { ApiEndpointResponse } from "../endpoint/apiEndpointResponse.js";
import { ApiEndpointResponseStatus } from "../endpoint/apiEndpointResponseStatus.js";

describe("ApiRoutes", () => {
	describe("basic functionality", () => {
		it("should store and retrieve endpoints by path", () => {
			const TestSchema = z.object({ value: z.string() });

			class TestEndpoint implements ApiEndpoint<typeof TestSchema> {
				async processRequest(
					args: z.infer<typeof TestSchema>,
				): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { value: args.value },
					};
				}

				getRequestArgsSchema(): typeof TestSchema {
					return TestSchema;
				}
			}

			const routes: ApiRoutes = {
				"/test": new TestEndpoint(),
			};

			expect(routes["/test"]).toBeInstanceOf(TestEndpoint);
			expect(routes["/test"].getRequestArgsSchema()).toBe(TestSchema);
		});

		it("should support multiple routes with different schemas", () => {
			const Schema1 = z.object({ a: z.string() });
			const Schema2 = z.object({ b: z.number() });

			class Endpoint1 implements ApiEndpoint<typeof Schema1> {
				async processRequest(): Promise<ApiEndpointResponse> {
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): typeof Schema1 {
					return Schema1;
				}
			}

			class Endpoint2 implements ApiEndpoint<typeof Schema2> {
				async processRequest(): Promise<ApiEndpointResponse> {
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): typeof Schema2 {
					return Schema2;
				}
			}

			const routes: ApiRoutes = {
				"/endpoint1": new Endpoint1(),
				"/endpoint2": new Endpoint2(),
			};

			expect(Object.keys(routes)).toHaveLength(2);
			expect(routes["/endpoint1"]).toBeInstanceOf(Endpoint1);
			expect(routes["/endpoint2"]).toBeInstanceOf(Endpoint2);
		});

		it("should support endpoints without schemas", () => {
			class NoArgsEndpoint implements ApiEndpoint<undefined> {
				async processRequest(): Promise<ApiEndpointResponse> {
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): undefined {
					return undefined;
				}
			}

			const routes: ApiRoutes = {
				"/no-args": new NoArgsEndpoint(),
			};

			expect(routes["/no-args"].getRequestArgsSchema()).toBeUndefined();
		});

		it("should support empty route collections", () => {
			const routes: ApiRoutes = {};
			expect(Object.keys(routes)).toHaveLength(0);
		});
	});

	describe("endpoint execution", () => {
		it("should execute endpoint processRequest successfully", async () => {
			const TestSchema = z.object({ value: z.string() });

			class TestEndpoint implements ApiEndpoint<typeof TestSchema> {
				async processRequest(
					args: z.infer<typeof TestSchema>,
				): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { received: args.value },
					};
				}

				getRequestArgsSchema(): typeof TestSchema {
					return TestSchema;
				}
			}

			const routes: ApiRoutes = {
				"/test": new TestEndpoint(),
			};

			const result = await routes["/test"].processRequest({ value: "hello" });
			expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(result.data).toEqual({ received: "hello" });
		});

		it("should pass logger to endpoint processRequest", async () => {
			const TestSchema = z.object({ value: z.string() });
			const mockLogger: Logger = {
				info: vi.fn(),
				error: vi.fn(),
				warn: vi.fn(),
				debug: vi.fn(),
			} as unknown as Logger;

			class TestEndpoint implements ApiEndpoint<typeof TestSchema> {
				async processRequest(
					args: z.infer<typeof TestSchema>,
					logger?: Logger,
				): Promise<ApiEndpointResponse> {
					logger?.info("Processing request");
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): typeof TestSchema {
					return TestSchema;
				}
			}

			const routes: ApiRoutes = {
				"/test": new TestEndpoint(),
			};

			await routes["/test"].processRequest({ value: "test" }, mockLogger);
			expect(mockLogger.info).toHaveBeenCalledWith("Processing request");
		});

		it("should handle endpoint returning error status", async () => {
			const TestSchema = z.object({ value: z.string() });

			class FailingEndpoint implements ApiEndpoint<typeof TestSchema> {
				async processRequest(): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.FAIL,
						error: "Something went wrong",
					};
				}

				getRequestArgsSchema(): typeof TestSchema {
					return TestSchema;
				}
			}

			const routes: ApiRoutes = {
				"/failing": new FailingEndpoint(),
			};

			const result = await routes["/failing"].processRequest({ value: "test" });
			expect(result.status).toBe(ApiEndpointResponseStatus.FAIL);
			expect(result.error).toBe("Something went wrong");
		});

		it("should handle endpoint returning processing status", async () => {
			const TestSchema = z.object({ value: z.string() });

			class ProcessingEndpoint implements ApiEndpoint<typeof TestSchema> {
				async processRequest(): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.PROCESSING,
						data: { message: "Request is being processed" },
					};
				}

				getRequestArgsSchema(): typeof TestSchema {
					return TestSchema;
				}
			}

			const routes: ApiRoutes = {
				"/processing": new ProcessingEndpoint(),
			};

			const result = await routes["/processing"].processRequest({
				value: "test",
			});
			expect(result.status).toBe(ApiEndpointResponseStatus.PROCESSING);
			expect(result.data).toEqual({ message: "Request is being processed" });
		});
	});

	describe("type safety", () => {
		// Minimal type test to verify parameter and return types
		it("should type ApiRoutes correctly", () => {
			const TestSchema = z.object({ value: z.string() });

			class TestEndpoint implements ApiEndpoint<typeof TestSchema> {
				async processRequest(): Promise<ApiEndpointResponse> {
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): typeof TestSchema {
					return TestSchema;
				}
			}

			const routes: ApiRoutes = {
				"/test": new TestEndpoint(),
			};

			expectTypeOf(routes).toMatchTypeOf<ApiRoutes>();
		});
	});
});

describe("ApiRoutesProvider", () => {
	describe("basic functionality", () => {
		it("should return routes from provider", () => {
			const TestSchema = z.object({ value: z.string() });

			class TestEndpoint implements ApiEndpoint<typeof TestSchema> {
				async processRequest(): Promise<ApiEndpointResponse> {
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): typeof TestSchema {
					return TestSchema;
				}
			}

			class TestRoutesProvider implements ApiRoutesProvider {
				getRoutes(): ApiRoutes {
					return {
						"/test": new TestEndpoint(),
					};
				}
			}

			const provider = new TestRoutesProvider();
			const routes = provider.getRoutes();

			expect(routes["/test"]).toBeInstanceOf(TestEndpoint);
		});

		it("should return multiple routes from provider", () => {
			const Schema1 = z.object({ a: z.string() });
			const Schema2 = z.object({ b: z.number() });

			class Endpoint1 implements ApiEndpoint<typeof Schema1> {
				async processRequest(): Promise<ApiEndpointResponse> {
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): typeof Schema1 {
					return Schema1;
				}
			}

			class Endpoint2 implements ApiEndpoint<typeof Schema2> {
				async processRequest(): Promise<ApiEndpointResponse> {
					return { status: ApiEndpointResponseStatus.SUCCESS };
				}

				getRequestArgsSchema(): typeof Schema2 {
					return Schema2;
				}
			}

			class MultiRoutesProvider implements ApiRoutesProvider {
				getRoutes(): ApiRoutes {
					return {
						"/route1": new Endpoint1(),
						"/route2": new Endpoint2(),
						"/route3": new Endpoint2(),
					};
				}
			}

			const provider = new MultiRoutesProvider();
			const routes = provider.getRoutes();

			expect(Object.keys(routes)).toHaveLength(3);
			expect(routes["/route1"]).toBeInstanceOf(Endpoint1);
			expect(routes["/route2"]).toBeInstanceOf(Endpoint2);
			expect(routes["/route3"]).toBeInstanceOf(Endpoint2);
		});

		it("should return empty routes from provider", () => {
			class EmptyRoutesProvider implements ApiRoutesProvider {
				getRoutes(): ApiRoutes {
					return {};
				}
			}

			const provider = new EmptyRoutesProvider();
			const routes = provider.getRoutes();

			expect(Object.keys(routes)).toHaveLength(0);
		});

		it("should allow dynamic route generation", () => {
			const TestSchema = z.object({ value: z.string() });

			class DynamicEndpoint implements ApiEndpoint<typeof TestSchema> {
				constructor(private name: string) {}

				async processRequest(): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { name: this.name },
					};
				}

				getRequestArgsSchema(): typeof TestSchema {
					return TestSchema;
				}
			}

			class DynamicRoutesProvider implements ApiRoutesProvider {
				getRoutes(): ApiRoutes {
					const routes: ApiRoutes = {};
					for (let i = 1; i <= 3; i++) {
						routes[`/endpoint${i}`] = new DynamicEndpoint(`endpoint${i}`);
					}
					return routes;
				}
			}

			const provider = new DynamicRoutesProvider();
			const routes = provider.getRoutes();

			expect(Object.keys(routes)).toHaveLength(3);
			expect(routes["/endpoint1"]).toBeInstanceOf(DynamicEndpoint);
			expect(routes["/endpoint2"]).toBeInstanceOf(DynamicEndpoint);
			expect(routes["/endpoint3"]).toBeInstanceOf(DynamicEndpoint);
		});
	});

	describe("integration with endpoints", () => {
		it("should execute endpoints from provider routes", async () => {
			const TestSchema = z.object({ value: z.string() });

			class TestEndpoint implements ApiEndpoint<typeof TestSchema> {
				async processRequest(
					args: z.infer<typeof TestSchema>,
				): Promise<ApiEndpointResponse> {
					return {
						status: ApiEndpointResponseStatus.SUCCESS,
						data: { echo: args.value },
					};
				}

				getRequestArgsSchema(): typeof TestSchema {
					return TestSchema;
				}
			}

			class TestRoutesProvider implements ApiRoutesProvider {
				getRoutes(): ApiRoutes {
					return {
						"/echo": new TestEndpoint(),
					};
				}
			}

			const provider = new TestRoutesProvider();
			const routes = provider.getRoutes();
			const result = await routes["/echo"].processRequest({ value: "test" });

			expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(result.data).toEqual({ echo: "test" });
		});
	});

	describe("type safety", () => {
		// Minimal type test for return type
		it("should type provider getRoutes return correctly", () => {
			class TestRoutesProvider implements ApiRoutesProvider {
				getRoutes(): ApiRoutes {
					return {};
				}
			}

			const provider = new TestRoutesProvider();
			expectTypeOf(provider.getRoutes).returns.toMatchTypeOf<ApiRoutes>();
		});
	});
});

describe("ApiRouteLimit", () => {
	describe("basic functionality", () => {
		it("should store windowMs and limit values", () => {
			const limit: ApiRouteLimit = {
				windowMs: 60000,
				limit: 100,
			};

			expect(limit.windowMs).toBe(60000);
			expect(limit.limit).toBe(100);
		});

		it("should support different time windows", () => {
			const limits: ApiRouteLimit[] = [
				{ windowMs: 1000, limit: 10 },
				{ windowMs: 60000, limit: 100 },
				{ windowMs: 3600000, limit: 1000 },
			];

			expect(limits[0].windowMs).toBe(1000); // 1 second
			expect(limits[1].windowMs).toBe(60000); // 1 minute
			expect(limits[2].windowMs).toBe(3600000); // 1 hour
		});

		it("should support various limit values", () => {
			const limits: ApiRouteLimit[] = [
				{ windowMs: 60000, limit: 1 },
				{ windowMs: 60000, limit: 100 },
				{ windowMs: 60000, limit: 1000 },
			];

			expect(limits[0].limit).toBe(1);
			expect(limits[1].limit).toBe(100);
			expect(limits[2].limit).toBe(1000);
		});
	});

	describe("usage scenarios", () => {
		it("should be usable in rate limiting logic", () => {
			const limit: ApiRouteLimit = {
				windowMs: 60000,
				limit: 10,
			};

			// Simulate rate limiting check
			const checkRateLimit = (
				requestCount: number,
				limit: ApiRouteLimit,
			): boolean => {
				return requestCount < limit.limit;
			};

			expect(checkRateLimit(5, limit)).toBe(true);
			expect(checkRateLimit(9, limit)).toBe(true);
			expect(checkRateLimit(10, limit)).toBe(false);
			expect(checkRateLimit(15, limit)).toBe(false);
		});
	});

	describe("type safety", () => {
		// Minimal type test for parameter types
		it("should type ApiRouteLimit properties correctly", () => {
			const limit: ApiRouteLimit = {
				windowMs: 60000,
				limit: 100,
			};

			expectTypeOf(limit.windowMs).toBeNumber();
			expectTypeOf(limit.limit).toBeNumber();
		});
	});
});

describe("ApiRouteLimits", () => {
	describe("basic functionality with enums", () => {
		it("should work with string enums", () => {
			enum RouteName {
				GET_USER = "GET_USER",
				CREATE_USER = "CREATE_USER",
			}

			const limits: ApiRouteLimits<RouteName> = {
				[RouteName.GET_USER]: {
					windowMs: 60000,
					limit: 100,
				},
				[RouteName.CREATE_USER]: {
					windowMs: 30000,
					limit: 50,
				},
			};

			expect(limits[RouteName.GET_USER].windowMs).toBe(60000);
			expect(limits[RouteName.GET_USER].limit).toBe(100);
			expect(limits[RouteName.CREATE_USER].windowMs).toBe(30000);
			expect(limits[RouteName.CREATE_USER].limit).toBe(50);
		});

		it("should work with number enums", () => {
			enum RouteId {
				GET_USER = 1,
				CREATE_USER = 2,
			}

			const limits: ApiRouteLimits<RouteId> = {
				[RouteId.GET_USER]: {
					windowMs: 60000,
					limit: 100,
				},
				[RouteId.CREATE_USER]: {
					windowMs: 30000,
					limit: 50,
				},
			};

			expect(limits[RouteId.GET_USER].windowMs).toBe(60000);
			expect(limits[RouteId.CREATE_USER].limit).toBe(50);
		});
	});

	describe("basic functionality with literals", () => {
		it("should work with string literal unions", () => {
			type RouteType = "GET_USER" | "CREATE_USER";

			const limits: ApiRouteLimits<RouteType> = {
				GET_USER: {
					windowMs: 60000,
					limit: 100,
				},
				CREATE_USER: {
					windowMs: 30000,
					limit: 50,
				},
			};

			expect(limits.GET_USER.windowMs).toBe(60000);
			expect(limits.CREATE_USER.limit).toBe(50);
		});
	});

	describe("usage scenarios", () => {
		it("should support lookup by route key", () => {
			enum RouteName {
				GET_USER = "GET_USER",
				CREATE_USER = "CREATE_USER",
				DELETE_USER = "DELETE_USER",
			}

			const limits: ApiRouteLimits<RouteName> = {
				[RouteName.GET_USER]: { windowMs: 60000, limit: 100 },
				[RouteName.CREATE_USER]: { windowMs: 30000, limit: 50 },
				[RouteName.DELETE_USER]: { windowMs: 60000, limit: 10 },
			};

			const getLimitForRoute = (
				route: RouteName,
				limits: ApiRouteLimits<RouteName>,
			): ApiRouteLimit => {
				return limits[route];
			};

			const userLimit = getLimitForRoute(RouteName.GET_USER, limits);
			expect(userLimit.limit).toBe(100);

			const deleteLimit = getLimitForRoute(RouteName.DELETE_USER, limits);
			expect(deleteLimit.limit).toBe(10);
		});

		it("should support iteration over limits", () => {
			enum RouteName {
				ROUTE_A = "ROUTE_A",
				ROUTE_B = "ROUTE_B",
			}

			const limits: ApiRouteLimits<RouteName> = {
				[RouteName.ROUTE_A]: { windowMs: 60000, limit: 100 },
				[RouteName.ROUTE_B]: { windowMs: 30000, limit: 50 },
			};

			const keys = Object.keys(limits) as RouteName[];
			expect(keys).toHaveLength(2);
			expect(keys).toContain(RouteName.ROUTE_A);
			expect(keys).toContain(RouteName.ROUTE_B);
		});
	});
});
