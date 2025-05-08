// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type { ApiRoutesProvider } from "@prosopo/api-route";
import {
	type ResolveAccessPolicy,
	createAccessPolicyResolver,
} from "#policy/accessPolicyResolver.js";

import { type PolicyFilter, ScopeMatch } from "#policy/accessPolicyResolver.js";
import type { AccessRulesStorage } from "#policy/accessRules.js";
import { apiRulePaths } from "#policy/api/apiRulePaths.js";
import { ApiRuleRoutesProvider } from "#policy/api/apiRuleRoutesProvider.js";
import { getExpressApiRuleRateLimits } from "#policy/api/getExpressApiRuleRateLimits.js";
import { createRedisAccessRulesStorage } from "#policy/redis/redisAccessRules.js";

export const createApiRuleRoutesProvider = (
	rulesStorage: AccessRulesStorage,
): ApiRoutesProvider => {
	return new ApiRuleRoutesProvider(rulesStorage);
};

export {
	type AccessRulesStorage,
	type ResolveAccessPolicy,
	type PolicyFilter,
	createRedisAccessRulesStorage,
	createAccessPolicyResolver,
	getExpressApiRuleRateLimits,
	apiRulePaths,
	ScopeMatch,
};
