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

import { type Logger, getLogger } from "@prosopo/common";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { ignoreMiddleware } from "../../../api/ignoreMiddleware.js";

const logger = getLogger("info", import.meta.url);

vi.mock("@prosopo/util", () => ({
	hexToU8a: vi.fn(),
	isHex: vi.fn(),
}));

describe("ignoreMiddleware", () => {
	it("should 404 if url does not contain /v1/prosopo", async () => {
		const mockLogger = {
			debug: vi.fn().mockImplementation(logger.debug),
			log: vi.fn().mockImplementation(logger.log),
			info: vi.fn().mockImplementation(logger.info),
			error: vi.fn().mockImplementation(logger.error),
			trace: vi.fn().mockImplementation(logger.trace),
			fatal: vi.fn().mockImplementation(logger.fatal),
			warn: vi.fn().mockImplementation(logger.warn),
		} as unknown as Logger;
		const mockReq = {
			url: "/favicon.ico",
			originalUrl: "/favicon.ico",
			headers: {
				signature: "0x1234",
				timestamp: new Date().getTime(),
			},
			logger: mockLogger,
		} as unknown as Request;

		const mockRes = {
			status: vi.fn().mockReturnThis(),
			statusCode: 404,
			json: vi.fn(),
			send: vi.fn(),
		} as unknown as Response;

		const mockNext = vi.fn(() => {
			console.log("mock next function");
		}) as unknown as NextFunction;

		const middleware = ignoreMiddleware();
		await middleware(mockReq, mockRes, mockNext);

		expect(mockRes.statusCode).toBe(404);
	});
});
