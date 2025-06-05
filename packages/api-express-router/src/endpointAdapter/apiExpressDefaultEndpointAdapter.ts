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

import type { ApiEndpoint } from "@prosopo/api-route";
import { type LogLevel, ProsopoApiError } from "@prosopo/common";
import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import type { ApiExpressEndpointAdapter } from "./apiExpressEndpointAdapter.js";

class ApiExpressDefaultEndpointAdapter implements ApiExpressEndpointAdapter {
	public constructor(
		private readonly logLevel: LogLevel,
		private readonly errorStatusCode: number,
	) {}

	public async handleRequest(
		endpoint: ApiEndpoint<ZodType | undefined>,
		request: Request,
		response: Response,
		next: NextFunction,
	): Promise<void> {
		let args: unknown;
		try {
			args = endpoint.getRequestArgsSchema()?.parse(request.body);
		} catch (error) {
			return next(
				new ProsopoApiError("API.PARSE_ERROR", {
					context: { code: 400, error: error },
				}),
			);
		}

		try {
			const apiEndpointResponse = await endpoint.processRequest(
				args,
				request.logger,
			);

			response.json(apiEndpointResponse);
		} catch (error) {
			request.logger.error((error as Error).message);

			response.status(500).send("An internal server error occurred.");
		}
	}
}

export { ApiExpressDefaultEndpointAdapter };
