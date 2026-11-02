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

import type { Logger } from "@prosopo/logger";
import type { NextFunction, Request } from "express";
import { type ErrorResponse, sendErrorResponse } from "./errorResponse.js";

// Express only treats a middleware as an error handler when it takes four
// parameters, so `next` stays although it is unused. `Request` is listed
// because its `logger` is declared only in this package's express.d.ts, so
// to consumers it shares no property with `{ logger?: Logger }`.
export const handleErrors = (
	err: unknown,
	request: Request | { logger?: Logger },
	response: ErrorResponse,
	next: NextFunction,
): void => {
	sendErrorResponse(err, "APIX-7", response, request.logger);
};
