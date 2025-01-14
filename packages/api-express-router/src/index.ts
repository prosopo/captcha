import type { ApiExpressEndpointAdapter } from "./endpointAdapter/apiExpressEndpointAdapter.js";
import { ApiExpressRoutesDefaultRegistrar } from "./routesRegistrar/apiExpressRoutesDefaultRegistrar.js";
import type { ApiExpressRouterFactory } from "./apiExpressRouterFactory.js";
import { ApiExpressRouterDefaultFactory } from "./apiExpressRouterDefaultFactory.js";
import type { ApiExpressRoutesRegistrar } from "./routesRegistrar/apiExpressRoutesRegistrar.js";
import { ApiExpressEndpointDefaultAdapter } from "./endpointAdapter/apiExpressEndpointDefaultAdapter.js";
import type { Logger } from "@prosopo/common";

const createApiExpressEndpointAdapter = (
	logger: Logger,
): ApiExpressEndpointAdapter => {
	return new ApiExpressEndpointDefaultAdapter(logger);
};

const createApiExpressRouterFactory = (
	apiEndpointAdapter: ApiExpressEndpointAdapter,
): ApiExpressRouterFactory => {
	const apiRoutesExpressRegistrar = new ApiExpressRoutesDefaultRegistrar(
		apiEndpointAdapter,
	);

	return new ApiExpressRouterDefaultFactory(apiRoutesExpressRegistrar);
};

export {
	createApiExpressEndpointAdapter,
	createApiExpressRouterFactory,
	type ApiExpressEndpointAdapter,
	type ApiExpressRouterFactory,
	type ApiExpressRoutesRegistrar,
};
