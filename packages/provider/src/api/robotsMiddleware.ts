import type { NextFunction, Request, Response } from "express";

export function robotsMiddleware() {
	return (_req: Request, res: Response, next: NextFunction) => {
		res.setHeader("Strict-Transport-Security", "max-age=31536000;");
		res.setHeader("X-XSS-Protection", "1; mode=block");
		res.setHeader("X-Frame-Options", "DENY");
		res.setHeader("X-Robots-Tag", "none");
		next();
	};
}
