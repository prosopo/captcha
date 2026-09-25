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

import { ClientApiPaths } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The HTTP outcome the router produces for a request, after `handleErrors` has
// turned any thrown ProsopoApiError into a status code + JSON body.
interface RouteOutcome {
	status: number;
	body: { error?: { code?: number; key?: string } } | undefined;
}

const { mockGetMaintenanceMode } = vi.hoisted(() => ({
	mockGetMaintenanceMode: vi.fn(() => false),
}));

vi.mock("../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: mockGetMaintenanceMode,
}));

// Decode failure happens before any DB access, so Tasks is never constructed on
// this path. It is still mocked so that a regression which reached it would
// surface as an assertion failure rather than a constructor throw.
vi.mock("../../../tasks/tasks.js", () => ({
	Tasks: vi.fn().mockImplementation(function () {
		return { db: { getClientRecord: vi.fn() } };
	}),
}));

import { prosopoVerifyRouter } from "../../../api/verify.js";

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

// Drives the real router (including its mounted `handleErrors`) and returns the
// HTTP status + JSON body the request ultimately produced.
const callRoute = async (
	path: ClientApiPaths,
	body: Record<string, unknown>,
): Promise<RouteOutcome> => {
	const router = prosopoVerifyRouter(buildEnv());
	const outcome: RouteOutcome = { status: 200, body: undefined };
	const res = {
		statusCode: 200,
		statusMessage: "",
		set: (): typeof res => res,
		status: (code: number): typeof res => {
			res.statusCode = code;
			outcome.status = code;
			return res;
		},
		json: (responseBody: RouteOutcome["body"]): typeof res => {
			outcome.body = responseBody;
			return res;
		},
		send: (responseBody: RouteOutcome["body"]): typeof res => {
			outcome.body = responseBody;
			return res;
		},
		end: (): typeof res => res,
	};
	const req = {
		method: "POST",
		url: path,
		originalUrl: path,
		path,
		headers: {},
		body,
		i18n: { t: (key: string): string => key },
		logger: {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		},
	};

	await new Promise<void>((resolve) => {
		router(
			req as unknown as Request,
			res as unknown as Response,
			(() => resolve()) as NextFunction,
		);
		// handleErrors responds synchronously; resolve on the next tick in case
		// the router settled without calling the final `next`.
		setImmediate(resolve);
	});

	return outcome;
};

describe("verify routes reject a malformed token with 400, not 500", () => {
	beforeEach(() => {
		mockGetMaintenanceMode.mockReturnValue(false);
	});

	// A well-formed hex string that passes the zod `0x`-prefix/length check but
	// is not a decodable ProcaptchaToken SCALE struct — i.e. exactly the bad
	// client input an unauthenticated caller can send to every verify endpoint.
	const malformedBody = { token: "0x1234", dappSignature: "0x00" };

	const routes: [string, ClientApiPaths][] = [
		["image", ClientApiPaths.VerifyImageCaptchaSolutionDapp],
		["pow", ClientApiPaths.VerifyPowCaptchaSolution],
		["puzzle", ClientApiPaths.VerifyPuzzleCaptchaSolution],
		["authenticated", ClientApiPaths.VerifyAuthenticatedSession],
	];

	for (const [name, path] of routes) {
		it(`${name}: undecodable token -> 400 CAPTCHA.PARSE_ERROR`, async () => {
			const { status, body } = await callRoute(path, malformedBody);

			// The regression answered 500 (API.BAD_REQUEST) here: a malformed
			// token is bad client input, so it must be a 400.
			expect(status).toBe(400);
			expect(body?.error?.code).toBe(400);
			expect(body?.error?.key).toBe("CAPTCHA.PARSE_ERROR");
		});
	}
});
