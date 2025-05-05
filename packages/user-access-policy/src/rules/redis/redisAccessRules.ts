import { type AccessRule, accessRuleSchema } from "../accessRule.js";
import type { RedisClientType } from "redis";
import type { SearchReply } from "@redis/search";
import type { AccessRulesReader, AccessRulesWriter } from "../accessRules.js";
import type { AccessPolicyScope } from "../../accessPolicy.js";
import type { Logger } from "@prosopo/common";
import {
	getAccessRulesQuery,
	accessRulesSearchOptions,
} from "./index/redisAccessRulesIndex.js";

export const createAccessRulesReader = (
	client: RedisClientType,
	indexName: string,
	logger: Logger,
): AccessRulesReader => {
	return {
		findRules: async (
			policyScope: AccessPolicyScope,
		): Promise<AccessRule[]> => {
			const query = getAccessRulesQuery(policyScope);

			const searchReply = await client.ft.search(
				indexName,
				query,
				accessRulesSearchOptions,
			);

			const accessRules = extractRulesFromSearchReply(searchReply, logger);

			logger.debug("found access rules", {
				accessRules: accessRules,
				policyScope: policyScope,
				query: query,
			});

			return accessRules;
		},

		findRuleIds: async (policyScope: AccessPolicyScope): Promise<string[]> => {
			const query = getAccessRulesQuery(policyScope);

			const records = await client.ft.searchNoContent(
				indexName,
				query,
				accessRulesSearchOptions,
			);

			const ruleIds = records.documents;

			logger.debug("found access rule ids", {
				ruleIds: ruleIds,
				policyScope: policyScope,
				query: query,
			});

			return ruleIds;
		},
	};
};

export const createAccessRulesWriter = (
	client: RedisClientType,
	resolveRuleKey: (rule: AccessRule) => string,
): AccessRulesWriter => {
	return {
		insertRule: async (
			rule: AccessRule,
			expirationTimestamp?: number,
		): Promise<void> => {
			const ruleKey = resolveRuleKey(rule);

			await client.hSet(ruleKey, rule);

			if (expirationTimestamp) {
				await client.expireAt(ruleKey, expirationTimestamp);
			}
		},

		deleteRules: async (ruleIds: string[]): Promise<void> => {
			await client.del(ruleIds);
		},
	};
};

const extractRulesFromSearchReply = (
	searchReply: SearchReply,
	logger: Logger,
): AccessRule[] => {
	const accessRules: AccessRule[] = [];

	searchReply.documents.map((document) => {
		const parsedDocument = accessRuleSchema.safeParse(document);

		if (parsedDocument.success) {
			accessRules.push(parsedDocument.data);
		} else {
			logger.debug("failed to parse access rule", {
				document: document,
				error: parsedDocument.error,
			});
		}
	});

	return accessRules;
};
