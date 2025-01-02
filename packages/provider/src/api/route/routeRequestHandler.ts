import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@prosopo/common";
import type { ZodType } from "zod";
import type { ApiResponse } from "@prosopo/types";

class RouteRequestHandler {
	constructor(
		private readonly argsSchema: ZodType | undefined,
		private readonly handler: (
			args: ZodType | undefined,
		) => Promise<ApiResponse>,
		private readonly logger: Logger | null,
	) {}

	public async handleRequest(
		request: Request,
		response: Response,
		next: NextFunction,
	): Promise<void> {
		try {
			const args = this.argsSchema?.parse(request.body);

			const apiResponse = await this.handler(args);

			response.json(apiResponse);
		} catch (err) {
			this.logger?.error(err);

			response.status(400).send("An internal server error occurred.");
		}
	}
}

export { RouteRequestHandler };
