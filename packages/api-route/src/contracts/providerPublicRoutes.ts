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

import {
	type HealthzResponse,
	PublicApiPaths,
	providerDetailsSchema,
} from "@prosopo/types";
import { type ZodType, z } from "zod";
import { type ApiRouteContract, defineApiRoute } from "../apiRouteContract.js";

export const healthzRoute: ApiRouteContract<
	PublicApiPaths.Healthz,
	undefined,
	ZodType<HealthzResponse>
> = defineApiRoute({
	path: PublicApiPaths.Healthz,
	method: "get",
	requestSchema: undefined,
	responseSchema: z.custom<HealthzResponse>(),
});

// Prometheus text exposition, not JSON.
export const metricsRoute: ApiRouteContract<
	PublicApiPaths.Metrics,
	undefined,
	undefined
> = defineApiRoute({
	path: PublicApiPaths.Metrics,
	method: "get",
	requestSchema: undefined,
	responseSchema: undefined,
});

export const getProviderDetailsRoute: ApiRouteContract<
	PublicApiPaths.GetProviderDetails,
	undefined,
	typeof providerDetailsSchema
> = defineApiRoute({
	path: PublicApiPaths.GetProviderDetails,
	method: "get",
	requestSchema: undefined,
	responseSchema: providerDetailsSchema,
});
