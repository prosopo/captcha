import type { ProviderEnvironment } from "@prosopo/types-env";
import type { Route } from "./route.js";

interface RoutesProvider {
	getRoutes(providerEnvironment: ProviderEnvironment): Route[];
}

export type { RoutesProvider };
