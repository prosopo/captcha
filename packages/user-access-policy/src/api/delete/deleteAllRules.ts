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
} from "../../../../cli/api-route/src/index.js";
import type { Logger } from "@prosopo/common";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";

export class DeleteAllRulesEndpoint implements ApiEndpoint<undefined> {
	public constructor(
		private readonly accessRulesStorage: AccessRulesStorage,
		private readonly logger: Logger,
	) {}

	public getRequestArgsSchema(): undefined {}

	async processRequest(): Promise<ApiEndpointResponse> {
		const deletedCount = await this.accessRulesStorage.deleteAllRules();

		this.logger.info(() => ({
			msg: "Endpoint deleted all access rules",
			data: { deletedCount },
		}));

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: {
				deleted_count: deletedCount,
			},
		};
	}
}
