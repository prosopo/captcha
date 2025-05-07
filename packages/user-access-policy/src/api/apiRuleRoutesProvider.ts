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

import type { ApiRoute, ApiRoutesProvider } from "@prosopo/api-route";
import type { AccessRulesWriter } from "#policy/rules/accessRules.js";
import { apiRulePaths } from "./apiRulePaths.js";
import { ApiDeleteManyRulesEndpoint } from "./deleteMany/apiDeleteManyRulesEndpoint.js";
import { ApiInsertManyRulesEndpoint } from "./insertMany/apiInsertManyRulesEndpoint.js";

class ApiRuleRoutesProvider implements ApiRoutesProvider {
	public constructor(private readonly accessRulesWriter: AccessRulesWriter) {}

	public getRoutes(): ApiRoute[] {
		return [
			{
				path: apiRulePaths.INSERT_MANY,
				endpoint: new ApiInsertManyRulesEndpoint(this.accessRulesWriter),
			},
			{
				path: apiRulePaths.DELETE_MANY,
				endpoint: new ApiDeleteManyRulesEndpoint(this.accessRulesWriter),
			},
		];
	}
}

export { ApiRuleRoutesProvider };
