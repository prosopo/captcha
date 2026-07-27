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
//
// The `superRefine` rejects Block+captchaType and Block+solvedImagesCount
// at write time. Those fields are meaningless on a Block policy — the
// sanitizer used to silently strip them, which meant operators writing
// e.g. "block image captchas for this IP" got a rule that actually
// blocked EVERY captcha type. The bug in #2885 (Block+deferToVerify 400
// on every /captcha/*) was a knock-on of the same silent-strip: the
// captchaType-equality check on the read side compared `undefined` to the
// request's captchaType and rejected. Rejecting at input surfaces the
// mismatch loudly so operators can adjust their intent (they usually
// wanted a Restrict) rather than persisting a rule that doesn't match
// what they typed.
// Base ZodObject shape — reused via `.shape` by `ruleInput` and
// `transformRule` (both compose accessPolicyInput's fields with policy /
// user scope fields via object spread). Split from `accessPolicyInput`
// below because that one applies a `.superRefine` and returns a
// `ZodEffects`, which loses `.shape`.
export const accessPolicyInputShape = z.object({
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

export const accessPolicyInput = accessPolicyInputShape.superRefine(
	(policy, ctx) => {
		if (policy.type !== AccessPolicyType.Block) return;
		if (policy.captchaType !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["captchaType"],
				message:
					"Block policies cannot pin a captchaType — Block always applies to every captcha type. Use a Restrict policy if you want to narrow the effect to one captcha type.",
			});
		}
		if (policy.solvedImagesCount !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["solvedImagesCount"],
				message:
					"Block policies cannot set solvedImagesCount — the field only applies to Restrict policies that adjust image-captcha rounds.",
			});
		}
	},
);

// Historical helper: strip fields the sanitizer used to remove silently.
// Kept as a no-op-in-practice safety net because Redis records written
// before the superRefine on `accessPolicyInput` (above) may still carry
// the stripped fields — reading them back should still normalize to the
// canonical shape. New writes are rejected at input.
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
