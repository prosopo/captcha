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
import type {
	AccessPolicy,
	AccessPolicyScope,
	AccessRule,
} from "#policy/accessPolicy.js";
import type { AccessRulesReader } from "#policy/accessRules.js";

export type ResolveAccessPolicy = (
	policyScope: AccessPolicyScope,
	clientId?: string,
) => Promise<AccessPolicy | undefined>;

export const createAccessPolicyResolver = (
	accessRulesReader: AccessRulesReader,
	logger: Logger,
): ResolveAccessPolicy => {
	return async (
		policyScope: AccessPolicyScope,
		clientId?: string,
	): Promise<AccessPolicy | undefined> => {
		const accessRules = await accessRulesReader.findRules(
			policyScope,
			clientId,
		);

		const primaryAccessRule = resolvePrimaryAccessRule(accessRules);

		logger.debug("Resolved access policy", {
			policyScope: policyScope,
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
