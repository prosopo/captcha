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

import { ApiClient } from "@prosopo/api";
import type { ApiResponse } from "@prosopo/types";
import {
	type DeleteRulesEndpointSchemaInput,
	type InsertManyRulesEndpointInputSchema,
	accessRuleApiPaths,
} from "@prosopo/user-access-policy";

export class AccessRulesApiClient extends ApiClient {
	public insertMany(
		toInsert: InsertManyRulesEndpointInputSchema,
		timestamp: string,
		signature: string,
	): Promise<ApiResponse> {
		return this.post(accessRuleApiPaths.INSERT_MANY, toInsert, {
			headers: {
				"Prosopo-Site-Key": this.account,
				timestamp,
				signature,
			},
		});
	}

	public deleteMany(
		toDelete: DeleteRulesEndpointSchemaInput,
		timestamp: string,
		signature: string,
	): Promise<ApiResponse> {
		return this.post(accessRuleApiPaths.DELETE_MANY, toDelete, {
			headers: {
				"Prosopo-Site-Key": this.account,
				timestamp,
				signature,
			},
		});
	}

	public deleteAll(timestamp: string, signature: string): Promise<ApiResponse> {
		return this.post(
			accessRuleApiPaths.DELETE_ALL,
			{},
			{
				headers: {
					"Prosopo-Site-Key": this.account,
					timestamp,
					signature,
				},
			},
		);
	}
}
