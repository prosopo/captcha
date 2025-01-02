import { AdminApiPaths } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { Tasks } from "../../tasks/index.js";
import { RegisterSiteKeyApiEndpoint } from "./endpoints/registerSiteKeyApiEndpoint.js";
import type {ApiRoutesProvider} from "../route/apiRoutesProvider.js";
import type {ApiRoute} from "../route/apiRoute.js";

class AdminApiRoutesProvider implements ApiRoutesProvider {
	public getRoutes(providerEnvironment: ProviderEnvironment): ApiRoute[] {
		const tasks = new Tasks(providerEnvironment);

		return [
			{
				path: AdminApiPaths.SiteKeyRegister,
				endpoint: new RegisterSiteKeyApiEndpoint(tasks.clientTaskManager),
			},
			// todo UserAccessRuleEndpoint
		];
	}
}

export { AdminApiRoutesProvider };
