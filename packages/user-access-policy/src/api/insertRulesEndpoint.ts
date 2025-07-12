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
import { LogLevel, type Logger, getLogger } from "@prosopo/common";
import { z } from "zod";
import {
	accessPolicySchema,
	policyScopeSchema,
	userScopeInputSchema,
} from "#policy/accessPolicy.js";
import type { AccessRulesWriter } from "#policy/accessRules.js";

export const insertRulesEndpointSchema: z.ZodType<{
	accessPolicy: z.infer<typeof accessPolicySchema>;
	policyScope?: z.infer<typeof policyScopeSchema>;
	userScopes: z.input<typeof userScopeInputSchema>[];
	expirationTimestamp?: number;
}> = z.object({
	accessPolicy: accessPolicySchema,
	policyScope: policyScopeSchema.optional(),
	userScopes: z.array(userScopeInputSchema),
	expirationTimestampSeconds: z
		.number()
		.optional()
		.transform((val) => (val !== undefined ? Math.floor(val) : val)),
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
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger || getLogger(LogLevel.enum.info, "InsertRulesEndpoint");

		const timeoutPromise = new Promise<ApiEndpointResponse>((resolve) => {
			setTimeout(() => {
				resolve({
					status: ApiEndpointResponseStatus.PROCESSING,
				});
			}, 5000);
		});

		const createRulesPromise = this.createRules(args)
			.then(() => ({
				status: ApiEndpointResponseStatus.SUCCESS,
			}))
			.catch((error) => {
				if (logger?.getLogLevel() === LogLevel.enum.debug) {
					logger.error(() => ({
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

	public getRequestArgsSchema(): InsertRulesEndpointSchema {
		return insertRulesEndpointSchema;
	}

	protected async createRules(
		args: InsertManyRulesEndpointOutputSchema,
	): Promise<string[]> {
		const policyScope = args.policyScope || {};

		const createPromises = [];
		for (const userScope of args.userScopes) {
			const rule = {
				...args.accessPolicy,
				...policyScope,
				...userScope,
			};

			createPromises.push(
				this.accessRulesWriter.insertRule(rule, args.expirationTimestamp),
			);
		}
		return Promise.all(createPromises);
	}
}
