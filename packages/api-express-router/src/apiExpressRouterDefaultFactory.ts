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
import type { ApiRoutesProvider } from "@prosopo/api-route";
import type {ApiExpressRouterFactory} from "./apiExpressRouterFactory.js";
import type {ApiExpressRoutesRegistrar} from "./routesRegistrar/apiExpressRoutesRegistrar.js";

class ApiExpressRouterDefaultFactory implements ApiExpressRouterFactory{
	public constructor(
		private readonly apiRoutesRegistrar: ApiExpressRoutesRegistrar,
	) {}

	public createRouter(routersProvider: ApiRoutesProvider): Router {
		const apiRoutes = routersProvider.getRoutes();

		const router = Router();

		this.apiRoutesRegistrar.registerRoutes(router, apiRoutes);

		return router;
	}
}

export { ApiExpressRouterDefaultFactory };
