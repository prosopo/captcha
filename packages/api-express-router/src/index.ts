// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type { LogLevel } from "@prosopo/common";
import { ApiExpressRouterFactory } from "./apiExpressRouterFactory.js";
import { ApiExpressDefaultEndpointAdapter } from "./endpointAdapter/apiExpressDefaultEndpointAdapter.js";
import type { ApiExpressEndpointAdapter } from "./endpointAdapter/apiExpressEndpointAdapter.js";

const apiExpressRouterFactory = new ApiExpressRouterFactory();

const createApiExpressDefaultEndpointAdapter = (
	logLevel: LogLevel,
	errorStatusCode = 500,
): ApiExpressEndpointAdapter => {
	return new ApiExpressDefaultEndpointAdapter(logLevel, errorStatusCode);
};

export {
	apiExpressRouterFactory,
	createApiExpressDefaultEndpointAdapter,
	type ApiExpressEndpointAdapter,
};

export * from "./errorHandler.js";
