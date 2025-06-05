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

import type { ApiRoute, ApiRoutesProvider } from "@prosopo/api-route";
import {
	type NextFunction,
	type Request,
	type Response,
	Router,
} from "express";
import type { ApiExpressEndpointAdapter } from "./endpointAdapter/apiExpressEndpointAdapter.js";
import { handleErrors } from "./errorHandler.js";

class ApiExpressRouterFactory {
	public createRouter(
		routersProvider: ApiRoutesProvider,
		apiEndpointAdapter: ApiExpressEndpointAdapter,
	): Router {
		const router = Router();
		const apiRoutes = routersProvider.getRoutes();

		this.registerRoutes(router, apiRoutes, apiEndpointAdapter);

		// Your error handler should always be at the end of your application stack. Apparently it means not only after all
		// app.use() but also after all your app.get() and app.post() calls.
		// https://stackoverflow.com/a/62358794/1178971
		router.use(handleErrors);

		return router;
	}

	protected registerRoutes(
		router: Router,
		routes: ApiRoute[],
		apiEndpointAdapter: ApiExpressEndpointAdapter,
	): void {
		for (const route of routes) {
			router.post(
				route.path,
				async (
					request: Request,
					response: Response,
					next: NextFunction,
				): Promise<void> => {
					return await apiEndpointAdapter.handleRequest(
						route.endpoint,
						request,
						response,
						next,
					);
				},
			);
		}
	}
}

export { ApiExpressRouterFactory };
