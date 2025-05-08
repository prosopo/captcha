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

import type { Logger } from "@prosopo/common";
import { z } from "zod";
import {
	type AccessPolicy,
	accessPolicyScopeSchema,
	userScopeSchema,
} from "#policy/accessPolicy.js";
import type { AccessRule, AccessRulesReader } from "#policy/accessRules.js";

export enum AccessPolicyMatch {
	EXACT = "exact",
	GREEDY = "greedy",
}

export const accessPolicyFilterSchema = z.object({
	policyScope: accessPolicyScopeSchema.optional(),
	/**
	 * exact: "clientId" => client rules, "undefined" => global rules. Used by the API
	 * greedy: "clientId" => client + global rules, "undefined" => any rules. Used by the Express middleware
	 */
	policyScopeMatch: z
		.nativeEnum(AccessPolicyMatch)
		.default(AccessPolicyMatch.EXACT)
		.optional(),
	userScope: userScopeSchema.optional(),
	/**
	 * exact: finds rules where all the given fields matches. Used by the API
	 * greedy: finds rules where any of the given fields match. Used by the Express middleware
	 */
	userScopeMatch: z
		.nativeEnum(AccessPolicyMatch)
		.default(AccessPolicyMatch.EXACT)
		.optional(),
});

export type AccessPolicyFilter = z.infer<typeof accessPolicyFilterSchema>;

export type ResolveAccessPolicy = (
	filter: AccessPolicyFilter,
) => Promise<AccessPolicy | undefined>;

export const createAccessPolicyResolver = (
	accessRulesReader: AccessRulesReader,
	logger: Logger,
): ResolveAccessPolicy => {
	return async (
		filter: AccessPolicyFilter,
	): Promise<AccessPolicy | undefined> => {
		const accessRules = await accessRulesReader.findRules(filter);

		const primaryAccessRule = resolvePrimaryAccessRule(accessRules);

		logger.debug("Resolved access policy", {
			filter: filter,
			accessRules: accessRules,
			primaryAccessRule: primaryAccessRule,
		});

		return primaryAccessRule;
	};
};

const resolvePrimaryAccessRule = (
	accessRules: AccessRule[],
): AccessRule | undefined => {
	const clientRules = accessRules.filter(
		(accessRule) => "string" === typeof accessRule.clientId,
	);
	const globalRules = accessRules.filter(
		(accessRule) => undefined === accessRule.clientId,
	);

	return clientRules.length > 0 ? clientRules.shift() : globalRules.shift();
};
