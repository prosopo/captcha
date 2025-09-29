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

import crypto from "node:crypto";
import { CaptchaTypeSchema } from "@prosopo/types";
import { getIPAddress } from "@prosopo/util";
import { Address4 } from "ip-address";
import { type ZodType, z } from "zod";
import {
	type AccessRulesFilter,
	ScopeMatch,
} from "#policy/accessRulesStorage.js";
import {
	type AccessPolicy,
	AccessPolicyType,
	type AccessRule,
	type PolicyScope,
	type UserAttributes,
	type UserIp,
} from "#policy/rule.js";
import type {
	AccessRuleRecord,
	UserAttributesRecord,
	UserIpRecord,
} from "#policy/ruleRecord.js";

export const accessPolicyInput = z.object({
	type: z.nativeEnum(AccessPolicyType),
	captchaType: CaptchaTypeSchema.optional(),
	description: z.coerce.string().optional(),
	// Redis stores values as strings, so coerce is needed to parse properly
	solvedImagesCount: z.coerce.number().optional(),
	// the percentage of image panels that must be solved per image CAPTCHA
	imageThreshold: z.coerce.number().optional(),
	// the Proof-of-Work difficulty level
	powDifficulty: z.coerce.number().optional(),
	// the number of unsolved image CAPTCHA challenges to serve
	unsolvedImagesCount: z.coerce.number().optional(),
	// used to increase the user's score
	frictionlessScore: z.coerce.number().optional(),
}) satisfies ZodType<AccessPolicy>;

export const policyScopeInput = z.object({
	clientId: z.coerce.string().optional(),
}) satisfies ZodType<PolicyScope>;

export type UserAttributesInput = UserAttributes & UserAttributesRecord;

const userAttributesInput = z
	.object({
		// coerce is used for safety, as e.g., incoming userId can be digital
		userId: z.coerce.string().optional(),
		ja4Hash: z.coerce.string().optional(),
		headersHash: z.coerce.string().optional(),
		userAgent: z.coerce.string().optional(),
		userAgentHash: z.coerce.string().optional(),
	})
	.transform((userAttributesInput: UserAttributesInput): UserAttributes => {
		// this line creates a new "userAttributes", without userAgent
		const { userAgent, ...userScope } = userAttributesInput;

		if ("string" === typeof userAgent) {
			userScope.userAgentHash = hashUserAgent(userAgent);
		}

		return userScope;
	});

const hashUserAgent = (userAgent: string): string =>
	crypto.createHash("sha256").update(userAgent).digest("hex");

export type UserIpInput = UserIp & UserIpRecord;

const userIpInput = z
	.object({
		ip: z.string().optional(),
		ipMask: z.string().optional(),
		numericIp: z.coerce.bigint().optional(),
		numericIpMaskMin: z.coerce.bigint().optional(),
		numericIpMaskMax: z.coerce.bigint().optional(),
	})
	.transform((userIpInput: UserIpInput): UserIp => {
		// this line creates a new "userScope", without ip and ipMask
		const { ip, ipMask, ...numericUserIp } = userIpInput;

		if ("string" === typeof ip) {
			numericUserIp.numericIp = getIPAddress(ip).bigInt();
		}

		// Assuming ipMask is already validated to be a string in CIDR format
		if ("string" === typeof ipMask) {
			// Create an Address4 object from the CIDR string.
			// Address4 automatically understands CIDR notation and represents the entire network range.
			const ipObject = new Address4(ipMask);

			// The minimum IP in the CIDR range is the start address of the network.
			numericUserIp.numericIpMaskMin = ipObject.startAddress().bigInt();

			// The maximum IP in the CIDR range is the end address of the network.
			numericUserIp.numericIpMaskMax = ipObject.endAddress().bigInt();
		}

		return numericUserIp;
	});

export type UserScopeInput = UserAttributesInput & UserIpInput;

export const userScopeInput = z
	.object({})
	.and(userAttributesInput)
	.and(userIpInput)
	.transform(
		// transform is used for type safety only - plain "satisfies ZodType<x>" doesn't work after ".and()"
		(userScopeInput): UserScopeInput => userScopeInput,
	);

export type AccessRuleInput = AccessPolicy &
	PolicyScope &
	UserScopeInput & {
		groupId?: string;
		ruleGroupId?: string;
	};

export const accessRuleInput = z
	.object({
		...accessPolicyInput.shape,
		...policyScopeInput.shape,
		groupId: z.coerce.string().optional(),
		ruleGroupId: z.coerce.string().optional(),
	})
	.and(userScopeInput)
	.transform((ruleInput: AccessRuleInput): AccessRule => {
		// this line creates a new "rule", without ruleGroupId
		const { ruleGroupId, ...rule } = ruleInput;

		if ("string" === typeof ruleGroupId) {
			rule.groupId = ruleGroupId;
		}

		return rule;
	});

// this function applies all the Zod scheme transformations, so .userAgent becomes .userAgentHash and so on.
export const transformAccessRuleRecordIntoRule = (
	ruleRecord: AccessRuleRecord,
): AccessRule => accessRuleInput.parse(ruleRecord);

export type AccessRulesFilterInput = AccessRulesFilter & {
	userScope?: UserScopeInput;
};

export const accessRulesFilterInput = z.object({
	policyScope: policyScopeInput.optional(),
	policyScopeMatch: z.nativeEnum(ScopeMatch).default(ScopeMatch.Exact),
	userScope: userScopeInput.optional(),
	userScopeMatch: z.nativeEnum(ScopeMatch).default(ScopeMatch.Exact),
	groupId: z.string().optional(),
}) satisfies ZodType<AccessRulesFilter>;
