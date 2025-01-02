import { AdminApiPaths } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { Tasks } from "../../tasks/index.js";
import { RegisterSiteKeyEndpoint } from "./endpoints/registerSiteKeyEndpoint.js";
import type {RoutesProvider} from "../routesProvider.js";
import type {Route} from "../route.js";

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
