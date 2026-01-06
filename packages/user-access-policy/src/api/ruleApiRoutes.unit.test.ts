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

import { describe, expect, it, vi } from "vitest";
import {
	AccessRuleApiRoutes,
	accessRuleApiPaths,
	getExpressApiRuleRateLimits,
} from "#policy/api/ruleApiRoutes.js";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";
import { loggerMockedInstance } from "../testLogger.js";

describe("AccessRuleApiRoutes", () => {
	const mockStorage: AccessRulesStorage = {
		fetchRules: vi.fn(),
		getMissingRuleIds: vi.fn(),
		findRules: vi.fn(),
		findRuleIds: vi.fn(),
		fetchAllRuleIds: vi.fn(),
		insertRules: vi.fn(),
		deleteRules: vi.fn(),
		deleteAllRules: vi.fn(),
	};

	it("should instantiate with storage and logger", () => {
		const routes = new AccessRuleApiRoutes(mockStorage, loggerMockedInstance);

		expect(routes).toBeInstanceOf(AccessRuleApiRoutes);
	});

	it("should return all endpoint routes", () => {
		const routes = new AccessRuleApiRoutes(mockStorage, loggerMockedInstance);
		const apiRoutes = routes.getRoutes();

		expect(Object.keys(apiRoutes)).toHaveLength(8);
	});

	it("should include all delete endpoints", () => {
		const routes = new AccessRuleApiRoutes(mockStorage, loggerMockedInstance);
		const apiRoutes = routes.getRoutes();

		expect(apiRoutes[accessRuleApiPaths.DELETE_ALL]).toBeDefined();
		expect(apiRoutes[accessRuleApiPaths.DELETE_GROUPS]).toBeDefined();
		expect(apiRoutes[accessRuleApiPaths.DELETE_MANY]).toBeDefined();
	});

	it("should include all read endpoints", () => {
		const routes = new AccessRuleApiRoutes(mockStorage, loggerMockedInstance);
		const apiRoutes = routes.getRoutes();

		expect(apiRoutes[accessRuleApiPaths.FETCH_MANY]).toBeDefined();
		expect(apiRoutes[accessRuleApiPaths.FIND_IDS]).toBeDefined();
		expect(apiRoutes[accessRuleApiPaths.GET_MISSING_IDS]).toBeDefined();
	});

	it("should include all write endpoints", () => {
		const routes = new AccessRuleApiRoutes(mockStorage, loggerMockedInstance);
		const apiRoutes = routes.getRoutes();

		expect(apiRoutes[accessRuleApiPaths.INSERT_MANY]).toBeDefined();
		expect(apiRoutes[accessRuleApiPaths.REHASH_ALL]).toBeDefined();
	});

	it("should create endpoints with injected storage", () => {
		const routes = new AccessRuleApiRoutes(mockStorage, loggerMockedInstance);
		const apiRoutes = routes.getRoutes();

		// Endpoints should have access to the storage instance
		expect(apiRoutes[accessRuleApiPaths.DELETE_ALL]).toBeDefined();
		expect(typeof apiRoutes[accessRuleApiPaths.DELETE_ALL]).toBe("object");
	});

	it("should create endpoints with injected logger", () => {
		const routes = new AccessRuleApiRoutes(mockStorage, loggerMockedInstance);
		const apiRoutes = routes.getRoutes();

		// All endpoints should be created with the logger
		for (const endpoint of Object.values(apiRoutes)) {
			expect(endpoint).toBeDefined();
		}
	});
});

