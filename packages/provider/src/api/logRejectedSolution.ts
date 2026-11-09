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
import { describeError, isSevereError, toProsopoError } from "@prosopo/common";
import type { NextFunction, Request, Response } from "express";
import { summariseRequestBody } from "./requestBodySummary.js";

/**
 * Logs why a captcha answer was refused before passing the error on. The
 * shared error handler logs client errors only at debug, which is not
 * shipped, and the widget answers a refusal by silently starting a new
 * challenge, so without this a visitor can loop for minutes leaving no trace
 * of the cause. Faults are left to the shared handler, which logs them as
 * errors.
 */
export const logRejectedSolution = (
	err: unknown,
	req: Request,
	_res: Response,
	next: NextFunction,
): void => {
	const error = toProsopoError(err, "PROV-98");
	if (!isSevereError(error)) {
		req.logger.info(() => ({
			msg: "Captcha solution rejected",
			data: {
				error: describeError(error),
				body: summariseRequestBody(req),
			},
		}));
	}
	next(err);
};
