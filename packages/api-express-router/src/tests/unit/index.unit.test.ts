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

import type { ApiEndpoint } from "@prosopo/api-route";
import type { Logger } from "@prosopo/common";
import { getLogger } from "@prosopo/common";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
	apiExpressRouterFactory,
	createApiExpressDefaultEndpointAdapter,
	type ApiExpressEndpointAdapter,
} from "../../index.js";

describe("index exports", () => {
	describe("apiExpressRouterFactory", () => {
		it("should be an instance of ApiExpressRouterFactory", () => {
			expect(apiExpressRouterFactory).toBeDefined();
			expect(apiExpressRouterFactory.createRouter).toBeDefined();
			expect(typeof apiExpressRouterFactory.createRouter).toBe("function");
		});
	});

	describe("createApiExpressDefaultEndpointAdapter", () => {
		it("should create an adapter with default error status code", () => {
			const adapter = createApiExpressDefaultEndpointAdapter("info");
			expect(adapter).toBeDefined();
			expect(adapter.handleRequest).toBeDefined();
			expect(typeof adapter.handleRequest).toBe("function");
		});

		it("should create an adapter with custom error status code", () => {
			const adapter = createApiExpressDefaultEndpointAdapter("warn", 503);
			expect(adapter).toBeDefined();
			expect(adapter.handleRequest).toBeDefined();
		});

		it("should create adapters with different log levels", () => {
			const levels = ["debug", "info", "warn", "error"] as const;
			for (const level of levels) {
				const adapter = createApiExpressDefaultEndpointAdapter(level);
				expect(adapter).toBeDefined();
			}
		});

		it("should create functional adapters", async () => {
			const adapter = createApiExpressDefaultEndpointAdapter("info");

			const mockEndpoint: ApiEndpoint<undefined> = {
				getRequestArgsSchema: () => undefined,
				processRequest: async () => ({
					status: "success",
					data: { result: "test" },
				}),
			};

			const mockRequest = {
				body: {},
				logger: getLogger("info", "test") as Logger,
			} as unknown as Request;

			const mockResponse = {
				json: vi.fn(),
				status: vi.fn().mockReturnThis(),
				send: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			await adapter.handleRequest(
				mockEndpoint,
				mockRequest,
				mockResponse,
				mockNext,
			);

			expect(mockResponse.json).toHaveBeenCalledWith({
				status: "success",
				data: { result: "test" },
			});
		});

		it("should create adapter with error status code 400", () => {
			const adapter = createApiExpressDefaultEndpointAdapter("info", 400);
			expect(adapter).toBeDefined();
		});

		it("should create adapter with error status code 404", () => {
			const adapter = createApiExpressDefaultEndpointAdapter("info", 404);
			expect(adapter).toBeDefined();
		});

		it("should create adapter with error status code 503", () => {
			const adapter = createApiExpressDefaultEndpointAdapter("info", 503);
			expect(adapter).toBeDefined();
		});

		it("should handle schema validation errors", async () => {
			const adapter = createApiExpressDefaultEndpointAdapter("info", 400);

			const schema = z.object({ value: z.number() });
			const mockEndpoint: ApiEndpoint<typeof schema> = {
				getRequestArgsSchema: () => schema,
				processRequest: async () => ({
					status: "success",
					data: {},
				}),
			};

			const mockRequest = {
				body: { value: "not-a-number" },
				logger: getLogger("info", "test") as Logger,
			} as unknown as Request;

			const mockResponse = {
				json: vi.fn(),
				status: vi.fn().mockReturnThis(),
				send: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			await adapter.handleRequest(
				mockEndpoint,
				mockRequest,
				mockResponse,
				mockNext,
			);

			// Should call next with ProsopoApiError
			expect(mockNext).toHaveBeenCalled();
			expect(mockResponse.json).not.toHaveBeenCalled();
		});

		it("should handle endpoint processing errors", async () => {
			const adapter = createApiExpressDefaultEndpointAdapter("error", 500);

			const mockEndpoint: ApiEndpoint<undefined> = {
				getRequestArgsSchema: () => undefined,
				processRequest: async () => {
					throw new Error("Processing error");
				},
			};

			const mockLogger = {
				error: vi.fn(),
			} as unknown as Logger;

			const mockRequest = {
				body: {},
				logger: mockLogger,
			} as unknown as Request;

			const mockResponse = {
				json: vi.fn(),
				status: vi.fn().mockReturnThis(),
				send: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			await adapter.handleRequest(
				mockEndpoint,
				mockRequest,
				mockResponse,
				mockNext,
			);

			expect(mockLogger.error).toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(500);
		});
	});
});
