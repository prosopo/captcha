import {type ApiResponse, UserAccessPolicyAddRuleBody} from "@prosopo/types";
import type { z } from "zod";
import type {Endpoint} from "../../interfaces/endpoint/endpoint.js";

class AddUserAccessRuleEndpoint
    implements Endpoint<typeof UserAccessPolicyAddRuleBody>
{

    async processRequest(
        args: z.infer<typeof UserAccessPolicyAddRuleBody>,
    ): Promise<ApiResponse> {

        // todo


        return {
            status: "success",
        };
    }

    public getRequestArgsSchema(): typeof UserAccessPolicyAddRuleBody {
        return UserAccessPolicyAddRuleBody;
    }
}

export { AddUserAccessRuleEndpoint };
