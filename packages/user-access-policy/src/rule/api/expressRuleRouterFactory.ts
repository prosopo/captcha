import type { ProviderEnvironment } from "@prosopo/types-env";
import ExpressRouterFactory from "../../api/express/expressRouterFactory.js";
import ApiRuleRoutesProvider from "./apiRuleRoutesProvider.js";
import ExpressRoutesRegistrar from "../../api/express/expressRoutesRegistrar.js";
import ExpressEndpointAdapter from "../../api/express/expressEndpointAdapter.js";
import { getLogger } from "@prosopo/common";

export default function (providerEnvironment: ProviderEnvironment) {
	const logger = getLogger(
		providerEnvironment.config.logLevel,
		"UserAccessPolicy",
	);
	const expressEndpointAdapter = new ExpressEndpointAdapter(logger);

	const expressRouterFactory = new ExpressRouterFactory();

	return expressRouterFactory.createRouter(
		providerEnvironment,
		new ApiRuleRoutesProvider(),
		new ExpressRoutesRegistrar(expressEndpointAdapter),
	);
}
