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

import { hexToU8a, isHex } from "@polkadot/util";
import {
	type Logger,
	ProsopoApiError,
	getLogger,
} from "@prosopo/common";
import type { KeyringPair } from "@prosopo/types";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi, expectTypeOf, beforeEach } from "vitest";
import { authMiddleware, verifySignature } from "../../../middlewares/authMiddleware.js";

const loggerOuter = getLogger("info", import.meta.url);

const createMockLogger = (): Logger => {
	return {
		debug: vi.fn().mockImplementation(loggerOuter.debug.bind(loggerOuter)),
		log: vi.fn().mockImplementation(loggerOuter.log.bind(loggerOuter)),
		info: vi.fn().mockImplementation(loggerOuter.info.bind(loggerOuter)),
		error: vi.fn().mockImplementation(loggerOuter.error.bind(loggerOuter)),
		trace: vi.fn().mockImplementation(loggerOuter.trace.bind(loggerOuter)),
		fatal: vi.fn().mockImplementation(loggerOuter.fatal.bind(loggerOuter)),
		warn: vi.fn().mockImplementation(loggerOuter.warn.bind(loggerOuter)),
	} as unknown as Logger;
};

vi.mock("@polkadot/util", async (importOriginal) => {
	const actual = await importOriginal();
	return {
		// @ts-ignore
		...actual,
		hexToU8a: vi.fn(),
		isHex: vi.fn(),
	};
});

