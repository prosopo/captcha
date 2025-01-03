import type { Request, Response } from "express";
import type { Logger } from "@prosopo/common";
import type { ZodType } from "zod";
import type {EndpointExpressAdapter} from "../interfaces/endpoint/endpointExpressAdapter.js";
import type {Endpoint} from "../interfaces/endpoint/endpoint.js";

class EndpointExpressAdminAdapter implements EndpointExpressAdapter {
	public constructor(private readonly logger: Logger | null) {}

	public async handleRequest(
		endpoint: Endpoint<ZodType | undefined>,
		request: Request,
		response: Response,
	): Promise<void> {
		try {
			const args = endpoint.getRequestArgsSchema()?.parse(request.body);

			const apiResponse = await endpoint.processRequest(args);

			response.json(apiResponse);
		} catch (error) {
			this.logger?.error(error);

			response.status(400).send("An internal server error occurred.");
		}
	}
}

export { EndpointExpressAdminAdapter };
