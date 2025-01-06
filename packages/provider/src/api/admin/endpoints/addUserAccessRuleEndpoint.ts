import { type ApiResponse, RegisterSitekeyBody } from "@prosopo/types";
import type { z } from "zod";
import type {Endpoint} from "../../interfaces/endpoint/endpoint.js";

class AddUserAccessRuleEndpoint
    implements Endpoint<typeof RegisterSitekeyBody>
{

    async processRequest(
        args: z.infer<typeof RegisterSitekeyBody>,
    ): Promise<ApiResponse> {


        return {
            status: "success",
        };
    }

    public getRequestArgsSchema(): typeof RegisterSitekeyBody {
        return RegisterSitekeyBody;
    }
}

export { AddUserAccessRuleEndpoint };
