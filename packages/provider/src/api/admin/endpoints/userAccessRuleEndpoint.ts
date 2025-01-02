import { type ApiResponse, RegisterSitekeyBody } from "@prosopo/types";
import type { z } from "zod";
import type { RouteEndpoint } from "../../route/routeEndpoint.js";

class UserAccessRuleEndpoint
    implements RouteEndpoint<typeof RegisterSitekeyBody>
{

    async handleRequest(
        args: z.infer<typeof RegisterSitekeyBody>,
    ): Promise<ApiResponse> {
       // todo

        return {
            status: "success",
        };
    }

    public getRequestArgsSchema(): typeof RegisterSitekeyBody {
        return RegisterSitekeyBody;
    }
}

export { UserAccessRuleEndpoint };
