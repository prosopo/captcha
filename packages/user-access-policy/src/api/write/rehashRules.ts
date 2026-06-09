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
import type { Logger } from "@prosopo/logger";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";

export class RehashRulesEndpoint implements ApiEndpoint<undefined> {
	public constructor(
		private readonly accessRulesStorage: AccessRulesStorage,
		private readonly logger: Logger,
	) {}

	public getRequestArgsSchema(): undefined {}

	async processRequest(logger?: Logger): Promise<ApiEndpointResponse> {
		const log = logger ?? this.logger;
		await this.accessRulesStorage.fetchAllRuleIds(async (ruleIds: string[]) => {
			log.info(() => ({
				msg: "Fetched rule ids batch",
				data: {
					count: ruleIds.length,
					ruleIds,
				},
			}));

			const ruleEntries = await this.accessRulesStorage.fetchRules(ruleIds);

			log.info(() => ({
				msg: "Fetched rules",
				data: {
					count: ruleEntries.length,
				},
			}));

			if (ruleEntries.length !== ruleIds.length) {
				log.warn(() => ({
					msg: "Fetched rules count is not equal to the requested count",
					data: {
						fetchedCount: ruleEntries.length,
						requestedCount: ruleIds.length,
					},
				}));
			}

			await this.accessRulesStorage.deleteRules(ruleIds);

			log.info(() => ({
				msg: "Deleted rules",
				data: {
					count: ruleIds.length,
				},
			}));

			await this.accessRulesStorage.insertRules(ruleEntries);

			log.info(() => ({
				msg: "Inserted rules",
				data: {
					count: ruleEntries.length,
				},
			}));
		});

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: {},
		};
	}
}
