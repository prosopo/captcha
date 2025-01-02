import { AdminApiPaths } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { Tasks } from "../../tasks/index.js";
import type {RoutesProvider} from "../definition/route/routesProvider.js";
import type {Route} from "../definition/route/route.js";
import {RegisterSiteKeyEndpoint} from "./endpoints/registerSiteKeyEndpoint.js";

class RoutesAdminProvider implements RoutesProvider {
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

export { RoutesAdminProvider };
