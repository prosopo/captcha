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

const loggerOuter = getLogger("info", import.meta.url);

describe("ja4Middleware", () => {
	it("should return default JA4 if an error occurs", async () => {
		const mockLogger = {
			debug: vi.fn().mockImplementation(loggerOuter.debug.bind(loggerOuter)),
			log: vi.fn().mockImplementation(loggerOuter.log.bind(loggerOuter)),
			info: vi.fn().mockImplementation(loggerOuter.info.bind(loggerOuter)),
			error: vi.fn().mockImplementation(loggerOuter.error.bind(loggerOuter)),
			trace: vi.fn().mockImplementation(loggerOuter.trace.bind(loggerOuter)),
			fatal: vi.fn().mockImplementation(loggerOuter.fatal.bind(loggerOuter)),
			warn: vi.fn().mockImplementation(loggerOuter.warn.bind(loggerOuter)),
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

		expect(mockReq.ja4.startsWith(DEFAULT_JA4)).toBe(true);
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

		expect(ja4.ja4PlusFingerprint.startsWith(DEFAULT_JA4)).toBe(true);
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
			"x-tls-server-name": "pronode8.prosopo.io",
			"x-tls-version": "tls1.3",
		};
		const ja4 = await getJA4(mockHeaders);
		expect(ja4.ja4PlusFingerprint).toBe("t13d1516h2_8daaf6152771_d8a2da3f94cd");
	});
});
