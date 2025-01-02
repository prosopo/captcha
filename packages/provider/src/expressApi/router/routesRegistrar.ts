import type { NextFunction, Request, Response, Router } from "express";
import type { Route } from "../../api/route.js";
import type { EndpointAdapter } from "../endpointAdapter.js";

class RoutesRegistrar {
	public constructor(
		private readonly endpointAdapter: EndpointAdapter,
	) {}

	public registerRoutes(router: Router, apiRoutes: Route[]): void {
		for (const apiRoute of apiRoutes) {
			router.post(
				apiRoute.path,
				async (
					request: Request,
					response: Response,
					next: NextFunction,
				): Promise<void> => {
					await this.endpointAdapter.handleRequest(
						apiRoute.endpoint,
						request,
						response,
						next,
					);
				},
			);
		}
	}
}

export { RoutesRegistrar };
