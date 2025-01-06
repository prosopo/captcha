import type { ProviderEnvironment } from "@prosopo/types-env";
// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Router } from "express";
import type { RoutesProvider } from "../interfaces/route/routesProvider.js";
import type { RoutesExpressRegistrar } from "./routesExpressRegistrar.js";

class RouterExpressFactory {
	public createRouter(
		providerEnvironment: ProviderEnvironment,
		routersProvider: RoutesProvider,
		routesExpressRegistrar: RoutesExpressRegistrar,
	): Router {
		const apiRoutes = routersProvider.getRoutes(providerEnvironment);

		const router = Router();

		routesExpressRegistrar.registerRoutes(router, apiRoutes);

		return router;
	}
}

export { RouterExpressFactory };
