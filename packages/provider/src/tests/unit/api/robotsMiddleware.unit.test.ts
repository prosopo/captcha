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

import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { robotsMiddleware } from "../../../api/robotsMiddleware.js";

describe("robotsMiddleware", () => {
	let mockReq: Request;
	let mockRes: Response;
	let mockNext: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();

		mockReq = {} as Request;

		mockRes = {
			setHeader: vi.fn(),
		} as unknown as Response;

		mockNext = vi.fn() as NextFunction;
	});

	it("should return a middleware function", () => {
		const middleware = robotsMiddleware();

		expect(middleware).toBeDefined();
		expect(typeof middleware).toBe("function");
	});

	it("should set all required security headers", async () => {
		const middleware = robotsMiddleware();

		await middleware(mockReq, mockRes, mockNext);

		expect(mockRes.setHeader).toHaveBeenCalledWith("Strict-Transport-Security", "max-age=31536000;");
		expect(mockRes.setHeader).toHaveBeenCalledWith("X-XSS-Protection", "1; mode=block");
		expect(mockRes.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
		expect(mockRes.setHeader).toHaveBeenCalledWith("X-Robots-Tag", "none");
		expect(mockRes.setHeader).toHaveBeenCalledTimes(4);
	});

	it("should call next() to continue the middleware chain", async () => {
		const middleware = robotsMiddleware();

		await middleware(mockReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalledWith();
		expect(mockNext).toHaveBeenCalledTimes(1);
	});

	it("should set headers in the correct order", async () => {
		const middleware = robotsMiddleware();

		await middleware(mockReq, mockRes, mockNext);

		// Verify the order of header setting
		expect(mockRes.setHeader).toHaveBeenNthCalledWith(1, "Strict-Transport-Security", "max-age=31536000;");
		expect(mockRes.setHeader).toHaveBeenNthCalledWith(2, "X-XSS-Protection", "1; mode=block");
		expect(mockRes.setHeader).toHaveBeenNthCalledWith(3, "X-Frame-Options", "DENY");
		expect(mockRes.setHeader).toHaveBeenNthCalledWith(4, "X-Robots-Tag", "none");
	});

	it("should be synchronous and call next immediately", () => {
		const middleware = robotsMiddleware();

		// Test that the middleware is synchronous
		const result = middleware(mockReq, mockRes, mockNext);

		expect(result).toBeUndefined(); // Express middleware doesn't return anything

		expect(mockNext).toHaveBeenCalled();
	});
});