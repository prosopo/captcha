import { type Logger, getLogger } from "@prosopo/common";
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
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import {
	DEFAULT_JA4,
	getJA4,
	ja4Middleware,
} from "../../../api/ja4Middleware.js";

const logger = getLogger("info", import.meta.url);

describe("ja4Middleware", () => {
	it("should return default JA4 if an error occurs", async () => {
		const mockLogger = {
			debug: vi.fn().mockImplementation(logger.debug),
			log: vi.fn().mockImplementation(logger.log),
			info: vi.fn().mockImplementation(logger.info),
			error: vi.fn().mockImplementation(logger.error),
			trace: vi.fn().mockImplementation(logger.trace),
			fatal: vi.fn().mockImplementation(logger.fatal),
			warn: vi.fn().mockImplementation(logger.warn),
		} as unknown as Logger;
		const mockReq: {
			ja4?: string;
			logger: Logger;
		} & Request = {
			headers: {},
			logger: mockLogger,
		} as unknown as Request;

		const mockRes = {
			set: vi.fn(),
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			end: vi.fn(),
		} as unknown as Response;
		const mockNext = vi.fn() as unknown as NextFunction;

		const ja4MiddlewareInstance = ja4Middleware({} as ProviderEnvironment);
		await ja4MiddlewareInstance(mockReq, mockRes, mockNext);

		expect(mockReq.ja4).toBe(DEFAULT_JA4);
	});
});

describe("getJA4", () => {
	it("should return default JA4 in development mode", async () => {
		const mockHeaders = {
			"x-tls-clienthello": "test",
			"x-tls-version": "test",
			"x-tls-server-name": "test",
		};

		const ja4 = await getJA4(mockHeaders);

		expect(ja4.ja4PlusFingerprint).toBe(DEFAULT_JA4);
	});

	it("should return the correct JA4 for a known ClientHello", async () => {
		const mockHeaders = {
			"x-tls-clienthello":
				"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",
			"x-tls-proto": "h2",
			"x-tls-proto-mutual": "true",
			"x-tls-public-key": "",
			"x-tls-public-key-sha256": "",
			"x-tls-resumed": "false",
			"x-tls-server-name": "pronode7.prosopo.io",
			"x-tls-version": "tls1.3",
		};
		const ja4 = await getJA4(mockHeaders);
		expect(ja4.ja4PlusFingerprint).toBe("t13d1516h2_8daaf6152771_8eba31f8906f");
	});

	it("should return the correct JA4 for a known ClientHello 2", async () => {
		const mockHeaders = {
			"x-tls-clienthello":
				"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",
			"x-tls-proto": "h2",
			"x-tls-proto-mutual": "true",
			"x-tls-public-key": "",
			"x-tls-public-key-sha256": "",
			"x-tls-resumed": "false",
			"x-tls-server-name": "pronode8.prosopo.io",
			"x-tls-version": "tls1.3",
		};
		const ja4 = await getJA4(mockHeaders);
		expect(ja4.ja4PlusFingerprint).toBe("t13d1516h2_8daaf6152771_8eba31f8906f");
	});
});
