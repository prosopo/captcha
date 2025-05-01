import type { AccessRule } from "./accessRule.js";
import type { AccessPolicyScope } from "../accessPolicy.js";

export type AccessRulesReader = {
	findRules(policyScope: AccessPolicyScope): Promise<AccessRule[]>;

	countRules(): Promise<number>;
};

export type AccessRulesWriter = {
	insertRules(rules: AccessRule[]): Promise<string[]>;

	deleteRules(policyScope: AccessPolicyScope): Promise<void>;
};
