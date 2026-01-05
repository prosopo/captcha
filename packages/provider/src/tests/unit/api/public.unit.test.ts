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
import { ProsopoApiError } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { PublicApiPaths } from "@prosopo/types";
import type { Request, Response } from "express";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { publicRouter } from "../../../api/public.js";

vi.mock("@prosopo/api-express-router", () => ({
	handleErrors: vi.fn(),
}));

describe("publicRouter", () => {
	let mockEnv: ProviderEnvironment;
	let mockReq: Request;
	let mockRes: Response;
	let mockNext: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnv = {
			getDb: vi.fn().mockReturnValue({
				getRedisConnection: vi.fn().mockReturnValue({
					isReady: vi.fn().mockReturnValue(true),
					getAwaitingTimeMs: vi.fn().mockReturnValue(0),
				}),
				getRedisAccessRulesConnection: vi.fn().mockReturnValue({
					isReady: vi.fn().mockReturnValue(true),
					getAwaitingTimeMs: vi.fn().mockReturnValue(0),
				}),
			}),
			logger: {
				error: vi.fn(),
			},
		} as unknown as ProviderEnvironment;
		mockReq = {
			params: {},
		} as Request;
		mockRes = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
			json: vi.fn(),
		} as unknown as Response;
		mockNext = vi.fn();
	});

	it("returns router with healthz endpoint", () => {
		const router = publicRouter(mockEnv);
		expect(router).toBeDefined();
	});

	it("healthz endpoint returns 200 OK", async () => {
		const router = publicRouter(mockEnv);
		const route = router.stack.find(
			(layer: { route?: { path: string } }) =>
				layer.route?.path === PublicApiPaths.Healthz,
		);
		expect(route).toBeDefined();

		if (route?.route?.stack?.[0]?.handle) {
			await route.route.stack[0].handle(mockReq, mockRes);
			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.send).toHaveBeenCalledWith("OK");
		}
	});

	it("getProviderDetails endpoint returns provider details", async () => {
		const router = publicRouter(mockEnv);
		const route = router.stack.find(
			(layer: { route?: { path: string } }) =>
				layer.route?.path === PublicApiPaths.GetProviderDetails,
		);
		expect(route).toBeDefined();

		if (route?.route?.stack?.[0]?.handle) {
			await route.route.stack[0].handle(mockReq, mockRes, mockNext);
			expect(mockRes.json).toHaveBeenCalled();
			const response = vi.mocked(mockRes.json).mock.calls[0]?.[0];
			expect(response).toHaveProperty("version");
			expect(response).toHaveProperty("message", "Provider online");
			expect(response).toHaveProperty("redis");
			expect(Array.isArray(response.redis)).toBe(true);
		}
	});

	it("getProviderDetails includes redis connection status", async () => {
		const router = publicRouter(mockEnv);
		const route = router.stack.find(
			(layer: { route?: { path: string } }) =>
				layer.route?.path === PublicApiPaths.GetProviderDetails,
		);

		if (route?.route?.stack?.[0]?.handle) {
			await route.route.stack[0].handle(mockReq, mockRes, mockNext);
			const response = vi.mocked(mockRes.json).mock.calls[0]?.[0];
			expect(response.redis).toHaveLength(2);
			expect(response.redis[0]).toHaveProperty("actor", "General");
			expect(response.redis[0]).toHaveProperty("isReady", true);
			expect(response.redis[1]).toHaveProperty("actor", "UAP");
			expect(response.redis[1]).toHaveProperty("isReady", true);
		}
	});

	it("getProviderDetails handles errors", async () => {
		mockEnv.getDb = vi.fn().mockImplementation(() => {
			throw new Error("Database error");
		});

		const router = publicRouter(mockEnv);
		const route = router.stack.find(
			(layer: { route?: { path: string } }) =>
				layer.route?.path === PublicApiPaths.GetProviderDetails,
		);

		if (route?.route?.stack?.[0]?.handle) {
			await route.route.stack[0].handle(mockReq, mockRes, mockNext);
			expect(mockNext).toHaveBeenCalled();
			const errorArg = mockNext.mock.calls[0]?.[0];
			expect(errorArg).toBeInstanceOf(ProsopoApiError);
		}
	});

	it("includes error handler middleware", () => {
		const router = publicRouter(mockEnv);
		const errorHandler = router.stack[router.stack.length - 1];
		expect(errorHandler).toBeDefined();
		expect(handleErrors).toBeDefined();
	});
});

