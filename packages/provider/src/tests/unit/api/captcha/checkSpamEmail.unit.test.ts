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

import { ProsopoApiError } from "@prosopo/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetMaintenanceMode } = vi.hoisted(() => ({
	mockGetMaintenanceMode: vi.fn(() => true),
}));

vi.mock("../../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: mockGetMaintenanceMode,
}));

// The Tasks constructor calls env.getDb(); stub it out so the maintenance-mode
// happy path never touches a real database.
vi.mock("../../../../tasks/index.js", () => ({
	Tasks: vi.fn(),
}));

vi.mock("../../../../tasks/spam/checkSpamEmail.js", () => ({
	checkSpamEmail: vi.fn(),
}));

import checkSpamEmailHandler from "../../../../api/captcha/checkSpamEmail.js";

const buildReqRes = (body: unknown) => {
	const req = {
		body,
		path: "/checkSpamEmail",
		method: "POST",
		logger: {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		},
		i18n: { t: (s: string) => s },
	};
	const res = {
		json: vi.fn().mockReturnValue(undefined),
		status: vi.fn().mockReturnThis(),
	};
	return { req, res, next: vi.fn() };
};

describe("checkSpamEmail handler", () => {
	beforeEach(() => {
		mockGetMaintenanceMode.mockReturnValue(true);
	});

	it("returns a 400 PARSE_ERROR for a malformed request body", async () => {
		const handler = checkSpamEmailHandler({} as never);
		// Missing the required `dapp` field.
		const { req, res, next } = buildReqRes({ email: "user@example.com" });
		await handler(req as never, res as never, next);

		expect(res.json).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalledTimes(1);
		const err = next.mock.calls[0]?.[0] as ProsopoApiError;
		expect(err).toBeInstanceOf(ProsopoApiError);
		expect(err.context?.code).toBe(400);
		// Guard against regressing to the outer 500 catch.
		expect(err.context?.code).not.toBe(500);
	});

	it("accepts a valid body and proceeds past parsing (maintenance short-circuit)", async () => {
		const handler = checkSpamEmailHandler({} as never);
		const { req, res, next } = buildReqRes({
			email: "user@example.com",
			dapp: "5CQ3QeyY82R8h8VWFKTic3FMB3WsbSJExZgbaUqfVJtAFPnb",
		});
		await handler(req as never, res as never, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.json).toHaveBeenCalledTimes(1);
		expect(res.json.mock.calls[0]?.[0]).toMatchObject({ isSpam: false });
	});
});
