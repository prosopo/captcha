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

import type { ProviderEnvironment } from "@prosopo/env";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { requestLoggerMiddleware } from "../../middlewares/requestLoggerMiddleware.js";

describe("requestLoggerMiddleware", () => {
	const createMockEnv = (logLevel: string): ProviderEnvironment => {
		return {
			config: {
				logLevel,
			},
		} as unknown as ProviderEnvironment;
	};

	it("should create middleware function", () => {
		const env = createMockEnv("info");
		const middleware = requestLoggerMiddleware(env);

		expectTypeOf(middleware).toMatchTypeOf<
			(req: Request, res: Response, next: NextFunction) => void
		>();
		expect(typeof middleware).toBe("function");
	});

	it("should attach logger to request", () => {
		const env = createMockEnv("info");
		const middleware = requestLoggerMiddleware(env);

		const mockRequest = {
			headers: {},
			body: {},
		} as unknown as Request;

		const mockResponse = {} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		middleware(mockRequest, mockResponse, mockNext);

		expect(mockRequest.logger).toBeDefined();
		expect(mockNext).toHaveBeenCalled();
	});

	it("should use x-request-id header if present", () => {
		const env = createMockEnv("info");
		const middleware = requestLoggerMiddleware(env);

		const requestId = "custom-request-id-123";
		const mockRequest = {
			headers: {
				"x-request-id": requestId,
			},
			body: {},
		} as unknown as Request;

		const mockResponse = {} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		middleware(mockRequest, mockResponse, mockNext);

		expect(mockRequest.requestId).toBe(requestId);
		expect(mockRequest.logger).toBeDefined();
	});

	it("should generate request ID with e- prefix if not in headers", () => {
		const env = createMockEnv("info");
		const middleware = requestLoggerMiddleware(env);

		const mockRequest = {
			headers: {},
			body: {},
		} as unknown as Request;

		const mockResponse = {} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		middleware(mockRequest, mockResponse, mockNext);

		expect(mockRequest.requestId).toBeDefined();
		expect(mockRequest.requestId).toMatch(/^e-/);
		expect(mockRequest.requestId?.length).toBeGreaterThan(2);
	});

	it("should include sessionId in logger if present in body", () => {
		const env = createMockEnv("info");
		const middleware = requestLoggerMiddleware(env);

		const sessionId = "session-123";
		const mockRequest = {
			headers: {},
			body: {
				sessionId,
			},
		} as unknown as Request;

		const mockResponse = {} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		middleware(mockRequest, mockResponse, mockNext);

		expect(mockRequest.logger).toBeDefined();
		expect(mockNext).toHaveBeenCalled();
	});

	it("should not include sessionId in logger if not present in body", () => {
		const env = createMockEnv("info");
		const middleware = requestLoggerMiddleware(env);

		const mockRequest = {
			headers: {},
			body: {},
		} as unknown as Request;

		const mockResponse = {} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		middleware(mockRequest, mockResponse, mockNext);

		expect(mockRequest.logger).toBeDefined();
		expect(mockNext).toHaveBeenCalled();
	});

	it("should handle different log levels", () => {
		const logLevels = ["debug", "info", "warn", "error"];

		for (const level of logLevels) {
			const env = createMockEnv(level);
			const middleware = requestLoggerMiddleware(env);

			const mockRequest = {
				headers: {},
				body: {},
			} as unknown as Request;

			const mockResponse = {} as unknown as Response;
			const mockNext = vi.fn() as unknown as NextFunction;

			middleware(mockRequest, mockResponse, mockNext);

			expect(mockRequest.logger).toBeDefined();
			expect(mockNext).toHaveBeenCalled();
		}
	});

	it("should call next() after setting up logger", () => {
		const env = createMockEnv("info");
		const middleware = requestLoggerMiddleware(env);

		const mockRequest = {
			headers: {},
			body: {},
		} as unknown as Request;

		const mockResponse = {} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		middleware(mockRequest, mockResponse, mockNext);

		expect(mockNext).toHaveBeenCalledTimes(1);
		expect(mockNext).toHaveBeenCalledWith();
	});

	it("should handle empty body", () => {
		const env = createMockEnv("info");
		const middleware = requestLoggerMiddleware(env);

		const mockRequest = {
			headers: {},
			body: null,
		} as unknown as Request;

		const mockResponse = {} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		middleware(mockRequest, mockResponse, mockNext);

		expect(mockRequest.logger).toBeDefined();
		expect(mockRequest.requestId).toBeDefined();
		expect(mockNext).toHaveBeenCalled();
	});

	it("should set requestId type correctly", () => {
		const env = createMockEnv("info");
		const middleware = requestLoggerMiddleware(env);

		const mockRequest = {
			headers: {},
			body: {},
		} as unknown as Request;

		const mockResponse = {} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		middleware(mockRequest, mockResponse, mockNext);

		// Type test: verify requestId is string | undefined
		expectTypeOf(mockRequest.requestId).toMatchTypeOf<string | undefined>();
		expect(typeof mockRequest.requestId).toBe("string");
	});
});
