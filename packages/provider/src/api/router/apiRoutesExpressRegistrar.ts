import type { NextFunction, Request, Response, Router } from "express";
import type { ApiRoute } from "../route/apiRoute.js";
import type { ApiEndpointExpressAdapter } from "../apiEndpoint/apiEndpointExpressAdapter.js";

class ApiRoutesExpressRegistrar {
	public registerRoutes(
		router: Router,
		apiRoutes: ApiRoute[],
		apiEndpointExpressAdapter: ApiEndpointExpressAdapter,
	): void {
		for (const apiRoute of apiRoutes) {
			router.post(
				apiRoute.path,
				async (
					request: Request,
					response: Response,
					next: NextFunction,
				): Promise<void> => {
					await apiEndpointExpressAdapter.handleRequest(
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

export { ApiRoutesExpressRegistrar };
