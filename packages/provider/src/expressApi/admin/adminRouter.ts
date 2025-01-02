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
import { AdminEndpointAdapter } from "./adminEndpointAdapter.js";
import { AdminRoutesProvider } from "../../api/admin/adminRoutesProvider.js";
import { RouterFactory } from "../router/routerFactory.js";
import { RoutesRegistrar } from "../router/routesRegistrar.js";

export function createAdminRouter(
	providerEnvironment: ProviderEnvironment,
): Router {
	const logger = getLogger(
		providerEnvironment.config.logLevel,
		"AdminEndpointAdapter",
	);

	const adminEndpointAdapter = new AdminEndpointAdapter(logger);

	const routerFactory = new RouterFactory();

	return routerFactory.createRouter(
		providerEnvironment,
		new AdminRoutesProvider(),
		new RoutesRegistrar(adminEndpointAdapter),
	);
}
