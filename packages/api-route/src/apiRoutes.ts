// Copyright 2021-2026 Prosopo (UK) Ltd.
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

import type { ZodType } from "zod";
import type { ApiEndpoint } from "./endpoint/apiEndpoint.js";
import type { ApiEndpointData } from "./endpoint/apiEndpointResponse.js";

export type ApiRoutes<Path extends string = string> = Record<
	Path,
	ApiEndpoint<ZodType | undefined, ApiEndpointData>
>;

export interface ApiRoutesProvider<Path extends string = string> {
	getRoutes(): ApiRoutes<Path>;
}

export type ApiRouteLimit = {
	windowMs: number;
	limit: number;
};

export type ApiRouteLimits<Enum extends string | number> = Record<
	Enum,
	ApiRouteLimit
>;
