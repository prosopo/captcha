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
import type { Logger } from "@prosopo/common";
import { type ZodType, z } from "zod";
import type { AccessRule } from "#policy/rule.js";
import { accessRuleInput } from "#policy/ruleInput/ruleInput.js";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";

export type GetRulesOptions = {
	ids: string[];
};

type GetRulesSchema = ZodType<GetRulesOptions>;

export type GetRulesResponse = {
	rules: AccessRule[];
};

export const rulesResponse: ZodType<GetRulesResponse> = z.object({
	rules: accessRuleInput.array(),
});

export type GetRulesEndpointResponse = ApiEndpointResponse & {
	data?: GetRulesResponse;
};

export class GetRulesEndpoint implements ApiEndpoint<GetRulesSchema> {
	public constructor(
		private readonly accessRulesStorage: AccessRulesStorage,
		private readonly logger: Logger,
	) {}

	public getRequestArgsSchema(): GetRulesSchema {
		return z.object({
			ids: z.string().array(),
		});
	}

	async processRequest(
		args: GetRulesOptions,
	): Promise<GetRulesEndpointResponse> {
		const rules: AccessRule[] = [];

		for (const ruleId of args.ids) {
			const rule = await this.accessRulesStorage.fetchRule(ruleId);

			if (rule) {
				rules.push(rule);
			}
		}

		this.logger.info(() => ({
			msg: "Endpoint fetched rules",
			data: {
				requestedCount: args.ids.length,
				foundCount: rules.length,
			},
		}));

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: {
				rules,
			},
		};
	}
}
