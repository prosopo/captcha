import type { NextFunction, Request, Response, Router } from "express";
import type { EndpointExpressAdapter } from "../definition/endpoint/endpointExpressAdapter.js";
import type { Route } from "../definition/route/route.js";

class RoutesExpressRegistrar {
	public constructor(
		private readonly endpointExpressAdapter: EndpointExpressAdapter,
	) {}

	public registerRoutes(router: Router, routes: Route[]): void {
		for (const route of routes) {
			router.post(
				route.path,
				async (
					request: Request,
					response: Response,
					next: NextFunction,
				): Promise<void> => {
					await this.endpointExpressAdapter.handleRequest(
						route.endpoint,
						request,
						response,
						next,
					);
				},
			);
		}
	}
}

export { RoutesExpressRegistrar };