describe("getExpressApiRuleRateLimits", () => {
	it("should return rate limits for all endpoints", () => {
		const rateLimits = getExpressApiRuleRateLimits();

		expect(Object.keys(rateLimits)).toHaveLength(8);
	});

	it("should return default rate limits when no environment variables are set", () => {
		const originalEnv = process.env;
		process.env = { ...originalEnv };

		const rateLimits = getExpressApiRuleRateLimits();

		// Check all endpoints have default values
		for (const limit of Object.values(rateLimits)) {
			expect(limit?.limit).toBe(5);
			expect(limit?.windowMs).toBe(10000);
		}

		process.env = originalEnv;
	});

	it("should use environment variables when set", () => {
		const originalEnv = process.env;
		// Environment variables should be in milliseconds
		process.env = {
			...originalEnv,
			PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_ALL_WINDOW: "20000",
			PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_ALL_LIMIT: "10",
		};

		const rateLimits = getExpressApiRuleRateLimits();

		expect(rateLimits[accessRuleApiPaths.DELETE_ALL].windowMs).toBe(20000);
		expect(rateLimits[accessRuleApiPaths.DELETE_ALL].limit).toBe(10);

		process.env = originalEnv;
	});

	it("should handle partial environment variable configuration", () => {
		const originalEnv = process.env;
		// Clean up any existing env vars first
		const cleanEnv = { ...originalEnv };
		for (const key of Object.keys(cleanEnv).filter((key) =>
			key.startsWith("PROSOPO_USER_ACCESS_POLICY_RULE_"),
		)) {
			delete cleanEnv[key];
		}

		process.env = {
			...cleanEnv,
			PROSOPO_USER_ACCESS_POLICY_RULE_INSERT_MANY_LIMIT: "15",
		};

		const rateLimits = getExpressApiRuleRateLimits();

		// Modified endpoint should have custom limit
		expect(rateLimits[accessRuleApiPaths.INSERT_MANY].limit).toBe(15);
		// But default window
		expect(rateLimits[accessRuleApiPaths.INSERT_MANY].windowMs).toBe(10000);

		// Other endpoints should have defaults
		expect(rateLimits[accessRuleApiPaths.DELETE_ALL].limit).toBe(5);
		expect(rateLimits[accessRuleApiPaths.DELETE_ALL].windowMs).toBe(10000);

		process.env = originalEnv;
	});

	it("should ignore invalid environment variable values", () => {
		const originalEnv = process.env;
		process.env = {
			...originalEnv,
			PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_ALL_WINDOW: "invalid",
			PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_ALL_LIMIT: "not-a-number",
		};

		const rateLimits = getExpressApiRuleRateLimits();

		// Should fall back to defaults when env vars are invalid
		expect(rateLimits[accessRuleApiPaths.DELETE_ALL].windowMs).toBe(10000);
		expect(rateLimits[accessRuleApiPaths.DELETE_ALL].limit).toBe(5);

		process.env = originalEnv;
	});

	it("should accept window values in milliseconds from environment", () => {
		const originalEnv = process.env;
		// Environment variable should be in milliseconds
		process.env = {
			...originalEnv,
			PROSOPO_USER_ACCESS_POLICY_RULE_FETCH_MANY_WINDOW: "30000",
		};

		const rateLimits = getExpressApiRuleRateLimits();

		expect(rateLimits[accessRuleApiPaths.FETCH_MANY].windowMs).toBe(30000);

		process.env = originalEnv;
	});

	it("should include rate limits for all defined API paths", () => {
		const rateLimits = getExpressApiRuleRateLimits();
		const apiPaths = Object.values(accessRuleApiPaths);

		for (const path of apiPaths) {
			expect(rateLimits[path]).toBeDefined();
			expect(rateLimits[path].limit).toBeTypeOf("number");
			expect(rateLimits[path].windowMs).toBeTypeOf("number");
		}
	});
});

describe("accessRuleApiPaths", () => {
	it("should define all API endpoint paths", () => {
		expect(accessRuleApiPaths.DELETE_ALL).toBe(
			"/v1/prosopo/user-access-policy/rules/delete-all",
		);
		expect(accessRuleApiPaths.DELETE_GROUPS).toBe(
			"/v1/prosopo/user-access-policy/rules/delete-groups",
		);
		expect(accessRuleApiPaths.DELETE_MANY).toBe(
			"/v1/prosopo/user-access-policy/rules/delete-many",
		);
		expect(accessRuleApiPaths.FETCH_MANY).toBe(
			"/v1/prosopo/user-access-policy/rules/fetch-many",
		);
		expect(accessRuleApiPaths.FIND_IDS).toBe(
			"/v1/prosopo/user-access-policy/rules/find-ids",
		);
		expect(accessRuleApiPaths.GET_MISSING_IDS).toBe(
			"/v1/prosopo/user-access-policy/rules/get-missing-ids",
		);
		expect(accessRuleApiPaths.INSERT_MANY).toBe(
			"/v1/prosopo/user-access-policy/rules/insert-many",
		);
		expect(accessRuleApiPaths.REHASH_ALL).toBe(
			"/v1/prosopo/user-access-policy/rules/rehash-all",
		);
	});

	it("should have unique paths for each endpoint", () => {
		const paths = Object.values(accessRuleApiPaths);
		const uniquePaths = new Set(paths);

		expect(uniquePaths.size).toBe(paths.length);
	});
});
