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
import { AdminApiPaths } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { Tasks } from "../../tasks/index.js";
import type { Route } from "../interfaces/route/route.js";
import type { RoutesProvider } from "../interfaces/route/routesProvider.js";
import { DeleteManyUserAccessRulesEndpoint } from "./endpoints/deleteManyUserAccessRulesEndpoint.js";
import { InsertManyUserAccessRulesEndpoint } from "./endpoints/insertManyUserAccessRulesEndpoint.js";
import { RegisterSiteKeyEndpoint } from "./endpoints/registerSiteKeyEndpoint.js";

class RoutesAdminProvider implements RoutesProvider {
	public getRoutes(providerEnvironment: ProviderEnvironment): Route[] {
		const tasks = new Tasks(providerEnvironment);
		const userAccessRulesStorage = providerEnvironment
			.getDb()
			.getUserAccessRulesStorage();

		return [
			{
				path: AdminApiPaths.SiteKeyRegister,
				endpoint: new RegisterSiteKeyEndpoint(tasks.clientTaskManager),
			},
			{
				path: AdminApiPaths.UserAccessPolicyInsertManyRules,
				endpoint: new InsertManyUserAccessRulesEndpoint(userAccessRulesStorage),
			},
			{
				path: AdminApiPaths.UserAccessPolicyDeleteManyRules,
				endpoint: new DeleteManyUserAccessRulesEndpoint(userAccessRulesStorage),
			},
		];
	}
}

export { RoutesAdminProvider };
