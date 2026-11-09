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
import { getLogger } from "@prosopo/logger";
import { describe, expect, it } from "vitest";
import {
	deleteAllRulesRoute,
	deleteRuleGroupsRoute,
	deleteRulesRoute,
	deletedRulesCountResponse,
	fetchRulesRoute,
	findRuleIdsRoute,
	getMissingIdsRoute,
	insertRulesRoute,
	rehashRulesRoute,
} from "#policy/api/ruleApiContracts.js";
import { accessRuleApiPaths } from "#policy/api/ruleApiPaths.js";
import { AccessRuleApiRoutes } from "#policy/api/ruleApiRoutes.js";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";

const contracts: ApiRouteContract[] = [
	deleteAllRulesRoute,
	deleteRuleGroupsRoute,
	deleteRulesRoute,
	fetchRulesRoute,
	findRuleIdsRoute,
	getMissingIdsRoute,
	insertRulesRoute,
	rehashRulesRoute,
];

describe("access rule contracts", () => {
	const routes = new AccessRuleApiRoutes(
		{} as AccessRulesStorage,
		getLogger("info", import.meta.url),
	).getRoutes();
	const endpoints = new Map(Object.entries(routes));

	it("cover every access rule path exactly once, all as POST", () => {
		expect(contracts.map((contract) => contract.path).sort()).toEqual(
			Object.values(accessRuleApiPaths).sort(),
		);
		expect(new Set(contracts.map((contract) => contract.method))).toEqual(
			new Set(["post"]),
		);
	});

	it.each(contracts)(
		"$path validates requests with its contract's schema",
		(contract: ApiRouteContract) => {
			expect(endpoints.get(contract.path)?.getRequestArgsSchema()).toBe(
				contract.requestSchema,
			);
		},
	);

	it("keeps the delete count on the wire as deleted_count", () => {
		expect(deletedRulesCountResponse.parse({ deleted_count: 3 })).toEqual({
			deleted_count: 3,
		});
		expect(() =>
			deletedRulesCountResponse.parse({ deletedCount: 3 }),
		).toThrow();
	});

	it("accepts the empty rehash payload and nothing else", () => {
		expect(rehashRulesRoute.responseSchema.parse({})).toEqual({});
		expect(() => rehashRulesRoute.responseSchema.parse({ x: 1 })).toThrow();
	});

	it("rejects a delete-groups entry without a group id", () => {
		expect(
			deleteRuleGroupsRoute.requestSchema.safeParse([{ clientIds: ["a"] }])
				.success,
		).toBe(false);
	});
});
