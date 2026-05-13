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
import type { Logger } from "@prosopo/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClearAllCountersEndpoint } from "../../../../api/admin/apiClearAllCountersEndpoint.js";
import type { UsageCounters } from "../../../../util/usageCounters.js";

const buildLogger = (): Logger =>
	({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}) as unknown as Logger;

describe("ApiClearAllCountersEndpoint", () => {
	let logger: Logger;

	beforeEach(() => {
		logger = buildLogger();
	});

	it("returns FAIL when UsageCounters is null", async () => {
		const endpoint = new ApiClearAllCountersEndpoint(null);
		const out = await endpoint.processRequest({}, logger);
		expect(out.status).toBe(ApiEndpointResponseStatus.FAIL);
	});

	it("returns FAIL when clearAll returns null (redis down)", async () => {
		const counters = {
			clearAll: vi.fn().mockResolvedValue(null),
		} as unknown as UsageCounters;
		const endpoint = new ApiClearAllCountersEndpoint(counters);
		const out = await endpoint.processRequest({}, logger);
		expect(out.status).toBe(ApiEndpointResponseStatus.FAIL);
		expect(counters.clearAll).toHaveBeenCalledWith(undefined);
	});

	it("clears all counters when no dapp is provided", async () => {
		const counters = {
			clearAll: vi.fn().mockResolvedValue(42),
		} as unknown as UsageCounters;
		const endpoint = new ApiClearAllCountersEndpoint(counters);
		const out = await endpoint.processRequest({}, logger);
		expect(out.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(out.data).toMatchObject({
			success: true,
			deletedCount: 42,
			scope: "all",
		});
		expect(counters.clearAll).toHaveBeenCalledWith(undefined);
	});

	it("scopes clear to the given dapp", async () => {
		const counters = {
			clearAll: vi.fn().mockResolvedValue(7),
		} as unknown as UsageCounters;
		const endpoint = new ApiClearAllCountersEndpoint(counters);
		const dapp = "5Gabc";
		const out = await endpoint.processRequest({ dapp }, logger);
		expect(out.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(out.data).toMatchObject({
			success: true,
			deletedCount: 7,
			scope: dapp,
		});
		expect(counters.clearAll).toHaveBeenCalledWith(dapp);
	});

	it("exposes the body schema", () => {
		const endpoint = new ApiClearAllCountersEndpoint(null);
		expect(endpoint.getRequestArgsSchema()).toBeDefined();
	});
});
