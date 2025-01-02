import { type ApiResponse, RegisterSitekeyBody } from "@prosopo/types";
import type { z } from "zod";
import type { ClientTaskManager } from "../../../tasks/client/clientTasks.js";
import type {Endpoint} from "../../endpoint.js";

class RegisterSiteKeyEndpoint
	implements Endpoint<typeof RegisterSitekeyBody>
{
	public constructor(private readonly clientTaskManager: ClientTaskManager) {}

	async processRequest(
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
