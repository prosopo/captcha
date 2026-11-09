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

import type { ApiRouteContract } from "@prosopo/api-route";
import {
	clearAllCountersRoute,
	dnsEventRoute,
	getAllDecisionMachinesRoute,
	getDecisionMachineRoute,
	getSessionRoute,
	registerSiteKeyRoute,
	registerSiteKeysRoute,
	removeAllDecisionMachinesRoute,
	removeDecisionMachineRoute,
	removeSiteKeyRoute,
	removeSiteKeysRoute,
	replaceDetectorPoolRoute,
	toggleMaintenanceModeRoute,
	updateDecisionMachineRoute,
} from "@prosopo/api-route/contracts";
import { AdminApiPaths } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { ApiAdminRoutesProvider } from "../../../../api/admin/apiAdminRoutesProvider.js";
import type { Tasks } from "../../../../tasks/index.js";

const contracts: ApiRouteContract[] = [
	registerSiteKeyRoute,
	registerSiteKeysRoute,
	removeSiteKeyRoute,
	removeSiteKeysRoute,
	toggleMaintenanceModeRoute,
	updateDecisionMachineRoute,
	getAllDecisionMachinesRoute,
	getDecisionMachineRoute,
	removeDecisionMachineRoute,
	removeAllDecisionMachinesRoute,
	clearAllCountersRoute,
	dnsEventRoute,
	replaceDetectorPoolRoute,
	getSessionRoute,
];

const tasks = {
	clientTaskManager: {},
	usageCounters: {},
	db: {},
	env: { ipInfoService: {} },
} as Partial<Tasks> as Tasks;

describe("ApiAdminRoutesProvider", () => {
	const routes = new ApiAdminRoutesProvider(tasks).getRoutes();

	it("serves exactly one endpoint per admin contract", () => {
		expect(Object.keys(routes).sort()).toEqual(
			contracts.map((contract) => contract.path).sort(),
		);
		expect(Object.keys(routes).sort()).toEqual(
			Object.values(AdminApiPaths).sort(),
		);
	});

	it.each(contracts)(
		"validates $path with its contract's request schema",
		(contract: ApiRouteContract) => {
			const endpoints = new Map(Object.entries(routes));
			expect(endpoints.get(contract.path)?.getRequestArgsSchema()).toBe(
				contract.requestSchema,
			);
		},
	);
});
