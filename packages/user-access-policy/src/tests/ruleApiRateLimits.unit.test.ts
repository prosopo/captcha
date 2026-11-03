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

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	accessRuleApiPaths,
	getExpressApiRuleRateLimits,
} from "../api/ruleApiRoutes.js";

const WINDOW = "PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_ALL_WINDOW";
const LIMIT = "PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_ALL_LIMIT";

const deleteAllLimits = () =>
	getExpressApiRuleRateLimits()[accessRuleApiPaths.DELETE_ALL];

describe("getExpressApiRuleRateLimits", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("uses the defaults when nothing is set", () => {
		vi.stubEnv(WINDOW, undefined);
		vi.stubEnv(LIMIT, undefined);
		expect(deleteAllLimits()).toEqual({ windowMs: 10_000, limit: 5 });
	});

	it("reads whole positive integers from the environment", () => {
		vi.stubEnv(WINDOW, "60000");
		vi.stubEnv(LIMIT, " 20 ");
		expect(deleteAllLimits()).toEqual({ windowMs: 60_000, limit: 20 });
	});

	it.each(["12abc", "1.5", "-3", "0", "", "abc"])(
		"falls back to the default for %j rather than a partial parse",
		(value) => {
			vi.stubEnv(WINDOW, value);
			vi.stubEnv(LIMIT, value);
			expect(deleteAllLimits()).toEqual({ windowMs: 10_000, limit: 5 });
		},
	);
});
