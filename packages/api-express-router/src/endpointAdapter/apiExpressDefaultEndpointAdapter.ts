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

import type { ApiEndpoint } from "@prosopo/api-route";
import { ProsopoError, isProsopoError } from "@prosopo/common";
import type { LogLevel } from "@prosopo/logger";
import { stringifyBigInts } from "@prosopo/util";
import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { sendErrorResponse } from "../errorResponse.js";
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
				new ProsopoError({
					code: "INVALID_REQUEST",
					errorSite: "APIX-1",
					message: "Error parsing request",
					cause: error,
				}),
			);
		}

		try {
			const apiEndpointResponse = await endpoint.processRequest(
				args,
				request.logger,
			);

			// otherwise .json() will throw "TypeError: Do not know how to serialize a BigInt" as uses JSON.stringify
			const responseObject = stringifyBigInts(apiEndpointResponse);

			response.json(responseObject);
		} catch (error) {
			// An error that is not a ProsopoError was not anticipated by the
			// endpoint, so it is reported with this adapter's status.
			const responseError = isProsopoError(error)
				? error
				: new ProsopoError({
						code: "UNEXPECTED",
						errorSite: "APIX-2",
						cause: error,
						status: this.errorStatusCode,
					});
			sendErrorResponse(responseError, "APIX-6", response, request.logger);
		}
	}
}

export { ApiExpressDefaultEndpointAdapter };
