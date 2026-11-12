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
	type ErrorSite,
	type ProsopoError,
	describeError,
	isSevereError,
	toApiError,
	toPublicError,
} from "@prosopo/common";
import type { Logger } from "@prosopo/logger";

export interface ErrorResponse {
	status(code: number): ErrorResponse;
	json(body: unknown): unknown;
}

export interface ChainableResponse<R> {
	status(code: number): R;
	json(body: unknown): R;
}

/**
 * Answers with an error the handler raised on purpose. Not logged: the
 * handler already knows what happened and logs the decision itself.
 */
export const sendProsopoError = <R extends ChainableResponse<R>>(
	response: R,
	error: ProsopoError,
): R =>
	response
		.status(error.status)
		.json({ error: toPublicError(error, "BACKEND_ERROR") });

/**
 * Errors are only logged where nobody handled them. A fault (5xx) is logged as
 * an error; a client's mistake (4xx) only at debug, since logging every bad
 * request is noise.
 */
export const logUnhandledError = (
	logger: Logger | undefined,
	error: ProsopoError,
): void => {
	const record = () => ({
		msg: error.errorId,
		data: { error: describeError(error) },
	});
	if (isSevereError(error)) logger?.error(record);
	else logger?.debug(record);
};

export const sendErrorResponse = (
	err: unknown,
	fallbackSite: ErrorSite,
	response: ErrorResponse,
	logger: Logger | undefined,
): void => {
	const { error, status, body } = toApiError(err, fallbackSite);
	logUnhandledError(logger, error);
	response.status(status).json(body);
};
