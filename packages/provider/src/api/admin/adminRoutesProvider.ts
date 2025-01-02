import type { Route } from "../route/route.js";
import { AdminApiPaths } from "@prosopo/types";
import type { RoutesProvider } from "../route/routesProvider.js";
import type { ProviderEnvironment } from "@prosopo/env";
import { Tasks } from "../../tasks/index.js";
import { RegisterSiteKeyEndpoint } from "./endpoints/registerSiteKeyEndpoint.js";

class AdminRoutesProvider implements RoutesProvider {
	public getRoutes(providerEnvironment: ProviderEnvironment): Route[] {
		const tasks = new Tasks(providerEnvironment);

		return [
			{
				path: AdminApiPaths.SiteKeyRegister,
				endpoint: new RegisterSiteKeyEndpoint(tasks.clientTaskManager),
			},
			// todo UserAccessRuleEndpoint
		];
	}
}

export { AdminRoutesProvider };
