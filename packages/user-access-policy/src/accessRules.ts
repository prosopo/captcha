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

import { z } from "zod";
import {
	accessPolicySchema,
	policyScopeSchema,
	userScopeSchema,
} from "#policy/accessPolicy.js";
import type { PolicyFilter } from "#policy/accessPolicyResolver.js";

export const accessRuleSchema = z.object({
	// flat structure is used to fit the Redis requirements
	...accessPolicySchema.shape,
	...policyScopeSchema.shape,
	...userScopeSchema.shape,
});

export type AccessRule = z.infer<typeof accessRuleSchema>;

export type AccessRulesReader = {
	findRules(filter: PolicyFilter): Promise<AccessRule[]>;

	findRuleIds(filter: PolicyFilter): Promise<string[]>;
};

export type AccessRulesWriter = {
	insertRule(
		rule: AccessRule,
		expirationTimestampSeconds?: number,
	): Promise<string>;

	deleteRules(ruleIds: string[]): Promise<void>;

	deleteAllRules(): Promise<void>;
};

export type AccessRulesStorage = AccessRulesReader & AccessRulesWriter;
