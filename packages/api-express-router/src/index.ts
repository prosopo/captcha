import type { ApiExpressEndpointAdapter } from "./endpointAdapter/apiExpressEndpointAdapter.js";
import { ApiExpressRouterFactory } from "./apiExpressRouterFactory.js";
import { ApiExpressDefaultEndpointAdapter } from "./endpointAdapter/apiExpressDefaultEndpointAdapter.js";
import type { Logger } from "@prosopo/common";

const apiExpressRouterFactory = new ApiExpressRouterFactory();

const createApiExpressDefaultEndpointAdapter = (
	logger: Logger,
	errorStatusCode = 500,
): ApiExpressEndpointAdapter => {
	return new ApiExpressDefaultEndpointAdapter(logger, errorStatusCode);
};

export {
	apiExpressRouterFactory,
	createApiExpressDefaultEndpointAdapter,
	type ApiExpressEndpointAdapter,
};
