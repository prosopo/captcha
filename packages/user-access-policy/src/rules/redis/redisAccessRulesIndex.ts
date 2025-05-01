import type { RedisClientType } from "redis";
import {
	SCHEMA_FIELD_TYPE,
	type RediSearchSchema,
	type FtSearchOptions,
} from "@redis/search";
import type { AccessRule } from "../accessRule.js";
import type { AccessPolicyScope } from "../../accessPolicy.js";

/*
 * Index command example:
 *
 * FT.CREATE index:test
 * ON HASH
 * SCHEMA
 * clientId TAG INDEXMISSING
 * id TAG
 * ip NUMERIC
 * ja4Fingerprint TAG
 * headersFingerprint TAG
 * */
export const createAccessRulesIndex = async (
	redisClient: RedisClientType,
	indexName: string,
	targetKeysPrefix: string,
): Promise<void> => {
	const schema: RediSearchSchema = {
		clientId: {
			type: SCHEMA_FIELD_TYPE.TAG,
			// necessary to make possible use of the ismissing() function on this field in the search
			INDEXMISSING: true,
		},
		id: SCHEMA_FIELD_TYPE.TAG,
		ip: SCHEMA_FIELD_TYPE.NUMERIC,
		ja4Fingerprint: SCHEMA_FIELD_TYPE.TAG,
		headersFingerprint: SCHEMA_FIELD_TYPE.TAG,
	} satisfies Partial<Record<keyof AccessRule, string | object>>;
	// satisfy is used to guarantee that the keys are right

	await redisClient.ft.create(indexName, schema, {
		ON: "HASH",
		PREFIX: targetKeysPrefix,
	});
};

export const dropAccessRulesIndex = async (
	redisClient: RedisClientType,
	indexName: string,
): Promise<void> => {
	await redisClient.ft.dropIndex(indexName);
};

export const accessRulesSearchOptions: FtSearchOptions = {
	// #2 is a required option when the 'ismissing()' function is in the query body
	DIALECT: 2,
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
export const getAccessRulesQuery = (policyScope: AccessPolicyScope): string => {
	const { clientId, userAttributes } = policyScope;

	const clientIdFilter =
		"string" === typeof clientId
			? // when clientId is set, we look among his + "global" rules.
				`( @clientId:${clientId}) | ismissing(@clientId) )`
			: // when clientId is not set, we look among "global" only rules.
				"ismissing(@clientId)";

	if (userAttributes && Object.keys(userAttributes).length > 0) {
		const userAttributesFilter = Object.entries(userAttributes)
			.map(([field, value]) => getUserAttributeQuery(field, value))
			// we support a partial user attribute match, so join by the logical "OR"
			.join(" | ");

		return `${clientIdFilter} ( ${userAttributesFilter} )`;
	}

	return clientIdFilter;
};

const getUserAttributeQuery = (field: string, value: unknown): string => {
	type CustomAttribute = Record<string, (value: unknown) => string>;

	const customAttributes: CustomAttribute = {
		ip: (value) =>
			`( @ip:[${value}] | ( @ipRangeMin:[-inf ${value}] @ipRangeMax:[${value} +inf] ) )`,
	};

	return "function" === typeof customAttributes[field]
		? customAttributes[field](value)
		: `@${field}:{${value}}`;
};
