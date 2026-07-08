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
import { z } from "zod";
import {
	type AccessPolicy,
	AccessPolicyType,
	GLOBAL_CLIENT_SCOPE_SENTINEL,
	type PolicyScope,
} from "#policy/rule.js";

// `satisfies ZodType<AccessPolicy>` is intentionally omitted: the
// `deferToVerify` preprocess widens the schema's input type to `unknown`
// (preprocess accepts anything), which fails the
// `ZodType<T, ZodTypeDef, T>` identity check. The `AllKeys<AccessPolicy>`
// constraint still catches missing-field regressions.
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
	// Skip the request-time block middleware and only fire at verify.
	// Redis stores booleans as strings — preprocess so "true"/"false"
	// round-trip to the JS boolean the matcher expects.
	deferToVerify: z
		.preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean())
		.optional(),
} satisfies AllKeys<AccessPolicy>);

// Sanitize block policies by removing captchaType and solvedImagesCount
export const sanitizeAccessPolicy = (policy: AccessPolicy): AccessPolicy => {
	if (policy.type === AccessPolicyType.Block) {
		const { captchaType, solvedImagesCount, ...blockPolicy } = policy;
		return blockPolicy;
	}
	return policy;
};

// `satisfies ZodType<PolicyScope>` is intentionally omitted (matches
// accessPolicyInput above): the `preprocess` wrapper widens the schema's
// input type to `unknown`, which fails the `ZodType<T, ZodTypeDef, T>`
// identity check. The `AllKeys<PolicyScope>` constraint still catches
// missing-field regressions.
export const policyScopeInput = z.object({
	// `getRedisRuleValue` stamps a sentinel string on global rules so the
	// read-time query can probe `@clientId:{global}` cheaply. Undo the
	// stamp here so consumers (rankCandidateRules, response payloads,
	// tests) continue to see `undefined` for global rules — the mongoose
	// side and the API input side never emit the sentinel.
	clientId: z.preprocess(
		(v) => (v === GLOBAL_CLIENT_SCOPE_SENTINEL ? undefined : v),
		z.coerce.string().optional(),
	),
} satisfies AllKeys<PolicyScope>);
