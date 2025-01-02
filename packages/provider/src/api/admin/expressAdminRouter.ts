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
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { Router } from "express";
import { getLogger } from "@prosopo/common";
import {EndpointExpressAdminAdapter} from "./endpointExpressAdminAdapter.js";
import {RouterExpressFactory} from "../express/routerExpressFactory.js";
import {RoutesAdminProvider} from "./routesAdminProvider.js";
import {RoutesExpressRegistrar} from "../express/routesExpressRegistrar.js";

export function createExpressAdminRouter(
	providerEnvironment: ProviderEnvironment,
): Router {
	const logger = getLogger(
		providerEnvironment.config.logLevel,
		"AdminEndpointAdapter",
	);

	const adminEndpointExpressAdapter = new EndpointExpressAdminAdapter(logger);

	const expressRouterFactory = new RouterExpressFactory();

	return expressRouterFactory.createRouter(
		providerEnvironment,
		new RoutesAdminProvider(),
		new RoutesExpressRegistrar(adminEndpointExpressAdapter),
	);
}
