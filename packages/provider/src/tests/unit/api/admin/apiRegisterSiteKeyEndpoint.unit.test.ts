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
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRegisterSiteKeyEndpoint } from "../../../../api/admin/apiRegisterSiteKeyEndpoint.js";

describe("ApiRegisterSiteKeyEndpoint", () => {
	let endpoint: ApiRegisterSiteKeyEndpoint;
	let mockClientTaskManager: {
		registerSiteKey: ReturnType<typeof vi.fn>;
	};
	let mockLogger: {
		info: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockClientTaskManager = {
			registerSiteKey: vi.fn().mockResolvedValue(undefined),
		};
		mockLogger = {
			info: vi.fn(),
		};
		endpoint = new ApiRegisterSiteKeyEndpoint(mockClientTaskManager as never);
	});

	it("returns success status when site key is registered", async () => {
		const result = await endpoint.processRequest(
			{
				siteKey: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				tier: 1,
			},
			mockLogger as never,
		);

		expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
	});

	it("calls registerSiteKey with correct parameters", async () => {
		const siteKey = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
		const tier = 2;
		const settings = { domains: ["example.com"] };

		await endpoint.processRequest(
			{ siteKey, tier, settings },
			mockLogger as never,
		);

		expect(mockClientTaskManager.registerSiteKey).toHaveBeenCalledWith(
			siteKey,
			tier,
			settings,
		);
	});

	it("uses empty settings when settings not provided", async () => {
		const siteKey = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
		const tier = 1;

		await endpoint.processRequest({ siteKey, tier }, mockLogger as never);

		expect(mockClientTaskManager.registerSiteKey).toHaveBeenCalledWith(
			siteKey,
			tier,
			expect.objectContaining({}),
		);
	});

	it("logs registration message", async () => {
		await endpoint.processRequest(
			{
				siteKey: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				tier: 1,
			},
			mockLogger as never,
		);

		expect(mockLogger.info).toHaveBeenCalled();
	});

	it("returns correct schema", () => {
		const schema = endpoint.getRequestArgsSchema();
		expect(schema).toBeDefined();
	});
});
