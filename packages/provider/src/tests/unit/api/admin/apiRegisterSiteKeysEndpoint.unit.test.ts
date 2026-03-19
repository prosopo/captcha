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

import { ApiEndpointResponseStatus } from "@prosopo/api-route";
import { CaptchaType, type IUserSettings, Tier } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRegisterSiteKeysEndpoint } from "../../../../api/admin/apiRegisterSiteKeysEndpoint.js";

describe("ApiRegisterSiteKeysEndpoint", () => {
	let endpoint: ApiRegisterSiteKeysEndpoint;
	let mockClientTaskManager: {
		registerSiteKeys: ReturnType<typeof vi.fn>;
	};
	let mockLogger: {
		info: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockClientTaskManager = {
			registerSiteKeys: vi.fn().mockResolvedValue(undefined),
		};
		mockLogger = {
			info: vi.fn(),
		};
		endpoint = new ApiRegisterSiteKeysEndpoint(
			mockClientTaskManager as never,
		);
	});

	it("returns success status when site keys are registered", async () => {
		const result = await endpoint.processRequest(
			[
				{
					siteKey: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
					tier: Tier.Free,
					settings: { domains: ["localhost"] } as unknown as IUserSettings,
				},
			],
			mockLogger as never,
		);

		expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
	});

	it("calls registerSiteKeys with correct parameters", async () => {
		const siteKeys = [
			{
				siteKey: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				tier: Tier.Professional,
				settings: {
					domains: ["example.com"],
					captchaType: CaptchaType.pow,
					frictionlessThreshold: 0.5,
					powDifficulty: 5,
					imageThreshold: 0.5,
					imageMaxRounds: 3,
				} as unknown as IUserSettings,
			},
			{
				siteKey: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				tier: Tier.Free,
				settings: { domains: ["example.org"] } as unknown as IUserSettings,
			},
		];

		await endpoint.processRequest(siteKeys, mockLogger as never);

		expect(mockClientTaskManager.registerSiteKeys).toHaveBeenCalledWith(
			siteKeys,
		);
	});

	it("logs registration message", async () => {
		await endpoint.processRequest(
			[
				{
					siteKey: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
					tier: Tier.Free,
					settings: { domains: ["localhost"] } as unknown as IUserSettings,
				},
			],
			mockLogger as never,
		);

		expect(mockLogger.info).toHaveBeenCalled();
	});

	it("returns correct schema", () => {
		const schema = endpoint.getRequestArgsSchema();
		expect(schema).toBeDefined();
	});
});
