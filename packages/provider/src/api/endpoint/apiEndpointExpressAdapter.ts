import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import type { ApiEndpoint } from "./apiEndpoint.js";

interface ApiEndpointExpressAdapter {
	handleRequest(
		apiEndpoint: ApiEndpoint<ZodType | undefined>,
		request: Request,
		response: Response,
		next: NextFunction,
	): Promise<void>;
}

export type { ApiEndpointExpressAdapter };
