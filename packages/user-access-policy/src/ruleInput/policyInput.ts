// Copyright 2021-2026 Prosopo (UK) Ltd.
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
import type { AllKeys } from "@prosopo/common";
import { CaptchaTypeSchema } from "@prosopo/types";
import { type ZodType, z } from "zod";
import {
	type AccessPolicy,
	AccessPolicyType,
	type PolicyScope,
} from "#policy/rule.js";

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
} satisfies AllKeys<AccessPolicy>) satisfies ZodType<AccessPolicy>;

// Sanitize block policies by removing captchaType and solvedImagesCount
export const sanitizeAccessPolicy = (policy: AccessPolicy): AccessPolicy => {
	if (policy.type === AccessPolicyType.Block) {
		const { captchaType, solvedImagesCount, ...blockPolicy } = policy;
		return blockPolicy;
	}
	return policy;
};

export const policyScopeInput = z.object({
	clientId: z.coerce.string().optional(),
} satisfies AllKeys<PolicyScope>) satisfies ZodType<PolicyScope>;
