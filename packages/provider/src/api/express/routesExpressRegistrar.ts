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
import type { NextFunction, Request, Response, Router } from "express";
import type { EndpointExpressAdapter } from "../interfaces/endpoint/endpointExpressAdapter.js";
import type { Route } from "../interfaces/route/route.js";

class RoutesExpressRegistrar {
	public constructor(
		private readonly endpointExpressAdapter: EndpointExpressAdapter,
	) {}

	public registerRoutes(router: Router, routes: Route[]): void {
		for (const route of routes) {
			router.post(
				route.path,
				async (
					request: Request,
					response: Response,
					next: NextFunction,
				): Promise<void> => {
					await this.endpointExpressAdapter.handleRequest(
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

export { RoutesExpressRegistrar };
