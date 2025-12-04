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

import { describe, expect, expectTypeOf, it } from "vitest";
import type { Logger } from "@prosopo/common";
import { z, type ZodType } from "zod";
import type { ApiEndpoint } from "../endpoint/apiEndpoint.js";
import type { ApiEndpointResponse } from "../endpoint/apiEndpointResponse.js";
import { ApiEndpointResponseStatus } from "../endpoint/apiEndpointResponseStatus.js";
import type {
    ApiRoutes,
    ApiRoutesProvider,
    ApiRouteLimit,
    ApiRouteLimits,
} from "../apiRoutes.js";

describe("ApiRoutes", () => {
    describe("type correctness", () => {
        it("should correctly type ApiRoutes as Record of endpoints", () => {
            const TestSchema = z.object({ value: z.string() });

            class TestEndpoint implements ApiEndpoint<typeof TestSchema> {
                async processRequest(
                    args: z.infer<typeof TestSchema>,
                ): Promise<ApiEndpointResponse> {
                    return { status: ApiEndpointResponseStatus.SUCCESS };
                }

                getRequestArgsSchema(): typeof TestSchema {
                    return TestSchema;
                }
            }

            class NoArgsEndpoint implements ApiEndpoint<undefined> {
                async processRequest(): Promise<ApiEndpointResponse> {
                    return { status: ApiEndpointResponseStatus.SUCCESS };
                }

                getRequestArgsSchema(): undefined {
                    return undefined;
                }
            }

            const routes: ApiRoutes = {
                "/test": new TestEndpoint(),
                "/no-args": new NoArgsEndpoint(),
            };

            expectTypeOf(routes).toMatchTypeOf<ApiRoutes>();
            // ApiRoutes is Record<string, ApiEndpoint<ZodType | undefined>>
            // so individual routes are typed as ApiEndpoint<ZodType | undefined>
            expectTypeOf(routes["/test"]).toMatchTypeOf<
                ApiEndpoint<ZodType | undefined>
            >();
            expectTypeOf(routes["/no-args"]).toMatchTypeOf<
                ApiEndpoint<ZodType | undefined>
            >();

            // Test runtime behavior
            expect(routes["/test"]).toBeInstanceOf(TestEndpoint);
            expect(routes["/no-args"]).toBeInstanceOf(NoArgsEndpoint);
        });

        it("should allow mixed endpoint types in ApiRoutes", () => {
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

            class Endpoint3 implements ApiEndpoint<undefined> {
                async processRequest(): Promise<ApiEndpointResponse> {
                    return { status: ApiEndpointResponseStatus.SUCCESS };
                }

                getRequestArgsSchema(): undefined {
                    return undefined;
                }
            }

            const routes: ApiRoutes = {
                "/endpoint1": new Endpoint1(),
                "/endpoint2": new Endpoint2(),
                "/endpoint3": new Endpoint3(),
            };

            expectTypeOf(routes).toMatchTypeOf<ApiRoutes>();
            expect(Object.keys(routes)).toHaveLength(3);
        });
    });

    describe("ApiRoutesProvider", () => {
        it("should correctly type ApiRoutesProvider interface", () => {
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

            expectTypeOf(provider).toMatchTypeOf<ApiRoutesProvider>();
            expectTypeOf(provider.getRoutes).returns.toMatchTypeOf<ApiRoutes>();
            expectTypeOf(routes).toMatchTypeOf<ApiRoutes>();

            // Test runtime behavior
            expect(routes["/test"]).toBeInstanceOf(TestEndpoint);
        });

        it("should allow provider to return multiple routes", () => {
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

            expectTypeOf(routes).toMatchTypeOf<ApiRoutes>();
            expect(Object.keys(routes)).toHaveLength(3);
            expect(routes["/route1"]).toBeInstanceOf(Endpoint1);
            expect(routes["/route2"]).toBeInstanceOf(Endpoint2);
        });

        it("should allow provider to return empty routes", () => {
            class EmptyRoutesProvider implements ApiRoutesProvider {
                getRoutes(): ApiRoutes {
                    return {};
                }
            }

            const provider = new EmptyRoutesProvider();
            const routes = provider.getRoutes();

            expectTypeOf(routes).toMatchTypeOf<ApiRoutes>();
            expect(Object.keys(routes)).toHaveLength(0);
        });
    });

    describe("ApiRouteLimit and ApiRouteLimits", () => {
        it("should correctly type ApiRouteLimit", () => {
            const limit: ApiRouteLimit = {
                windowMs: 60000,
                limit: 100,
            };

            expectTypeOf(limit).toMatchTypeOf<ApiRouteLimit>();
            expectTypeOf(limit.windowMs).toMatchTypeOf<number>();
            expectTypeOf(limit.limit).toMatchTypeOf<number>();

            expect(limit.windowMs).toBe(60000);
            expect(limit.limit).toBe(100);
        });

        it("should correctly type ApiRouteLimits with string enum", () => {
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

            expectTypeOf(limits).toMatchTypeOf<ApiRouteLimits<RouteName>>();
            expectTypeOf(limits[RouteName.GET_USER]).toMatchTypeOf<ApiRouteLimit>();
            expectTypeOf(limits[RouteName.CREATE_USER]).toMatchTypeOf<ApiRouteLimit>();

            expect(limits[RouteName.GET_USER].windowMs).toBe(60000);
            expect(limits[RouteName.GET_USER].limit).toBe(100);
            expect(limits[RouteName.CREATE_USER].windowMs).toBe(30000);
            expect(limits[RouteName.CREATE_USER].limit).toBe(50);
        });

        it("should correctly type ApiRouteLimits with number enum", () => {
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

            expectTypeOf(limits).toMatchTypeOf<ApiRouteLimits<RouteId>>();
            expectTypeOf(limits[RouteId.GET_USER]).toMatchTypeOf<ApiRouteLimit>();
            expectTypeOf(limits[RouteId.CREATE_USER]).toMatchTypeOf<ApiRouteLimit>();

            expect(limits[RouteId.GET_USER].windowMs).toBe(60000);
            expect(limits[RouteId.GET_USER].limit).toBe(100);
        });

        it("should correctly type ApiRouteLimits with string literal union", () => {
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

            expectTypeOf(limits).toMatchTypeOf<ApiRouteLimits<RouteType>>();
            expectTypeOf(limits.GET_USER).toMatchTypeOf<ApiRouteLimit>();
            expectTypeOf(limits.CREATE_USER).toMatchTypeOf<ApiRouteLimit>();

            expect(limits.GET_USER.windowMs).toBe(60000);
            expect(limits.CREATE_USER.limit).toBe(50);
        });
    });
});

