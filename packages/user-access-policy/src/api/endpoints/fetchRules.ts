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
import type { AllKeys, Logger } from "@prosopo/common";
import { type ZodType, z } from "zod";
import { ruleEntryInput } from "#policy/ruleInput/ruleInput.js";
import type {
	AccessRuleEntry,
	AccessRulesStorage,
} from "#policy/rulesStorage.js";

export type FetchRulesOptions = {
	ids: string[];
};

type FetchRulesSchema = ZodType<FetchRulesOptions>;

export type FetchRulesResponse = {
	ruleEntries: AccessRuleEntry[];
};

export const fetchRulesResponse = z.object({
	ruleEntries: ruleEntryInput.array(),
} satisfies AllKeys<FetchRulesResponse>) satisfies ZodType<FetchRulesResponse>;

export type FetchRulesEndpointResponse = ApiEndpointResponse & {
	data?: FetchRulesResponse;
};

export class FetchRulesEndpoint implements ApiEndpoint<FetchRulesSchema> {
	public constructor(
		private readonly accessRulesStorage: AccessRulesStorage,
		private readonly logger: Logger,
	) {}

	public getRequestArgsSchema(): FetchRulesSchema {
		return z.object({
			ids: z.string().array(),
		} satisfies AllKeys<FetchRulesOptions>);
	}

	async processRequest(
		args: FetchRulesOptions,
	): Promise<FetchRulesEndpointResponse> {
		const rulesResponse: FetchRulesResponse = { ruleEntries: [] };

		for (const ruleId of args.ids) {
			const ruleFetchResult = await this.accessRulesStorage.fetchRule(ruleId);

			if (ruleFetchResult) {
				rulesResponse.ruleEntries.push({
					rule: ruleFetchResult.rule,
					expiresUnixTimestamp: ruleFetchResult.expiresUnixTimestamp,
				});
			}
		}

		this.logger.info(() => ({
			msg: "Endpoint fetched rules",
			data: {
				requestedCount: args.ids.length,
				foundCount: rulesResponse.ruleEntries.length,
			},
		}));

		this.logger.debug(() => ({
			msg: "Fetched rule details",
			data: {
				ruleEntries: rulesResponse.ruleEntries,
			},
		}));

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: rulesResponse,
		};
	}
}
