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

export enum AccessPolicyType {
	Block = "1",
	Restrict = "2",
}

export enum AccessPolicyMatch {
	STRICT = "STRICT",
	PARTIAL = "PARTIAL",
}

export const accessPolicySchema = z.object({
	type: z.nativeEnum(AccessPolicyType),
	solvedImagesCount: z.number().optional(),
	unsolvedImagesCount: z.number().optional(),
	frictionlessScore: z.number().optional(),
});

export const userAccessAttributesSchema = z.object({
	userId: z.string().optional(),
	numericIp: z.string().optional(),
	ja4Hash: z.string().optional(),
	headersHash: z.string().optional(),
	userAgentHash: z.string().optional(),
});

export const accessPolicyScopeSchema = z
	.object({
		numericIpMaskMin: z.string().optional(),
		numericIpMaskMax: z.string().optional(),
	})
	.merge(userAccessAttributesSchema);

const accessRuleScopeSchema = z.object({
	clientId: z.string().optional(),
});

export const accessRuleSchema = z.object({
	// flat structure is used to fit the Redis requirements
	...accessPolicySchema.shape,
	...accessRuleScopeSchema.shape,
	...accessPolicyScopeSchema.shape,
});

export const accessRulesFilterSchema = z
	.object({
		ruleScopeMatch: z.nativeEnum(AccessPolicyMatch).optional(),
		policyScope: accessPolicyScopeSchema.optional(),
		policyScopeMatch: z.nativeEnum(AccessPolicyMatch).optional(),
	})
	.merge(accessRuleScopeSchema);

export type AccessPolicy = z.infer<typeof accessPolicySchema>;
export type UserAccessAttributes = z.infer<typeof userAccessAttributesSchema>;
export type AccessPolicyScope = z.infer<typeof accessPolicyScopeSchema>;
export type AccessRule = z.infer<typeof accessRuleSchema>;
export type AccessRulesFilter = z.infer<typeof accessRulesFilterSchema>;
