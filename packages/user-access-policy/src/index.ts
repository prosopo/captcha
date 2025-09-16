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

export {
	type AccessPolicy,
	AccessPolicyType,
	type PolicyScope,
	type UserScope,
	type UserScopeApiInput,
	type UserScopeApiOutput,
	accessPolicySchema,
	policyScopeSchema,
} from "#policy/accessPolicy.js";
export { type PolicyFilter, ScopeMatch } from "#policy/accessPolicyResolver.js";
export {
	type AccessRule,
	type AccessRulesStorage,
	accessRuleSchema,
	getAccessRuleHash,
	type AccessRuleExtended,
	accessRuleSchemaExtended,
} from "#policy/accessRules.js";
export {
	accessRuleApiPaths,
	getExpressApiRuleRateLimits,
} from "#policy/api/accessRuleApiRoutes.js";
export {
	type DeleteAllRulesEndpointSchema,
	deleteAllRulesEndpointSchema,
} from "#policy/api/deleteAllRulesEndpoint.js";
export {
	type DeleteRulesEndpointSchemaInput,
	type DeleteRulesEndpointSchemaOutput,
	deleteRulesEndpointSchema,
} from "#policy/api/deleteRulesEndpoint.js";
export {
	type InsertManyRulesEndpointInputSchema,
	type InsertManyRulesEndpointOutputSchema,
	insertRulesEndpointSchema,
} from "#policy/api/insertRulesEndpoint.js";
export { createRedisAccessRulesStorage } from "#policy/redis/redisRulesStorage.js";
export { userScopeInputSchema } from "./accessPolicy.js";
export { redisAccessRulesIndex } from "./redis/redisRulesIndex.js";
export { AccessRulesApiClient } from "./api/accessRulesApiClient.js";

import type { ApiRoutesProvider } from "@prosopo/api-route";
import type { AccessRulesStorage } from "#policy/accessRules.js";
import { AccessRuleApiRoutes } from "#policy/api/accessRuleApiRoutes.js";

export const createApiRuleRoutesProvider = (
	rulesStorage: AccessRulesStorage,
): ApiRoutesProvider => {
	return new AccessRuleApiRoutes(rulesStorage);
};
