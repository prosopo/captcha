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

import type { MatchedAccessRule, MatchedRuleCondition } from "@prosopo/types";
import type { AccessRule } from "#policy/rule.js";
import {
	type UserScopeRecordField,
	getUserScopeRecordFromAccessRuleRecord,
	userScopeRecordFields,
} from "#policy/ruleRecord.js";
import {
	makeAccessRuleHash,
	transformAccessRuleIntoRecord,
} from "#policy/transformRule.js";

// A `coords` polygon serialises to an unbounded JSON string. The audit UI only
// needs enough to recognise the rule, and the snapshot is copied onto every
// record the rule acts on, so cap it rather than dragging kilobytes through
// Mongo on each blocked request.
const MAX_CONDITION_VALUE_LENGTH = 256;

const toCondition = (
	field: UserScopeRecordField,
	value: unknown,
): MatchedRuleCondition | undefined => {
	if (value === undefined || value === null) return undefined;
	// `asn` is a number on the rule; every other scope field is a string.
	const asString = typeof value === "string" ? value : String(value);
	if (asString.length === 0) return undefined;
	return asString.length > MAX_CONDITION_VALUE_LENGTH
		? {
				field,
				value: `${asString.slice(0, MAX_CONDITION_VALUE_LENGTH)}…`,
				truncated: true,
			}
		: { field, value: asString };
};

/**
 * Derive the rule's populated scope fields in record form.
 *
 * Goes through `transformAccessRuleIntoRecord` so the IP triple collapses back
 * to the human-readable `ip` / `ipMask` the operator originally typed, rather
 * than the numeric range the matcher works in, and so the field names match
 * the vocabulary the portal's Access Control page already labels conditions
 * with (`ip`, `ipMask`, `userAgent`, `ja4Hash`, …).
 */
const deriveConditions = (rule: AccessRule): MatchedRuleCondition[] => {
	let scope: Partial<Record<UserScopeRecordField, unknown>>;
	try {
		scope = getUserScopeRecordFromAccessRuleRecord(
			transformAccessRuleIntoRecord(rule),
		);
	} catch {
		// Never let audit bookkeeping break enforcement. A rule shape the
		// record transform rejects (or an IP range cidr-calc can't express)
		// still blocks — it just describes itself without conditions.
		return [];
	}

	const conditions: MatchedRuleCondition[] = [];
	for (const field of userScopeRecordFields) {
		const condition = toCondition(field, scope[field]);
		if (condition) {
			conditions.push(condition);
		}
	}
	return conditions;
};

/**
 * Snapshot a matched rule for persistence alongside the request it acted on.
 *
 * Total function: every rule shape yields a value, so callers can inline it
 * into a record literal without a try/catch of their own.
 */
export const describeMatchedRule = (rule: AccessRule): MatchedAccessRule => ({
	ruleHash: makeAccessRuleHash(rule),
	policyType: rule.type,
	conditions: deriveConditions(rule),
	...(rule.description !== undefined && { description: rule.description }),
	...(rule.captchaType !== undefined && { captchaType: rule.captchaType }),
	...(rule.deferToVerify !== undefined && {
		deferToVerify: rule.deferToVerify,
	}),
	...(rule.groupId !== undefined && { ruleGroupId: rule.groupId }),
	...(rule.clientId !== undefined && { clientId: rule.clientId }),
});
