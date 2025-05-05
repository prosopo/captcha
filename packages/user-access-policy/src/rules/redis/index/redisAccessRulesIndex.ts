import type {RedisClientType} from "redis";
import {
    SCHEMA_FIELD_TYPE,
    type FtSearchOptions,
} from "@redis/search";
import type {AccessRule} from "../../accessRule.js";
import type {AccessPolicyScope} from "../../../accessPolicy.js";
import {createRedisIndex, type RedisIndex} from "./redisIndex.js";

const accessRulesIndex: RedisIndex = {
    name: "index:user-access-rules",
    /**
     * Note on the field type decision
     *
     * TAG is designed for the exact value matching
     * TEXT is designed for the word-based and pattern matching
     *
     * For our goal TAG fits perfectly and, more performant
     */
    schema: {
        clientId: {
            type: SCHEMA_FIELD_TYPE.TAG,
            // necessary to make possible use of the ismissing() function on this field in the search
            INDEXMISSING: true,
        },
        userId: SCHEMA_FIELD_TYPE.TAG,
        ip: SCHEMA_FIELD_TYPE.NUMERIC,
        ja4Hash: SCHEMA_FIELD_TYPE.TAG,
        headersHash: SCHEMA_FIELD_TYPE.TAG,
        userAgentHash: SCHEMA_FIELD_TYPE.TAG,
    } satisfies Partial<Record<keyof AccessRule, string | object>>,
    // the satisfy statement is to guarantee that the keys are right
    options: {
        ON: "HASH" as const,
        // index names take space, so we use an acronym instead of the long-tailed one
        PREFIX: "uar:",
    },
}


export const createAccessRulesIndex =
    async (client: RedisClientType): Promise<void> =>
        createRedisIndex(client, accessRulesIndex);

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
    const {clientId, userAttributes} = policyScope;

    const clientIdFilter =
        "string" === typeof clientId
            ? // when clientId is set, we look among his + "global" rules.
            `( @clientId:${clientId}) | ismissing(@clientId) )`
            : // when clientId is not set, we look among "global" only rules.
            "ismissing(@clientId)";

    if (userAttributes && Object.keys(userAttributes).length > 0) {
        const userAttributesFilter = Object.entries(userAttributes)
            .map(([field, value]) => getUserAttributeQuery(field, value))
            // to support a partial user attribute match join by the logical "OR"
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
