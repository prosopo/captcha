import type { KeyringPair } from "@polkadot/keyring/types";
import { hexToU8a, isHex } from "@polkadot/util";
import { type Logger, ProsopoApiError, ProsopoEnvError } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
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
import { describe, expect, it, vi } from "vitest";
import { authMiddleware } from "../../../api/authMiddleware.js";
import type { Tasks } from "../../../tasks/tasks.js";

vi.mock("@polkadot/util", () => ({
	hexToU8a: vi.fn(),
	isHex: vi.fn(),
}));

const mockLogger = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
} as unknown as Logger;
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

	it("should 404 if url does not contain /v1/prosopo", async () => {
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
		} as unknown as Response;

		const mockNext = vi.fn(() => {
			console.log("mock next function");
		}) as unknown as NextFunction;

		const middleware = authMiddleware(mockEnv);
		await middleware(mockReq, mockRes, mockNext);

		expect(mockRes.statusCode).toBe(404);
	});
});