describe("authMiddleware - additional tests", () => {
	let mockPair: KeyringPair;
	let mockAuthAccount: KeyringPair;

	beforeEach(() => {
		mockPair = {
			publicKey: new Uint8Array([1, 2, 3]),
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			verify: vi.fn(),
		} as unknown as KeyringPair;

		mockAuthAccount = {
			publicKey: new Uint8Array([4, 5, 6]),
			address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
			verify: vi.fn(),
		} as unknown as KeyringPair;
	});

	describe("extractHeaders", () => {
		it("should throw ProsopoApiError when timestamp is missing", async () => {
			const mockReq = {
				headers: {
					signature: "0x1234",
				},
				logger: createMockLogger(),
			} as unknown as Request;

			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			const middleware = authMiddleware(mockPair);
			await middleware(mockReq, mockRes, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.json).toHaveBeenCalled();
		});

		it("should throw ProsopoApiError when signature is missing", async () => {
			const mockReq = {
				headers: {
					timestamp: new Date().getTime().toString(),
				},
				logger: createMockLogger(),
			} as unknown as Request;

			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			const middleware = authMiddleware(mockPair);
			await middleware(mockReq, mockRes, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.json).toHaveBeenCalled();
		});

		it("should throw ProsopoApiError when signature is array", async () => {
			vi.mocked(isHex).mockReturnValue(true);

			const mockReq = {
				headers: {
					signature: ["0x1234", "0x5678"],
					timestamp: new Date().getTime().toString(),
				},
				logger: createMockLogger(),
			} as unknown as Request;

			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			const middleware = authMiddleware(mockPair);
			await middleware(mockReq, mockRes, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
		});

		it("should throw ProsopoApiError when timestamp is array", async () => {
			vi.mocked(isHex).mockReturnValue(true);

			const mockReq = {
				headers: {
					signature: "0x1234",
					timestamp: [new Date().getTime().toString()],
				},
				logger: createMockLogger(),
			} as unknown as Request;

			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			const middleware = authMiddleware(mockPair);
			await middleware(mockReq, mockRes, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
		});

		it("should throw ProsopoApiError when signature is not hex", async () => {
			vi.mocked(isHex).mockReturnValue(false);

			const mockReq = {
				headers: {
					signature: "not-hex",
					timestamp: new Date().getTime().toString(),
				},
				logger: createMockLogger(),
			} as unknown as Request;

			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			const middleware = authMiddleware(mockPair);
			await middleware(mockReq, mockRes, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
		});

		it("should throw ProsopoApiError when timestamp is too old", async () => {
			vi.mocked(isHex).mockReturnValue(true);
			vi.mocked(hexToU8a).mockReturnValue(new Uint8Array());
			vi.mocked(mockPair.verify).mockReturnValue(true);

			const oldTimestamp = new Date().getTime() - 400000; // More than 5 minutes ago

			const mockReq = {
				headers: {
					signature: "0x1234",
					timestamp: oldTimestamp.toString(),
				},
				logger: createMockLogger(),
			} as unknown as Request;

			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			const middleware = authMiddleware(mockPair);
			await middleware(mockReq, mockRes, mockNext);

			expect(mockRes.status).toHaveBeenCalledWith(401);
		});

		it("should accept timestamp within 5 minutes", async () => {
			vi.mocked(isHex).mockReturnValue(true);
			vi.mocked(hexToU8a).mockReturnValue(new Uint8Array());
			vi.mocked(mockPair.verify).mockReturnValue(true);

			const recentTimestamp = new Date().getTime() - 100000; // Less than 5 minutes ago

			const mockReq = {
				headers: {
					signature: "0x1234",
					timestamp: recentTimestamp.toString(),
				},
				logger: createMockLogger(),
			} as unknown as Request;

			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			const middleware = authMiddleware(mockPair);
			await middleware(mockReq, mockRes, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe("authAccount priority", () => {
		it("should try authAccount first if provided", async () => {
			vi.mocked(isHex).mockReturnValue(true);
			vi.mocked(hexToU8a).mockReturnValue(new Uint8Array());
			vi.mocked(mockAuthAccount.verify).mockReturnValue(true);
			vi.mocked(mockPair.verify).mockReturnValue(false);

			const mockReq = {
				headers: {
					signature: "0x1234",
					timestamp: new Date().getTime().toString(),
				},
				logger: createMockLogger(),
			} as unknown as Request;

			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			const middleware = authMiddleware(mockPair, mockAuthAccount);
			await middleware(mockReq, mockRes, mockNext);

			expect(mockAuthAccount.verify).toHaveBeenCalled();
			expect(mockNext).toHaveBeenCalled();
		});

		it("should fall back to pair if authAccount verification fails", async () => {
			vi.mocked(isHex).mockReturnValue(true);
			vi.mocked(hexToU8a).mockReturnValue(new Uint8Array());
			vi.mocked(mockAuthAccount.verify).mockReturnValue(false);
			vi.mocked(mockPair.verify).mockReturnValue(true);

			const mockLogger = createMockLogger();

			const mockReq = {
				headers: {
					signature: "0x1234",
					timestamp: new Date().getTime().toString(),
				},
				logger: mockLogger,
			} as unknown as Request;

			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			const middleware = authMiddleware(mockPair, mockAuthAccount);
			await middleware(mockReq, mockRes, mockNext);

			expect(mockAuthAccount.verify).toHaveBeenCalled();
			expect(mockPair.verify).toHaveBeenCalled();
			expect(mockLogger.warn).toHaveBeenCalled();
			expect(mockNext).toHaveBeenCalled();
		});
	});

	describe("verifySignature", () => {
		it("should throw ProsopoApiError when verification fails", () => {
			vi.mocked(hexToU8a).mockReturnValue(new Uint8Array([1, 2, 3]));
			vi.mocked(mockPair.verify).mockReturnValue(false);

			expect(() => {
				verifySignature("0x1234", "message", mockPair);
			}).toThrow(ProsopoApiError);
		});

		it("should not throw when verification succeeds", () => {
			vi.mocked(hexToU8a).mockReturnValue(new Uint8Array([1, 2, 3]));
			vi.mocked(mockPair.verify).mockReturnValue(true);

			expect(() => {
				verifySignature("0x1234", "message", mockPair);
			}).not.toThrow();
		});

		it("should call pair.verify with correct parameters", () => {
			const signature = "0x1234";
			const message = "test-message";
			const u8Sig = new Uint8Array([1, 2, 3]);

			vi.mocked(hexToU8a).mockReturnValue(u8Sig);
			vi.mocked(mockPair.verify).mockReturnValue(true);

			verifySignature(signature, message, mockPair);

			expect(hexToU8a).toHaveBeenCalledWith(signature);
			expect(mockPair.verify).toHaveBeenCalledWith(
				message,
				u8Sig,
				mockPair.publicKey,
			);
		});
	});

	describe("error handling", () => {
		it("should handle errors in catch block", async () => {
			const mockLogger = createMockLogger();

			const mockReq = {
				headers: {},
				logger: mockLogger,
			} as unknown as Request;

			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;

			const mockNext = vi.fn() as unknown as NextFunction;

			const middleware = authMiddleware(mockPair);
			await middleware(mockReq, mockRes, mockNext);

			expect(mockLogger.error).toHaveBeenCalled();
			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.json).toHaveBeenCalled();
		});
	});

	describe("type tests", () => {
		it("should have correct middleware return type", () => {
			const middleware = authMiddleware(mockPair);

			expectTypeOf(middleware).toMatchTypeOf<
				(req: Request, res: Response, next: NextFunction) => Promise<void>
			>();
		});

		it("should accept optional authAccount parameter", () => {
			// Type test: verify authAccount is optional
			const middleware1 = authMiddleware(mockPair);
			const middleware2 = authMiddleware(mockPair, mockAuthAccount);
			const middleware3 = authMiddleware(undefined, mockAuthAccount);

			expect(middleware1).toBeDefined();
			expect(middleware2).toBeDefined();
			expect(middleware3).toBeDefined();
		});

		it("should have correct verifySignature signature", () => {
			expectTypeOf(verifySignature).parameter(0).toMatchTypeOf<string>();
			expectTypeOf(verifySignature).parameter(1).toMatchTypeOf<string>();
			expectTypeOf(verifySignature).parameter(2).toMatchTypeOf<KeyringPair>();
		});
	});
});

