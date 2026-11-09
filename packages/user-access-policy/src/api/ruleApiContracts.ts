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

import { type ApiRouteContract, defineApiRoute } from "@prosopo/api-route";
import type { AllKeys } from "@prosopo/common";
import { type ZodType, type ZodTypeDef, z } from "zod";
import {
	accessPolicyInput,
	policyScopeExclusionsInput,
	policyScopeInput,
} from "#policy/ruleInput/policyInput.js";
import {
	type AccessRulesFilterInput,
	accessRulesFilterInput,
	ruleEntryInput,
} from "#policy/ruleInput/ruleInput.js";
import { userScopeInput } from "#policy/ruleInput/userScopeInput.js";
import type {
	DeleteSiteGroup,
	DeleteSiteGroups,
} from "./delete/deleteRuleGroups.js";
import type {
	FetchRulesOptions,
	FetchRulesResponse,
} from "./read/fetchRules.js";
import { accessRuleApiPaths } from "./ruleApiPaths.js";
import type { InsertRulesGroup } from "./write/insertRules.js";

// Access rule routes are ApiEndpoints, so the response schema describes the
// `data` field of the { status, data, error } envelope rather than the whole body.

// Several inputs use `z.preprocess` on `deferToVerify`, so their input
// position is `unknown` rather than the parsed type.
type LooseSchema<Output> = ZodType<Output, ZodTypeDef, unknown>;

export type MissingIds = string[];

export type MissingIdsResponse = {
	ids: string[];
};

export const missingIdsResponse = z.object({
	ids: z.string().array(),
} satisfies AllKeys<MissingIdsResponse>) satisfies ZodType<MissingIdsResponse>;

export type RuleIdsResponse = {
	ruleIds: string[];
};

export const ruleIdsResponse = z.object({
	ruleIds: z.string().array(),
} satisfies AllKeys<RuleIdsResponse>) satisfies ZodType<RuleIdsResponse>;

export const fetchRulesResponse: LooseSchema<FetchRulesResponse> = z.object({
	ruleEntries: ruleEntryInput.array(),
} satisfies AllKeys<FetchRulesResponse>);

export type DeletedRulesCount = {
	deleted_count: number;
};

export const deletedRulesCountResponse = z.object({
	deleted_count: z.number(),
} satisfies AllKeys<DeletedRulesCount>) satisfies ZodType<DeletedRulesCount>;

export type RehashedRules = Record<string, never>;

export const getMissingIdsRoute: ApiRouteContract<
	accessRuleApiPaths.GET_MISSING_IDS,
	ZodType<MissingIds>,
	ZodType<MissingIdsResponse>
> = defineApiRoute({
	path: accessRuleApiPaths.GET_MISSING_IDS,
	method: "post",
	requestSchema: z.string().array() satisfies ZodType<MissingIds>,
	responseSchema: missingIdsResponse,
});

export const deleteAllRulesRoute: ApiRouteContract<
	accessRuleApiPaths.DELETE_ALL,
	undefined,
	ZodType<DeletedRulesCount>
> = defineApiRoute({
	path: accessRuleApiPaths.DELETE_ALL,
	method: "post",
	requestSchema: undefined,
	responseSchema: deletedRulesCountResponse,
});

export const deleteRuleGroupsRoute: ApiRouteContract<
	accessRuleApiPaths.DELETE_GROUPS,
	ZodType<DeleteSiteGroups>,
	ZodType<DeletedRulesCount>
> = defineApiRoute({
	path: accessRuleApiPaths.DELETE_GROUPS,
	method: "post",
	requestSchema: z.array(
		z.object({
			clientIds: z.string().array(),
			groupId: z.string(),
		} satisfies AllKeys<DeleteSiteGroup>),
	),
	responseSchema: deletedRulesCountResponse,
});

export const deleteRulesRoute: ApiRouteContract<
	accessRuleApiPaths.DELETE_MANY,
	LooseSchema<AccessRulesFilterInput[]>,
	ZodType<DeletedRulesCount>
> = defineApiRoute({
	path: accessRuleApiPaths.DELETE_MANY,
	method: "post",
	requestSchema: z.array(accessRulesFilterInput),
	responseSchema: deletedRulesCountResponse,
});

export const fetchRulesRoute: ApiRouteContract<
	accessRuleApiPaths.FETCH_MANY,
	ZodType<FetchRulesOptions>,
	LooseSchema<FetchRulesResponse>
> = defineApiRoute({
	path: accessRuleApiPaths.FETCH_MANY,
	method: "post",
	requestSchema: z.object({
		ids: z.string().array(),
	} satisfies AllKeys<FetchRulesOptions>),
	responseSchema: fetchRulesResponse,
});

export const findRuleIdsRoute: ApiRouteContract<
	accessRuleApiPaths.FIND_IDS,
	LooseSchema<AccessRulesFilterInput[]>,
	ZodType<RuleIdsResponse>
> = defineApiRoute({
	path: accessRuleApiPaths.FIND_IDS,
	method: "post",
	requestSchema: z.array(accessRulesFilterInput),
	responseSchema: ruleIdsResponse,
});

export const insertRulesRoute: ApiRouteContract<
	accessRuleApiPaths.INSERT_MANY,
	LooseSchema<InsertRulesGroup[]>,
	undefined
> = defineApiRoute({
	path: accessRuleApiPaths.INSERT_MANY,
	method: "post",
	requestSchema: z.array(
		z.object({
			accessPolicy: accessPolicyInput,
			policyScopes: z.array(policyScopeInput).optional(),
			excludedClientIds: policyScopeExclusionsInput.shape.excludedClientIds,
			groupId: z.string().optional(),
			userScopes: z.array(userScopeInput),
			expiresUnixTimestamp: z.number().optional(),
		} satisfies AllKeys<InsertRulesGroup>),
	),
	responseSchema: undefined,
});

export const rehashRulesRoute: ApiRouteContract<
	accessRuleApiPaths.REHASH_ALL,
	undefined,
	ZodType<RehashedRules>
> = defineApiRoute({
	path: accessRuleApiPaths.REHASH_ALL,
	method: "post",
	requestSchema: undefined,
	responseSchema: z.record(z.never()) satisfies ZodType<RehashedRules>,
});
