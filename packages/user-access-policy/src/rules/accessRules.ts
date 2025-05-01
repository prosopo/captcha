import type { AccessRule } from "./accessRule.js";
import type { AccessPolicyScope } from "../accessPolicy.js";

export type AccessRulesReader = {
	findRules(policyScope: AccessPolicyScope): Promise<AccessRule[]>;

	findRuleIds(policyScope: AccessPolicyScope): Promise<string[]>;
};

export type AccessRulesWriter = {
	insertRule(rule: AccessRule, expirationTimestamp?: number): Promise<void>;

	deleteRules(ruleIds: string[]): Promise<void>;
};
