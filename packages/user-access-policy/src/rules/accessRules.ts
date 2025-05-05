import type { AccessPolicyScope } from "#policy/accessPolicy.js";
import type { AccessRule } from "#policy/rules/accessRule.js";

export type AccessRulesReader = {
	findRules(policyScope: AccessPolicyScope): Promise<AccessRule[]>;

	findRuleIds(policyScope: AccessPolicyScope): Promise<string[]>;
};

export type AccessRulesWriter = {
	insertRule(rule: AccessRule, expirationTimestamp?: number): Promise<void>;

	deleteRules(ruleIds: string[]): Promise<void>;

	deleteAllRules(): Promise<void>;
};
