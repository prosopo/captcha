import type { Request, Response } from "express";
import type { Logger } from "@prosopo/common";
import type { ZodType } from "zod";
import type { Endpoint } from "../../api/endpoint.js";
import type { EndpointAdapter } from "../endpointAdapter.js";

class AdminEndpointAdapter implements EndpointAdapter {
	public constructor(private readonly logger: Logger | null) {}

	public async handleRequest(
		apiEndpoint: Endpoint<ZodType | undefined>,
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

export { AdminEndpointAdapter };
