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

import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { robotsMiddleware } from "../../../api/robotsMiddleware.js";

describe("robotsMiddleware", () => {
	it("sets security headers and calls next", () => {
		const mockReq = {} as Request;
		const mockRes = {
			setHeader: vi.fn(),
		} as unknown as Response;
		const mockNext = vi.fn() as NextFunction;

		const middleware = robotsMiddleware();
		middleware(mockReq, mockRes, mockNext);

		expect(mockRes.setHeader).toHaveBeenCalledWith(
			"Strict-Transport-Security",
			"max-age=31536000;",
		);
		expect(mockRes.setHeader).toHaveBeenCalledWith(
			"X-XSS-Protection",
			"1; mode=block",
		);
		expect(mockRes.setHeader).toHaveBeenCalledWith(
			"X-Frame-Options",
			"DENY",
		);
		expect(mockRes.setHeader).toHaveBeenCalledWith("X-Robots-Tag", "none");
		expect(mockNext).toHaveBeenCalled();
	});

	it("sets all required headers", () => {
		const mockReq = {} as Request;
		const setHeaderCalls: Array<[string, string]> = [];
		const mockRes = {
			setHeader: vi.fn((name: string, value: string) => {
				setHeaderCalls.push([name, value]);
			}),
		} as unknown as Response;
		const mockNext = vi.fn() as NextFunction;

		const middleware = robotsMiddleware();
		middleware(mockReq, mockRes, mockNext);

		expect(setHeaderCalls).toHaveLength(4);
		expect(setHeaderCalls).toContainEqual([
			"Strict-Transport-Security",
			"max-age=31536000;",
		]);
		expect(setHeaderCalls).toContainEqual(["X-XSS-Protection", "1; mode=block"]);
		expect(setHeaderCalls).toContainEqual(["X-Frame-Options", "DENY"]);
		expect(setHeaderCalls).toContainEqual(["X-Robots-Tag", "none"]);
	});
});

