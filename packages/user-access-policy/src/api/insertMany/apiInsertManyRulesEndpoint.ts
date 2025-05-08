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
import type { z } from "zod";
import type {
	AccessPolicy,
	PolicyScope,
	UserScope,
} from "#policy/accessPolicy.js";
import type { AccessRulesWriter } from "#policy/accessRules.js";
import {
	type ApiInsertManyRulesArgsSchema,
	apiInsertManyRulesArgsSchema,
} from "./apiInsertManyRulesArgsSchema.js";

class ApiInsertManyRulesEndpoint
	implements ApiEndpoint<ApiInsertManyRulesArgsSchema>
{
	public constructor(private readonly accessRulesWriter: AccessRulesWriter) {}

	async processRequest(
		args: z.infer<ApiInsertManyRulesArgsSchema>,
	): Promise<ApiEndpointResponse> {
		return new Promise((resolve) => {
			// either return after 5s or when the rules are inserted or fail to insert
			setTimeout(() => {
				resolve({
					status: ApiEndpointResponseStatus.PROCESSING,
				});
			}, 5000);

			const policyScope = args.policyScope || {};

			this.createRules(args.policy, policyScope, args.userScopes)
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

	public getRequestArgsSchema(): ApiInsertManyRulesArgsSchema {
		return apiInsertManyRulesArgsSchema;
	}

	protected async createRules(
		accessPolicy: AccessPolicy,
		policyScope: PolicyScope,
		userScopes: UserScope[],
	): Promise<void> {
		for (const userScope of userScopes) {
			await this.accessRulesWriter.insertRule({
				...accessPolicy,
				...policyScope,
				...userScope,
			});
		}
	}
}

export { ApiInsertManyRulesEndpoint };
