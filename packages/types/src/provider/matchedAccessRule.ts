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

import { array, boolean, literal, object, string, union } from "zod";
import { type CaptchaType, CaptchaTypeSchema } from "../client/index.js";

// Lives here rather than in @prosopo/user-access-policy because the Session
// schema (below in database.ts) needs it, and user-access-policy already
// depends on @prosopo/types — the reverse edge would be a package cycle.
// `describeMatchedRule` in @prosopo/user-access-policy is the only producer.

export const MatchedRuleConditionSchema = object({
	// A `UserScopeRecordField` from @prosopo/user-access-policy — kept as a
	// plain string here to avoid the package cycle. The producer only ever
	// emits values from `userScopeRecordFields`, and every consumer treats an
	// unrecognised field as a raw label, so nothing depends on the narrowing.
	field: string(),
	value: string(),
	// Set when `value` was clipped (a `coords` polygon serialises unbounded),
	// so the UI can say "truncated" rather than imply an exact match.
	truncated: boolean().optional(),
});

export type MatchedRuleCondition = {
	field: string;
	value: string;
	truncated?: boolean;
};

/**
 * The access rule that actually fired, denormalised onto the record it acted
 * on.
 *
 * Access rules are ephemeral — client rules carry a TTL (the anomaly jobs
 * default to 24h) and are reaped by Mongo's `expiry` index — so an audit row
 * cannot answer "which policy blocked me?" by joining to the live rules
 * collection: by the time anyone looks, the rule is usually gone. Storing the
 * matched rule's own content at enforcement time is what makes the answer
 * survive. `ruleGroupId` is the join key back to the portal's Access Control
 * page for the rules that DO still exist.
 */
export const MatchedAccessRuleSchema = object({
	ruleHash: string(),
	policyType: union([literal("block"), literal("restrict"), literal("allow")]),
	conditions: array(MatchedRuleConditionSchema),
	description: string().optional(),
	captchaType: CaptchaTypeSchema.optional(),
	deferToVerify: boolean().optional(),
	ruleGroupId: string().optional(),
	// Absent for global (Prosopo-wide) rules; the siteKey for client rules.
	clientId: string().optional(),
});

export type MatchedAccessRule = {
	ruleHash: string;
	// "allow" fires the authenticated-session fast-path in the frictionless
	// flow — see AccessPolicyType in @prosopo/user-access-policy.
	policyType: "block" | "restrict" | "allow";
	conditions: MatchedRuleCondition[];
	description?: string;
	captchaType?: CaptchaType;
	deferToVerify?: boolean;
	ruleGroupId?: string;
	clientId?: string;
};
