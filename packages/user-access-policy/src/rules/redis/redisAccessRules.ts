import type { AccessRule } from "../accessRule.js";
import type { RedisClientType } from "redis";
import type { AccessRulesReader, AccessRulesWriter } from "../accessRules.js";
import type { AccessPolicyScope } from "../../accessPolicy.js";
import type { UserAttributes } from "../../userAttributes.js";

export const createRedisAccessRulesReader = (
	redisClient: RedisClientType,
): AccessRulesReader => {
	// todo.

	return {
		findRules: (policyScope: AccessPolicyScope): Promise<AccessRule[]> => {
			redisClient.ft.search("idx:user-access-policy:rules", "*");
		},

		countRules: (): Promise<number> => {
			return Promise.resolve(0);
		},
	};
};

export const createRedisAccessRulesWriter = (
	redisClient: RedisClientType,
): AccessRulesWriter => {
	// todo.

	return {
		insertRules: (rules: AccessRule[]): Promise<string[]> => {
			return Promise.resolve([]);
		},

		deleteRules: (policyScope: AccessPolicyScope): Promise<void> => {
			return Promise.resolve(undefined);
		},
	};
};

/*
 *
 * ft.dropindex index:test
 * FT.CREATE index:test
 * ON HASH
 * SCHEMA
 * clientId TAG INDEXMISSING
 * id TAG
 * ip NUMERIC
 * ja4Fingerprint TAG
 * headersFingerprint TAG
 *
 * ft.search index:test "(ismissing(@clientId) | @clientId:{value})
 * (@ip:[value] | (@ipRangeMin:[-inf value] @ipRangeMax:[value +inf]))
 * @id:{value} @ja4Fingerprint:{value} headersFingerprint:{value}"
 * DIALECT 2
 * */

const getPolicyScopeFilter = (policyScope: AccessPolicyScope): string => {
	const { clientId, userAttributes } = policyScope;

	const clientIdFilter =
		"string" === typeof clientId
			? // when clientId is set, we look among his + "global" rules.
				`( @clientId:${clientId}) | ismissing(@clientId) )`
			: // when clientId is not set, we look among "global" only rules.
				"ismissing(@clientId)";

	if (userAttributes && Object.keys(userAttributes).length > 0) {
		const userAttributesFilter = Object.entries(userAttributes)
			.map(([field, value]) => getUserAttributeFilter(field, value))
			// we support a partial user attribute match, so join by the logical "OR"
			.join(" | ");

		return `${clientIdFilter} ( ${userAttributesFilter} )`;
	}

	return clientIdFilter;
};

const getUserAttributeFilter = (field: string, value: unknown): string => {
	type SpecialFilterRecord = Record<string, (value: unknown) => string>;

	const specialFilters: SpecialFilterRecord = {
		ip: (value) =>
			`( @ip:[${value}] | ( @ipRangeMin:[-inf ${value}] @ipRangeMax:[${value} +inf] ) )`,
	};

	return "function" === typeof specialFilters[field]
		? specialFilters[field](value)
		: `@${field}:{${value}}`;
};
