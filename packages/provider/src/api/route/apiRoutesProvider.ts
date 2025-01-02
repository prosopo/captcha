import type { ProviderEnvironment } from "@prosopo/types-env";
import type { ApiRoute } from "./apiRoute.js";

interface ApiRoutesProvider {
    getRoutes(providerEnvironment: ProviderEnvironment): ApiRoute[];
}

export type { ApiRoutesProvider };
