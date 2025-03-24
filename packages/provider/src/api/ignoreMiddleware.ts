import { ApiPrefix } from "@prosopo/types";
import type { NextFunction, Request, Response } from "express";

export function ignoreMiddleware() {
	return (req: Request, res: Response, next: NextFunction) => {
		// Ignore non-api routes
		if (req.originalUrl.indexOf(ApiPrefix) === -1) {
			res.setHeader("Strict-Transport-Security", "max-age=31536000;");
			res.setHeader("X-XSS-Protection", "1; mode=block");
			res.setHeader("X-Frame-Options", "DENY");
			res.setHeader("X-Robots-Tag", "none");
			res.statusCode = 404;
			res.send("Not Found");
			return;
		}
		next();
	};
}
