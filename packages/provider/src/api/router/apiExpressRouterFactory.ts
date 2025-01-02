import { Router } from "express";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { ApiRoutesProvider } from "../route/apiRoutesProvider.js";
import { ApiRoutesExpressRegistrar } from "./apiRoutesExpressRegistrar.js";
import type { ApiEndpointExpressAdapter } from "../endpoint/apiEndpointExpressAdapter.js";

class ApiExpressRouterFactory {
	public constructor(
		private readonly apiRoutesExpressRegistrar: ApiRoutesExpressRegistrar | null = null,
	) {}

	public createRouter(
		providerEnvironment: ProviderEnvironment,
		apiRoutesProvider: ApiRoutesProvider,
		apiEndpointExpressAdapter: ApiEndpointExpressAdapter,
	): Router {
		const apiRoutes = apiRoutesProvider.getRoutes(providerEnvironment);

		const apiRoutesExpressRegistrar = this.getApiRoutesExpressRegistrar();

		const router = Router();

		apiRoutesExpressRegistrar.registerRoutes(
			router,
			apiRoutes,
			apiEndpointExpressAdapter,
		);

		return router;
	}

	protected getApiRoutesExpressRegistrar(): ApiRoutesExpressRegistrar {
		if (this.apiRoutesExpressRegistrar) {
			return this.apiRoutesExpressRegistrar;
		}

		return new ApiRoutesExpressRegistrar();
	}
}

export { ApiExpressRouterFactory };
