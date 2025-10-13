// Copyright 2021-2025 Prosopo (UK) Ltd.
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
	policyScope?: PolicyScope;
	userScopes: UserScopeInput[];
	groupId?: string;
	expiresUnixTimestamp?: number;
};

type ParsedInsertRulesGroup = InsertRulesGroup & {
	userScopes: UserScope[];
};

type InsertRulesSchema = ZodType<InsertRulesGroup>;

export class InsertRulesEndpoint implements ApiEndpoint<InsertRulesSchema> {
	public constructor(
		private readonly accessRulesWriter: AccessRulesWriter,
		private readonly logger: Logger,
	) {}

	public getRequestArgsSchema(): InsertRulesSchema {
		return z.object({
			accessPolicy: accessPolicyInput,
			policyScope: policyScopeInput.optional(),
			groupId: z.string().optional(),
			userScopes: z.array(userScopeInput),
			expiresUnixTimestamp: z.number().optional(),
		} satisfies AllKeys<InsertRulesGroup>);
	}

	async processRequest(
		args: ParsedInsertRulesGroup,
	): Promise<ApiEndpointResponse> {
		const timeoutPromise = new Promise<ApiEndpointResponse>((resolve) => {
			setTimeout(() => {
				resolve({
					status: ApiEndpointResponseStatus.PROCESSING,
				});
			}, 5000);
		});

		const createRulesPromise = this.createRules(args)
			.then((insertedIds) => {
				this.logger.info(() => ({
					msg: "Endpoint inserted access rules",
					data: {
						userScopesCount: args.userScopes.length,
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

	protected async createRules(args: ParsedInsertRulesGroup): Promise<string[]> {
		const policyScope = args.policyScope || {};

		const ruleEntries: AccessRuleEntry[] = [];

		for (const userScope of args.userScopes) {
			const rule: AccessRule = {
				...args.accessPolicy,
				...policyScope,
				...userScope,
				...(args.groupId ? { groupId: args.groupId } : {}),
			};

			ruleEntries.push({
				rule: rule,
				expiresUnixTimestamp: args.expiresUnixTimestamp,
			});
		}

		return this.accessRulesWriter.insertRules(ruleEntries);
	}
}
