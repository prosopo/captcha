import ExpressRouterFactory from "../../api/express/expressRouterFactory.js";
import ApiRuleRoutesProvider from "./apiRuleRoutesProvider.js";
import ExpressRoutesRegistrar from "../../api/express/expressRoutesRegistrar.js";
import ExpressEndpointAdapter from "../../api/express/expressEndpointAdapter.js";
import type { Logger } from "@prosopo/common";
import type RulesStorage from "../storage/rulesStorage.js";
import type { Router } from "express";

export default function (rulesStorage: RulesStorage, logger: Logger): Router {
	const expressEndpointAdapter = new ExpressEndpointAdapter(logger);
	const expressRouterFactory = new ExpressRouterFactory();

	return expressRouterFactory.createRouter(
		rulesStorage,
		new ApiRuleRoutesProvider(),
		new ExpressRoutesRegistrar(expressEndpointAdapter),
	);
}
