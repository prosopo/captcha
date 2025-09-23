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

import { type RediSearchSchema, SCHEMA_FIELD_TYPE } from "@redis/search";
import type { SchemaDefinition } from "mongoose";
import { type ZodType, z } from "zod";
import { ScopeMatch } from "#policy/storage/accessRulesStorage.js";
import type { UserAttributes } from "#policy/userScope/userAttributes.js";

export type PolicyScope = {
	clientId?: string;
};

export const policyScopeSchema = z.object({
	clientId: z.coerce.string().optional(),
}) satisfies ZodType<PolicyScope>;

export const policyScopeMongooseSchema: SchemaDefinition<PolicyScope> = {
	clientId: { type: String, required: false },
};

export const policyScopeRedisSchema: RediSearchSchema = {
	clientId: {
		type: SCHEMA_FIELD_TYPE.TAG,
		INDEXMISSING: true,
	},
} satisfies Record<keyof PolicyScope, object>;

export const getPolicyScopeRedisQuery = (
	policyScope: PolicyScope | undefined,
	scopeMatchType: ScopeMatch | undefined,
): string => {
	const clientId = policyScope?.clientId;

	if ("string" === typeof clientId) {
		return ScopeMatch.Exact === scopeMatchType
			? `@clientId:{${clientId}}`
			: `( @clientId:{${clientId}} | ismissing(@clientId) )`;
	}

	return ScopeMatch.Exact === scopeMatchType ? "ismissing(@clientId)" : "";
};
