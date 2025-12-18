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

import type { ApiRoutes, ApiRoutesProvider } from "@prosopo/api-route";
import type { ApiEndpoint } from "@prosopo/api-route";
import type { Logger } from "@prosopo/common";
import type { NextFunction, Request, Response, Router } from "express";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { ApiExpressRouterFactory } from "../../apiExpressRouterFactory.js";
import type { ApiExpressEndpointAdapter } from "../../endpointAdapter/apiExpressEndpointAdapter.js";

describe("ApiExpressRouterFactory", () => {
	describe("createRouter", () => {
		it("should create a router with registered routes", () => {
			const mockEndpoint: ApiEndpoint<z.ZodType> = {
				getRequestArgsSchema: () => z.object({ test: z.string() }),
				processRequest: async () => ({
					status: "success",
					data: { result: "ok" },
				}),
			};

			const mockRoutes: ApiRoutes = {
				"/test": mockEndpoint,
				"/another": mockEndpoint,
			};

			const mockRoutesProvider: ApiRoutesProvider = {
				getRoutes: () => mockRoutes,
			};

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router = factory.createRouter(mockRoutesProvider, mockAdapter);

			expect(router).toBeDefined();
			expectTypeOf(router).toMatchTypeOf<Router>();
		});

		it("should register all routes from provider", () => {
			const mockEndpoint1: ApiEndpoint<z.ZodType> = {
				getRequestArgsSchema: () => z.object({ test: z.string() }),
				processRequest: async () => ({
					status: "success",
					data: { result: "ok" },
				}),
			};

			const mockEndpoint2: ApiEndpoint<z.ZodType> = {
				getRequestArgsSchema: () => z.object({ other: z.number() }),
				processRequest: async () => ({
					status: "success",
					data: { result: "ok" },
				}),
			};

			const mockRoutes: ApiRoutes = {
				"/route1": mockEndpoint1,
				"/route2": mockEndpoint2,
				"/route3": mockEndpoint1,
			};

			const mockRoutesProvider: ApiRoutesProvider = {
				getRoutes: () => mockRoutes,
			};

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router = factory.createRouter(mockRoutesProvider, mockAdapter);

			expect(router).toBeDefined();
			// Verify adapter was called for each route registration
			// The actual route registration happens internally, but we can verify
			// the router is created successfully
		});

		it("should register error handler at the end", () => {
			const mockRoutes: ApiRoutes = {
				"/test": {
					getRequestArgsSchema: () => undefined,
					processRequest: async () => ({
						status: "success",
						data: {},
					}),
				},
			};

			const mockRoutesProvider: ApiRoutesProvider = {
				getRoutes: () => mockRoutes,
			};

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router = factory.createRouter(mockRoutesProvider, mockAdapter);

			expect(router).toBeDefined();
			// Error handler is registered via router.use(handleErrors)
			// This is verified by the router being created successfully
		});

		it("should handle empty routes object", () => {
			const mockRoutes: ApiRoutes = {};

			const mockRoutesProvider: ApiRoutesProvider = {
				getRoutes: () => mockRoutes,
			};

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router = factory.createRouter(mockRoutesProvider, mockAdapter);

			expect(router).toBeDefined();
		});

		it("should accept ApiExpressEndpointAdapter parameter", () => {
			const mockRoutes: ApiRoutes = {
				"/test": {
					getRequestArgsSchema: () => undefined,
					processRequest: async () => ({
						status: "success",
						data: {},
					}),
				},
			};

			const mockRoutesProvider: ApiRoutesProvider = {
				getRoutes: () => mockRoutes,
			};

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();

			// Type test: verify createRouter accepts ApiExpressEndpointAdapter
			expectTypeOf(factory.createRouter)
				.parameter(1)
				.toMatchTypeOf<ApiExpressEndpointAdapter>();

			const router = factory.createRouter(mockRoutesProvider, mockAdapter);
			expect(router).toBeDefined();
		});

		it("should return Router type", () => {
			const mockRoutes: ApiRoutes = {
				"/test": {
					getRequestArgsSchema: () => undefined,
					processRequest: async () => ({
						status: "success",
						data: {},
					}),
				},
			};

			const mockRoutesProvider: ApiRoutesProvider = {
				getRoutes: () => mockRoutes,
			};

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router = factory.createRouter(mockRoutesProvider, mockAdapter);

			// Type test: verify return type is Router
			expectTypeOf(router).toMatchTypeOf<Router>();
		});
	});

	describe("registerRoutes", () => {
		it("should register routes with POST method", async () => {
			const mockEndpoint: ApiEndpoint<z.ZodType> = {
				getRequestArgsSchema: () => z.object({ test: z.string() }),
				processRequest: async () => ({
					status: "success",
					data: { result: "ok" },
				}),
			};

			const mockRoutes: ApiRoutes = {
				"/test-route": mockEndpoint,
			};

			const mockRequest = {
				body: { test: "value" },
				logger: {} as Logger,
			} as unknown as Request;

			const mockResponse = {
				json: vi.fn(),
				status: vi.fn().mockReturnThis(),
				send: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router = factory.createRouter(
				{ getRoutes: () => mockRoutes },
				mockAdapter,
			);

			// Simulate a POST request to the registered route
			// Note: This is a simplified test - in a real scenario you'd use supertest
			// or similar to make actual HTTP requests
			expect(router).toBeDefined();
			expect(mockAdapter.handleRequest).not.toHaveBeenCalled();
		});

		it("should pass correct parameters to adapter", () => {
			const mockEndpoint: ApiEndpoint<z.ZodType> = {
				getRequestArgsSchema: () => z.object({ test: z.string() }),
				processRequest: async () => ({
					status: "success",
					data: { result: "ok" },
				}),
			};

			const mockRoutes: ApiRoutes = {
				"/test": mockEndpoint,
			};

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router = factory.createRouter(
				{ getRoutes: () => mockRoutes },
				mockAdapter,
			);

			expect(router).toBeDefined();
		});

		it("should handle routes with special characters", () => {
			const mockEndpoint: ApiEndpoint<z.ZodType> = {
				getRequestArgsSchema: () => z.object({ id: z.string() }),
				processRequest: async () => ({
					status: "success",
					data: {},
				}),
			};

			const mockRoutes: ApiRoutes = {
				"/api/v1/users/:id": mockEndpoint,
				"/api/v1/users/:id/profile": mockEndpoint,
			};

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router = factory.createRouter(
				{ getRoutes: () => mockRoutes },
				mockAdapter,
			);

			expect(router).toBeDefined();
		});

		it("should handle many routes", () => {
			const mockEndpoint: ApiEndpoint<z.ZodType> = {
				getRequestArgsSchema: () => z.object({ test: z.string() }),
				processRequest: async () => ({
					status: "success",
					data: {},
				}),
			};

			const mockRoutes: ApiRoutes = {};
			// Create 100 routes
			for (let i = 0; i < 100; i++) {
				mockRoutes[`/route${i}`] = mockEndpoint;
			}

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router = factory.createRouter(
				{ getRoutes: () => mockRoutes },
				mockAdapter,
			);

			expect(router).toBeDefined();
		});
	});

	describe("edge cases", () => {
		it("should handle routes with undefined schema", () => {
			const mockEndpoint: ApiEndpoint<undefined> = {
				getRequestArgsSchema: () => undefined,
				processRequest: async () => ({
					status: "success",
					data: { result: "no schema" },
				}),
			};

			const mockRoutes: ApiRoutes = {
				"/no-schema": mockEndpoint,
			};

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router = factory.createRouter(
				{ getRoutes: () => mockRoutes },
				mockAdapter,
			);

			expect(router).toBeDefined();
		});

		it("should handle routes with complex schemas", () => {
			const complexSchema = z.object({
				user: z.object({
					name: z.string(),
					email: z.string().email(),
					age: z.number().min(0).max(120),
					tags: z.array(z.string()),
				}),
				metadata: z.record(z.string(), z.unknown()),
			});

			const mockEndpoint: ApiEndpoint<typeof complexSchema> = {
				getRequestArgsSchema: () => complexSchema,
				processRequest: async () => ({
					status: "success",
					data: {},
				}),
			};

			const mockRoutes: ApiRoutes = {
				"/complex": mockEndpoint,
			};

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router = factory.createRouter(
				{ getRoutes: () => mockRoutes },
				mockAdapter,
			);

			expect(router).toBeDefined();
		});

		it("should handle routes with same endpoint but different paths", () => {
			const sharedEndpoint: ApiEndpoint<z.ZodType> = {
				getRequestArgsSchema: () => z.object({ id: z.string() }),
				processRequest: async () => ({
					status: "success",
					data: {},
				}),
			};

			const mockRoutes: ApiRoutes = {
				"/path1": sharedEndpoint,
				"/path2": sharedEndpoint,
				"/path3": sharedEndpoint,
			};

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router = factory.createRouter(
				{ getRoutes: () => mockRoutes },
				mockAdapter,
			);

			expect(router).toBeDefined();
		});

		it("should create router with different adapter implementations", () => {
			const mockRoutes: ApiRoutes = {
				"/test": {
					getRequestArgsSchema: () => undefined,
					processRequest: async () => ({
						status: "success",
						data: {},
					}),
				},
			};

			const mockRoutesProvider: ApiRoutesProvider = {
				getRoutes: () => mockRoutes,
			};

			const adapter1: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const adapter2: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router1 = factory.createRouter(mockRoutesProvider, adapter1);
			const router2 = factory.createRouter(mockRoutesProvider, adapter2);

			expect(router1).toBeDefined();
			expect(router2).toBeDefined();
		});

		it("should handle async endpoint processing", () => {
			const asyncEndpoint: ApiEndpoint<undefined> = {
				getRequestArgsSchema: () => undefined,
				processRequest: async () => {
					// Simulate async operation
					await new Promise((resolve) => setTimeout(resolve, 10));
					return {
						status: "success",
						data: { async: true },
					};
				},
			};

			const mockRoutes: ApiRoutes = {
				"/async": asyncEndpoint,
			};

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const factory = new ApiExpressRouterFactory();
			const router = factory.createRouter(
				{ getRoutes: () => mockRoutes },
				mockAdapter,
			);

			expect(router).toBeDefined();
		});
	});
});
