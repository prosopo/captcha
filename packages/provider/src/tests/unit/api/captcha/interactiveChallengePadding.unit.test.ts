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
import {
	type ApiResponse,
	CaptchaType,
	type PoWChallengeId,
} from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AugmentedRequest } from "../../../../express.js";

const { manager } = vi.hoisted(() => ({
	manager: {
		getPrioritisedAccessPolicies: vi.fn(),
		isValidRequest: vi.fn(),
	},
}));

vi.mock("../../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
	getMaintenanceMode: (): boolean => false,
}));

vi.mock("../../../../api/validateAddress.js", () => ({
	validateAddr: vi.fn(),
	validateSiteKey: vi.fn(),
}));

vi.mock("../../../../tasks/index.js", () => ({
	Tasks: vi.fn().mockImplementation(function (): object {
		return {
			db: {
				getClientRecord: vi.fn().mockResolvedValue({ settings: {} }),
				getSessionRecordBySessionId: vi.fn().mockResolvedValue(undefined),
			},
		};
	}),
}));

vi.mock("../../../../api/captcha/trafficFilterRequestTime.js", () => ({
	applyTrafficFilterAtRequestTime: (): object => ({
		kind: "challenge",
		captchaType: CaptchaType.puzzle,
		padBytes: 5 * 1024 * 1024,
		sourceCategories: ["proxy"],
	}),
}));

import {
	type InteractiveChallengeSpec,
	interactiveChallengeHandler,
} from "../../../../api/captcha/interactiveCaptchaChallenge.js";
import type { CaptchaManager } from "../../../../tasks/captchaManager.js";

type Challenge = ApiResponse & { challenge: PoWChallengeId };

const CHALLENGE: Challenge = {
	status: "ok",
	challenge: "1700000000000___user___dapp___1" as PoWChallengeId,
};

const spec: InteractiveChallengeSpec<Challenge> = {
	captchaType: CaptchaType.puzzle,
	label: "puzzle",
	manager: (): CaptchaManager => manager as unknown as CaptchaManager,
	maintenanceResponse: async (): Promise<Challenge> => CHALLENGE,
	issue: async () => ({ response: CHALLENGE, logData: {} }),
};

const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

const request = (): Request & AugmentedRequest =>
	({
		body: {
			user: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
			dapp: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			sessionId: "session-id",
		},
		headers: { origin: "https://example.com" },
		ip: "192.0.2.1",
		ja4: "ja4",
		logger,
	}) as unknown as Request & AugmentedRequest;

describe("interactive challenge tarpit", () => {
	beforeEach(() => {
		manager.getPrioritisedAccessPolicies.mockResolvedValue([]);
		manager.isValidRequest.mockResolvedValue({
			valid: true,
			sessionId: "session-id",
		});
	});

	it("does not pad a puzzle challenge even when the traffic filter asks for it", async () => {
		const locals: Record<string, unknown> = {};
		const json = vi.fn();
		const res = { locals, json } as unknown as Response;
		const next: NextFunction = vi.fn();

		await interactiveChallengeHandler(
			{} as ProviderEnvironment,
			{} as AccessRulesStorage,
			spec,
		)(request(), res, next);

		expect(next).not.toHaveBeenCalled();
		expect(json).toHaveBeenCalledWith(CHALLENGE);
		expect(locals.padBytes).toBeUndefined();
	});
});
