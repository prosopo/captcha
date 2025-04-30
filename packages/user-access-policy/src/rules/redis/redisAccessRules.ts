import type { AccessRule } from "../accessRule.js";
import type { RedisClientType } from "redis";
import type { AccessRulesReader, AccessRulesWriter } from "../accessRules.js";

export const createAccessRulesReader = (
	redisClient: RedisClientType,
): AccessRulesReader => {
	// todo.

	return {
		findRules: (filters: Partial<AccessRule>): Promise<AccessRule[]> => {
			return Promise.resolve([]);
		},

		countRules: (): Promise<number> => {
			return Promise.resolve(0);
		},
	};
};

export const createAccessRulesWriter = (
	redisClient: RedisClientType,
): AccessRulesWriter => {
	// todo.

	return {
		insertRules: (records: AccessRule[]): Promise<string[]> => {
			return Promise.resolve([]);
		},

		deleteRules: (filters: Partial<AccessRule>): Promise<void> => {
			return Promise.resolve(undefined);
		},
	};
};
