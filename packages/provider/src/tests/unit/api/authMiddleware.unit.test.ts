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

import type { KeyringPair } from "@polkadot/keyring/types";
import { hexToU8a, isHex } from "@polkadot/util";
import {
	type Logger,
	ProsopoApiError,
	ProsopoEnvError,
	getLogger,
} from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { authMiddleware } from "../../../api/authMiddleware.js";
import type { Tasks } from "../../../tasks/tasks.js";

const loggerOuter = getLogger("info", import.meta.url);

const mockLogger = {
	debug: vi.fn().mockImplementation(loggerOuter.debug.bind(loggerOuter)),
	log: vi.fn().mockImplementation(loggerOuter.log.bind(loggerOuter)),
	info: vi.fn().mockImplementation(loggerOuter.info.bind(loggerOuter)),
	error: vi.fn().mockImplementation(loggerOuter.error.bind(loggerOuter)),
	trace: vi.fn().mockImplementation(loggerOuter.trace.bind(loggerOuter)),
	fatal: vi.fn().mockImplementation(loggerOuter.fatal.bind(loggerOuter)),
	warn: vi.fn().mockImplementation(loggerOuter.warn.bind(loggerOuter)),
} as unknown as Logger;

vi.mock("@polkadot/util", async (importOriginal) => {
	const actual = await importOriginal();

	return {
		// @ts-ignore
		...actual,
		hexToU8a: vi.fn(),
		isHex: vi.fn(),
	};
});

const mockTasks = {} as Tasks;
const mockPair = {
	publicKey: "mockPublicKey",
	verify: vi.fn(),
} as unknown as KeyringPair;
const mockEnv = {
	pair: mockPair,
	authAccount: mockPair,
	logger: mockLogger,
} as ProviderEnvironment;

describe("authMiddleware", () => {
	it("should call next() if signature is valid", async () => {
		const mockLogger = {
			debug: vi.fn().mockImplementation(loggerOuter.debug.bind(loggerOuter)),
			log: vi.fn().mockImplementation(loggerOuter.log.bind(loggerOuter)),
			info: vi.fn().mockImplementation(loggerOuter.info.bind(loggerOuter)),
			error: vi.fn().mockImplementation(loggerOuter.error.bind(loggerOuter)),
			trace: vi.fn().mockImplementation(loggerOuter.trace.bind(loggerOuter)),
			fatal: vi.fn().mockImplementation(loggerOuter.fatal.bind(loggerOuter)),
			warn: vi.fn().mockImplementation(loggerOuter.warn.bind(loggerOuter)),
		} as unknown as Logger;
		const mockReq = {
			url: "/v1/prosopo/provider/captcha/image",
			originalUrl: "/v1/prosopo/provider/captcha/image",
			headers: {
				signature: "0x1234",
				timestamp: new Date().getTime(),
			},
			logger: mockLogger,
		} as unknown as Request;

		const mockRes = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		const mockNext = vi.fn() as unknown as NextFunction;

		vi.mocked(isHex).mockReturnValue(true);
		vi.mocked(hexToU8a).mockReturnValue(new Uint8Array());
		vi.mocked(mockPair.verify).mockReturnValue(true);

		const middleware = authMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalled();
		expect(mockRes.status).not.toHaveBeenCalled();
	});

	it("should return 401 if signature is invalid", async () => {
		const mockLogger = {
			debug: vi.fn().mockImplementation(loggerOuter.debug.bind(loggerOuter)),
			log: vi.fn().mockImplementation(loggerOuter.log.bind(loggerOuter)),
			info: vi.fn().mockImplementation(loggerOuter.info.bind(loggerOuter)),
			error: vi.fn().mockImplementation(loggerOuter.error.bind(loggerOuter)),
			trace: vi.fn().mockImplementation(loggerOuter.trace.bind(loggerOuter)),
			fatal: vi.fn().mockImplementation(loggerOuter.fatal.bind(loggerOuter)),
			warn: vi.fn().mockImplementation(loggerOuter.warn.bind(loggerOuter)),
		} as unknown as Logger;
		const mockReq = {
			url: "/v1/prosopo/provider/captcha/image",
			originalUrl: "/v1/prosopo/provider/captcha/image",
			headers: {
				signature: "0x1234",
				timestamp: new Date().getTime(),
			},
			logger: mockLogger,
		} as unknown as Request;

		const mockRes = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		const mockNext = vi.fn() as unknown as NextFunction;

		vi.mocked(isHex).mockReturnValue(true);
		vi.mocked(hexToU8a).mockReturnValue(new Uint8Array());
		vi.mocked(mockPair.verify).mockReturnValue(false);

		const middleware = authMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(mockNext).not.toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: "Unauthorized",
			message: expect.any(ProsopoApiError),
		});
	});

	it("should return 401 if key pair is missing", async () => {
		const mockLogger = {
			debug: vi.fn().mockImplementation(loggerOuter.debug.bind(loggerOuter)),
			log: vi.fn().mockImplementation(loggerOuter.log.bind(loggerOuter)),
			info: vi.fn().mockImplementation(loggerOuter.info.bind(loggerOuter)),
			error: vi.fn().mockImplementation(loggerOuter.error.bind(loggerOuter)),
			trace: vi.fn().mockImplementation(loggerOuter.trace.bind(loggerOuter)),
			fatal: vi.fn().mockImplementation(loggerOuter.fatal.bind(loggerOuter)),
			warn: vi.fn().mockImplementation(loggerOuter.warn.bind(loggerOuter)),
		} as unknown as Logger;
		const mockReq = {
			url: "/v1/prosopo/provider/captcha/image",
			originalUrl: "/v1/prosopo/provider/captcha/image",
			headers: {
				signature: "0x1234",
				timestamp: new Date().getTime(),
			},
			logger: mockLogger,
		} as unknown as Request;

		const mockRes = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;

		const mockNext = vi.fn() as unknown as NextFunction;

		const invalidEnv = {
			pair: null,
		} as unknown as ProviderEnvironment;

		const middleware = authMiddleware(invalidEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(mockNext).not.toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: "Unauthorized",
			message: expect.any(ProsopoEnvError),
		});
	});
});
