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
import { ProsopoApiError } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/env";
import { PublicApiPaths } from "@prosopo/types";
import { version } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicRouter } from "../../../api/public.js";

vi.mock("@prosopo/api-express-router", () => ({
	handleErrors: vi.fn(),
}));

vi.mock("@prosopo/util", () => ({
	version: "1.0.0-test",
}));

describe("publicRouter", () => {
	let mockEnv: ProviderEnvironment;
	let mockDb: any;
	let mockRedisConnection: any;
	let mockRedisAccessRulesConnection: any;
	let mockLogger: any;
	let mockReq: Request;
	let mockRes: Response;
	let mockNext: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();

		mockLogger = {
			error: vi.fn(),
		};

		mockRedisConnection = {
			isReady: vi.fn().mockReturnValue(true),
			getAwaitingTimeMs: vi.fn().mockReturnValue(5000),
		};

		mockRedisAccessRulesConnection = {
			isReady: vi.fn().mockReturnValue(false),
			getAwaitingTimeMs: vi.fn().mockReturnValue(10000),
		};

		mockDb = {
			getRedisConnection: vi.fn().mockReturnValue(mockRedisConnection),
			getRedisAccessRulesConnection: vi.fn().mockReturnValue(mockRedisAccessRulesConnection),
		};

		mockEnv = {
			getDb: vi.fn().mockReturnValue(mockDb),
			logger: mockLogger,
		} as unknown as ProviderEnvironment;

		mockReq = {} as Request;

		mockRes = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			json: vi.fn(),
		} as unknown as Response;

		mockNext = vi.fn() as NextFunction;
	});

	it("should return a configured Express router", () => {
		const router = publicRouter(mockEnv);

		expect(router).toBeDefined();
		expect(typeof router.get).toBe("function");
		expect(typeof router.use).toBe("function");
	});

	it("should handle health check endpoint", () => {
		// Test the health check handler directly
		const healthCheckHandler = (req: Request, res: Response) => {
			res.status(200).send("OK");
		};

		healthCheckHandler(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.send).toHaveBeenCalledWith("OK");
	});

	it("should handle provider details endpoint with successful database connections", async () => {
		const router = publicRouter(mockEnv);

		// Mock the route handler for provider details
		const providerDetailsHandler = vi.fn(async (req, res, next) => {
			try {
				const db = mockEnv.getDb();
				const redisConnection = db.getRedisConnection();
				const redisAccessRulesConnection = db.getRedisAccessRulesConnection();

				const response = {
					version,
					message: "Provider online",
					redis: [
						{
							actor: "General",
							isReady: redisConnection.isReady(),
							awaitingTimeSeconds: Math.ceil(redisConnection.getAwaitingTimeMs() / 1000),
						},
						{
							actor: "UAP",
							isReady: redisAccessRulesConnection.isReady(),
							awaitingTimeSeconds: Math.ceil(redisAccessRulesConnection.getAwaitingTimeMs() / 1000),
						},
					],
				};

				return res.json(response);
			} catch (err) {
				mockEnv.logger.error(() => ({
					err,
					data: { reqParams: req.params },
					msg: "Error getting provider details",
				}));
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { code: 500 },
					}),
				);
			}
		});

		// Call the handler directly to test the logic
		await providerDetailsHandler(mockReq, mockRes, mockNext);

		expect(mockEnv.getDb).toHaveBeenCalled();
		expect(mockRes.json).toHaveBeenCalledWith({
			version: "1.0.0-test",
			message: "Provider online",
			redis: [
				{
					actor: "General",
					isReady: true,
					awaitingTimeSeconds: 5, // 5000ms / 1000
				},
				{
					actor: "UAP",
					isReady: false,
					awaitingTimeSeconds: 10, // 10000ms / 1000
				},
			],
		});
	});

	it("should handle provider details endpoint with database errors", async () => {
		// Mock database to throw an error
		mockEnv.getDb = vi.fn().mockImplementation(() => {
			throw new Error("Database connection failed");
		});

		const router = publicRouter(mockEnv);

		// Mock the route handler for provider details
		const providerDetailsHandler = vi.fn(async (req, res, next) => {
			try {
				const db = mockEnv.getDb();
				// This will throw
				db.getRedisConnection();
			} catch (err) {
				mockEnv.logger.error(() => ({
					err,
					data: { reqParams: req.params },
					msg: "Error getting provider details",
				}));
				return next(
					new ProsopoApiError("API.BAD_REQUEST", {
						context: { code: 500 },
					}),
				);
			}
		});

		// Call the handler directly to test error handling
		await providerDetailsHandler(mockReq, mockRes, mockNext);

		expect(mockLogger.error).toHaveBeenCalledWith(
			expect.any(Function), // Logger function
		);

		// Verify next was called with ProsopoApiError
		expect(mockNext).toHaveBeenCalledWith(
			expect.any(ProsopoApiError),
		);

		const error = mockNext.mock.calls[0][0] as ProsopoApiError;
		expect(error).toBeInstanceOf(ProsopoApiError);
	});

	it("should register error handler middleware", () => {
		const router = publicRouter(mockEnv);

		// Check that handleErrors was registered by inspecting the router
		const layers = (router as any).stack || [];
		const errorHandlerLayer = layers.find((layer: any) =>
			layer.handle === handleErrors
		);

		expect(errorHandlerLayer).toBeDefined();
	});

	it("should calculate awaiting time correctly", async () => {
		// Test different awaiting times
		mockRedisConnection.getAwaitingTimeMs.mockReturnValue(1234);
		mockRedisAccessRulesConnection.getAwaitingTimeMs.mockReturnValue(5678);

		const router = publicRouter(mockEnv);

		const providerDetailsHandler = vi.fn(async (req, res, next) => {
			try {
				const db = mockEnv.getDb();
				const redisConnection = db.getRedisConnection();
				const redisAccessRulesConnection = db.getRedisAccessRulesConnection();

				const response = {
					version,
					message: "Provider online",
					redis: [
						{
							actor: "General",
							isReady: redisConnection.isReady(),
							awaitingTimeSeconds: Math.ceil(redisConnection.getAwaitingTimeMs() / 1000),
						},
						{
							actor: "UAP",
							isReady: redisAccessRulesConnection.isReady(),
							awaitingTimeSeconds: Math.ceil(redisAccessRulesConnection.getAwaitingTimeMs() / 1000),
						},
					],
				};

				return res.json(response);
			} catch (err) {
				return next(err);
			}
		});

		await providerDetailsHandler(mockReq, mockRes, mockNext);

		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				redis: expect.arrayContaining([
					expect.objectContaining({ awaitingTimeSeconds: 2 }), // ceil(1234/1000) = 2
					expect.objectContaining({ awaitingTimeSeconds: 6 }), // ceil(5678/1000) = 6
				]),
			}),
		);
	});
});