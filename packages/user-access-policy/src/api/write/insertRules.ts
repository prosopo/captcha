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

import {
	type ApiEndpoint,
	type ApiEndpointResponse,
	ApiEndpointResponseStatus,
} from "@prosopo/api-route";
import { type AllKeys, LogLevel, type Logger } from "@prosopo/common";
import { type ZodType, z } from "zod";
import type {
	AccessPolicy,
	AccessRule,
	PolicyScope,
	UserScope,
} from "#policy/rule.js";
import {
	accessPolicyInput,
	policyScopeInput,
} from "#policy/ruleInput/policyInput.js";
import {
	type UserScopeInput,
	userScopeInput,
} from "#policy/ruleInput/userScopeInput.js";
import type {
	AccessRuleEntry,
	AccessRulesWriter,
} from "#policy/rulesStorage.js";

export type InsertRulesGroup = {
	accessPolicy: AccessPolicy;
	userScopes: UserScopeInput[];
	// a single client may have multiple siteKeys,
	// so for batch requests we take multiple policyScopes as apply all the rules to every scope
	policyScopes?: PolicyScope[];
	groupId?: string;
	expiresUnixTimestamp?: number;
};

type ParsedInsertRulesGroup = InsertRulesGroup & {
	userScopes: UserScope[];
};

type ParsedInsertRuleGroups = ParsedInsertRulesGroup[];

type InsertRulesSchema = ZodType<InsertRulesGroup[]>;

export class InsertRulesEndpoint implements ApiEndpoint<InsertRulesSchema> {
	public constructor(
		private readonly accessRulesWriter: AccessRulesWriter,
		private readonly logger: Logger,
	) {}

	public getRequestArgsSchema(): InsertRulesSchema {
		return z.array(
			z.object({
				accessPolicy: accessPolicyInput,
				policyScopes: z.array(policyScopeInput).optional(),
				groupId: z.string().optional(),
				userScopes: z.array(userScopeInput),
				expiresUnixTimestamp: z.number().optional(),
			} satisfies AllKeys<InsertRulesGroup>),
		);
	}

	async processRequest(
		args: ParsedInsertRuleGroups,
	): Promise<ApiEndpointResponse> {
		const timeoutPromise = new Promise<ApiEndpointResponse>((resolve) => {
			setTimeout(() => {
				resolve({
					status: ApiEndpointResponseStatus.PROCESSING,
				});
			}, 5000);
		});

		const userScopesCount = args.reduce(
			(userScopesCount, group) => userScopesCount + group.userScopes.length,
			0,
		);

		const createRulesPromise = this.createRuleGroups(args)
			.then((insertedIds) => {
				this.logger.info(() => ({
					msg: "Endpoint inserted access rules",
					data: {
						userScopesCount: userScopesCount,
						insertedCount: insertedIds.length,
						uniqueIdsCount: new Set(insertedIds).size,
					},
				}));

				this.logger.debug(() => ({
					msg: "Inserted access rules details",
					data: {
						insertedIds,
						input: args,
					},
				}));

				return {
					status: ApiEndpointResponseStatus.SUCCESS,
				};
			})
			.catch((error) => {
				if (LogLevel.enum.debug === this.logger.getLogLevel()) {
					this.logger.error(() => ({
						err: error,
						data: { args },
						msg: "Failed to insert access rules",
					}));
				}
				return {
					status: ApiEndpointResponseStatus.FAIL,
				};
			});

		// Whichever finishes first: timeout or actual rule creation
		return Promise.race([timeoutPromise, createRulesPromise]);
	}

	protected async createRuleGroups(
		groups: ParsedInsertRuleGroups,
	): Promise<string[]> {
		const ruleIdPromises = groups.map((group) => this.createRulesGroup(group));

		const ruleIdSets = await Promise.all(ruleIdPromises);

		return ruleIdSets.flat();
	}

	protected async createRulesGroup(
		group: ParsedInsertRulesGroup,
	): Promise<string[]> {
		const ruleEntries: AccessRuleEntry[] = [];
		const policyScopes = group.policyScopes || [];

		for (const userScope of group.userScopes) {
			const ruleBase: AccessRule = {
				...group.accessPolicy,
				...userScope,
				...(group.groupId ? { groupId: group.groupId } : {}),
			};

			if (policyScopes.length > 0) {
				for (const policyScope of policyScopes) {
					ruleEntries.push({
						rule: {
							...ruleBase,
							...policyScope,
						},
					});
				}
			} else {
				ruleEntries.push({
					rule: ruleBase,
					expiresUnixTimestamp: group.expiresUnixTimestamp,
				});
			}
		}

		return this.accessRulesWriter.insertRules(ruleEntries);
	}
}
