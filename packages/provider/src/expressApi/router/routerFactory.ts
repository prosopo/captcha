import { Router } from "express";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { RoutesProvider } from "../../api/routesProvider.js";
import type { RoutesRegistrar } from "./routesRegistrar.js";

class RouterFactory {
	public createRouter(
		providerEnvironment: ProviderEnvironment,
		routersProvider: RoutesProvider,
		routesRegistrar: RoutesRegistrar,
	): Router {
		const apiRoutes = routersProvider.getRoutes(providerEnvironment);

		const router = Router();

		routesRegistrar.registerRoutes(router, apiRoutes);

		return router;
	}
}

export { RouterFactory };
