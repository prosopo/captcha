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

import { ApiParams, ClientApiPaths } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetMaintenanceMode } = vi.hoisted(() => ({
	mockGetMaintenanceMode: vi.fn(() => true),
}));

vi.mock("../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: mockGetMaintenanceMode,
}));

// The Tasks constructor calls `env.getDb()`, which throws while the DB is
// unavailable. Mocking it lets a miss of the maintenance short-circuit show up
// as a wrong response body rather than a constructor throw.
vi.mock("../../../tasks/tasks.js", () => ({
	Tasks: vi.fn().mockImplementation(function () {
		return { db: { getClientRecord: vi.fn() } };
	}),
}));

import { prosopoVerifyRouter } from "../../../api/verify.js";

type CapturedResponse = Record<string, unknown> | undefined;

const buildEnv = (): ProviderEnvironment =>
	({
		getDb: () => {
			throw new Error("db not setup! Please call isReady() first");
		},
		logger: {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		},
	}) as unknown as ProviderEnvironment;

// Drive the real router so the test covers the wiring in `verify.ts`, not just
// the response builder. Express routers are plain (req, res, next) middleware.
const callRoute = async (path: ClientApiPaths): Promise<CapturedResponse> => {
	const router = prosopoVerifyRouter(buildEnv());
	let captured: CapturedResponse;
	const res = {
		statusCode: 200,
		json: (body: Record<string, unknown>) => {
			captured = body;
			return res;
		},
		status: (code: number) => {
			res.statusCode = code;
			return res;
		},
	};
	const req = {
		method: "POST",
		url: path,
		originalUrl: path,
		path,
		headers: {},
		body: {},
		// The unit test asserts the key is looked up rather than the localised
		// output, so the stub is the identity function.
		i18n: { t: (key: string) => key },
		logger: {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		},
	};

	await new Promise<void>((resolve, reject) => {
		// The stubs above carry only the fields the maintenance-mode path
		// touches, so they're cast to the shapes express's router expects.
		router(
			req as unknown as Request,
			res as unknown as Response,
			((err?: unknown) => (err ? reject(err) : resolve())) as NextFunction,
		);
		// The handler responds synchronously on the maintenance path, so resolve
		// on the next tick if `next` was never called.
		setImmediate(resolve);
	});

	return captured;
};

describe("verify routes in maintenance mode", () => {
	beforeEach(() => {
		mockGetMaintenanceMode.mockReturnValue(true);
	});

	const routes: [string, ClientApiPaths][] = [
		["image", ClientApiPaths.VerifyImageCaptchaSolutionDapp],
		["pow", ClientApiPaths.VerifyPowCaptchaSolution],
		["puzzle", ClientApiPaths.VerifyPuzzleCaptchaSolution],
	];

	for (const [name, path] of routes) {
		it(`${name}: returns the same field set a real verify returns`, async () => {
			const body = await callRoute(path);

			expect(body).toBeDefined();
			expect(body?.[ApiParams.verified]).toBe(true);
			// Not the bare "ok" the short-circuit used to send: integrations read
			// this field and a real verify never returns "ok" here.
			expect(body?.[ApiParams.status]).toBe("API.USER_VERIFIED");
			// Sent unconditionally — the tier gate needs a client record from the
			// DB, which is exactly what is unavailable in maintenance mode.
			expect(body?.[ApiParams.score]).toBe(0);
			// Failure-only field; maintenance mode always passes.
			expect(body).not.toHaveProperty(ApiParams.reason);
			// No commitment exists to reference.
			expect(body).not.toHaveProperty(ApiParams.commitmentId);
		});
	}
});
