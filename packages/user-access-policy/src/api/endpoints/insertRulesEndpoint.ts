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
import { LogLevel, type Logger } from "@prosopo/common";
import { type ZodType, z } from "zod";
import { type AccessPolicy, accessPolicySchema } from "#policy/accessPolicy.js";
import type { AccessRule } from "#policy/accessRule.js";
import type { AccessRulesWriter } from "#policy/accessRulesStorage.js";
import { type PolicyScope, policyScopeSchema } from "#policy/policyScope.js";
import {
	type UserScope,
	userScopeSchema,
} from "#policy/userScope/userScope.js";

export type InsertRulesGroup = {
	accessPolicy: AccessPolicy;
	policyScope?: PolicyScope;
	groupId?: string;
	userScopes: UserScope[];
	expirationTimestamp?: number;
};

type InsertRulesSchema = ZodType<InsertRulesGroup>;

export class InsertRulesEndpoint implements ApiEndpoint<InsertRulesSchema> {
	public constructor(
		private readonly accessRulesWriter: AccessRulesWriter,
		private readonly logger: Logger,
	) {}

	public getRequestArgsSchema(): InsertRulesSchema {
		return z.object({
			accessPolicy: accessPolicySchema,
			policyScope: policyScopeSchema.optional(),
			groupId: z.string().optional(),
			userScopes: z.array(userScopeSchema),
			expirationTimestamp: z
				.number()
				.optional()
				.transform((val) => (val !== undefined ? Math.floor(val) : val)),
		});
	}

	async processRequest(args: InsertRulesGroup): Promise<ApiEndpointResponse> {
		const timeoutPromise = new Promise<ApiEndpointResponse>((resolve) => {
			setTimeout(() => {
				resolve({
					status: ApiEndpointResponseStatus.PROCESSING,
				});
			}, 5000);
		});

		const createRulesPromise = this.createRules(args)
			.then(() => {
				this.logger.info(() => ({
					msg: "Endpoint inserted access rules",
					data: { args },
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

	protected async createRules(args: InsertRulesGroup): Promise<string[]> {
		const policyScope = args.policyScope || {};

		const createPromises = [];
		for (const userScope of args.userScopes) {
			const rule: AccessRule = {
				...args.accessPolicy,
				...policyScope,
				...userScope,
				...(args.groupId ? { groupId: args.groupId } : {}),
			};

			createPromises.push(
				this.accessRulesWriter.insertRule(rule, args.expirationTimestamp),
			);
		}
		return Promise.all(createPromises);
	}
}
