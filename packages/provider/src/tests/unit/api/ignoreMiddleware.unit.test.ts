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

import { ApiPrefix, PublicApiPaths } from "@prosopo/types";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ignoreMiddleware } from "../../../api/ignoreMiddleware.js";

describe("ignoreMiddleware", () => {
	let mockReq: Request;
	let mockRes: Response;
	let mockNext: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();

		mockReq = {
			originalUrl: "",
		} as Request;

		mockRes = {
			statusCode: 200,
			send: vi.fn(),
		} as unknown as Response;

		mockNext = vi.fn() as NextFunction;
	});

	it("should return a middleware function", () => {
		const middleware = ignoreMiddleware();

		expect(middleware).toBeDefined();
		expect(typeof middleware).toBe("function");
	});

	it("should allow health check requests to pass through", () => {
		const middleware = ignoreMiddleware();

		mockReq.originalUrl = `/api${PublicApiPaths.Healthz}`;

		middleware(mockReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalledWith();
		expect(mockNext).toHaveBeenCalledTimes(1);
		expect(mockRes.send).not.toHaveBeenCalled();
	});

	it("should allow health check requests with query parameters", () => {
		const middleware = ignoreMiddleware();

		mockReq.originalUrl = `/api${PublicApiPaths.Healthz}?param=value`;

		middleware(mockReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalledWith();
		expect(mockRes.send).not.toHaveBeenCalled();
	});

	it("should return 404 for non-API routes", () => {
		const middleware = ignoreMiddleware();

		mockReq.originalUrl = "/some-other-route";

		middleware(mockReq, mockRes, mockNext);

		expect(mockRes.statusCode).toBe(404);
		expect(mockRes.send).toHaveBeenCalledWith("Not Found");
		expect(mockNext).not.toHaveBeenCalled();
	});

	it("should return 404 for routes not starting with API prefix", () => {
		const middleware = ignoreMiddleware();

		mockReq.originalUrl = "/api-but-not-proper-prefix/something";

		middleware(mockReq, mockRes, mockNext);

		expect(mockRes.statusCode).toBe(404);
		expect(mockRes.send).toHaveBeenCalledWith("Not Found");
		expect(mockNext).not.toHaveBeenCalled();
	});

	it("should allow API routes to pass through", () => {
		const middleware = ignoreMiddleware();

		mockReq.originalUrl = `${ApiPrefix}/some-endpoint`;

		middleware(mockReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalledWith();
		expect(mockRes.send).not.toHaveBeenCalled();
	});

	it("should allow API routes with query parameters", () => {
		const middleware = ignoreMiddleware();

		mockReq.originalUrl = `${ApiPrefix}/endpoint?param=value&another=123`;

		middleware(mockReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalledWith();
		expect(mockRes.send).not.toHaveBeenCalled();
	});

	it("should allow API routes with complex paths", () => {
		const middleware = ignoreMiddleware();

		mockReq.originalUrl = `${ApiPrefix}/v1/captcha/challenge/image`;

		middleware(mockReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalledWith();
		expect(mockRes.send).not.toHaveBeenCalled();
	});

	it("should handle root path requests", () => {
		const middleware = ignoreMiddleware();

		mockReq.originalUrl = "/";

		middleware(mockReq, mockRes, mockNext);

		expect(mockRes.statusCode).toBe(404);
		expect(mockRes.send).toHaveBeenCalledWith("Not Found");
		expect(mockNext).not.toHaveBeenCalled();
	});

	it("should handle empty path requests", () => {
		const middleware = ignoreMiddleware();

		mockReq.originalUrl = "";

		middleware(mockReq, mockRes, mockNext);

		expect(mockRes.statusCode).toBe(404);
		expect(mockRes.send).toHaveBeenCalledWith("Not Found");
		expect(mockNext).not.toHaveBeenCalled();
	});

	it("should handle undefined originalUrl", () => {
		const middleware = ignoreMiddleware();

		(mockReq as any).originalUrl = undefined;

		expect(() => middleware(mockReq, mockRes, mockNext)).toThrow();
	});

	it("should be case sensitive for API prefix matching", () => {
		const middleware = ignoreMiddleware();

		mockReq.originalUrl = "/API/some-endpoint"; // uppercase API

		middleware(mockReq, mockRes, mockNext);

		expect(mockRes.statusCode).toBe(404);
		expect(mockRes.send).toHaveBeenCalledWith("Not Found");
		expect(mockNext).not.toHaveBeenCalled();
	});

	it("should handle API prefix at the beginning of the path", () => {
		const middleware = ignoreMiddleware();

		mockReq.originalUrl = `${ApiPrefix}endpoint`; // no leading slash after prefix

		middleware(mockReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalledWith();
		expect(mockRes.send).not.toHaveBeenCalled();
	});
});
