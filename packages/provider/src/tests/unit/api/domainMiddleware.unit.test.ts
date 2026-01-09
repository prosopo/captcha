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

import { handleErrors } from "@prosopo/api-express-router";
import { type Logger, getLogger, ProsopoApiError } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { validateAddress } from "@prosopo/util-crypto";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { domainMiddleware } from "../../../api/domainMiddleware.js";
import { Tasks } from "../../../tasks/index.js";

vi.mock("@prosopo/api-express-router", () => ({
	handleErrors: vi.fn(),
}));

vi.mock("@prosopo/util-crypto", () => ({
	validateAddress: vi.fn(),
}));

vi.mock("../../../tasks/index.js", () => ({
	Tasks: vi.fn(),
}));

const loggerOuter = getLogger("info", import.meta.url);

describe("domainMiddleware", () => {
	let mockEnv: ProviderEnvironment;
	let mockReq: Request & { i18n?: { t: (key: string) => string }; logger?: Logger; hostname?: string };
	let mockRes: Response;
	let mockNext: NextFunction;
	let mockLogger: Logger;
	let mockTasks: {
		db: {
			getClientRecord: ReturnType<typeof vi.fn>;
		};
		clientTaskManager: {
			domainPatternMatcher: ReturnType<typeof vi.fn>;
		};
	};

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
		} as unknown as Logger;

		mockTasks = {
			db: {
				getClientRecord: vi.fn(),
			},
			clientTaskManager: {
				domainPatternMatcher: vi.fn(),
			},
		};

		vi.mocked(Tasks).mockImplementation(() => mockTasks as unknown as Tasks);

		mockEnv = {} as ProviderEnvironment;
		mockReq = {
			headers: {},
			logger: mockLogger,
			i18n: {
				t: vi.fn((key: string) => key),
			},
			hostname: "example.com",
		} as unknown as Request & { i18n?: { t: (key: string) => string }; logger?: Logger; hostname?: string };
		mockRes = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;
		mockNext = vi.fn() as NextFunction;
	});

	it("throws error when site-key header is missing", async () => {
		mockReq.headers = {};

		const middleware = domainMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(handleErrors).toHaveBeenCalled();
		const errorArg = vi.mocked(handleErrors).mock.calls[0]?.[0];
		expect(errorArg).toBeInstanceOf(ProsopoApiError);
		if (errorArg instanceof ProsopoApiError) {
			expect(errorArg.translationKey).toBe("API.SITE_KEY_NOT_REGISTERED");
		}
	});

	it("throws error when site key is invalid", async () => {
		mockReq.headers = {
			"prosopo-site-key": "invalid",
		};
		vi.mocked(validateAddress).mockImplementation(() => {
			throw new Error("Invalid address");
		});

		const middleware = domainMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(handleErrors).toHaveBeenCalled();
		const errorArg = vi.mocked(handleErrors).mock.calls[0]?.[0];
		expect(errorArg).toBeInstanceOf(ProsopoApiError);
		if (errorArg instanceof ProsopoApiError) {
			expect(errorArg.translationKey).toBe("API.INVALID_SITE_KEY");
		}
	});

	it("throws error when client record is not found", async () => {
		mockReq.headers = {
			"prosopo-site-key": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};
		vi.mocked(validateAddress).mockReturnValue(true);
		mockTasks.db.getClientRecord.mockResolvedValue(null);

		const middleware = domainMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(handleErrors).toHaveBeenCalled();
		const errorArg = vi.mocked(handleErrors).mock.calls[0]?.[0];
		expect(errorArg).toBeInstanceOf(ProsopoApiError);
		if (errorArg instanceof ProsopoApiError) {
			expect(errorArg.translationKey).toBe("API.SITE_KEY_NOT_REGISTERED");
		}
	});

	it("throws error when allowedDomains is missing", async () => {
		mockReq.headers = {
			"prosopo-site-key": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};
		vi.mocked(validateAddress).mockReturnValue(true);
		mockTasks.db.getClientRecord.mockResolvedValue({
			settings: {},
		} as never);

		const middleware = domainMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(handleErrors).toHaveBeenCalled();
		const errorArg = vi.mocked(handleErrors).mock.calls[0]?.[0];
		expect(errorArg).toBeInstanceOf(ProsopoApiError);
	});

	it("throws error when origin header is missing", async () => {
		mockReq.headers = {
			"prosopo-site-key": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};
		vi.mocked(validateAddress).mockReturnValue(true);
		mockTasks.db.getClientRecord.mockResolvedValue({
			settings: {
				domains: ["example.com"],
			},
		} as never);

		const middleware = domainMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(handleErrors).toHaveBeenCalled();
		const errorArg = vi.mocked(handleErrors).mock.calls[0]?.[0];
		expect(errorArg).toBeInstanceOf(ProsopoApiError);
		if (errorArg instanceof ProsopoApiError) {
			expect(errorArg.translationKey).toBe("API.UNAUTHORIZED_ORIGIN_URL");
		}
	});

	it("calls next when origin matches allowed domain", async () => {
		mockReq.headers = {
			"prosopo-site-key": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			origin: "https://example.com",
		};
		vi.mocked(validateAddress).mockReturnValue(true);
		mockTasks.db.getClientRecord.mockResolvedValue({
			settings: {
				domains: ["example.com"],
			},
		} as never);
		mockTasks.clientTaskManager.domainPatternMatcher.mockReturnValue(true);

		const middleware = domainMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalled();
		expect(handleErrors).not.toHaveBeenCalled();
	});

	it("throws error when origin does not match any allowed domain", async () => {
		mockReq.headers = {
			"prosopo-site-key": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			origin: "https://unauthorized.com",
		};
		vi.mocked(validateAddress).mockReturnValue(true);
		mockTasks.db.getClientRecord.mockResolvedValue({
			settings: {
				domains: ["example.com"],
			},
		} as never);
		mockTasks.clientTaskManager.domainPatternMatcher.mockReturnValue(false);

		const middleware = domainMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(handleErrors).toHaveBeenCalled();
		const errorArg = vi.mocked(handleErrors).mock.calls[0]?.[0];
		expect(errorArg).toBeInstanceOf(ProsopoApiError);
		if (errorArg instanceof ProsopoApiError) {
			expect(errorArg.translationKey).toBe("API.UNAUTHORIZED_ORIGIN_URL");
		}
	});

	it("handles non-API errors by returning 401", async () => {
		mockReq.headers = {
			"prosopo-site-key": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		};
		vi.mocked(validateAddress).mockReturnValue(true);
		mockTasks.db.getClientRecord.mockRejectedValue(new Error("Database error"));

		const middleware = domainMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: "Unauthorized",
			message: expect.any(Error),
		});
	});
});

