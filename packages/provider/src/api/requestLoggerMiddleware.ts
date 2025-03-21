import { getLogger } from "@prosopo/common";
import type { ProviderEnvironment } from "@prosopo/env";
import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

export function requestLoggerMiddleware(env: ProviderEnvironment) {
	return (req: Request, res: Response, next: NextFunction) => {
		const requestId =
			(req.headers["x-request-id"] as string) || `e-${uuidv4()}`; // use prefix to differentiate from other IDs

		const logger = getLogger(env.config.logLevel, "request-logger", requestId);

		// Attach logger to the request
		req.logger = logger;
		req.requestId = requestId;

		// Continue to next middleware
		next();
	};
}
