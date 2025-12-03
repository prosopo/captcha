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

import type { PolicyScope, UserIp, UserScope } from "#policy/rule.js";
import { userScopeSchema } from "#policy/ruleInput/userScopeInput.js";
import {
	type AccessRulesFilter,
	FilterScopeMatch,
} from "#policy/rulesStorage.js";

type QueryBuilder = (value: unknown, scope: UserIp) => string;

/**
 * Escapes special characters for Redis TAG field queries.
 * Redis TAG fields treat these characters as special and they must be escaped with a backslash.
 */
const escapeTagValue = (value: string): string => {
	// Characters that need escaping in Redis TAG queries
	return value.replace(/([,.<>{}\[\]"':;!@#$%^&*()\-+=~|/\\])/g, "\\$1");
};

// #2 is a required option when the 'ismissing()' function is in the query body
export const REDIS_QUERY_DIALECT = 2;

const userIpQueries: Record<keyof UserIp, QueryBuilder> = {
	numericIp: (value, scope) => {
		if (undefined !== value) {
			return `( @numericIp:[${value} ${value}] | ( @numericIpMaskMin:[-inf ${value}] @numericIpMaskMax:[${value} +inf] ) )`;
		}
		// Only emit ismissing(@numericIp) if ranges are also not present
		if (
			scope.numericIpMaskMin === undefined &&
			scope.numericIpMaskMax === undefined
		) {
			return "ismissing(@numericIp) ismissing(@numericIpMaskMin) ismissing(@numericIpMaskMax)";
		}
		// Else, let ranges handle it
		return "";
	},
	numericIpMaskMin: (value, scope) => {
		if (scope.numericIp !== undefined) {
			return ""; // handled by numericIp
		}
		return value !== undefined
			? `@numericIpMaskMin:[-inf ${value}]`
			: "ismissing(@numericIpMaskMin)";
	},
	numericIpMaskMax: (value, scope) => {
		if (scope.numericIp !== undefined) {
			return ""; // handled by numericIp
		}
		return value !== undefined
			? `@numericIpMaskMax:[${value} +inf]`
			: "ismissing(@numericIpMaskMax)";
	},
};

const getUserScopeQuery = (
	userScope: UserScope,
	FilterScopeMatchType: FilterScopeMatch | undefined,
	matchingFieldsOnly: boolean,
): string => {
	let scopeEntries = Object.entries(userScope) as Array<
		[keyof UserScope, unknown]
	>;
	let scopeJoinType = " ";

	// skip fields with undefined values if in greedy mode and set operator to OR
	if (FilterScopeMatchType === FilterScopeMatch.Greedy) {
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
		for (const name of Object.keys(userScopeSchema.shape) as Array<
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
			getUserScopeFieldQuery(
				scopeFieldName,
				scopeFieldValue,
				FilterScopeMatchType,
				scopeObj,
			),
		)
		.filter(Boolean)
		.join(scopeJoinType);
};

// Fields that may contain special characters requiring escaping in Redis TAG queries
const FIELDS_REQUIRING_ESCAPE: ReadonlySet<keyof UserScope> = new Set([
	"coords",
]);

const getUserScopeFieldQuery = (
	fieldName: keyof UserScope,
	fieldValue: unknown,
	scopeMatch: FilterScopeMatch | undefined,
	fullScope: Partial<UserScope>,
): string => {
	if (fieldName in userIpQueries) {
		const queryBuilder = userIpQueries[fieldName as keyof UserIp];

		return queryBuilder(fieldValue, fullScope);
	}

	if (undefined === fieldValue) {
		return `ismissing(@${fieldName})`;
	}

	const stringValue = String(fieldValue);
	// Only escape fields that may contain special characters (like coords with JSON)
	const queryValue = FIELDS_REQUIRING_ESCAPE.has(fieldName)
		? escapeTagValue(stringValue)
		: stringValue;

	return `@${fieldName}:{${queryValue}}`;
};

const getPolicyScopeQuery = (
	policyScope: PolicyScope | undefined,
	scopeMatch: FilterScopeMatch | undefined,
): string => {
	const clientId = policyScope?.clientId;

	if ("string" === typeof clientId) {
		return FilterScopeMatch.Exact === scopeMatch
			? `@clientId:{${clientId}}`
			: `( @clientId:{${clientId}} | ismissing(@clientId) )`;
	}

	return FilterScopeMatch.Exact === scopeMatch ? "ismissing(@clientId)" : "";
};

/*
 * Search command example:
 *
 * ft.search index:test "( @clientId:{value} | ismissing(@clientId) )
 * (
 * ( @ip:[value] | ( @ipRangeMin:[-inf value] @ipRangeMax:[value +inf] ) ) |
 * @id:{value} | @ja4Fingerprint:{value} | headersFingerprint:{value}"
 * )
 * DIALECT 2 # must have when the ismissing() function in use
 * */
export const getRulesRedisQuery = (
	filter: AccessRulesFilter,
	matchingFieldsOnly: boolean,
): string => {
	const { policyScope, userScope } = filter;
	const queryParts = [];

	if (filter.groupId) {
		queryParts.push(`@groupId:{${filter.groupId}}`);
	}

	const policyScopeQuery = getPolicyScopeQuery(
		policyScope,
		filter.policyScopeMatch,
	);

	if (policyScopeQuery) {
		queryParts.push(policyScopeQuery);
	}

	if (userScope && Object.keys(userScope).length > 0) {
		const userScopeFilter = getUserScopeQuery(
			userScope,
			filter.userScopeMatch,
			matchingFieldsOnly,
		);

		queryParts.push(`( ${userScopeFilter} )`);
	}

	return queryParts.length > 0 ? queryParts.join(" ") : "*";
};
