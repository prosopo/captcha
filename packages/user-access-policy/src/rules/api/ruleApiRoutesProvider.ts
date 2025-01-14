// Copyright 2021-2024 Prosopo (UK) Ltd.
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

import type { ApiRoute } from "@api/route/apiRoute.js";
import type { ApiRoutesProvider } from "@api/route/apiRoutesProvider.js";
import { DeleteManyRulesApiEndpoint } from "@rules/api/deleteMany/deleteManyRulesApiEndpoint.js";
import { InsertManyRulesApiEndpoint } from "@rules/api/insertMany/insertManyRulesApiEndpoint.js";
import { ruleApiPaths } from "@rules/api/ruleApiPaths.js";
import type { RulesStorage } from "@rules/storage/rulesStorage.js";

class RuleApiRoutesProvider implements ApiRoutesProvider {
	public getRoutes(rulesStorage: RulesStorage): ApiRoute[] {
		return [
			{
				path: ruleApiPaths.INSERT_MANY,
				endpoint: new InsertManyRulesApiEndpoint(rulesStorage),
			},
			{
				path: ruleApiPaths.DELETE_MANY,
				endpoint: new DeleteManyRulesApiEndpoint(rulesStorage),
			},
		];
	}
}

export { RuleApiRoutesProvider };
