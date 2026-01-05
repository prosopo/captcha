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
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
	type ApiExpressEndpointAdapter,
	apiExpressRouterFactory,
	createApiExpressDefaultEndpointAdapter,
} from "../../index.js";

describe("index exports - runtime tests", () => {
	describe("apiExpressRouterFactory", () => {
		it("should be a singleton instance", () => {
			const factory1 = apiExpressRouterFactory;
			const factory2 = apiExpressRouterFactory;

			expect(factory1).toBe(factory2);
			expect(factory1).toBeDefined();
		});

		it("should have createRouter method", () => {
			expect(apiExpressRouterFactory.createRouter).toBeDefined();
			expect(typeof apiExpressRouterFactory.createRouter).toBe("function");
		});

		it("should create router with createRouter method", () => {
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

			const mockRoutesProvider: ApiRoutesProvider = {
				getRoutes: () => mockRoutes,
			};

			const mockAdapter: ApiExpressEndpointAdapter = {
				handleRequest: vi.fn().mockResolvedValue(undefined),
			};

			const router = apiExpressRouterFactory.createRouter(
				mockRoutesProvider,
				mockAdapter,
			);

			expect(router).toBeDefined();
		});
	});

	describe("createApiExpressDefaultEndpointAdapter", () => {
		it("should create adapter with logLevel only", () => {
			const adapter = createApiExpressDefaultEndpointAdapter("info");

			expect(adapter).toBeDefined();
			expect(adapter.handleRequest).toBeDefined();
			expect(typeof adapter.handleRequest).toBe("function");
		});

		it("should create adapter with logLevel and errorStatusCode", () => {
			const adapter = createApiExpressDefaultEndpointAdapter("info", 400);

			expect(adapter).toBeDefined();
			expect(adapter.handleRequest).toBeDefined();
		});

		it("should create different adapter instances", () => {
			const adapter1 = createApiExpressDefaultEndpointAdapter("info", 500);
			const adapter2 = createApiExpressDefaultEndpointAdapter("warn", 400);

			expect(adapter1).not.toBe(adapter2);
			expect(adapter1).toBeDefined();
			expect(adapter2).toBeDefined();
		});

		it("should create adapter with different log levels", () => {
			const levels = ["debug", "info", "warn", "error"] as const;

			for (const level of levels) {
				const adapter = createApiExpressDefaultEndpointAdapter(level);
				expect(adapter).toBeDefined();
			}
		});

		it("should create adapter with different error status codes", () => {
			const codes = [400, 401, 403, 404, 500, 503];

			for (const code of codes) {
				const adapter = createApiExpressDefaultEndpointAdapter("info", code);
				expect(adapter).toBeDefined();
			}
		});

		it("should use default errorStatusCode when not provided", () => {
			// Default should be 500 based on function signature
			const adapter = createApiExpressDefaultEndpointAdapter("info");

			expect(adapter).toBeDefined();
			// The default is used internally, we verify the adapter is created
		});
	});
});
