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

import type { ApiRoutesProvider } from "@prosopo/api-route";
import type { LogLevel } from "@prosopo/common";
import type { NextFunction, Request, Response, Router } from "express";
import { describe, expectTypeOf, it } from "vitest";
import {
	type ApiExpressEndpointAdapter,
	apiExpressRouterFactory,
	createApiExpressDefaultEndpointAdapter,
} from "../../index.js";

describe("index exports - type tests", () => {
	describe("apiExpressRouterFactory", () => {
		it("should have createRouter method with correct signature", () => {
			// Type test: verify createRouter accepts ApiRoutesProvider and ApiExpressEndpointAdapter
			expectTypeOf(apiExpressRouterFactory.createRouter)
				.parameter(0)
				.toMatchTypeOf<ApiRoutesProvider>();
			expectTypeOf(apiExpressRouterFactory.createRouter)
				.parameter(1)
				.toMatchTypeOf<ApiExpressEndpointAdapter>();

			// Type test: verify createRouter returns Router
			expectTypeOf(
				apiExpressRouterFactory.createRouter,
			).returns.toMatchTypeOf<Router>();
		});
	});

	describe("createApiExpressDefaultEndpointAdapter", () => {
		it("should accept LogLevel and optional errorStatusCode", () => {
			// Type test: verify first parameter is LogLevel
			expectTypeOf(createApiExpressDefaultEndpointAdapter)
				.parameter(0)
				.toMatchTypeOf<LogLevel>();

			// Type test: verify second parameter is optional number
			expectTypeOf(createApiExpressDefaultEndpointAdapter)
				.parameter(1)
				.toMatchTypeOf<number | undefined>();

			// Type test: verify return type is ApiExpressEndpointAdapter
			expectTypeOf(
				createApiExpressDefaultEndpointAdapter,
			).returns.toMatchTypeOf<ApiExpressEndpointAdapter>();
		});

		it("should return ApiExpressEndpointAdapter with correct handleRequest signature", () => {
			const adapter = createApiExpressDefaultEndpointAdapter("info", 500);

			// Type test: verify adapter has handleRequest method
			expectTypeOf(adapter.handleRequest).toMatchTypeOf<
				(
					endpoint: Parameters<ApiExpressEndpointAdapter["handleRequest"]>[0],
					request: Request,
					response: Response,
					next: NextFunction,
				) => Promise<void>
			>();
		});
	});

	describe("ApiExpressEndpointAdapter type", () => {
		it("should have correct handleRequest signature", () => {
			// Type test: verify interface structure
			type Adapter = ApiExpressEndpointAdapter;

			expectTypeOf<Adapter["handleRequest"]>().toMatchTypeOf<
				(
					endpoint: Parameters<Adapter["handleRequest"]>[0],
					request: Request,
					response: Response,
					next: NextFunction,
				) => Promise<void>
			>();
		});
	});
});
