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
	type AccessPolicy,
	AccessPolicyType,
	type PolicyScope,
	type UserScope,
	type UserScopeApiInput,
	type UserScopeApiOutput,
	accessPolicySchema,
	policyScopeSchema,
} from "#policy/accessPolicy.js";
import { type PolicyFilter, ScopeMatch } from "#policy/accessPolicyResolver.js";
import {
	type AccessRule,
	type AccessRulesStorage,
	accessRuleSchema,
} from "#policy/accessRules.js";
import {
	AccessRuleApiRoutes,
	accessRuleApiPaths,
	getExpressApiRuleRateLimits,
} from "#policy/api/accessRuleApiRoutes.js";
import {
	type DeleteAllRulesEndpointSchema,
	deleteAllRulesEndpointSchema,
} from "#policy/api/deleteAllRulesEndpoint.js";
import {
	type DeleteRulesEndpointSchemaInput,
	type DeleteRulesEndpointSchemaOutput,
	deleteRulesEndpointSchema,
} from "#policy/api/deleteRulesEndpoint.js";
import type {DeleteRuleGroupsInputEndpointSchema} from "#policy/api/deleteRuleGroupsEndpoint.js";
import {
	type InsertManyRulesEndpointInputSchema,
	type InsertManyRulesEndpointOutputSchema,
	insertRulesEndpointSchema,
} from "#policy/api/insertRulesEndpoint.js";
import { createRedisAccessRulesStorage } from "#policy/redis/redisAccessRules.js";
import { createRedisAccessRulesIndex } from "#policy/redis/redisAccessRulesIndex.js";
import { userScopeInputSchema } from "./accessPolicy.js";
import {
	type AccessRuleExtended,
	accessRuleSchemaExtended,
} from "./accessRules.js";

export const createApiRuleRoutesProvider = (
	rulesStorage: AccessRulesStorage,
): ApiRoutesProvider => {
	return new AccessRuleApiRoutes(rulesStorage);
};

export {
	type AccessPolicy,
	type PolicyScope,
	type AccessRulesStorage,
	type PolicyFilter,
	type DeleteRulesEndpointSchemaOutput,
	type DeleteRulesEndpointSchemaInput,
	type DeleteAllRulesEndpointSchema,
	type InsertManyRulesEndpointInputSchema,
	type InsertManyRulesEndpointOutputSchema,
    type DeleteRuleGroupsInputEndpointSchema,
	type AccessRule,
	type UserScope,
	type UserScopeApiInput,
	type UserScopeApiOutput,
	type AccessRuleExtended,
	AccessPolicyType,
	ScopeMatch,
	// redis
	createRedisAccessRulesIndex,
	createRedisAccessRulesStorage,
	// api
	accessRuleApiPaths,
	accessRuleSchema,
	accessRuleSchemaExtended,
	accessPolicySchema,
	policyScopeSchema,
	insertRulesEndpointSchema,
	deleteAllRulesEndpointSchema,
	deleteRulesEndpointSchema,
	getExpressApiRuleRateLimits,
	userScopeInputSchema,
};
