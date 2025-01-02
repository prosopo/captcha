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
import { ApiExpressRouterFactory } from "./router/apiExpressRouterFactory.js";
import { AdminApiRoutesProvider } from "./admin/adminApiRoutesProvider.js";
import { AdminApiEndpointExpressAdapter } from "./admin/adminApiEndpointExpressAdapter.js";
import { getLogger } from "@prosopo/common";

export function prosopoAdminRouter(
	providerEnvironment: ProviderEnvironment,
): Router {
	const logger = getLogger(
		providerEnvironment.config.logLevel,
		"AdminApiRouter",
	);

	const apiExpressRouterFactory = new ApiExpressRouterFactory();

	return apiExpressRouterFactory.createRouter(
		providerEnvironment,
		new AdminApiRoutesProvider(),
		new AdminApiEndpointExpressAdapter(logger),
	);
}
