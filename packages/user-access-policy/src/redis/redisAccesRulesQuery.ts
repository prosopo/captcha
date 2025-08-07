import type {AccessRule} from "#policy/accessRules.js";
import {type PolicyFilter, ScopeMatch} from "#policy/accessPolicyResolver.js";
import {type PolicyScope, type UserScope, userScopeSchema} from "#policy/accessPolicy.js";
import {numericIndexFields} from "#policy/redis/redisAccessRulesIndex.js";

type CustomFieldComparisons = Record<
    keyof AccessRule,
    (value: unknown, scope: { [key in keyof AccessRule]: unknown }) => string
>;

const greedyFieldComparisons: Partial<CustomFieldComparisons> = {
    numericIp: (value, scope) => {
        if (value !== undefined) {
            return `( @numericIp:[${value}] | ( @numericIpMaskMin:[-inf ${value}] @numericIpMaskMax:[${value} +inf] ) )`;
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
export const getRedisAccessRulesQuery = (
    filter: PolicyFilter,
    matchingFieldsOnly: boolean,
): string => {
    const { policyScope, userScope } = filter;
    const queryParts=[];

    const policyScopeQuery = getPolicyScopeQuery(
        policyScope,
        filter.policyScopeMatch,
    );

    if(policyScopeQuery){
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

    return queryParts.length>0 ? queryParts.join(" ") : "*";
};

const getPolicyScopeQuery = (
    policyScope: PolicyScope | undefined,
    scopeMatchType: ScopeMatch | undefined,
): string => {
    const policyScopeFields: (keyof PolicyScope)[] = ["clientId", "groupId"];

   return policyScopeFields.map(scopeField =>
        getPolicyScopeFieldQuery(scopeField,policyScope?.[scopeField], scopeMatchType))
        .join(" ")
       .trim()
};

const getPolicyScopeFieldQuery = (
    fieldName: keyof PolicyScope,
    fieldValue: string | undefined,
    scopeMatchType: ScopeMatch | undefined,
): string => {
    if ("string" === typeof fieldValue) {
        return ScopeMatch.Exact === scopeMatchType
            ? `@${fieldName}:{${fieldValue}}`
            : `( @${fieldName}:{${fieldValue}} | ismissing(@${fieldName}) )`;
    }

    return ScopeMatch.Exact === scopeMatchType ? `ismissing(@${fieldName})` : "";
};

const getUserScopeQuery = (
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
                scopeMatchType,
                scopeObj,
            ),
        )
        .filter(Boolean)
        .join(scopeJoinType);
};

const getUserScopeFieldQuery = (
    fieldName: keyof UserScope,
    fieldValue: unknown,
    matchType: ScopeMatch | undefined,
    fullScope: Partial<UserScope>, // <-- NEW ARG
): string => {
    if ("function" === typeof greedyFieldComparisons[fieldName]) {
        return greedyFieldComparisons[fieldName](fieldValue, fullScope);
    }

    if (fieldValue === undefined) {
        return `ismissing(@${fieldName})`;
    }

    return numericIndexFields.includes(fieldName)
        ? `@${fieldName}:[${fieldValue}]`
        : `@${fieldName}:{${fieldValue}}`;
};