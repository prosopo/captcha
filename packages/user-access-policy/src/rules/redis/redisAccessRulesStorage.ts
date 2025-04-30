import type { AccessRulesStorage } from "../accessRulesStorage.js";
import type { AccessRule } from "../accessRule.js";
import type { RedisClientType } from "redis";

const createRedisAccessRulesStorage = (
	redisClient: RedisClientType,
): AccessRulesStorage => {
	// todo.

	return {
		findRules: (filters: Partial<AccessRule>[]): Promise<AccessRule[]> => {
			return Promise.resolve([]);
		},

		countRules: (): Promise<number> => {
			return Promise.resolve(0);
		},

		insertRules: (records: AccessRule[]): Promise<string[]> => {
			return Promise.resolve([]);
		},

		deleteRules: (filters: Partial<AccessRule>[]): Promise<void> => {
			return Promise.resolve(undefined);
		},
	};
};
