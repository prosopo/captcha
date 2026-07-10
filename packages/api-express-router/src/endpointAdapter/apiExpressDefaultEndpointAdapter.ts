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
import {
	ProsopoApiError,
	ProsopoBaseError,
	unwrapError,
} from "@prosopo/common";
import type { LogLevel } from "@prosopo/logger";
import { stringifyBigInts } from "@prosopo/util";
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

			// otherwise .json() will throw "TypeError: Do not know how to serialize a BigInt" as uses JSON.stringify
			const responseObject = stringifyBigInts(apiEndpointResponse);

			response.json(responseObject);
		} catch (error) {
			request.logger.error(() => ({
				err: error,
			}));

			// Errors that already carry an explicit HTTP status code (e.g. a 400
			// admin auth/validation error) should surface that code with the
			// standard `{ error: ... }` JSON envelope. Everything else — base
			// errors without a status code, or non-Prosopo errors — is treated as
			// an unexpected failure and mapped to this adapter's configured
			// errorStatusCode. In both cases the envelope is produced by
			// `unwrapError` so the message/key stay consistent and localised.
			const responseError =
				error instanceof ProsopoApiError ||
				(error instanceof ProsopoBaseError &&
					typeof error.context?.code === "number")
					? error
					: new ProsopoApiError("API.UNKNOWN", {
							context: { code: this.errorStatusCode },
							silent: true,
						});

			const { code, statusMessage, jsonError } = unwrapError(
				responseError,
				request.i18n,
			);
			response.statusMessage = statusMessage;
			response.status(code).json({ error: jsonError });
		}
	}
}

export { ApiExpressDefaultEndpointAdapter };
