import {type ApiResponse, UserAccessPolicyRemoveRuleBody} from "@prosopo/types";
import type { z } from "zod";
import type {Endpoint} from "../../interfaces/endpoint/endpoint.js";

class RemoveUserAccessRuleEndpoint
    implements Endpoint<typeof UserAccessPolicyRemoveRuleBody>
{

    async processRequest(
        args: z.infer<typeof UserAccessPolicyRemoveRuleBody>,
    ): Promise<ApiResponse> {


        return {
            status: "success",
        };
    }

    public getRequestArgsSchema(): typeof UserAccessPolicyRemoveRuleBody {
        return UserAccessPolicyRemoveRuleBody;
    }
}

export { RemoveUserAccessRuleEndpoint };
