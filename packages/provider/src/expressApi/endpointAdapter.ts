import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import type { Endpoint } from "../api/endpoint.js";

interface EndpointAdapter {
	handleRequest(
		apiEndpoint: Endpoint<ZodType | undefined>,
		request: Request,
		response: Response,
		next: NextFunction,
	): Promise<void>;
}

export type { EndpointAdapter };
