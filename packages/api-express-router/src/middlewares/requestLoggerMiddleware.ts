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

import { getLogger, parseLogLevel } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/env";
import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

const getHeaderValue = (
	req: Request,
	headerName: string,
): string | undefined => {
	if (headerName in req.headers && req.headers[headerName]) {
		return req.headers[headerName].toString();
	}
	return undefined;
};

export function requestLoggerMiddleware(env: ProviderEnvironment) {
	return (req: Request, res: Response, next: NextFunction) => {
		const requestId =
			(req.headers["x-request-id"] as string) || `e-${uuidv4()}`; // use prefix to differentiate from other IDs
		const user = getHeaderValue(req, "prosopo-user");
		const siteKey = getHeaderValue(req, "prosopo-site-key");
		const sessionId = req.body?.sessionId ? req.body.sessionId : null;

		// Attach site key and user to the request logger
		req.logger = req.logger.with({
			user,
			siteKey,
		});

		const logger = getLogger(
			parseLogLevel(env.config.logLevel),
			"request-logger",
		).with({
			requestId,
			...(user ? { user } : {}),
			...(siteKey ? { siteKey } : {}),
			...(sessionId ? { sessionId } : {}),
		});

		// Attach logger to the request
		req.logger = logger;
		req.requestId = requestId;

		// Continue to next middleware
		next();
	};
}
