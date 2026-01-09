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
import type { Logger } from "@prosopo/common";
import { getLogger } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/env";
import express from "express";
import supertest from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiExpressRouterFactory } from "../../apiExpressRouterFactory.js";
import { ApiExpressDefaultEndpointAdapter } from "../../endpointAdapter/apiExpressDefaultEndpointAdapter.js";
import { requestLoggerMiddleware } from "../../middlewares/requestLoggerMiddleware.js";

describe("ApiExpressRouterFactory Integration Tests", () => {
	let app: express.Application;
	let factory: ApiExpressRouterFactory;
	let adapter: ApiExpressDefaultEndpointAdapter;
	let logger: Logger;

	beforeEach(() => {
		app = express();
		app.use(express.json());

		logger = getLogger("info", "test");
		app.use(
			requestLoggerMiddleware({
				config: { logLevel: "error" },
			} as ProviderEnvironment),
		);

		factory = new ApiExpressRouterFactory();
		adapter = new ApiExpressDefaultEndpointAdapter(logger, 500);
	});

	describe("Full HTTP request routing", () => {
		it("should handle successful API endpoint requests", async () => {
			// Testing that the router properly registers POST routes and handles requests
			// This covers the uncovered lines in apiExpressRouterFactory.ts (lines 52-62)
			const mockEndpoint = {
				getRequestArgsSchema: () => z.object({ message: z.string() }),
				processRequest: async (args: { message: string }, logger?: Logger) => ({
					status: "success" as const,
					data: { echo: args.message, processed: true },
				}),
			};

			const routes: ApiRoutes = {
				"/echo": mockEndpoint,
			};

			const routesProvider: ApiRoutesProvider = {
				getRoutes: () => routes,
			};

			const router = factory.createRouter(routesProvider, adapter);
			app.use("/api", router);

			const response = await supertest(app)
				.post("/api/echo")
				.send({ message: "hello world" })
				.expect(200);

			expect(response.body).toEqual({
				status: "success",
				data: { echo: "hello world", processed: true },
			});
		});

		it("should handle multiple routes correctly", async () => {
			// Testing multiple route registration
			const echoEndpoint = {
				getRequestArgsSchema: () => z.object({ text: z.string() }),
				processRequest: async (args: { text: string }) => ({
					status: "success" as const,
					data: { echoed: args.text },
				}),
			};

			const mathEndpoint = {
				getRequestArgsSchema: () => z.object({ a: z.number(), b: z.number() }),
				processRequest: async (args: { a: number; b: number }) => ({
					status: "success" as const,
					data: { sum: args.a + args.b },
				}),
			};

			const routes: ApiRoutes = {
				"/echo": echoEndpoint,
				"/math/add": mathEndpoint,
			};

			const routesProvider: ApiRoutesProvider = {
				getRoutes: () => routes,
			};

			const router = factory.createRouter(routesProvider, adapter);
			app.use("/api/v1", router);

			// Test echo endpoint
			const echoResponse = await supertest(app)
				.post("/api/v1/echo")
				.send({ text: "integration test" })
				.expect(200);

			expect(echoResponse.body).toEqual({
				status: "success",
				data: { echoed: "integration test" },
			});

			// Test math endpoint
			const mathResponse = await supertest(app)
				.post("/api/v1/math/add")
				.send({ a: 5, b: 3 })
				.expect(200);

			expect(mathResponse.body).toEqual({
				status: "success",
				data: { sum: 8 },
			});
		});

		it("should handle request validation errors", async () => {
			// Testing schema validation - this covers error handling in the endpoint adapter
			const strictEndpoint = {
				getRequestArgsSchema: () =>
					z.object({
						requiredField: z.string(),
						numberField: z.number().min(0),
					}),
				processRequest: async (args: {
					requiredField: string;
					numberField: number;
				}) => ({
					status: "success" as const,
					data: args,
				}),
			};

			const routes: ApiRoutes = {
				"/validate": strictEndpoint,
			};

			const routesProvider: ApiRoutesProvider = {
				getRoutes: () => routes,
			};

			const router = factory.createRouter(routesProvider, adapter);
			app.use("/api", router);

			// Test missing required field
			const response1 = await supertest(app)
				.post("/api/validate")
				.send({ numberField: 42 })
				.expect(400);

			expect(response1.body.error).toBeDefined();

			// Test invalid number (negative)
			const response2 = await supertest(app)
				.post("/api/validate")
				.send({ requiredField: "test", numberField: -1 })
				.expect(400);

			expect(response2.body.error).toBeDefined();
		});

		it("should handle endpoint processing errors", async () => {
			// Testing error handling in processRequest - covers line 60 in endpoint adapter
			const failingEndpoint = {
				getRequestArgsSchema: () => z.object({ shouldFail: z.boolean() }),
				processRequest: async (args: { shouldFail: boolean }) => {
					if (args.shouldFail) {
						throw new Error("Simulated endpoint error");
					}
					return {
						status: "success" as const,
						data: { success: true },
					};
				},
			};

			const routes: ApiRoutes = {
				"/unstable": failingEndpoint,
			};

			const routesProvider: ApiRoutesProvider = {
				getRoutes: () => routes,
			};

			const router = factory.createRouter(routesProvider, adapter);
			app.use("/api", router);

			// Test successful case
			const successResponse = await supertest(app)
				.post("/api/unstable")
				.send({ shouldFail: false })
				.expect(200);

			expect(successResponse.body).toEqual({
				status: "success",
				data: { success: true },
			});

			// Test error case - should get 500 status
			const errorResponse = await supertest(app)
				.post("/api/unstable")
				.send({ shouldFail: true })
				.expect(500);

			expect(errorResponse.text).toBe("An internal server error occurred.");
		});

		it("should handle routes without request schema validation", async () => {
			// Testing endpoints without schema validation
			const noSchemaEndpoint = {
				getRequestArgsSchema: () => undefined,
				processRequest: async (logger?: Logger) => ({
					status: "success" as const,
					data: { message: "No schema required" },
				}),
			};

			const routes: ApiRoutes = {
				"/noschema": noSchemaEndpoint,
			};

			const routesProvider: ApiRoutesProvider = {
				getRoutes: () => routes,
			};

			const router = factory.createRouter(routesProvider, adapter);
			app.use("/api", router);

			const response = await supertest(app)
				.post("/api/noschema")
				.send({ someData: "ignored" })
				.expect(200);

			expect(response.body).toEqual({
				status: "success",
				data: { message: "No schema required" },
			});
		});

		it("should handle endpoint processing errors with adapter error response", async () => {
			// Testing that the endpoint adapter handles errors properly
			const throwingEndpoint = {
				getRequestArgsSchema: () => z.object({}),
				processRequest: async () => {
					throw new Error("Test error");
				},
			};

			const routes: ApiRoutes = {
				"/error": throwingEndpoint,
			};

			const routesProvider: ApiRoutesProvider = {
				getRoutes: () => routes,
			};

			const router = factory.createRouter(routesProvider, adapter);
			app.use("/api", router);

			// The adapter should catch the error and return a plain text error response
			const response = await supertest(app)
				.post("/api/error")
				.send({})
				.expect(500);

			expect(response.text).toBe("An internal server error occurred.");
			expect(response.headers["content-type"]).toContain("text/plain");
		});
	});

	describe("Router integration with Express app", () => {
		it("should work with standard Express middleware chain", async () => {
			// Testing integration with other Express middleware
			app.use((req, res, next) => {
				res.locals.testValue = "middleware_set";
				next();
			});

			const middlewareAwareEndpoint = {
				getRequestArgsSchema: () => z.object({}),
				processRequest: async () => ({
					status: "success" as const,
					data: { middlewareCheck: "passed" },
				}),
			};

			const routes: ApiRoutes = {
				"/middleware": middlewareAwareEndpoint,
			};

			const routesProvider: ApiRoutesProvider = {
				getRoutes: () => routes,
			};

			const router = factory.createRouter(routesProvider, adapter);
			app.use("/test", router);

			const response = await supertest(app)
				.post("/test/middleware")
				.send({})
				.expect(200);

			expect(response.body).toEqual({
				status: "success",
				data: { middlewareCheck: "passed" },
			});
		});
	});
});
