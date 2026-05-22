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

import { ApiParams, POW_SEPARATOR } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetMaintenanceMode, mockedDbMethods, mockedManagers } = vi.hoisted(
	() => {
		const v = vi.fn(() => true);
		const db = {
			getClientRecord: vi.fn(),
			getSessionRecordByToken: vi.fn(),
			getSessionByuserSitekeyIpHash: vi.fn(),
			storePowCaptchaRecord: vi.fn(),
			storePuzzleCaptchaRecord: vi.fn(),
		};
		const managers = {
			powCaptchaManager: {
				isValidRequest: vi.fn(),
				getPowCaptchaChallenge: vi.fn(),
				getPrioritisedAccessPolicies: vi.fn(),
			},
			puzzleCaptchaManager: {
				isValidRequest: vi.fn(),
				getPuzzleCaptchaChallenge: vi.fn(),
				getPrioritisedAccessPolicies: vi.fn(),
			},
			frictionlessManager: {
				decryptAndAttachSimdReadingsIfAbsent: vi.fn(),
			},
		};
		return {
			mockGetMaintenanceMode: v,
			mockedDbMethods: db,
			mockedManagers: managers,
		};
	},
);

vi.mock("../../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: mockGetMaintenanceMode,
}));

vi.mock("../../../../utils/normalizeRequestIp.js", () => ({
	normalizeRequestIp: (ip: unknown) => String(ip),
}));

vi.mock("../../../../api/validateAddress.js", () => ({
	validateAddr: vi.fn(),
	validateSiteKey: vi.fn(),
}));

vi.mock("../../../../tasks/index.js", () => ({
	Tasks: vi.fn().mockImplementation(() => ({
		setLogger: vi.fn(),
		db: mockedDbMethods,
		...mockedManagers,
		logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
	})),
}));

import getPowChallenge from "../../../../api/captcha/getPoWCaptchaChallenge.js";
import getPuzzleChallenge from "../../../../api/captcha/getPuzzleCaptchaChallenge.js";

type MockReq = {
	body: unknown;
	headers: Record<string, unknown>;
	ip: string;
	ja4: Record<string, unknown>;
	logger: {
		info: ReturnType<typeof vi.fn>;
		warn: ReturnType<typeof vi.fn>;
		error: ReturnType<typeof vi.fn>;
		debug: ReturnType<typeof vi.fn>;
	};
	i18n: { t: (s: string) => string };
	ipInfo?: unknown;
};

type MockRes = {
	json: ReturnType<typeof vi.fn>;
	status: ReturnType<typeof vi.fn>;
};

const buildReqRes = (body: unknown) => {
	const req: MockReq = {
		body,
		headers: {},
		ip: "::1",
		ja4: {},
		logger: {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		},
		i18n: { t: (s: string) => s },
	};
	const res: MockRes = {
		json: vi.fn().mockReturnValue(undefined),
		status: vi.fn().mockReturnThis(),
	};
	return { req, res, next: vi.fn() };
};

const validBody = {
	user: "5Co9jMoD7RZxe19JbZU9zsSRo8buaFj2wSEsKxGJSbNWXEpc",
	dapp: "5CQ3QeyY82R8h8VWFKTic3FMB3WsbSJExZgbaUqfVJtAFPnb",
};

describe("maintenance mode short-circuit", () => {
	beforeEach(() => {
		mockGetMaintenanceMode.mockReturnValue(true);
		for (const fn of Object.values(mockedDbMethods)) fn.mockReset();
		for (const mgr of Object.values(mockedManagers)) {
			for (const fn of Object.values(mgr)) fn.mockReset();
		}
	});

	describe("getPoWCaptchaChallenge", () => {
		it("returns dummy challenge without hitting the DB", async () => {
			const handler = getPowChallenge({} as never, {} as never);
			const { req, res, next } = buildReqRes(validBody);
			await handler(req as never, res as never, next);

			expect(res.json).toHaveBeenCalledTimes(1);
			const body = res.json.mock.calls[0]?.[0];
			expect(body[ApiParams.status]).toBe("ok");
			expect(body[ApiParams.difficulty]).toBe(1);
			expect(body[ApiParams.challenge].split(POW_SEPARATOR)).toHaveLength(4);

			expect(mockedDbMethods.getClientRecord).not.toHaveBeenCalled();
			expect(mockedDbMethods.storePowCaptchaRecord).not.toHaveBeenCalled();
			expect(
				mockedManagers.powCaptchaManager.isValidRequest,
			).not.toHaveBeenCalled();
		});

		it("falls through to the normal flow when maintenance mode is off", async () => {
			mockGetMaintenanceMode.mockReturnValue(false);
			mockedDbMethods.getClientRecord.mockResolvedValueOnce(null);

			const handler = getPowChallenge({} as never, {} as never);
			const { req, res, next } = buildReqRes(validBody);
			await handler(req as never, res as never, next);

			expect(mockedDbMethods.getClientRecord).toHaveBeenCalled();
		});
	});

	describe("getPuzzleCaptchaChallenge", () => {
		it("returns dummy challenge without hitting the DB", async () => {
			const handler = getPuzzleChallenge({} as never, {} as never);
			const { req, res, next } = buildReqRes(validBody);
			await handler(req as never, res as never, next);

			expect(res.json).toHaveBeenCalledTimes(1);
			const body = res.json.mock.calls[0]?.[0];
			expect(body[ApiParams.status]).toBe("ok");
			expect(body[ApiParams.tolerance]).toBeGreaterThanOrEqual(1000);
			expect(body[ApiParams.challenge].split(POW_SEPARATOR)).toHaveLength(4);

			expect(mockedDbMethods.getClientRecord).not.toHaveBeenCalled();
			expect(mockedDbMethods.storePuzzleCaptchaRecord).not.toHaveBeenCalled();
			expect(
				mockedManagers.puzzleCaptchaManager.isValidRequest,
			).not.toHaveBeenCalled();
		});

		it("falls through to the normal flow when maintenance mode is off", async () => {
			mockGetMaintenanceMode.mockReturnValue(false);
			mockedDbMethods.getClientRecord.mockResolvedValueOnce(null);

			const handler = getPuzzleChallenge({} as never, {} as never);
			const { req, res, next } = buildReqRes(validBody);
			await handler(req as never, res as never, next);

			expect(mockedDbMethods.getClientRecord).toHaveBeenCalled();
		});
	});
});
