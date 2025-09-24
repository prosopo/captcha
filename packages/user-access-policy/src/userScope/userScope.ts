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

import type { RediSearchSchema } from "@redis/search";
import type { SchemaDefinition } from "mongoose";
import { z } from "zod";
import { ScopeMatch } from "#policy/accessRulesStorage.js";
import {
	type UserAttributes,
	type UserAttributesRecord,
	userAttributesMongooseSchema,
	userAttributesRecordFields,
	userAttributesRedisSchema,
	userAttributesSchema,
} from "./userAttributes.js";
import {
	type UserIp,
	type UserIpRecord,
	userIpMongooseSchema,
	userIpRecordFields,
	userIpRedisQueries,
	userIpRedisSchema,
	userIpSchema,
} from "./userIp.js";

export type UserScope = UserAttributes & UserIp;

export type UserScopeRecord = UserAttributesRecord & UserIpRecord;

export const userScopeRecordFields = [
	...userAttributesRecordFields,
	...userIpRecordFields,
] as const satisfies (keyof UserScopeRecord)[];

export type UserScopeRecordFields = typeof userScopeRecordFields;

export const userScopeSchema = z
	.object({})
	.and(userAttributesSchema)
	.and(userIpSchema)
	.transform(
		// transform is used for type safety only - plain "satisfies ZodType<x>" doesn't work after ".and()"
		(userScopeInput): UserScope & UserScopeRecord => userScopeInput,
	);

export const userScopeMongooseSchema: SchemaDefinition<UserScopeRecord> = {
	...userAttributesMongooseSchema,
	...userIpMongooseSchema,
};

export const userScopeRedisSchema: RediSearchSchema = {
	...userAttributesRedisSchema,
	...userIpRedisSchema,
} satisfies Partial<Record<keyof UserScope, object>>;

export const getUserScopeRedisQuery = (
	userScope: UserScope,
	scopeMatchType: ScopeMatch | undefined,
	matchingFieldsOnly: boolean,
): string => {
	let scopeEntries = Object.entries(userScope) as Array<
		[keyof UserScope, unknown]
	>;
	let scopeJoinType = " ";

	// skip fields with undefined values if in greedy mode and set operator to OR
	if (scopeMatchType === ScopeMatch.Greedy) {
		scopeEntries = scopeEntries.filter(
			([_, value]) => value !== undefined,
		) as Array<[keyof UserScope, unknown]>;
		scopeJoinType = " | ";
	}

	if (matchingFieldsOnly) {
		const scopeMap = new Map<keyof UserScope, unknown>(scopeEntries);

		// If numericIp is explicitly undefined, set both range fields to undefined
		if (scopeMap.has("numericIp") && scopeMap.get("numericIp") === undefined) {
			scopeMap.set("numericIpMaskMin", undefined);
			scopeMap.set("numericIpMaskMax", undefined);
		}

		// Ensure all expected fields are accounted for
		for (const name of Object.keys(userScopeSchema._def.schema) as Array<
			keyof UserScope
		>) {
			if (!scopeMap.has(name)) {
				scopeMap.set(name, undefined);
			}
		}

		scopeEntries = [...scopeMap.entries()];
	}

	const scopeObj = Object.fromEntries(scopeEntries) as Partial<UserScope>;

	return scopeEntries
		.map(([scopeFieldName, scopeFieldValue]) =>
			getUserScopeRedisFieldQuery(
				scopeFieldName,
				scopeFieldValue,
				scopeMatchType,
				scopeObj,
			),
		)
		.filter(Boolean)
		.join(scopeJoinType);
};

const getUserScopeRedisFieldQuery = (
	fieldName: keyof UserScope,
	fieldValue: unknown,
	matchType: ScopeMatch | undefined,
	fullScope: Partial<UserScope>,
): string => {
	if (fieldName in userIpRedisQueries) {
		const queryBuilder = userIpRedisQueries[fieldName as keyof UserIp];

		return queryBuilder(fieldValue, fullScope);
	}

	return undefined === fieldValue
		? `ismissing(@${fieldName})`
		: `@${fieldName}:{${fieldValue}}`;
};
