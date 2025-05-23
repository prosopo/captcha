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
import { z } from "zod";
import {
	accessPolicySchema,
	policyScopeSchema,
	userScopeInputSchema,
} from "#policy/accessPolicy.js";
import type { AccessRulesWriter } from "#policy/accessRules.js";

export const insertRulesEndpointSchema: z.ZodType<{
	policy: z.infer<typeof accessPolicySchema>;
	policyScope?: z.infer<typeof policyScopeSchema>;
	userScopes: z.input<typeof userScopeInputSchema>[];
	expirationTimestampSeconds?: number;
}> = z.object({
	policy: accessPolicySchema,
	policyScope: policyScopeSchema.optional(),
	userScopes: z.array(userScopeInputSchema),
	expirationTimestampSeconds: z.number().optional(),
});

export type InsertRulesEndpointSchema = typeof insertRulesEndpointSchema;

export type InsertManyRulesEndpointInputSchema = z.input<
	typeof insertRulesEndpointSchema
>;

export type InsertManyRulesEndpointOutputSchema = z.output<
	typeof insertRulesEndpointSchema
>;

export class InsertRulesEndpoint
	implements ApiEndpoint<InsertRulesEndpointSchema>
{
	public constructor(private readonly accessRulesWriter: AccessRulesWriter) {}

	async processRequest(
		args: z.infer<InsertRulesEndpointSchema>,
	): Promise<ApiEndpointResponse> {
		return new Promise((resolve) => {
			// either return after 5s or when the rules are inserted or fail to insert
			setTimeout(() => {
				resolve({
					status: ApiEndpointResponseStatus.PROCESSING,
				});
			}, 5000);

			this.createRules(args)
				.then(() => {
					resolve({
						status: ApiEndpointResponseStatus.SUCCESS,
					});
				})
				.catch((e) => {
					resolve({
						status: ApiEndpointResponseStatus.FAIL,
					});
				});
		});
	}

	public getRequestArgsSchema(): InsertRulesEndpointSchema {
		return insertRulesEndpointSchema;
	}

	protected async createRules(
		args: InsertManyRulesEndpointOutputSchema,
	): Promise<void> {
		const policyScope = args.policyScope || {};

		for (const userScope of args.userScopes) {
			await this.accessRulesWriter.insertRule(
				{
					...args.policy,
					...policyScope,
					...userScope,
				},
				args.expirationTimestampSeconds,
			);
		}
	}
}
