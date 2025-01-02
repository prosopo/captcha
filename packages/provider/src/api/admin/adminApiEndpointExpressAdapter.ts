import type { Request, Response } from "express";
import type { Logger } from "@prosopo/common";
import type { ZodType } from "zod";
import type { ApiEndpoint } from "../endpoint/apiEndpoint.js";
import type { ApiEndpointExpressAdapter } from "../endpoint/apiEndpointExpressAdapter.js";

class AdminApiEndpointExpressAdapter implements ApiEndpointExpressAdapter {
	public constructor(private readonly logger: Logger | null) {}

	public async handleRequest(
		apiEndpoint: ApiEndpoint<ZodType | undefined>,
		request: Request,
		response: Response,
	): Promise<void> {
		try {
			const args = apiEndpoint.getRequestArgsSchema()?.parse(request.body);

			const apiResponse = await apiEndpoint.processRequest(args);

			response.json(apiResponse);
		} catch (error) {
			this.logger?.error(error);

			response.status(400).send("An internal server error occurred.");
		}
	}
}

export { AdminApiEndpointExpressAdapter };
