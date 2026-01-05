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

import { handleErrors } from "@prosopo/api-express-router";
import { type Logger, getLogger } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { headerCheckMiddleware } from "../../../api/headerCheckMiddleware.js";
import * as validateAddressModule from "../../../api/validateAddress.js";

vi.mock("@prosopo/api-express-router", () => ({
	handleErrors: vi.fn(),
}));

vi.mock("../../../api/validateAddress.js", () => ({
	validateSiteKey: vi.fn(),
	validateAddr: vi.fn(),
}));

const loggerOuter = getLogger("info", import.meta.url);

describe("headerCheckMiddleware", () => {
	let mockEnv: ProviderEnvironment;
	let mockReq: Request;
	let mockRes: Response;
	let mockNext: NextFunction;
	let mockLogger: Logger;

	beforeEach(() => {
		vi.clearAllMocks();
		mockLogger = {
			debug: vi.fn().mockImplementation(loggerOuter.debug.bind(loggerOuter)),
			log: vi.fn().mockImplementation(loggerOuter.log.bind(loggerOuter)),
			info: vi.fn().mockImplementation(loggerOuter.info.bind(loggerOuter)),
			error: vi.fn().mockImplementation(loggerOuter.error.bind(loggerOuter)),
			trace: vi.fn().mockImplementation(loggerOuter.trace.bind(loggerOuter)),
			fatal: vi.fn().mockImplementation(loggerOuter.fatal.bind(loggerOuter)),
			warn: vi.fn().mockImplementation(loggerOuter.warn.bind(loggerOuter)),
			with: vi.fn().mockReturnThis(),
		} as unknown as Logger;

		mockEnv = {} as ProviderEnvironment;
		mockReq = {
			headers: {},
			logger: mockLogger,
		} as unknown as Request;
		mockRes = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;
		mockNext = vi.fn() as NextFunction;
	});

	it("returns 401 when user header is missing", async () => {
		mockReq.headers = {
			"prosopo-site-key": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};

		const middleware = headerCheckMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: "Unauthorized",
			message: "Unauthorized",
		});
		expect(mockNext).not.toHaveBeenCalled();
	});

	it("returns 401 when site-key header is missing", async () => {
		mockReq.headers = {
			"prosopo-user": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};

		const middleware = headerCheckMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: "Unauthorized",
			message: "Unauthorized",
		});
		expect(mockNext).not.toHaveBeenCalled();
	});

	it("calls validateSiteKey with site key", async () => {
		mockReq.headers = {
			"prosopo-user": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			"prosopo-site-key": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};

		const middleware = headerCheckMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(validateAddressModule.validateSiteKey).toHaveBeenCalledWith(
			"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			mockLogger,
		);
	});

	it("calls validateAddr with user", async () => {
		mockReq.headers = {
			"prosopo-user": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			"prosopo-site-key": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};

		const middleware = headerCheckMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(validateAddressModule.validateAddr).toHaveBeenCalledWith(
			"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			undefined,
			mockLogger,
		);
	});

	it("sets req.user and req.siteKey when validation passes", async () => {
		mockReq.headers = {
			"prosopo-user": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			"prosopo-site-key": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};

		const middleware = headerCheckMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect((mockReq as { user?: string }).user).toBe(
			"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		);
		expect((mockReq as { siteKey?: string }).siteKey).toBe(
			"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		);
		expect(mockNext).toHaveBeenCalled();
	});

	it("updates logger with user and siteKey", async () => {
		mockReq.headers = {
			"prosopo-user": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			"prosopo-site-key": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};

		const middleware = headerCheckMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(mockLogger.with).toHaveBeenCalledWith({
			user: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			siteKey: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		});
	});

	it("calls handleErrors when validation throws", async () => {
		mockReq.headers = {
			"prosopo-user": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			"prosopo-site-key": "invalid",
		};
		vi.mocked(validateAddressModule.validateSiteKey).mockImplementation(() => {
			throw new Error("Invalid site key");
		});

		const middleware = headerCheckMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(handleErrors).toHaveBeenCalled();
		expect(mockNext).not.toHaveBeenCalled();
	});
});

