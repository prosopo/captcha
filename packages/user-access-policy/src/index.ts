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
import { type AccessPolicy, AccessPolicyType } from "#policy/accessPolicy.js";
import {
	type ResolveAccessPolicy,
	createAccessPolicyResolver,
} from "#policy/accessPolicyResolver.js";
import { type PolicyFilter, ScopeMatch } from "#policy/accessPolicyResolver.js";
import type { AccessRulesStorage } from "#policy/accessRules.js";
import {
	AccessRuleApiRoutes,
	accessRuleApiPaths,
	getExpressApiRuleRateLimits,
} from "#policy/api/accessRuleApiRoutes.js";
import { deleteAllRulesEndpointSchema } from "#policy/api/deleteAllRulesEndpoint.js";
import { deleteRulesEndpointSchema } from "#policy/api/deleteRulesEndpoint.js";
import { insertRulesEndpointSchema } from "#policy/api/insertRulesEndpoint.js";
import { createRedisAccessRulesStorage } from "#policy/redis/redisAccessRules.js";
import { createRedisAccessRulesIndex } from "#policy/redis/redisAccessRulesIndex.js";

export const createApiRuleRoutesProvider = (
	rulesStorage: AccessRulesStorage,
): ApiRoutesProvider => {
	return new AccessRuleApiRoutes(rulesStorage);
};

export {
	type AccessPolicy,
	type AccessRulesStorage,
	type ResolveAccessPolicy,
	type PolicyFilter,
	createAccessPolicyResolver,
	AccessPolicyType,
	ScopeMatch,
	// redis
	createRedisAccessRulesIndex,
	createRedisAccessRulesStorage,
	// api
	accessRuleApiPaths,
	insertRulesEndpointSchema,
	deleteAllRulesEndpointSchema,
	deleteRulesEndpointSchema,
	getExpressApiRuleRateLimits,
};
