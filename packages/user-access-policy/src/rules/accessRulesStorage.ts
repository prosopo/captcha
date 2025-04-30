import type { AccessRule } from "./accessRule.js";

export type AccessRulesReader = {
	findRules(filters: Partial<AccessRule>[]): Promise<AccessRule[]>;

	countRules(): Promise<number>;
};

export type AccessRulesWriter = {
	insertRules(records: AccessRule[]): Promise<string[]>;

	deleteRules(filters: Partial<AccessRule>[]): Promise<void>;
};

export type AccessRulesStorage = AccessRulesReader & AccessRulesWriter;
