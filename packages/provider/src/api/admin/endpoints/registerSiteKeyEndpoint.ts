import { type ApiResponse, RegisterSitekeyBody } from "@prosopo/types";
import type { z } from "zod";
import type { ClientTaskManager } from "../../../tasks/client/clientTasks.js";
import type { RouteEndpoint } from "../../route/routeEndpoint.js";

class RegisterSiteKeyEndpoint
	implements RouteEndpoint<typeof RegisterSitekeyBody>
{
	public constructor(private readonly clientTaskManager: ClientTaskManager) {}

	async handleRequest(
		args: z.infer<typeof RegisterSitekeyBody>,
	): Promise<ApiResponse> {
		const { siteKey, settings } = args;

		const temp = settings || {};

		await this.clientTaskManager.registerSiteKey(siteKey, temp);

		return {
			status: "success",
		};
	}

	public getRequestArgsSchema(): typeof RegisterSitekeyBody {
		return RegisterSitekeyBody;
	}
}

export { RegisterSiteKeyEndpoint };
