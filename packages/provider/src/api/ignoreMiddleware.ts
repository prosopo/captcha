import { ApiPrefix } from "@prosopo/types";
import type { NextFunction, Request, Response } from "express";

export function ignoreMiddleware() {
	return (req: Request, res: Response, next: NextFunction) => {
		// Ignore non-api routes
		if (req.originalUrl.indexOf(ApiPrefix) === -1) {
			res.statusCode = 404;
			res.send("Not Found");
			return;
		}
		next();
	};
}
