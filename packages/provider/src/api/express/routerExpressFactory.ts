import { Router } from "express";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { RoutesExpressRegistrar } from "./routesExpressRegistrar.js";
import type {RoutesProvider} from "../interfaces/route/routesProvider.js";

class RouterExpressFactory {
	public createRouter(
		providerEnvironment: ProviderEnvironment,
		routersProvider: RoutesProvider,
		routesExpressRegistrar: RoutesExpressRegistrar,
	): Router {
		const apiRoutes = routersProvider.getRoutes(providerEnvironment);

		const router = Router();

		routesExpressRegistrar.registerRoutes(router, apiRoutes);

		return router;
	}
}

export { RouterExpressFactory };
