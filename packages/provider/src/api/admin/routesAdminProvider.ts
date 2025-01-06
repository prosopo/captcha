import { AdminApiPaths } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { Tasks } from "../../tasks/index.js";
import type { RoutesProvider } from "../interfaces/route/routesProvider.js";
import type { Route } from "../interfaces/route/route.js";
import { RegisterSiteKeyEndpoint } from "./endpoints/registerSiteKeyEndpoint.js";
import { AddUserAccessRuleEndpoint } from "./endpoints/addUserAccessRuleEndpoint.js";
import { RemoveUserAccessRuleEndpoint } from "./endpoints/removeUserAccessRuleEndpoint.js";

class RoutesAdminProvider implements RoutesProvider {
	public getRoutes(providerEnvironment: ProviderEnvironment): Route[] {
		const tasks = new Tasks(providerEnvironment);

		return [
			{
				path: AdminApiPaths.SiteKeyRegister,
				endpoint: new RegisterSiteKeyEndpoint(tasks.clientTaskManager),
			},
			{
				path: AdminApiPaths.UserAccessPolicyAddRule,
				endpoint: new AddUserAccessRuleEndpoint(),
			},
			{
				path: AdminApiPaths.UserAccessPolicyRemoveRule,
				endpoint: new RemoveUserAccessRuleEndpoint(),
			},
		];
	}
}

export { RoutesAdminProvider };
