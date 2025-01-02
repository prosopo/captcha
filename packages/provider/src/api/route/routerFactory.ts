import { Router } from "express";
import type { Logger } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { RouteRequestHandler } from "./routeRequestHandler.js";
import type { RoutesProvider } from "./routesProvider.js";

class RouterFactory {
	public createRouter(
		providerEnvironment: ProviderEnvironment,
		routesProvider: RoutesProvider,
		logger: Logger | null,
	): Router {
		const routes = routesProvider.getRoutes(providerEnvironment);

		const router = Router();

		for (const route of routes) {
			const routeRequestHandler = new RouteRequestHandler(
				route.endpoint.getRequestArgsSchema(),
				route.endpoint.handleRequest.bind(route.endpoint),
				logger,
			);

			const routeRequestHandlerCallback =
				routeRequestHandler.handleRequest.bind(routeRequestHandler);

			router.post(route.path, routeRequestHandlerCallback);
		}

		return router;
	}
}

export { RouterFactory };
